// Sistema Cyberpunk RED — Fieldbook no Foundry 14 de verdade (tests/lib/foundry14.js):
// - as regras puras ficam em tests/sistema/regras.test.mjs (node --test), com as tabelas da wiki;
// - no Foundry: ficha, crítico do d10, catálogo, cyberware que só vale instalado, recarregar, o ataque com a defesa
//   no cliente do jogador do alvo e o dano na ficha, e a importação de um personagem feito na wiki de teste.
// Os dados ficam fixos onde a conta importa: CONFIG.Dice.randomUniform devolve os lados pedidos, em ordem.
// Só roda com a mesa do servidor vazia: a licença do Foundry vale para uma mesa por vez.
const path = require('path');
const foundry14 = require('../lib/foundry14');
const { mesaOcupada } = require('../lib/foundry');
const { abrirEdge } = require('../lib/edge');

module.exports = async ({ edge, servidores, r }) => {
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

  let netrunner;
  await r.passo('wiki: Netrunner (Rato de Rua) com o cyberdeck e os programas que a montagem põe nele', async () => {
    const { personagem } = await api('/api/personagens', 'POST', { metodo: 'ratoderua', sorteio: { linha: 1 }, lingua: 'Portuguese', casa: 'Heywood', nome: 'Teste Netrunner', apelido: 'Deck', role: 'netrunner', lifepath });
    await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
    await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
    for (let i = 0; i < 30 && !/Salvo/.test(await texto('#cc-save')); i++) await edge.sleep(200);
    netrunner = (await api(`/api/personagens/${personagem.id}`)).personagem;
    const itens = netrunner.resultado?.itens || [];
    const deck = itens.find(i => i.id.startsWith('core_gear:cyberdeck'));
    const noDeck = itens.filter(i => deck && i.em === deck.uid);
    return [Boolean(deck) && noDeck.length >= 4, `${itens.length} itens · deck ${deck?.id} · no deck: ${noDeck.map(i => `${i.id}×${i.qtd}`).join(', ')}`];
  });

  let nomad;
  await r.passo('wiki: Nomad (Rato de Rua) com dois veículos da família (o carro com Chassis pesado e Upgrade de assento) e uma arma de 2077 comprada na loja', async () => {
    const { personagem } = await api('/api/personagens', 'POST', {
      metodo: 'ratoderua', sorteio: { linha: 1 }, lingua: 'Portuguese', casa: 'Heywood', nome: 'Teste Nomad', apelido: 'Estrada', role: 'nomad', lifepath,
      oficina: ['v:Compact Groundcar', 'u:0:Heavy Chassis', 'u:0:Seating Upgrade', 'v:Roadbike'],
      itens: [{ uid: 'loja:teste-2077', id: 'armas-2077:arasaka-hjke-11-yukimura', qtd: 1 }]
    });
    await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
    await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
    for (let i = 0; i < 30 && !/Salvo/.test(await texto('#cc-save')); i++) await edge.sleep(200);
    nomad = (await api(`/api/personagens/${personagem.id}`)).personagem;
    const r = nomad.resultado || {};
    const veiculos = (r.veiculos || []).map(v => `${v.foundry?.nome} (${(v.upgrades || []).map(u => u.foundry?.nome).join(', ')})`);
    const de2077 = (r.itens || []).some(i => i.id === 'armas-2077:arasaka-hjke-11-yukimura');
    return [veiculos.length === 2 && (r.veiculos[0].upgrades || []).length === 2 && de2077, `veículos: ${veiculos.join('; ')} · arma de 2077 no resultado: ${de2077}`];
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
      await foundry14.capturarAvisos(edge);
      await foundry14.entrarComoMestre(edge, mesa.url);
      const info = await edge.evaluate(`({ geracao: game.release.generation, build: game.release.build, sistema: game.system.id, versao: game.system.version, gm: game.user.isGM, api: Object.keys(game.system.api || {}) })`);
      return [info.geracao === 14 && info.sistema === S && info.gm && info.api.includes('combate'), JSON.stringify(info)];
    });

    await r.passo('compêndios: armas, armaduras, munição, cyberware, equipamento, roupas, drogas, netrunning, upgrades, veículos, o conteúdo de 2077, lesões e os personagens de exemplo; o Solo de exemplo entra pronto para o combate', async () => {
      const info = await edge.evaluate(`(async () => {
        const tamanhos = Object.fromEntries(game.packs.filter(p => p.metadata.packageName === '${S}').map(p => [p.metadata.name, p.index.size]));
        const pack = game.packs.get('${S}.exemplos');
        const entrada = pack.index.find(e => e.name === 'Solo (exemplo)');
        const ator = await game.actors.importFromCompendium(pack, entrada._id);
        const rifle = ator.items.getName('Assault Rifle');
        const resumo = { hp: ator.system.hp.value, ini: ator.system.iniciativa, sp: [ator.system.armadura.cabeca.sp, ator.system.armadura.corpo.sp], pente: rifle.system.pente.value, municao: rifle.municaoCarregada?.name, hum: ator.system.humanidade.value, humMax: ator.system.humanidade.max };
        await ator.delete();
        return { tamanhos, resumo };
      })()`);
      const t = info.tamanhos;
      const s = info.resumo;
      // Iniciativa 12: REF 8 + Kerenzikov 2 + Reação de Iniciativa 2 (os pontos do Solo de exemplo).
      return [t.armas === 100 && t.armaduras === 18 && t.municao === 55 && t.cyberware === 107 && t.equipamento === 51 && t.roupas === 90 && t.drogas === 10 && t.netrunning === 30 && t.upgrades === 51 && t.veiculos === 14 && t['armas-2077'] === 58 && t['cyberware-2077'] === 62 && t['netrunning-2077'] === 48 && t.lesoes === 22 && t.exemplos === 2 && s.hp === 45 && s.ini === 12 && s.sp.join() === '11,11' && s.pente === 25 && s.municao === 'Rifle (Basic)' && s.hum === 36 && s.humMax === 48,
        JSON.stringify(info)];
    });

    await r.passo('migração dos dados (C1): o mundo novo fica na versão atual sem perguntar; um mundo da versão 0 com o TeleOptics antigo (num ator, num token não ligado e num compêndio do mundo trancado) e um Cyberaudio que virou Fashionware: a pergunta lista o que muda e os passos; "Depois" não muda nada; "Migrar agora" muda só isso, tranca o compêndio de novo, grava a versão e deixa o registro no chat dos mestres; de novo, nada muda e não pergunta; dados de uma versão mais nova só avisam', async () => {
      const info = await edge.evaluate(`(async () => {
        const api = game.system.api.migracao;
        const esperar = async (condicao, vezes = 100) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const versao = () => game.settings.get('${S}', 'versaoDosDados');
        // O mundo novo: o ready gravou a versão, sem perguntar.
        const novo = { gravada: await esperar(() => versao() === api.VERSAO_DOS_DADOS), atual: api.VERSAO_DOS_DADOS, pergunta: Boolean(document.querySelector('.application.dialog.migracao')) };
        const cat = await game.system.api.wiki.carregarCatalogo();
        const pegar = id => foundry.utils.deepClone(cat[id]);
        // O TeleOptics como o catálogo o trazia até o ciclo 26: com o +1 de sempre do CORE.
        const teleAntigo = () => {
          const t = pegar('core_cyberware:teleoptics');
          t.system.instalado = true;
          t.effects = [{ name: 'TeleOptics', img: 'icons/svg/upgrade.svg', type: 'base', transfer: true, system: { changes: [
            { key: 'system.bonus.tiroMirado', type: 'add', value: '1', phase: 'initial' }, { key: 'system.bonus.tiroUnico', type: 'add', value: '1', phase: 'initial' }] } }];
          return t;
        };
        const avisos = [];
        let ator, audio, capanga, cena, pacote, mensagem;
        try {
          ator = await Actor.implementation.create({ name: 'Migração: ator', type: 'personagem', items: [teleAntigo()] });
          const dadosDoAudio = pegar('core_cyberware:amplified-hearing');
          dadosDoAudio.system.tipo = 'fashionware';
          audio = await Item.implementation.create(dadosDoAudio);
          // O token não ligado com o TeleOptics só nele (no delta); o ator do mundo não tem. O protótipo do personagem sai
          // sempre ligado (AtorCPR._preCreate): o token se desliga na criação.
          capanga = await Actor.implementation.create({ name: 'Migração: capanga', type: 'personagem' });
          // Desligada: sem cena ativa, o Foundry 14 liga a primeira que se cria, e o canvas desenhando o token quebra o core.
          cena = await Scene.implementation.create({ name: 'Migração (teste)', active: false, width: 1000, height: 1000 });
          const [token] = await cena.createEmbeddedDocuments('Token', [(await capanga.getTokenDocument({ x: 100, y: 100, actorLink: false })).toObject()]);
          await token.actor.createEmbeddedDocuments('Item', [teleAntigo()]);
          pacote = await foundry.documents.collections.CompendiumCollection.createCompendium({ type: 'Item', label: 'Migração (teste)', name: 'migracao-teste' });
          await Item.implementation.create(teleAntigo(), { pack: pacote.collection });
          await pacote.configure({ locked: true });
          await game.settings.set('${S}', 'versaoDosDados', 0);
          const teleDe = a => a.items.find(i => i.getFlag('${S}', 'catalogo') === 'core_cyberware:teleoptics');
          const estado = async () => ({
            ator: teleDe(game.actors.get(ator.id)).effects.size, bonus: game.actors.get(ator.id).system.bonus.tiroMirado, audio: game.items.get(audio.id).system.tipo,
            token: teleDe(cena.tokens.get(token.id).actor).effects.size, capanga: game.actors.get(capanga.id).items.size,
            pacote: (await pacote.getDocuments())[0].effects.size, trancado: pacote.locked, versao: versao()
          });
          const antes = await estado();
          // A pergunta: o que muda e os passos. A segunda é outra janela (a primeira pode ainda estar no DOM).
          const pergunta = () => document.querySelector('.application.dialog.migracao:not(.minimizing)');
          const responder = async (escolha, outraQue) => {
            const promessa = api.migrarMundo();
            await esperar(() => pergunta() && pergunta().id !== outraQue);
            const janela = pergunta();
            const itens = [...janela.querySelectorAll('.dialog-content li')].map(li => li.textContent.trim());
            const botoes = [...janela.querySelectorAll('.form-footer button[data-action]')].map(b => b.dataset.action);
            janela.querySelector('button[data-action="' + escolha + '"]').click();
            return { id: janela.id, itens, botoes, resultado: await promessa };
          };
          const depois = await responder('depois');
          const adiado = await estado();
          const migrar = await responder('migrar', depois.id);
          const migrado = await estado();
          mensagem = game.messages.contents.findLast(m => m.getFlag('${S}', 'migracao'));
          const dados = mensagem?.getFlag('${S}', 'migracao');
          const registro = { de: dados?.de, para: dados?.para, mudados: dados?.mudados, soMestres: Boolean(mensagem?.whisper.length) && mensagem.whisper.every(id => game.users.get(id).isGM) };
          // De novo, desde a versão 0: os dados já estão no formato novo, e nada muda (sem perguntar).
          await esperar(() => !pergunta());
          const deNovo = await api.migrarMundo({ desde: 0 });
          const semPergunta = !pergunta();
          // Dados de uma versão mais nova que a do sistema: só o aviso.
          ui.notifications.warn = texto => { avisos.push(String(texto)); return {}; };
          await game.settings.set('${S}', 'versaoDosDados', api.VERSAO_DOS_DADOS + 5);
          await api.conferirMigracao();
          const maisNova = { avisos: avisos.slice(), versao: versao() };
          return { novo, antes, depois: { itens: depois.itens, botoes: depois.botoes, resultado: depois.resultado }, adiado, migrar: { itens: migrar.itens, resultado: migrar.resultado }, migrado, registro, deNovo, semPergunta, maisNova };
        } finally {
          delete ui.notifications.warn;
          await game.settings.set('${S}', 'versaoDosDados', api.VERSAO_DOS_DADOS);
          if (pacote) { await pacote.configure({ locked: false }); await pacote.deleteCompendium(); }
          for (const documento of [cena, ator, capanga, audio, mensagem]) if (documento) await documento.delete();
        }
      })()`);
      const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const { novo, antes, adiado, migrado, registro, deNovo, maisNova } = info;
      const lista = info.depois.itens.join(' | ');
      const esperadoAntes = { ator: 1, bonus: 1, audio: 'fashionware', token: 1, capanga: 0, pacote: 1, trancado: true, versao: 0 };
      const esperadoDepois = { ator: 0, bonus: 0, audio: 'cyberAudioSuite', token: 0, capanga: 0, pacote: 0, trancado: true, versao: novo.atual };
      return [novo.gravada && !novo.pergunta && igual(antes, esperadoAntes) && igual(adiado, esperadoAntes) && info.depois.resultado.adiado === true && igual(info.depois.botoes, ['migrar', 'depois'])
        && ['1 item do mundo', '1 ator do mundo', 'até 1 token não ligado', '1 documento do compêndio Migração (teste)', 'TeleOptics', 'Fashionware'].every(t => lista.includes(t))
        && info.migrar.resultado.mudados === 4 && igual(migrado, esperadoDepois)
        && registro.de === 0 && registro.para === novo.atual && registro.mudados?.length === 4 && registro.soMestres
        && deNovo.mudados === 0 && !deNovo.adiado && info.semPergunta && maisNova.avisos.length === 1 && maisNova.avisos[0].includes('mais nova') && maisNova.versao === novo.atual + 5,
        JSON.stringify(info)];
    });

    await r.passo('personagem novo: HP 10 + 5 × (BODY + WILL) / 2, Humanidade EMP × 10, token ligado à ficha', async () => {
      const info = await edge.evaluate(`(async () => {
        const a = await Actor.implementation.create({ name: 'Atiradora', type: 'personagem', system: { atributos: { body: { valor: 6 }, will: { valor: 7 }, emp: { valor: 5 }, ref: { valor: 8 }, dex: { valor: 7 }, luck: { valor: 6 } }, hp: { value: 45 }, humanidade: { value: 50 }, pericias: { handgun: { nivel: 4 }, 'shoulder-arms': { nivel: 4 }, evasion: { nivel: 2 } } } });
        return { hp: a.system.hp.max, hum: a.system.humanidade.max, sorte: a.system.sorte.max, emp: a.system.empAtual, ligado: a.prototypeToken.actorLink, barra: a.prototypeToken.bar1.attribute, estado: a.system.ferimento.chave, ini: a.system.iniciativa };
      })()`);
      return [info.hp === 45 && info.hum === 50 && info.sorte === 6 && info.emp === 5 && info.ligado && info.barra === 'hp' && info.estado === 'ileso' && info.ini === 8, JSON.stringify(info)];
    });

    await r.passo('mortalmente ferido: −6 MOVE (mínimo 1); volta quando o HP sobe', async () => {
      const info = await edge.evaluate(`(async () => {
        const a = await Actor.implementation.create({ name: 'Ferido', type: 'personagem', system: { atributos: { move: { valor: 8 } }, hp: { value: 0 } } });
        const mortal = a.system.atributos.move.valor;
        await a.update({ 'system.hp.value': 30 });
        const vivo = a.system.atributos.move.valor;
        await a.delete();
        return { mortal, vivo };
      })()`);
      return [info.mortal === 2 && info.vivo === 8, JSON.stringify(info)];
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

    await r.passo('ficha: abre no tema escuro, com as fontes do modelo, as 7 abas, os 10 atributos e só as perícias com nível (o botão mostra todas); rola pelo atributo', async () => {
      await edge.evaluate(`game.actors.getName('Atiradora').sheet.render({ force: true })`);
      const olhar = () => edge.evaluate(`(() => { const f = document.querySelector('.cpr-fieldbook.ficha-personagem'); return f && {
        abas: f.querySelectorAll('nav.tabs [data-tab]').length, atributos: f.querySelectorAll('.atributo').length, pericias: f.querySelectorAll('.pericia').length,
        hp: f.querySelector('.indicador.hp .valor')?.textContent.trim(), escuro: f.classList.contains('themed') && f.classList.contains('theme-dark'),
        botao: f.querySelector('[data-action="alternarPericias"]')?.textContent.trim() }; })()`);
      let ficha = null;
      for (let i = 0; i < 30 && !ficha; i++) { await edge.sleep(200); ficha = await olhar(); }
      const fontes = await edge.evaluate(`document.fonts.ready.then(async () => { await Promise.all([document.fonts.load('500 16px Rajdhani'), document.fonts.load('700 16px Rajdhani'), document.fonts.load('16px "Share Tech Mono"')]); return document.fonts.check('700 16px Rajdhani') && document.fonts.check('16px "Share Tech Mono"') && [...document.fonts].filter(f => /Rajdhani|Share Tech Mono/.test(f.family) && f.status === 'loaded').length; })`);
      await edge.evaluate(`document.querySelector('.cpr-fieldbook.ficha-personagem [data-action="alternarPericias"]').click()`);
      let todas = null;
      for (let i = 0; i < 30 && !(todas?.pericias > ficha?.pericias); i++) { await edge.sleep(200); todas = await olhar(); }
      const antes = await edge.evaluate('game.messages.size');
      // Ctrl + clique: rola direto, sem a janela de rolagem (o passo da janela confere o clique comum).
      await edge.evaluate(`document.querySelector('.cpr-fieldbook.ficha-personagem .atributo[data-atributo="ref"] .rolar').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))`);
      await edge.sleep(800);
      const depois = await edge.evaluate('game.messages.size');
      await edge.shot('ficha');
      return [ficha && ficha.abas === 7 && ficha.atributos === 10 && ficha.pericias === 3 && ficha.escuro && ficha.hp === '/45' && ficha.botao === 'VER TODAS' && fontes === 3
        && todas?.pericias >= 61 && todas.botao === 'SÓ COM NÍVEL' && depois === antes + 1, `${JSON.stringify({ ficha, todas, fontes })} · mensagens ${antes} → ${depois}`];
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

    await r.passo('ficha do item: mudar o preço de um cyberware não troca o tipo dele (o do catálogo e um que a lista não conhece)', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const editarPreco = async (tipo = null) => {
          const dados = foundry.utils.deepClone(cat['core_cyberware:cyberaudio-suite']);
          if (tipo) dados.system.tipo = tipo;
          const [item] = await Item.implementation.create([dados]);
          await item.sheet.render({ force: true });
          for (let i = 0; i < 50 && !item.sheet.element?.querySelector('input[name="system.preco"]'); i++) await new Promise(r => setTimeout(r, 100));
          const opcao = item.sheet.element.querySelector('select[name="system.tipo"]').value;
          const campo = item.sheet.element.querySelector('input[name="system.preco"]');
          campo.value = 123;
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          for (let i = 0; i < 50 && item.system.preco !== 123; i++) await new Promise(r => setTimeout(r, 100));
          const resultado = { opcao, tipo: item.system.tipo, preco: item.system.preco };
          await item.sheet.close();
          await item.delete();
          return resultado;
        };
        return { catalogo: await editarPreco(), desconhecido: await editarPreco('tipoDeOutroConteudo') };
      })()`);
      const { catalogo: c, desconhecido: d } = info;
      return [c.preco === 123 && c.opcao === 'cyberAudioSuite' && c.tipo === 'cyberAudioSuite' && d.preco === 123 && d.opcao === 'tipoDeOutroConteudo' && d.tipo === 'tipoDeOutroConteudo',
        JSON.stringify(info)];
    });

    await r.passo('ficha do item no jeito da maquete "Item Sheets" do usuário: o tipo na cor dele, o resumo e as etiquetas no alto; as abas Detalhes, Descrição e Efeitos, trocadas pelo clique; os campos em células; o uso em três botões, que gravam', async () => {
      const arma = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const esperar = async (condicao, vezes = 50) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
        const criados = await Item.implementation.create([foundry.utils.deepClone(cat['core_weapons:heavy-pistol']), foundry.utils.deepClone(cat['core_gear:cyberdeck'])]);
        window.__itensDaFicha = { arma: criados.find(i => i.type === 'arma'), deck: criados.find(i => i.type === 'cyberdeck') };
        const item = window.__itensDaFicha.arma;
        await item.sheet.render({ force: true });
        await esperar(() => item.sheet.element?.querySelector('.ficha-de-item .tab.detalhes label.celula'));
        const f = () => item.sheet.element;
        const lido = {
          tipo: textoDe(f().querySelector('.linha-tipo .tipo')), rotulo: game.i18n.localize(CONFIG.Item.typeLabels.arma), resumo: textoDe(f().querySelector('.resumo')),
          etiquetas: [...f().querySelectorAll('.etiqueta')].map(textoDe), abas: [...f().querySelectorAll('.abas-do-item a')].map(a => a.dataset.tab + (a.classList.contains('active') ? '*' : '')).join(),
          celulas: f().querySelectorAll('.tab.detalhes label.celula').length, cor: getComputedStyle(f().querySelector('.ficha-de-item')).getPropertyValue('--cor-tipo').trim()
        };
        // A troca de aba pelo clique: a Descrição aparece e os Detalhes somem; de volta, para a captura.
        f().querySelector('.abas-do-item a[data-tab="descricao"]').click();
        await esperar(() => f().querySelector('.tab.descricao.active'));
        lido.depois = [...f().querySelectorAll('section.tab')].map(s => s.dataset.tab + (s.classList.contains('active') ? '*' : '')).join();
        lido.detalhesSomem = getComputedStyle(f().querySelector('.tab.detalhes')).display;
        f().querySelector('.abas-do-item a[data-tab="detalhes"]').click();
        await esperar(() => f().querySelector('.tab.detalhes.active'));
        return lido;
      })()`);
      await edge.shot('ficha-item-arma');
      const deck = await edge.evaluate(`(async () => {
        const esperar = async (condicao, vezes = 50) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const { arma, deck: item } = window.__itensDaFicha;
        await arma.sheet.close();
        await item.sheet.render({ force: true });
        await esperar(() => item.sheet.element?.querySelector('.ficha-de-item .uso .segmento'));
        const f = () => item.sheet.element;
        const antes = item.system.uso;
        const outro = [...f().querySelectorAll('.uso .segmento input')].find(input => input.value !== antes);
        outro.closest('label').click();
        await esperar(() => item.system.uso === outro.value && f()?.querySelector('.uso .segmento.ativo input')?.value === outro.value);
        return { antes, escolhido: outro.value, depois: item.system.uso, ativo: f().querySelector('.uso .segmento.ativo input')?.value, segmentos: f().querySelectorAll('.uso .segmento').length,
          cor: getComputedStyle(f().querySelector('.ficha-de-item')).getPropertyValue('--cor-tipo').trim() };
      })()`);
      await edge.shot('ficha-item-cyberdeck');
      await edge.evaluate(`(async () => { const { arma, deck } = window.__itensDaFicha; await deck.sheet.close(); await Item.deleteDocuments([arma.id, deck.id]); delete window.__itensDaFicha; return true; })()`);
      const ok = arma.tipo === arma.rotulo && arma.tipo !== '' && arma.resumo === 'Armas de uma Mão // à distância' && arma.etiquetas.join() === 'Padrão'
        && arma.abas === 'detalhes*,descricao,efeitos' && arma.celulas >= 8 && /ff2a4a/i.test(arma.cor)
        && arma.depois === 'detalhes,descricao*,efeitos' && arma.detalhesSomem === 'none'
        && deck.segmentos === 3 && deck.escolhido !== deck.antes && deck.depois === deck.escolhido && deck.ativo === deck.escolhido && /02d7f2/i.test(deck.cor);
      return [ok, JSON.stringify({ arma, deck })];
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
        return { antes, depois: { ini: a.system.iniciativa, efeitoAtivo: ker.effects.contents[0]?.active, hum: a.system.humanidade.value, humMax: a.system.humanidade.max, emp: a.system.empAtual, sp: a.system.armadura.corpo.sp }, itens: a.items.size, tamanhoCatalogo: Object.keys(cat).length };
      })()`);
      return [info.antes.ini === 8 && info.antes.efeitoAtivo === false && info.depois.ini === 10 && info.depois.efeitoAtivo === true && info.depois.hum === 36 && info.depois.humMax === 48 && info.depois.emp === 3 && info.depois.sp === 11 && info.itens === 4,
        JSON.stringify(info)];
    });

    await r.passo('desinstalar cyberware: a Humanidade perdida não volta (só a terapia devolve); o máximo sobe 2 e o efeito para', async () => {
      const info = await edge.evaluate(`(async () => {
        const a = game.actors.getName('Atiradora');
        const ker = a.items.getName('Kerenzikov');
        await a.desinstalarCyberware(ker);
        const fora = { hum: a.system.humanidade.value, humMax: a.system.humanidade.max, ini: a.system.iniciativa, efeitoAtivo: ker.effects.contents[0]?.active };
        // Os passos seguintes contam com o Kerenzikov instalado e a Humanidade 36: devolve o estado de antes.
        await a.instalarCyberware(ker, { rolar: false });
        await a.update({ 'system.humanidade.value': 36 });
        return { fora, volta: { hum: a.system.humanidade.value, humMax: a.system.humanidade.max, ini: a.system.iniciativa } };
      })()`);
      return [info.fora.hum === 36 && info.fora.humMax === 50 && info.fora.ini === 8 && info.fora.efeitoAtivo === false && info.volta.hum === 36 && info.volta.humMax === 48 && info.volta.ini === 10,
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

    await r.passo('Sorte e o visual do chat: os pontos preparados pela ficha (− e +, até a Sorte que resta) entram no teste de perícia, +1 cada, e saem da Sorte (o cabeçalho mostra a Sorte usada na sessão); o ↺ do começo da sessão volta ao máximo (e a usada, a 0); o teste e o dano saem no visual do tema (os dados em caixas com o total grande, no lugar do bloco do Foundry; o tipo na linha de cima, pelo CSS; a faixa amarela do teste e a vermelha do dano)', async () => {
      // Armas de uma Mão com +2 de Sorte: d10 5 → REF 8 + 4 + 2 + 5 = 19. Dano do rifle: 5d6, 3 em cada = 15.
      await fixar(edge, [[5, 10], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]);
      const info = await edge.evaluate(`(async () => {
        const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const a = game.actors.getName('Atiradora');
        const sorteAntes = a.system.sorte.value;
        await a.sheet.render({ force: true });
        await esperar(() => a.sheet.element?.querySelector('.indicador.sorte [data-delta="1"]'));
        const f = () => a.sheet.element;
        const clicar = async (seletor, mudou) => { f().querySelector(seletor).click(); await esperar(mudou); };
        const preparada = () => f()?.querySelector('.indicador.sorte .sorte-acoes b')?.textContent.trim();
        // + + − +: 2 pontos preparados, e a ficha mostra.
        for (const [delta, esperado] of [[1, 1], [1, 2], [-1, 1], [1, 2]]) await clicar('.indicador.sorte [data-delta="' + delta + '"]', () => a.sortePreparada === esperado && preparada() === '+' + esperado);
        // A Sorte usada na sessão, no cabeçalho (as maquetes): o máximo menos a que resta.
        const usada = () => f()?.querySelector('.indicador.sorte .usada')?.textContent.trim();
        const naFicha = { preparada: preparada(), destaque: f().querySelector('.indicador.sorte').classList.contains('preparada'), usada: usada() };
        // Mais do que resta não dá: fica no que resta.
        await a.prepararSorte(99);
        const teto = a.sortePreparada;
        await a.prepararSorte(2);
        // O teste de perícia, pelo nome na ficha, direto (Ctrl + clique): a Sorte preparada entra sozinha.
        const antes = game.messages.size;
        f().querySelector('.tab.pericias .pericia[data-pericia="handgun"] .nome').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await esperar(() => game.messages.size > antes && a.sortePreparada === 0);
        const teste = game.messages.contents.at(-1);
        const partes = [...new DOMParser().parseFromString(teste.content, 'text/html').querySelectorAll('.partes li')].map(li => li.textContent.trim());
        await esperar(() => usada() === 'USADA ' + (a.system.sorte.max - a.system.sorte.value));
        const depois = { sorte: a.system.sorte.value, preparada: a.sortePreparada, total: teste.rolls[0].total, formula: teste.rolls[0].formula, partes, usada: usada(),
          gasta: f().querySelector('.indicador.sorte .usada').classList.contains('gasta') };
        // O dano do rifle, pelo botão da aba Combate.
        const rifle = a.items.getName('Assault Rifle');
        const antesDoDano = game.messages.size;
        f().querySelector('.tab.combate tr[data-item-id="' + rifle.id + '"] [data-action="rolarDano"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await esperar(() => game.messages.size > antesDoDano);
        const dano = game.messages.contents.at(-1);
        // O visual do tema na mensagem inteira (no chat e na notificação, onde houver).
        await esperar(() => document.querySelector('.chat-message[data-message-id="' + dano.id + '"]'));
        const classes = id => [...document.querySelectorAll('.chat-message[data-message-id="' + id + '"]')].map(li => [...li.classList].filter(c => c.startsWith('cprf-')).sort().join(' '));
        // O cartão no visual novo: as caixas dos dados e o total grande (do cartão, não do Foundry), o tipo na linha de
        // cima (desenhado pelo CSS) e a cor da faixa de cima.
        const cartao = id => {
          const li = document.querySelector('#chat .chat-message[data-message-id="' + id + '"]') ?? document.querySelector('.chat-message[data-message-id="' + id + '"]');
          return { dados: [...li.querySelectorAll('.dados-do-cartao .dado')].map(d => d.textContent).join(), total: li.querySelector('.dados-do-cartao .total')?.textContent,
            tipo: getComputedStyle(li.querySelector('.message-sender'), '::before').content, faixa: getComputedStyle(li, '::before').backgroundColor, foundry: Boolean(li.querySelector('.dice-roll')) };
        };
        const visual = { teste: classes(teste.id), dano: classes(dano.id), danoTotal: dano.rolls[0].total, cartaoDoTeste: cartao(teste.id), cartaoDoDano: cartao(dano.id),
          dadosDoTeste: teste.rolls[0].dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result)).join(), dadosDoDano: dano.rolls[0].dice.flatMap(d => d.results.filter(r => r.active).map(r => r.result)).join() };
        // ↺: começo da sessão.
        await a.prepararSorte(1);
        await clicar('.indicador.sorte [data-action="recarregarSorte"]', () => a.system.sorte.value === a.system.sorte.max && a.sortePreparada === 0);
        await esperar(() => usada() === 'USADA 0');
        const recarregada = { sorte: a.system.sorte.value, max: a.system.sorte.max, preparada: a.sortePreparada, usada: usada(), gasta: f().querySelector('.indicador.sorte .usada').classList.contains('gasta') };
        await a.update({ 'system.sorte.value': sorteAntes });
        await a.sheet.close();
        return { sorteAntes, naFicha, teto, depois, visual, recarregada, fila: window.__fila.length };
      })()`);
      // O chat, para a conferência visual.
      await edge.evaluate(`ui.sidebar.changeTab('chat', 'primary')`);
      await edge.sleep(600);
      await edge.shot('chat');
      await edge.evaluate(`ui.sidebar.changeTab('actors', 'primary')`);
      const { naFicha, depois, visual, recarregada } = info;
      const ok = info.sorteAntes === 5 && naFicha.preparada === '+2' && naFicha.destaque && info.teto === 5 && naFicha.usada === 'USADA 1' && depois.usada === 'USADA 3' && depois.gasta
        && recarregada.usada === 'USADA 0' && !recarregada.gasta
        && depois.total === 19 && depois.formula === '1d10crit + 8 + 4 + 2' && depois.partes.includes('Sorte +2') && depois.sorte === 3 && depois.preparada === 0
        && visual.teste.length > 0 && visual.teste.every(c => c === 'cprf-mensagem cprf-teste') && visual.dano.length > 0 && visual.dano.every(c => c === 'cprf-dano cprf-mensagem') && visual.danoTotal === 15
        && visual.cartaoDoTeste.dados === visual.dadosDoTeste && visual.cartaoDoTeste.total === '19' && /TESTE/.test(visual.cartaoDoTeste.tipo) && visual.cartaoDoTeste.faixa === 'rgb(252, 238, 9)' && !visual.cartaoDoTeste.foundry
        && visual.cartaoDoDano.dados === visual.dadosDoDano && visual.cartaoDoDano.total === '15' && /DANO/.test(visual.cartaoDoDano.tipo) && visual.cartaoDoDano.faixa === 'rgb(255, 42, 74)' && !visual.cartaoDoDano.foundry
        && recarregada.sorte === 6 && recarregada.max === 6 && recarregada.preparada === 0 && info.fila === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('janela de rolagem (como a do CORE): o clique na perícia abre a janela com as partes, os situacionais (do cyberware e das lesões; o Olho danificado vem ligado), os 12 modificadores comuns da wiki, o modificador do mestre e a Sorte, com o total ao vivo; o que se marca entra no teste e a Sorte sai; cancelar não rola; Ctrl + clique rola direto, com os ligados por padrão; no atributo, só os de todas as ações; "Rolar direto" inverte', async () => {
      await fixar(edge, [[5, 10], [6, 10], [7, 10], [8, 10]]);
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const cat = await game.system.api.wiki.carregarCatalogo();
          const pegar = id => foundry.utils.deepClone(cat[id]);
          const a = await Actor.implementation.create({ name: 'Teste Janela', type: 'personagem', system: { atributos: { int: { valor: 6 } }, sorte: { value: 3 }, pericias: { perception: { nivel: 4 } }, role: { nome: 'Lawman', rank: 4 } } });
          const ouvido = pegar('core_cyberware:amplified-hearing');
          ouvido.system.instalado = true;
          await a.createEmbeddedDocuments('Item', [ouvido, pegar('core_critical-injuries-head:damaged-eye'), pegar('core_critical-injuries-body:crushed-fingers')]);
          await a.prepararSorte(1);
          await a.sheet.render({ force: true });
          await esperar(() => a.sheet.element?.querySelector('.tab.pericias .pericia[data-pericia="perception"] .nome'));
          const f = () => a.sheet.element;
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el.textContent.replace(/\\s+/g, ' ').trim();
          const ler = j => ({
            titulo: textoDe(j.querySelector('.window-title')), partes: [...j.querySelectorAll('.partes li')].map(textoDe),
            situacionais: [...j.querySelectorAll('[name="situacional"]')].map(c => textoDe(c.closest('label')) + (c.checked ? ' [x]' : ' [ ]')).sort(),
            comuns: j.querySelectorAll('[name="comum"]').length, sorte: j.querySelector('[name="sorte"]').value, total: textoDe(j.querySelector('.total-sem-dado'))
          });
          const caixa = (j, nome, texto) => [...j.querySelectorAll('[name="' + nome + '"]')].find(c => c.closest('label').textContent.includes(texto));
          const marcar = (c, sim) => { c.checked = sim; c.dispatchEvent(new Event('change', { bubbles: true })); };
          const partesDa = m => [...new DOMParser().parseFromString(m.content, 'text/html').querySelectorAll('.partes li')].map(textoDe);
          const pericia = () => f().querySelector('.tab.pericias .pericia[data-pericia="perception"] .nome');
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));

          // 1. O clique abre a janela; marca, soma e rola.
          pericia().click();
          await esperar(() => janela()?.querySelector('.total-sem-dado'));
          let j = janela();
          const aberta = ler(j);
          marcar(caixa(j, 'situacional', 'pela audição'), true);
          marcar(caixa(j, 'situacional', 'pela visão'), false);
          marcar(caixa(j, 'comum', 'Iluminação noturna'), true);
          const outro = j.querySelector('[name="outro"]');
          outro.value = 2;
          outro.dispatchEvent(new Event('input', { bubbles: true }));
          // A Sorte da janela (2) no lugar da preparada (1).
          const sorte = j.querySelector('[name="sorte"]');
          sorte.value = 2;
          sorte.dispatchEvent(new Event('input', { bubbles: true }));
          const totalMarcado = textoDe(j.querySelector('.total-sem-dado'));
          let antes = game.messages.size;
          j.querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          const marcado = { partes: partesDa(m), total: m.rolls[0].total, sorte: a.system.sorte.value, preparada: a.sortePreparada };

          // 2. Cancelar não rola.
          pericia().click();
          await esperar(() => janela()?.querySelector('button[data-action="cancelar"]'));
          antes = game.messages.size;
          janela().querySelector('button[data-action="cancelar"]').click();
          await esperar(() => !janela());
          await new Promise(r => setTimeout(r, 300));
          const cancelou = game.messages.size === antes;

          // 3. Ctrl + clique: direto, com o Olho danificado (ligado por padrão) e sem Sorte (a preparada já saiu).
          antes = game.messages.size;
          ctrl(pericia());
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const direto = { partes: partesDa(m), total: m.rolls[0].total, janela: Boolean(janela()) };

          // 4. No atributo, a janela só traz os situacionais de todas as ações.
          f().querySelector('.atributo[data-atributo="int"] .rolar').click();
          await esperar(() => janela()?.querySelector('.total-sem-dado'));
          j = janela();
          const atributo = ler(j);
          antes = game.messages.size;
          j.querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          const atributoTotal = game.messages.contents.at(-1).rolls[0].total;

          // 5. "Rolar direto" (deste navegador) inverte: o clique rola, e Ctrl + clique abre a janela.
          await game.settings.set('${S}', 'rolarDireto', true);
          antes = game.messages.size;
          pericia().click();
          await esperar(() => game.messages.size > antes);
          const invertido = { rolou: game.messages.size === antes + 1, janela: Boolean(janela()) };
          ctrl(pericia());
          await esperar(() => janela()?.querySelector('button[data-action="cancelar"]'));
          invertido.abriu = Boolean(janela());
          return { aberta, totalMarcado, marcado, cancelou, direto, atributo, atributoTotal, invertido };
        })()`);
        // A janela aberta (a do passo 5), para a conferência visual.
        await edge.sleep(400);
        await edge.shot('janela-rolagem');
        const { aberta, marcado, direto, atributo, invertido } = info;
        const tem = (lista, ...itens) => itens.every(item => lista.includes(item));
        const ok = aberta.titulo === 'Teste: Percepção' && aberta.partes.join() === 'INT +6,Percepção +4,1d10'
          && aberta.situacionais.join(' / ') === ['Amplified Hearing: Percepção pela audição +2 [ ]', 'Dedos esmagados: Todas as ações com as mãos −4 [ ]', 'Olho danificado: Percepção pela visão −2 [x]'].join(' / ')
          && aberta.comuns === 12 && aberta.sorte === '1' && aberta.total === '9' && info.totalMarcado === '15'
          && tem(marcado.partes, 'INT +6', 'Percepção +4', 'Amplified Hearing: Percepção pela audição +2', 'Iluminação noturna ou fraca -1', 'Modificador do mestre +2', 'Sorte +2')
          && !marcado.partes.some(parte => parte.includes('pela visão') || parte.startsWith('Investigator')) && marcado.total === 20 && marcado.sorte === 1 && marcado.preparada === 0
          && info.cancelou && !direto.janela && tem(direto.partes, 'Olho danificado: Percepção pela visão -2') && !direto.partes.some(parte => parte.startsWith('Sorte')) && direto.total === 14
          && atributo.titulo === 'Teste: INT' && atributo.partes.join() === 'INT +6,1d10' && atributo.situacionais.join() === 'Dedos esmagados: Todas as ações com as mãos −4 [ ]' && info.atributoTotal === 13
          && invertido.rolou && !invertido.janela && invertido.abriu;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          await game.settings.set('${S}', 'rolarDireto', false);
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-rolagem')) await app.close();
          for (const a of game.actors.filter(a => a.name === 'Teste Janela')) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('extrato (o ledger do CORE): o botão de Eurodólares no cabeçalho abre o extrato; somar 100, subtrair 30 e definir 50, cada um com o motivo e quem mudou; sem quantia não muda; perder mais do que tem fica negativo, com o aviso; uma mudança por fora entra como "mudança direta"; o mestre tira uma linha e escolhe, como no CORE, se a mudança também é desfeita; a aba Equipamento mostra as últimas; o IP tem o seu', async () => {
      const ID = `'${S}-extrato-' + a.id + '-'`;
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const a = game.actors.getName('Atiradora');
          const inicio = { dinheiro: a.system.dinheiro, ip: a.system.pontosDeMelhoria, linhas: a.system.extratos.dinheiro.length };
          await a.sheet.render({ force: true });
          await esperar(() => a.sheet.element?.querySelector('.indicador.com-extrato[data-campo="dinheiro"]'));
          const f = () => a.sheet.element;
          const cabecalho = [...f().querySelectorAll('.indicador.com-extrato')].map(b => b.dataset.campo + ' ' + b.querySelector('b').textContent.trim() + ' ' + b.querySelector('i').textContent.trim());
          // O botão de Eurodólares abre a janela.
          f().querySelector('.indicador.com-extrato[data-campo="dinheiro"]').click();
          const janela = campo => foundry.applications.instances.get(${ID} + campo);
          await esperar(() => janela('dinheiro')?.rendered);
          const j = () => janela('dinheiro').element;
          const linhas = () => [...j().querySelectorAll('.historico li.linha')];
          const saldoNaJanela = el => el.querySelector('.saldo b').firstChild.textContent.trim();
          const avisos = [];
          ui.notifications.warn = m => { avisos.push(String(m)); };
          // Cada mudança redesenha a janela uma vez: espera a linha nova e o saldo novo nela antes da próxima.
          const mudar = async (acao, quantia, motivo, saldo, nAvisos = avisos.length) => {
            const n = linhas().length;
            j().querySelector('[name="quantia"]').value = quantia;
            j().querySelector('[name="motivo"]').value = motivo;
            j().querySelector('[data-action="' + acao + '"]').click();
            await esperar(() => a.system.dinheiro === saldo && linhas().length === n + 1 && saldoNaJanela(j()) === String(saldo) && avisos.length === nAvisos);
          };
          try {
            await mudar('somar', 100, 'Pagamento do fixer', inicio.dinheiro + 100);
            await mudar('subtrair', 30, 'Munição', inicio.dinheiro + 70);
            await mudar('definir', 50, 'Acerto de contas', 50);
            // Sem quantia: só o aviso.
            j().querySelector('[name="quantia"]').value = '';
            j().querySelector('[data-action="somar"]').click();
            await esperar(() => avisos.length === 1);
            await mudar('subtrair', 80, 'Conserto', -30, 2);
          } finally { delete ui.notifications.warn; }
          const ler = li => ['mudanca', 'saldo-linha', 'motivo', 'usuario'].map(c => li.querySelector('.' + c).textContent.trim()).join(' | ');
          const naJanela = { saldo: j().querySelector('.saldo b').textContent.replace(/\\s+/g, ' ').trim(), negativo: j().querySelector('.saldo b').classList.contains('negativo'), historico: linhas().map(ler), campos: [j().querySelector('[name="quantia"]').value, j().querySelector('[name="motivo"]').value] };
          // Uma mudança por fora (uma macro, outro módulo): entra no extrato como "mudança direta", com quem mudou.
          await a.update({ 'system.dinheiro': 200 });
          await esperar(() => linhas().length === inicio.linhas + 5 && saldoNaJanela(j()) === '200');
          const direta = { linha: a.system.extratos.dinheiro.at(-1), naJanela: ler(linhas()[0]) };
          // O mestre tira linhas, e a janela pergunta, como a do CORE, se a mudança também é desfeita.
          const pergunta = () => document.querySelector('.application.dialog.extrato-apagar:not(.minimizing)');
          const tirar = async (motivo, escolha, saldo) => {
            const n = linhas().length;
            linhas().find(li => li.querySelector('.motivo').textContent.trim() === motivo).querySelector('[data-action="apagar"]').click();
            await esperar(() => pergunta()?.querySelector('button[data-action="' + escolha + '"]'));
            const texto = [...pergunta().querySelectorAll('.dialog-content p')].map(p => p.textContent.trim()).join(' ');
            const botoes = [...pergunta().querySelectorAll('.form-footer button[data-action]')].map(b => b.dataset.action).join();
            pergunta().querySelector('button[data-action="' + escolha + '"]').click();
            await esperar(() => linhas().length === n - 1 && saldoNaJanela(j()) === saldo);
            return { texto, botoes };
          };
          // A da munição, só tirada: o saldo fica em 200.
          const perguntaMunicao = await tirar('Munição', 'tirar', '200');
          const apagada = { dinheiro: a.system.dinheiro, motivos: a.system.extratos.dinheiro.map(l => l.motivo), lixeiras: j().querySelectorAll('.historico [data-action="apagar"]').length, pergunta: perguntaMunicao };
          // A do pagamento, desfeita: o saldo volta os 100.
          const perguntaPagamento = await tirar('Pagamento do fixer', 'desfazer', '100');
          const desfeita = { dinheiro: a.system.dinheiro, motivos: a.system.extratos.dinheiro.map(l => l.motivo), pergunta: perguntaPagamento };
          // A ficha: o cabeçalho com o saldo novo e a aba Equipamento com as últimas mudanças.
          await esperar(() => f()?.querySelector('.indicador.com-extrato[data-campo="dinheiro"] b')?.textContent.trim() === '100');
          const naFicha = {
            cabecalho: f().querySelector('.indicador.com-extrato[data-campo="dinheiro"] b').textContent.trim(),
            painel: [...f().querySelectorAll('.tab.equipamento .extrato-recente li:not(.vazio)')].map(li => li.querySelector('.mudanca').textContent.trim() + ' ' + li.className)
          };
          // O IP tem o extrato dele, aberto pelo botão IP do cabeçalho.
          f().querySelector('.indicador.com-extrato[data-campo="pontosDeMelhoria"]').click();
          await esperar(() => janela('pontosDeMelhoria')?.rendered);
          const ji = janela('pontosDeMelhoria').element;
          ji.querySelector('[name="quantia"]').value = 5;
          ji.querySelector('[name="motivo"]').value = 'Sessão 3';
          ji.querySelector('[data-action="somar"]').click();
          await esperar(() => a.system.pontosDeMelhoria === inicio.ip + 5 && ji.querySelectorAll('.historico li.linha').length === 1 && saldoNaJanela(ji) === '5');
          const ip = { valor: a.system.pontosDeMelhoria, titulo: ji.querySelector('.window-title')?.textContent.trim(), linha: ji.querySelector('.historico li.linha .mudanca').textContent.trim(), dinheiro: a.system.extratos.dinheiro.length };
          await janela('pontosDeMelhoria').close();
          return { inicio, cabecalho, avisos, naJanela, direta, apagada, desfeita, naFicha, ip };
        })()`);
        // A janela do extrato, para a conferência visual.
        await edge.sleep(500);
        await edge.shot('extrato');
        const { inicio, naJanela, direta, apagada, desfeita, naFicha, ip } = info;
        const usuario = 'Gamemaster';
        const ok = inicio.dinheiro === 0 && inicio.linhas === 0 && info.cabecalho.join() === 'dinheiro 0 EURODÓLARES,pontosDeMelhoria 0 IP,reputacao 0 REPUTAÇÃO'
          && naJanela.historico.join(' / ') === [`−80 eb | -30 | Conserto | ${usuario}`, `= 50 (−20) | 50 | Acerto de contas | ${usuario}`, `−30 eb | 70 | Munição | ${usuario}`, `+100 eb | 100 | Pagamento do fixer | ${usuario}`].join(' / ')
          && naJanela.saldo === '-30 eb' && naJanela.negativo && naJanela.campos.join() === ','
          && info.avisos.length === 2 && /quantia/.test(info.avisos[0]) && /saiu mais do que tinha/.test(info.avisos[1])
          && direta.linha.acao === 'definir' && direta.linha.delta === 230 && direta.linha.saldo === 200 && direta.linha.motivo === '' && direta.linha.usuario === usuario && /^\d{4}-\d\d-\d\dT/.test(direta.linha.quando)
          && direta.naJanela === `= 200 (+230) | 200 | mudança direta | ${usuario}`
          && apagada.dinheiro === 200 && apagada.motivos.join() === 'Pagamento do fixer,Acerto de contas,Conserto,' && apagada.lixeiras === 4
          && apagada.pergunta.texto === 'Tirar do histórico a linha −30 eb, Munição. A mudança também é desfeita? O saldo vai de 200 para 230.' && apagada.pergunta.botoes === 'desfazer,tirar,cancelar'
          && desfeita.dinheiro === 100 && desfeita.motivos.join() === 'Acerto de contas,Conserto,' && /O saldo vai de 200 para 100\./.test(desfeita.pergunta.texto)
          && naFicha.cabecalho === '100' && naFicha.painel.join() === '= 200 eb entrou,−80 eb saiu,= 50 eb saiu'
          && ip.valor === 5 && ip.titulo === 'Pontos de Melhoria: Atiradora' && ip.linha === '+5 IP' && ip.dinheiro === 3;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          const a = game.actors.getName('Atiradora');
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes.includes('extrato-apagar')) await app.close();
          for (const campo of ['dinheiro', 'pontosDeMelhoria', 'reputacao']) await foundry.applications.instances.get(${ID} + campo)?.close();
          await a.update({ 'system.dinheiro': 0, 'system.pontosDeMelhoria': 0, 'system.extratos': { dinheiro: [], pontosDeMelhoria: [], reputacao: [] } }, { cprfExtrato: true });
          await a.sheet.close();
          return true;
        })()`);
      }
    });

    await r.passo('inventário: o Agent vale carregando (+2 em Pesquisa em Biblioteca) e não guardado; o Medscanner, só equipado; o Boost liga pela ficha do item (+2 INT); a ficha lista e troca o uso, e muda a quantidade com − e + (sem passar de 0 e sem erro no 0); o "Usar" do equipamento ligado à mão liga e desliga o efeito (na linha e na ficha do item)', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const esperar = async condicao => { for (let i = 0; i < 50 && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const ids = ['core_gear:agent', 'core_gear:medscanner', 'core_drugs:boost', 'core_clothing:high-fashion-footwear'];
        const a = await Actor.implementation.create({ name: 'Mochileiro', type: 'personagem', items: ids.map(id => foundry.utils.deepClone(cat[id])) });
        const bonus = id => a.system.pericia(id).bonus;
        const [agent, med, boost] = ['Agent', 'Medscanner', 'Boost'].map(nome => a.items.getName(nome));
        const passos = [{ biblioteca: bonus('library-search'), primeirosSocorros: bonus('first-aid'), int: a.system.atributos.int.valor }];
        await agent.update({ 'system.uso': 'guardado' });
        await med.update({ 'system.uso': 'equipado' });
        passos.push({ biblioteca: bonus('library-search'), primeirosSocorros: bonus('first-aid') });
        // A droga: o botão da ficha do item liga o efeito principal.
        await boost.sheet.render({ force: true });
        await esperar(() => boost.sheet.element?.querySelector('[data-action="alternarEfeito"]'));
        [...boost.sheet.element.querySelectorAll('[data-action="alternarEfeito"]')].find(b => b.closest('li').textContent.includes('Boost Primary')).click();
        await esperar(() => a.system.atributos.int.valor !== 5);
        passos.push({ int: a.system.atributos.int.valor, ligados: boost.effects.filter(e => !e.disabled).map(e => e.name) });
        await boost.sheet.close();
        // A ficha do personagem: as listas do inventário e o botão do uso (guardado → equipado).
        await a.sheet.render({ force: true });
        await esperar(() => a.sheet.element?.querySelector('.tab.equipamento [data-action="mudarUso"]'));
        const linhas = [...a.sheet.element.querySelectorAll('.tab.equipamento li[data-item-id]')].filter(li => li.querySelector('[data-action="mudarUso"]'))
          .map(li => [li.querySelector('.nome').textContent, li.querySelector('.detalhe').textContent, li.querySelector('.quantidade b')?.textContent ?? '-', li.querySelector('[data-action="mudarUso"]').textContent].join(' | '));
        // A quantidade com − e + (as maquetes): o Boost vai de 1 a 2 e volta; no 0, o − não desce mais.
        const doses = () => a.sheet.element.querySelector('li[data-item-id="' + boost.id + '"] .quantidade b')?.textContent;
        const mudar = async (delta, esperado) => { a.sheet.element.querySelector('li[data-item-id="' + boost.id + '"] [data-action="mudarQuantidade"][data-delta="' + delta + '"]').click(); await esperar(() => boost.system.quantidade === esperado && doses() === String(esperado)); return boost.system.quantidade; };
        const quantidade = [await mudar(1, 2), await mudar(-1, 1), await mudar(-1, 0)];
        // O − no 0: fica no 0 e sem erro (o min: 0 do modelo segura; o Foundry 14 corta no mínimo ao limpar os dados).
        const errosNoZero = [];
        const pegar = evento => errosNoZero.push(String(evento.reason?.message ?? evento.reason));
        window.addEventListener('unhandledrejection', pegar);
        try {
          // Aqui o "esperar a quantidade 0" já seria verdade antes de a mudança chegar: o passo espera ela assentar e só
          // então lê o item e a ficha.
          a.sheet.element.querySelector('li[data-item-id="' + boost.id + '"] [data-action="mudarQuantidade"][data-delta="-1"]').click();
          await new Promise(r => setTimeout(r, 800));
          quantidade.push(boost.system.quantidade, Number(doses()));
        } finally { window.removeEventListener('unhandledrejection', pegar); }
        a.sheet.element.querySelector('li[data-item-id="' + agent.id + '"] [data-action="mudarUso"]').click();
        await esperar(() => agent.system.uso === 'equipado');
        passos.push({ uso: agent.system.uso, biblioteca: bonus('library-search') });
        // "Usar" o equipamento ligado à mão (as maquetes): uma lanterna feita à mão, com +1 em Percepção, desligada. O botão
        // da linha liga (e a Percepção sobe); o da ficha do item desliga.
        const [lanterna] = await a.createEmbeddedDocuments('Item', [{ name: 'Lanterna de Teste', type: 'equipamento', system: { ativacao: 'manual', uso: 'carregando' },
          effects: [{ name: 'Lanterna acesa', type: 'base', transfer: true, disabled: true, system: { changes: [{ key: 'system.bonus.pericias.perception', type: 'add', value: '1', phase: 'initial', priority: null }] } }] }]);
        const botaoDaLinha = () => a.sheet.element.querySelector('li[data-item-id="' + lanterna.id + '"] [data-action="usarItem"]');
        await esperar(() => botaoDaLinha());
        const usar = { antes: [bonus('perception'), botaoDaLinha().textContent.trim()].join() };
        botaoDaLinha().click();
        await esperar(() => lanterna.emUso && botaoDaLinha()?.textContent.trim() === 'Em uso');
        usar.ligada = [bonus('perception'), botaoDaLinha().textContent.trim()].join();
        await lanterna.sheet.render({ force: true });
        await esperar(() => lanterna.sheet.element?.querySelector('[data-action="usar"]'));
        const botaoDaFicha = lanterna.sheet.element.querySelector('[data-action="usar"]').textContent.trim();
        lanterna.sheet.element.querySelector('[data-action="usar"]').click();
        await esperar(() => !lanterna.emUso && lanterna.sheet.element?.querySelector('[data-action="usar"]')?.textContent.trim() === 'USAR');
        usar.desligada = [bonus('perception'), botaoDaFicha].join();
        await lanterna.sheet.close();
        // Os outros equipamentos (os do catálogo, sem ativação à mão) não têm o botão.
        usar.semBotao = [agent, med].every(item => !a.sheet.element.querySelector('li[data-item-id="' + item.id + '"] [data-action="usarItem"]'));
        await a.sheet.close();
        await a.delete();
        return { passos, linhas, quantidade, errosNoZero, usar };
      })()`);
      const [p0, p1, p2, p3] = info.passos;
      const linhas = info.linhas.join(' ; ');
      return [p0.biblioteca === 2 && p0.primeirosSocorros === 0 && p0.int === 5 && p1.biblioteca === 0 && p1.primeirosSocorros === 2 && p2.int === 7 && p2.ligados.join() === 'Boost Primary'
        && p3.uso === 'equipado' && p3.biblioteca === 2 && /Agent \|[^;]*\| 1 \| Guardado/.test(linhas) && /Medscanner \|[^;]*Medscanner[^;]*\| 1 \| Equipado/.test(linhas) && /Boost \|  \| 1 \| Carregando/.test(linhas)
        && /High Fashion Footwear \| Calçado · Alta moda \| 1 \| Equipado/.test(linhas) && info.quantidade.join() === '2,1,0,0,0' && info.errosNoZero.length === 0
        && info.usar.antes === '0,Usar' && info.usar.ligada === '1,Em uso' && info.usar.desligada === '0,DESLIGAR' && info.usar.semBotao, JSON.stringify(info)];
    });

    await r.passo('acessórios: o carregador estendido põe o pente do rifle em 35 (a recarga enche 35); o Smartgun Link dá +1, e dois dão +1 só; tirados, volta a 25; o hardware ocupa slots do deck', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const pegar = id => foundry.utils.deepClone(cat[id]);
        const balas = pegar('core_ammo:rifle-basic');
        balas.system.quantidade = 100;
        const ids = ['core_weapons:assault-rifle', 'core_upgrades:extended-magazine-assault-rifle', 'core_upgrades:smartgun-link', 'core_upgrades:smartgun-link', 'core_gear:cyberdeck', 'core_upgrades:backup-drive'];
        const a = await Actor.implementation.create({ name: 'Armeiro', type: 'personagem', system: { pericias: { 'shoulder-arms': { nivel: 4 } } }, items: [...ids.map(pegar), balas] });
        const rifle = a.items.getName('Assault Rifle');
        const deck = a.items.getName('Cyberdeck');
        const acessorios = a.items.filter(i => i.type === 'upgrade' && i.system.alvo === 'arma');
        const partes = () => rifle.partesDoAtaque().partes.map(p => p.rotulo + ' ' + p.valor);
        const antes = { max: rifle.system.pente.max, partes: partes() };
        await a.updateEmbeddedDocuments('Item', [...acessorios.map(i => ({ _id: i.id, 'system.instaladoEm': rifle.id })), { _id: a.items.getName('Backup Drive').id, 'system.instaladoEm': deck.id }]);
        await rifle.recarregar();
        const com = { max: rifle.system.pente.max, pente: rifle.system.pente.value, slots: rifle.slotsUsados, partes: partes(), deck: deck.slotsUsados };
        // As fichas: a linha do rifle com os acessórios e a lista de upgrades; o "Instalado em" na ficha do acessório.
        const esperar = async condicao => { for (let i = 0; i < 50 && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        await a.sheet.render({ force: true });
        await esperar(() => a.sheet.element?.querySelector('.tab.equipamento li[data-item-id="' + rifle.id + '"] .detalhe'));
        com.ficha = {
          rifle: a.sheet.element.querySelector('.tab.equipamento li[data-item-id="' + rifle.id + '"] .detalhe').textContent,
          upgrades: [...a.sheet.element.querySelectorAll('.tab.equipamento li[data-item-id]')].filter(li => / em (Assault Rifle|Cyberdeck)$/.test(li.querySelector('.detalhe')?.textContent ?? '')).length
        };
        await a.sheet.close();
        await acessorios[0].sheet.render({ force: true });
        await esperar(() => acessorios[0].sheet.element?.querySelector('select[name="system.instaladoEm"]'));
        com.ficha.instaladoEm = acessorios[0].sheet.element.querySelector('select[name="system.instaladoEm"]').value === rifle.id;
        await acessorios[0].sheet.close();
        await a.updateEmbeddedDocuments('Item', acessorios.map(i => ({ _id: i.id, 'system.instaladoEm': '' })));
        const sem = { max: rifle.system.pente.max, partes: partes() };
        await a.delete();
        return { antes, com, sem };
      })()`);
      const { antes, com, sem } = info;
      const links = lista => lista.filter(p => p.startsWith('Smartgun Link')).length;
      return [antes.max === 25 && links(antes.partes) === 0 && com.max === 35 && com.pente === 35 && com.slots === 5 && links(com.partes) === 1 && com.partes.includes('Smartgun Link 1')
        && com.deck === 2 && sem.max === 25 && links(sem.partes) === 0
        && /pente 35\/35 · Extended Magazine \(Assault Rifle\), Smartgun Link, Smartgun Link$/.test(com.ficha.rifle) && com.ficha.upgrades === 4 && com.ficha.instaladoEm, JSON.stringify(info)];
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
    // No navegador de quem defende: espera a janela de reação, clica na escolha e devolve o texto da janela.
    const responder = async (navegador, escolha) => {
      for (let i = 0; i < 60; i++) {
        await navegador.sleep(250);
        const texto = await navegador.evaluate(`(() => {
          const janela = document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing)');
          const botao = janela?.querySelector('button.opcao[data-escolha="${escolha}"]');
          if (!botao) return null;
          const texto = janela.textContent.replace(/\\s+/g, ' ').trim();
          botao.click();
          return texto || '(janela vazia)';
        })()`).catch(() => null);
        if (texto) return texto;
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

    await r.passo('janela de rolagem no ataque e na iniciativa: o Atacar da ficha abre a janela antes de gastar a bala (cancelar não gasta nem rola); a luneta de precisão vem marcada contra o alvo a 51 m ou mais e desmarcada perto; os TeleOptics pela wiki (o do RED só no mirado, o de 2077 também no tiro único; a luneta não acumula com eles); o que se marca entra no ataque; sem a janela, a luneta entra sozinha quando vale; a iniciativa de quem tem Sandevistan abre a janela com o +3 marcado, e "Rolar direto" rola com ele', async () => {
      // Atores e tokens só deste passo (apagados no fim): o Atirador de Elite (REF 8, Armas de Ombro 4, rifle com a luneta,
      // Sandevistan), o Perto (a 4 m) e o Telhado (10 m no chão e 52 m acima: mais de 51 m).
      const ATQ = `(() => { const a = game.actors.getName('Atirador de Elite'); const rifle = a.items.getName('Assault Rifle'); return { a, rifle }; })()`;
      try {
        const montagem = await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const pegar = id => foundry.utils.deepClone(cat[id]);
          const a = await Actor.implementation.create({ name: 'Atirador de Elite', type: 'personagem', system: { atributos: { ref: { valor: 8 } }, pericias: { 'shoulder-arms': { nivel: 4 } } } });
          const rifle = pegar('core_weapons:assault-rifle');
          Object.assign(rifle.system, { equipada: true, pente: { value: 25, max: 25 } });
          const [arma] = await a.createEmbeddedDocuments('Item', [rifle]);
          const luneta = pegar('core_upgrades:sniping-scope');
          luneta.system.instaladoEm = arma.id;
          const sandevistan = pegar('core_cyberware:sandevistan');
          sandevistan.system.instalado = true;
          await a.createEmbeddedDocuments('Item', [luneta, sandevistan]);
          const perto = await Actor.implementation.create({ name: 'Perto', type: 'personagem', system: { hp: { value: 40 } } });
          const telhado = await Actor.implementation.create({ name: 'Telhado', type: 'personagem', system: { hp: { value: 40 } } });
          const token = async (ator, x, elevation = 0) => (await ator.getTokenDocument({ x, y: 900, elevation })).toObject();
          await canvas.scene.createEmbeddedDocuments('Token', [await token(a, 300), await token(perto, 500), await token(telhado, 800, 52)]);
          await __esperar(() => canvas.tokens.placeables.length === 7);
          await new Promise(r => setTimeout(r, 500));
          const d = nome => game.system.api.combate.distancia(__token('Atirador de Elite'), __token(nome));
          return { perto: d('Perto'), telhado: d('Telhado') };
        })()`);

        // A. A janela do Atacar, com a luneta marcada (Telhado) e desmarcada (Perto); cancelar não gasta nem rola.
        const janelas = await edge.evaluate(`(async () => {
          const { a, rifle } = ${ATQ};
          await a.sheet.render({ force: true });
          await __esperar(() => a.sheet.element?.querySelector('.tab.combate tr[data-item-id="' + rifle.id + '"] [data-action="atacar"]'));
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el.textContent.replace(/\\s+/g, ' ').trim();
          const abrir = async alvo => {
            canvas.tokens.setTargets([__token(alvo).id]);
            a.sheet.element.querySelector('.tab.combate tr[data-item-id="' + rifle.id + '"] [data-action="atacar"]').click();
            await __esperar(() => janela()?.querySelector('.total-sem-dado'));
            const j = janela();
            const lido = {
              titulo: textoDe(j.querySelector('.window-title')), partes: [...j.querySelectorAll('.partes li')].map(textoDe),
              situacionais: [...j.querySelectorAll('[name="situacional"]')].map(c => textoDe(c.closest('label')) + (c.checked ? ' [x]' : ' [ ]')), total: textoDe(j.querySelector('.total-sem-dado'))
            };
            const antes = game.messages.size;
            j.querySelector('button[data-action="cancelar"]').click();
            await __esperar(() => !janela());
            await new Promise(r => setTimeout(r, 300));
            return { ...lido, rolou: game.messages.size !== antes, pente: rifle.system.pente.value };
          };
          return { telhado: await abrir('Telhado'), perto: await abrir('Perto') };
        })()`);

        // A2. Os TeleOptics pela wiki, contra o Telhado (cancelando): o do RED no mirado, marcado, e a luneta desmarcada (não
        // acumula); no tiro único, só a luneta; o de 2077, no tiro único, marcado, e a luneta desmarcada.
        const teleoptics = await edge.evaluate(`(async () => {
          const { a, rifle } = ${ATQ};
          const cat = await game.system.api.wiki.carregarCatalogo();
          const instalar = async id => { const dados = foundry.utils.deepClone(cat[id]); dados.system.instalado = true; return (await a.createEmbeddedDocuments('Item', [dados]))[0]; };
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el.textContent.replace(/\\s+/g, ' ').trim();
          const linha = () => a.sheet.element.querySelector('.tab.combate tr[data-item-id="' + rifle.id + '"]');
          const ler = async () => {
            await __esperar(() => janela()?.querySelector('.total-sem-dado'));
            const j = janela();
            const lido = [...j.querySelectorAll('[name="situacional"]')].map(c => textoDe(c.closest('label')) + (c.checked ? ' [x]' : ' [ ]'));
            j.querySelector('button[data-action="cancelar"]').click();
            await __esperar(() => !janela());
            return lido;
          };
          canvas.tokens.setTargets([__token('Telhado').id]);
          const red = await instalar('core_cyberware:teleoptics');
          await __esperar(() => linha());
          linha().querySelector('[data-action="mirar"]').click();
          await __esperar(() => document.querySelector('.application.dialog.mirar:not(.minimizing) button[data-action="cabeca"]'));
          document.querySelector('.application.dialog.mirar:not(.minimizing) button[data-action="cabeca"]').click();
          const redMirado = await ler();
          linha().querySelector('[data-action="atacar"]').click();
          const redTiro = await ler();
          await red.delete();
          const novo = await instalar('cyberware-2077:teleoptics-2077');
          await __esperar(() => linha());
          linha().querySelector('[data-action="atacar"]').click();
          const tiro2077 = await ler();
          await novo.delete();
          await __esperar(() => linha());
          return { redMirado, redTiro, tiro2077, pente: rifle.system.pente.value };
        })()`);

        // B. Pela janela, contra o Perto: o modificador do mestre e a Sorte entram; a luneta, não. d10 5; o dano 5 × 1.
        await fixar(edge, [[5, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]]);
        const pelaJanela = await edge.evaluate(`(async () => {
          const { a, rifle } = ${ATQ};
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          canvas.tokens.setTargets([__token('Perto').id]);
          const cartoes = () => game.messages.filter(m => m.getFlag('${S}', 'ataque')).length;
          const antes = cartoes();
          a.sheet.element.querySelector('.tab.combate tr[data-item-id="' + rifle.id + '"] [data-action="atacar"]').click();
          await __esperar(() => janela()?.querySelector('.total-sem-dado'));
          const j = janela();
          const outro = j.querySelector('[name="outro"]');
          outro.value = 2;
          outro.dispatchEvent(new Event('input', { bubbles: true }));
          const sorte = j.querySelector('[name="sorte"]');
          sorte.value = 1;
          sorte.dispatchEvent(new Event('input', { bubbles: true }));
          j.querySelector('button[data-action="rolar"]').click();
          await __esperar(() => cartoes() > antes, 150);
          const teste = game.messages.filter(m => m.getFlag('${S}', 'teste')?.ataque).at(-1);
          const partes = [...new DOMParser().parseFromString(teste.content, 'text/html').querySelectorAll('.partes li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim());
          return { partes, total: teste.rolls[0].total, pente: rifle.system.pente.value, sorte: a.system.sorte.value, cartao: cartoes() > antes };
        })()`);

        // C. Sem a janela (como Ctrl + clique e as macros), contra o Telhado: a luneta entra sozinha. d10 6.
        await fixar(edge, [[6, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]]);
        const direto = await edge.evaluate(`(async () => {
          const { rifle } = ${ATQ};
          await rifle.atacar({ alvos: [__token('Telhado')] });
          const teste = game.messages.filter(m => m.getFlag('${S}', 'teste')?.ataque).at(-1);
          const partes = [...new DOMParser().parseFromString(teste.content, 'text/html').querySelectorAll('.partes li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim());
          return { partes, total: teste.rolls[0].total, pente: rifle.system.pente.value };
        })()`);

        // D. A iniciativa: a janela traz o Sandevistan (+3, marcado); "Rolar direto" rola com ele. d10 6 e depois 7.
        await fixar(edge, [[6, 10]]);
        const iniciativa = await edge.evaluate(`(async () => {
          const { a } = ${ATQ};
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el.textContent.replace(/\\s+/g, ' ').trim();
          const combate = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
          const [combatente] = await combate.createEmbeddedDocuments('Combatant', [{ tokenId: __token('Atirador de Elite').id, sceneId: canvas.scene.id, actorId: a.id }]);
          const rolando = combate.rollInitiative([combatente.id]);
          await __esperar(() => janela()?.querySelector('.total-sem-dado'));
          const j = janela();
          const lido = { partes: [...j.querySelectorAll('.partes li')].map(textoDe), situacionais: [...j.querySelectorAll('[name="situacional"]')].map(c => textoDe(c.closest('label')) + (c.checked ? ' [x]' : ' [ ]')), total: textoDe(j.querySelector('.total-sem-dado')) };
          j.querySelector('button[data-action="rolar"]').click();
          await rolando;
          lido.comJanela = combate.combatants.get(combatente.id).initiative;
          window.__fila = [[7, 10]];
          await game.settings.set('${S}', 'rolarDireto', true);
          await combate.rollInitiative([combatente.id]);
          lido.direto = combate.combatants.get(combatente.id).initiative;
          lido.janelaNoDireto = Boolean(janela());
          return lido;
        })()`);
        const info = { montagem, janelas, teleoptics, pelaJanela, direto, iniciativa };
        const { telhado, perto } = janelas;
        const luneta = 'Sniping Scope: alvo a 51 m ou mais +1';
        const ok = montagem.perto < 51 && montagem.telhado >= 51
          && /Assault Rifle/.test(telhado.titulo) && telhado.partes.join() === 'REF +8,Armas de Ombro +4,1d10' && telhado.situacionais.join() === luneta + ' [x]' && telhado.total === '13'
          && !telhado.rolou && telhado.pente === 25 && perto.situacionais.join() === luneta + ' [ ]' && perto.total === '12' && !perto.rolou && perto.pente === 25
          && teleoptics.redMirado.join(' / ') === ['TeleOptics: tiro mirado a 51 m ou mais +1 [x]', luneta + ' [ ]'].join(' / ') && teleoptics.redTiro.join() === luneta + ' [x]'
          && teleoptics.tiro2077.join(' / ') === ['TeleOptics (2077): tiro único a 51 m ou mais +1 [x]', luneta + ' [ ]'].join(' / ') && teleoptics.pente === 25
          && pelaJanela.cartao && pelaJanela.partes.includes('Modificador do mestre +2') && pelaJanela.partes.includes('Sorte +1') && !pelaJanela.partes.some(parte => parte.startsWith('Sniping'))
          && pelaJanela.total === 8 + 4 + 2 + 1 + 5 && pelaJanela.pente === 24 && pelaJanela.sorte === 4
          && direto.partes.includes(luneta) && direto.total === 8 + 4 + 1 + 6 && direto.pente === 23
          && iniciativa.partes.join() === 'REF +8,1d10' && iniciativa.situacionais.join() === 'Sandevistan: Iniciativa +3 [x]' && iniciativa.total === '11'
          && iniciativa.comJanela === 8 + 3 + 6 && iniciativa.direto === 8 + 3 + 7 && !iniciativa.janelaNoDireto;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          await game.settings.set('${S}', 'rolarDireto', false);
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-rolagem')) await app.close();
          for (const combate of game.combats.filter(c => c.combatants.some(cb => cb.name === 'Atirador de Elite'))) await combate.delete();
          canvas.tokens.setTargets([]);
          const nomes = ['Atirador de Elite', 'Perto', 'Telhado'];
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          await __esperar(() => canvas.tokens.placeables.length === 4);
          return true;
        })()`);
      }
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

    await r.passo('o dano rolado à parte (o botão "Dano" da ficha) pelos botões do cartão (as maquetes do usuário): "Aplicar dano" no alvo marcado (T), no corpo, com a armadura, como o ataque, e o "Desfazer"; no crítico, os +5 sem a lesão, e "Rolar a lesão" rola a tabela do corpo uma vez por alvo', async () => {
      // A limpeza, também quando o passo falha no meio: o alvo inteiro de novo (HP, SP e sem a lesão) e sem a marca (T),
      // para os passos seguintes (sem ela, uma falha aqui derrubava o fogo supressivo e os turnos).
      const limpar = () => edge.evaluate(`(async () => {
        const alvo = __ator('Alvo');
        await alvo.deleteEmbeddedDocuments('Item', alvo.items.filter(i => i.type === 'lesao').map(i => i.id));
        const armadura = alvo.items.find(i => i.type === 'armadura' && i.system.equipada && i.system.sp.corpo.max);
        await alvo.update({ 'system.hp.value': 45 });
        if (armadura) await armadura.update({ 'system.sp.corpo.value': armadura.system.sp.corpo.max });
        __token('Alvo').object.setTarget(false, { releaseOthers: true });
        return true;
      })()`);
      let simples;
      let critico;
      try {
        // Sem crítico: 5d6 = 3 × 5 = 15 contra SP 11: passam 4 (HP 45 → 41; a armadura perde 1).
        await fixar(edge, [[3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]);
        simples = await edge.evaluate(`(async () => {
          const rifle = __ator('Atiradora').items.getName('Assault Rifle');
          const alvo = __ator('Alvo');
          __token('Alvo').object.setTarget(true, { releaseOthers: true });
          const r = await rifle.rolarDano({ perguntar: false });
          const m = r.mensagem;
          await __esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarDano"]'));
          const botoes = [...document.querySelector('[data-message-id="' + m.id + '"]').querySelectorAll('[data-cprf-acao]')].map(b => b.dataset.cprfAcao).join();
          const antes = game.messages.size;
          document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarDano"]').click();
          await __esperar(() => game.messages.size > antes && game.messages.contents.at(-1).getFlag('${S}', 'ataque'));
          const resultado = game.messages.contents.at(-1);
          const resumo = resultado.getFlag('${S}', 'ataque');
          const lido = { total: r.total, critico: r.critico, botoes, hp: alvo.system.hp.value, sp: alvo.system.armadura.corpo.sp, cabecalho: resumo.cabecalho, ataque: resumo.ataque,
            linha: resumo.linhas[0] && [resumo.linhas[0].resultado, resumo.linhas[0].dano?.recebido, resumo.linhas[0].dano?.local].join() };
          // O "Desfazer" do cartão do resultado devolve o HP e o SP.
          await __esperar(() => document.querySelector('[data-message-id="' + resultado.id + '"] [data-cprf-acao="desfazer"]'));
          document.querySelector('[data-message-id="' + resultado.id + '"] [data-cprf-acao="desfazer"]').click();
          await __esperar(() => resultado.getFlag('${S}', 'desfeito'));
          return { ...lido, desfeito: { hp: alvo.system.hp.value, sp: alvo.system.armadura.corpo.sp } };
        })()`);
        // Crítico: 6, 6, 2, 3, 4 = 21 contra SP 11: passam 10, e os +5 do crítico (HP 45 → 30), sem a lesão. A lesão: 2d6 4 + 4 = 8 (Perna quebrada).
        await fixar(edge, [[6, 6], [6, 6], [2, 6], [3, 6], [4, 6], [4, 6], [4, 6]]);
        critico = await edge.evaluate(`(async () => {
          const rifle = __ator('Atiradora').items.getName('Assault Rifle');
          const alvo = __ator('Alvo');
          const lesoes = () => alvo.items.filter(i => i.type === 'lesao').map(i => i.name);
          const r = await rifle.rolarDano({ perguntar: false });
          const m = r.mensagem;
          await __esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="rolarLesao"]'));
          const botoes = [...document.querySelector('[data-message-id="' + m.id + '"]').querySelectorAll('[data-cprf-acao]')].map(b => b.dataset.cprfAcao).join();
          let antes = game.messages.size;
          document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarDano"]').click();
          await __esperar(() => game.messages.size > antes && game.messages.contents.at(-1).getFlag('${S}', 'ataque'));
          const resumo = game.messages.contents.at(-1).getFlag('${S}', 'ataque');
          const depoisDoDano = { hp: alvo.system.hp.value, lesoes: lesoes().join(), notas: resumo.notas.join(' ') };
          antes = game.messages.size;
          document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="rolarLesao"]').click();
          await __esperar(() => lesoes().length === 1 && game.messages.size > antes);
          const cartaoDaLesao = game.messages.contents.at(-1).getFlag('${S}', 'lesao')?.nome;
          // De novo no mesmo alvo: não rola outra (o aviso, capturado aqui).
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="rolarLesao"]').click();
            await __esperar(() => avisos.length === 1);
          } finally { delete ui.notifications.warn; }
          return { total: r.total, critico: r.critico, botoes, depoisDoDano, lesoes: lesoes().join(), cartaoDaLesao, avisos, rolados: (m.getFlag('${S}', 'lesoesRoladas') ?? []).length };
        })()`);
      } finally {
        await limpar();
      }
      const ok = simples.total === 15 && !simples.critico && simples.botoes === 'aplicarDano' && simples.hp === 41 && simples.sp === 10
        && simples.cabecalho === '15 de dano, no corpo' && simples.ataque === null && simples.linha === 'acertou,4,corpo' && simples.desfeito.hp === 45 && simples.desfeito.sp === 11
        && critico.total === 21 && critico.critico && critico.botoes === 'aplicarDano,rolarLesao' && critico.depoisDoDano.hp === 30 && critico.depoisDoDano.lesoes === ''
        && critico.depoisDoDano.notas.includes('Rolar a lesão') && critico.lesoes === 'Perna quebrada' && critico.cartaoDaLesao === 'Perna quebrada'
        && critico.avisos.join() === 'Este dano já rolou a lesão desses alvos.' && critico.rolados === 1;
      return [ok, JSON.stringify({ simples, critico })];
    });

    await r.passo('"Rolar iniciativa" na aba Combate da ficha (as maquetes do usuário): sem combate, o do mestre cria um, põe o token na fila e rola (REF 6 + 1d10 7 = 13); de novo no mesmo combate, não rola outra vez (o aviso)', async () => {
      await fixar(edge, [[7, 10]]);
      const info = await edge.evaluate(`(async () => {
        const alvo = __ator('Alvo');
        const antes = { combate: Boolean(game.combat), situacionais: alvo.situacionaisDaIniciativa().length, base: alvo.system.iniciativa };
        let criado = null;
        const avisos = [];
        try {
          await alvo.sheet.render({ force: true });
          await __esperar(() => alvo.sheet.element?.querySelector('[data-action="rolarIniciativa"]'));
          alvo.sheet.changeTab('combate', 'primary');
          alvo.sheet.element.querySelector('[data-action="rolarIniciativa"]').click();
          await __esperar(() => Number.isFinite(game.combat?.combatants.find(c => c.actor === alvo)?.initiative));
          criado = game.combat;
          const combatente = criado.combatants.find(c => c.actor === alvo);
          const lido = { ...antes, cena: criado.scene?.id === canvas.scene.id, token: combatente.token?.name ?? null, iniciativa: combatente.initiative, fila: criado.combatants.size };
          ui.notifications.info = mensagem => { avisos.push(String(mensagem)); };
          try {
            alvo.sheet.element.querySelector('[data-action="rolarIniciativa"]').click();
            await __esperar(() => avisos.length === 1);
          } finally { delete ui.notifications.info; }
          return { ...lido, avisos, depois: combatente.initiative, fila2: criado.combatants.size };
        } finally {
          await alvo.sheet.close();
          if (!antes.combate) await game.combat?.delete();
        }
      })()`);
      const ok = !info.combate && info.situacionais === 0 && info.base === 6 && info.cena && info.token === 'Alvo' && info.fila === 1 && info.iniciativa === 13
        && info.avisos.join() === 'Alvo já tem iniciativa 13 neste combate.' && info.depois === 13 && info.fila2 === 1;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Consertar" na ficha da armadura (as maquetes; a decisão do usuário de 2026-10-16): o SP gasto volta ao máximo e o chat diz que o personagem consertou (o cartão "CONSERTO"); inteira, só avisa, sem outra mensagem', async () => {
      const info = await edge.evaluate(`(async () => {
        const alvo = __ator('Alvo');
        const armadura = alvo.items.find(i => i.type === 'armadura' && i.system.sp.corpo.max);
        const max = armadura.system.sp.corpo.max;
        const cabeca = armadura.system.sp.cabeca;
        await armadura.update({ 'system.sp.corpo.value': max - 3 });
        const avisos = [];
        try {
          await armadura.sheet.render({ force: true });
          await __esperar(() => armadura.sheet.element?.querySelector('[data-action="consertar"]'));
          const antes = game.messages.size;
          armadura.sheet.element.querySelector('[data-action="consertar"]').click();
          await __esperar(() => armadura.system.sp.corpo.value === max && game.messages.size > antes);
          const m = game.messages.contents.at(-1);
          await __esperar(() => document.querySelector('.chat-message[data-message-id="' + m.id + '"] .message-sender'));
          const li = document.querySelector('#chat .chat-message[data-message-id="' + m.id + '"]') ?? document.querySelector('.chat-message[data-message-id="' + m.id + '"]');
          const esperado = 'Alvo consertou ' + armadura.name + ': o SP do corpo volta de ' + (max - 3) + ' para ' + max + '.';
          const lido = { sp: armadura.system.sp.corpo.value, max, cabecaInteira: cabeca.value === cabeca.max, texto: new DOMParser().parseFromString(m.content, 'text/html').body.textContent.trim(), esperado,
            mudancas: (m.getFlag('${S}', 'conserto')?.mudancas ?? []).map(x => x.local + ' ' + x.antes + '→' + x.depois).join(), tipo: getComputedStyle(li.querySelector('.message-sender'), '::before').content };
          // De novo, inteira: o aviso, sem outra mensagem.
          const depois = game.messages.size;
          ui.notifications.info = mensagem => { avisos.push(String(mensagem)); };
          try {
            armadura.sheet.element.querySelector('[data-action="consertar"]').click();
            await __esperar(() => avisos.length === 1);
            await new Promise(r => setTimeout(r, 300));
          } finally { delete ui.notifications.info; }
          return { ...lido, avisos, nome: armadura.name, novas: game.messages.size - depois };
        } finally {
          await armadura.sheet.close();
          await armadura.update({ 'system.sp.corpo.value': max });
        }
      })()`);
      const ok = info.sp === info.max && info.cabecaInteira && info.texto === info.esperado && info.mudancas === 'corpo ' + (info.max - 3) + '→' + info.max && info.tipo === '"CONSERTO // "'
        && info.avisos.join() === info.nome + ' já está inteira.' && info.novas === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Rolar Humanidade" na ficha do cyberware e "Aplicar" no cartão (as maquetes): a perda rolada sem instalar a peça (2d6: 3 + 4 = 7) e, pelo botão do mestre, tirada uma vez da Humanidade do dono; o cartão diz o que mudou e perde o botão', async () => {
      await fixar(edge, [[3, 6], [4, 6]]);
      const info = await edge.evaluate(`(async () => {
        const alvo = __ator('Alvo');
        const cat = await game.system.api.wiki.carregarCatalogo();
        const [peca] = await alvo.createEmbeddedDocuments('Item', [foundry.utils.deepClone(cat['core_cyberware:neural-link'])]);
        const humanidade = alvo.system.humanidade.value;
        try {
          await peca.sheet.render({ force: true });
          await __esperar(() => peca.sheet.element?.querySelector('[data-action="rolarHumanidade"]'));
          const antes = game.messages.size;
          peca.sheet.element.querySelector('[data-action="rolarHumanidade"]').click();
          await __esperar(() => game.messages.size > antes && game.messages.contents.at(-1).getFlag('${S}', 'perdaDeHumanidade'));
          const m = game.messages.contents.at(-1);
          const rolado = { total: m.getFlag('${S}', 'perdaDeHumanidade').total, instalado: peca.system.instalado, humanidade: alvo.system.humanidade.value };
          await __esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarHumanidade"]'));
          document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarHumanidade"]').click();
          await __esperar(() => m.getFlag('${S}', 'perdaDeHumanidade')?.aplicado && !document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarHumanidade"]'));
          const texto = new DOMParser().parseFromString(m.content, 'text/html').querySelector('.resultado')?.textContent.trim();
          return { humanidade, rolado, depois: alvo.system.humanidade.value, texto, aplicado: m.getFlag('${S}', 'perdaDeHumanidade').aplicado,
            botao: Boolean(document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarHumanidade"]')) };
        } finally {
          await peca.sheet.close();
          await alvo.deleteEmbeddedDocuments('Item', [peca.id]);
          await alvo.update({ 'system.humanidade.value': humanidade });
        }
      })()`);
      const ok = info.rolado.total === 7 && !info.rolado.instalado && info.rolado.humanidade === info.humanidade && info.depois === info.humanidade - 7 && !info.botao
        && info.texto === 'Aplicada em Alvo: Humanidade ' + info.humanidade + ' → ' + (info.humanidade - 7) + '.' && info.aplicado.antes === info.humanidade && info.aplicado.depois === info.humanidade - 7;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Atacar", "Recarregar" e o SP da armadura na ficha do item (as maquetes): a arma de um personagem ataca pelo fluxo da ficha (a janela no clique; Ctrl + clique, direto) e recarrega o pente; a armadura mostra o SP de cada local em caixas e perde 1 no "−1", sem passar de 0', async () => {
      const info = await edge.evaluate(`(async () => {
        const rifle = __ator('Atiradora').items.getName('Assault Rifle');
        const municao = rifle.municaoCarregada;
        const guardado = { pente: rifle.system.pente.value, municao: municao?.system.quantidade };
        const armadura = __ator('Alvo').items.find(i => i.type === 'armadura' && i.system.sp.corpo.max);
        const corpo = armadura.system.sp.corpo;
        const chamadas = [];
        // O ataque em si é o da ficha (os outros passos o conferem): aqui, o que o botão pede a ele.
        rifle.atacar = opcoes => { chamadas.push(opcoes.perguntar); return null; };
        try {
          await rifle.sheet.render({ force: true });
          await __esperar(() => rifle.sheet.element?.querySelector('[data-action="atacar"]'));
          const f = () => rifle.sheet.element;
          const botoes = [...f().querySelectorAll('.acoes-do-item [data-action]')].map(b => b.dataset.action).join();
          f().querySelector('[data-action="atacar"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          f().querySelector('[data-action="atacar"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await __esperar(() => chamadas.length === 2);
          // Recarregar: o pente com 5 a menos volta cheio, da munição carregada.
          await rifle.update({ 'system.pente.value': rifle.system.pente.max - 5 });
          const antes = municao.system.quantidade;
          f().querySelector('[data-action="recarregar"]').click();
          await __esperar(() => rifle.system.pente.value === rifle.system.pente.max);
          const recarga = { pente: rifle.system.pente.value + '/' + rifle.system.pente.max, gastou: antes - municao.system.quantidade };
          await rifle.sheet.close();
          // A armadura: o SP do corpo em caixas; "−1" tira 1; no 0, não desce (lido depois de assentar).
          await armadura.update({ 'system.sp.corpo.value': 1 });
          await armadura.sheet.render({ force: true });
          await __esperar(() => armadura.sheet.element?.querySelector('[data-action="ablar"][data-local="corpo"]'));
          const g = () => armadura.sheet.element;
          const trilha = () => (el => el && el.style.getPropertyValue('--pontos').trim() + '/' + el.style.getPropertyValue('--max').trim())(g()?.querySelector('.trilha-sp[data-local="corpo"] .pontos-visuais'));
          const caixas = { antes: trilha(), locais: [...g().querySelectorAll('.trilha-sp')].map(t => t.dataset.local).join() };
          g().querySelector('[data-action="ablar"][data-local="corpo"]').click();
          await __esperar(() => armadura.system.sp.corpo.value === 0 && trilha() === '0/' + corpo.max);
          caixas.depois = trilha();
          g().querySelector('[data-action="ablar"][data-local="corpo"]').click();
          await new Promise(r => setTimeout(r, 800));
          caixas.noZero = armadura.system.sp.corpo.value + ',' + trilha();
          return { botoes, chamadas, recarga, caixas, max: corpo.max };
        } finally {
          delete rifle.atacar;
          await rifle.sheet.close();
          await armadura.sheet.close();
          await rifle.update({ 'system.pente.value': guardado.pente });
          if (municao) await municao.update({ 'system.quantidade': guardado.municao });
          await armadura.update({ 'system.sp.corpo.value': armadura.system.sp.corpo.max });
        }
      })()`);
      const { botoes, chamadas, recarga, caixas, max } = info;
      const ok = botoes === 'atacar,recarregar' && chamadas.join() === 'true,false' && recarga.pente === '25/25' && recarga.gastou === 5
        && caixas.locais === 'corpo' && caixas.antes === '1/' + max && caixas.depois === '0/' + max && caixas.noZero === '0,0/' + max;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Rodar" e "Restaurar REZ" na ficha do programa (as maquetes): fora do deck, sem o "Rodar"; no deck, liga e desliga o programa (o "Ativo" da aba NET); a REZ perdida volta ao máximo', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = await Actor.implementation.create({ name: 'Teste Netrunner do Programa', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } },
          items: [foundry.utils.deepClone(cat['core_gear:cyberdeck']), foundry.utils.deepClone(cat['core_programs:eraser'])] });
        const eraser = a.items.getName('Eraser');
        try {
          await eraser.sheet.render({ force: true });
          await __esperar(() => eraser.sheet.element?.querySelector('.tab.detalhes'));
          const f = () => eraser.sheet.element;
          const acoes = () => [...(f()?.querySelectorAll('.acoes-do-item [data-action]') ?? [])].map(b => b.dataset.action + ':' + b.textContent.trim()).join();
          const foraDoDeck = acoes();
          await eraser.update({ 'system.instaladoEm': a.items.find(i => i.type === 'cyberdeck').id });
          await __esperar(() => f()?.querySelector('[data-action="rodar"]'));
          const noDeck = acoes();
          f().querySelector('[data-action="rodar"]').click();
          await __esperar(() => eraser.system.ativo && acoes().includes('rodar:DESLIGAR'));
          const ligado = acoes();
          f().querySelector('[data-action="rodar"]').click();
          await __esperar(() => !eraser.system.ativo && acoes().includes('rodar:RODAR'));
          await eraser.perderRez(3);
          await __esperar(() => f()?.querySelector('.rez-do-programa')?.textContent.includes('4/7'));
          const ferido = f().querySelector('.rez-do-programa').textContent.trim();
          f().querySelector('[data-action="restaurarRez"]').click();
          await __esperar(() => eraser.rezAtual === 7 && f()?.querySelector('.rez-do-programa')?.textContent.includes('7/7'));
          return { foraDoDeck, noDeck, ligado, desligado: !eraser.system.ativo, ferido, restaurado: eraser.rezAtual };
        } finally {
          await eraser.sheet.close();
          await a.delete();
        }
      })()`);
      const ok = info.foraDoDeck === 'restaurarRez:RESTAURAR REZ' && info.noDeck === 'rodar:RODAR,restaurarRez:RESTAURAR REZ' && info.ligado === 'rodar:DESLIGAR,restaurarRez:RESTAURAR REZ'
        && info.desligado && info.ferido === 'REZ 4/7' && info.restaurado === 7;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('a correção rápida e o tratamento da lesão (wiki, p. 223; as maquetes): quem trata (o token selecionado; o próprio ferido, também selecionado, só na correção) rola TECH + Paramédico + 1d10 e precisa superar a DV; a correção da Perna quebrada (DV13) tira o −4 de MOVE até o fim do dia, e o "Voltou" o devolve; o tratamento (DV15) empatado falha, e passando, a lesão sai', async () => {
      // O Medtech de teste: TECH 8 + Paramédico 4 = 12. Correção: d10 2 = 14 > 13. Tratamento: d10 3 = 15 (não supera 15); d10 4 = 16.
      await fixar(edge, [[2, 10], [3, 10], [4, 10]]);
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const alvo = __ator('Alvo');
        const medico = await Actor.implementation.create({ name: 'Teste Medtech', type: 'personagem', system: { atributos: { tech: { valor: 8 } }, pericias: { paramedic: { nivel: 4 } } } });
        const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await medico.getTokenDocument({ x: 300, y: 300 })).toObject()]);
        const [perna] = await alvo.createEmbeddedDocuments('Item', [foundry.utils.deepClone(cat['core_critical-injuries-body:broken-leg'])]);
        const move = () => alvo.system.atributos.move.valor;
        const dialogo = () => document.querySelector('.application.dialog.tratar-lesao');
        const ultimo = () => game.messages.contents.at(-1).getFlag('${S}', 'tratamento');
        const f = () => alvo.sheet.element;
        const linha = () => f()?.querySelector('.tab.combate .lesoes .item-linha[data-item-id="' + perna.id + '"]');
        const responder = async () => {
          await __esperar(() => dialogo()?.querySelector('select[name="quem"]'));
          const lido = { quem: [...dialogo().querySelectorAll('select[name="quem"] option')].map(o => o.textContent).join(), opcoes: [...dialogo().querySelectorAll('select[name="opcao"] option')].map(o => o.textContent).join() };
          dialogo().querySelector('select[name="quem"]').value = medico.uuid;
          dialogo().querySelector('select[name="opcao"]').value = '0';
          dialogo().querySelector('button[data-action="ok"]').click();
          // A janela sai com a animação: o próximo clique só depois que ela some (senão a resposta vai para a velha).
          await __esperar(() => !dialogo());
          return lido;
        };
        try {
          await __esperar(() => canvas.tokens.get(token.id));
          // O Medtech e o próprio Alvo selecionados: o tratamento não pode ser em si mesmo, e o Alvo não pode aparecer nele.
          canvas.tokens.get(token.id).control({ releaseOthers: true });
          __token('Alvo').object.control({ releaseOthers: false });
          await alvo.sheet.render({ force: true });
          alvo.sheet.changeTab('combate', 'primary');
          await __esperar(() => linha()?.querySelector('[data-action="corrigirLesao"]'));
          const antes = { move: move(), botoes: [...linha().querySelectorAll('[data-action]')].map(b => b.dataset.action).join() };
          // A correção rápida: o −4 de MOVE sai, e a lesão fica marcada.
          let mensagens = game.messages.size;
          linha().querySelector('[data-action="corrigirLesao"]').click();
          const dialogoDaCorrecao = await responder();
          await __esperar(() => game.messages.size > mensagens + 1 && ultimo());
          await __esperar(() => linha()?.querySelector('[data-action="voltouLesao"]'));
          const corrigida = { move: move(), resultado: ultimo().resultado, total: ultimo().total, botoes: [...linha().querySelectorAll('[data-action]')].map(b => b.dataset.action).join(), marca: linha().querySelector('.corrigida')?.textContent.trim() };
          // "Voltou": o efeito volta.
          linha().querySelector('[data-action="voltouLesao"]').click();
          await __esperar(() => move() === antes.move && linha()?.querySelector('[data-action="corrigirLesao"]'));
          const voltou = move();
          // O tratamento: empatado com a DV, falha; passando, a lesão sai.
          mensagens = game.messages.size;
          linha().querySelector('[data-action="tratarLesao"]').click();
          const dialogoDoTratamento = await responder();
          await __esperar(() => game.messages.size > mensagens + 1 && ultimo());
          const falhou = { resultado: ultimo().resultado, total: ultimo().total, ainda: alvo.items.has(perna.id) };
          mensagens = game.messages.size;
          linha().querySelector('[data-action="tratarLesao"]').click();
          await responder();
          await __esperar(() => game.messages.size > mensagens + 1 && !alvo.items.has(perna.id));
          const curada = { resultado: ultimo().resultado, total: ultimo().total, move: move(), texto: new DOMParser().parseFromString(game.messages.contents.at(-1).content, 'text/html').body.textContent.trim() };
          return { antes, dialogoDaCorrecao, corrigida, voltou, dialogoDoTratamento, falhou, curada };
        } finally {
          // Uma janela de tratamento que tenha sobrado (o passo falhou no meio) atrapalharia os passos seguintes.
          for (const app of [...foundry.applications.instances.values()].filter(app => app.element?.classList.contains('tratar-lesao'))) await app.close();
          await alvo.sheet.close();
          if (alvo.items.has(perna.id)) await alvo.deleteEmbeddedDocuments('Item', [perna.id]);
          canvas.tokens.releaseAll();
          await canvas.scene.deleteEmbeddedDocuments('Token', [token.id]);
          await medico.delete();
        }
      })()`);
      const { antes, dialogoDaCorrecao: c, corrigida, voltou, dialogoDoTratamento: t, falhou, curada } = info;
      const ok = antes.move === 1 && antes.botoes === 'editarItem,corrigirLesao,tratarLesao,apagarItem'
        && c.quem === 'Teste Medtech,Alvo' && c.opcoes === 'Paramédico DV13' && corrigida.resultado === 'corrigida' && corrigida.total === 14 && corrigida.move === 5
        && corrigida.botoes === 'editarItem,voltouLesao,tratarLesao,apagarItem' && corrigida.marca === 'CORRIGIDA' && voltou === 1
        && t.quem === 'Teste Medtech' && t.opcoes === 'Paramédico DV15,Cirurgia DV13' && falhou.resultado === 'falhou' && falhou.total === 15 && falhou.ainda
        && curada.resultado === 'curada' && curada.total === 16 && curada.move === 5 && curada.texto === 'Teste Medtech tratou Perna quebrada de Alvo (Paramédico 16 contra DV15).';
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Usar" a droga (wiki, p. 227–229; as maquetes): gasta a dose e liga o efeito primário (o Black Lace tira 2d6 de Humanidade); quando o efeito acaba, WILL + Resistir Tortura/Drogas + 1d10 contra a DV do secundário: passando, a Humanidade volta; falhando (o Boost), o vício fica', async () => {
      // Black Lace: 2d6 3 + 4 = 7 de Humanidade; o teste, WILL 6 + Resistir 4 + d10 8 = 18 > 17. Boost: d10 5 = 15, não supera 17.
      await fixar(edge, [[3, 6], [4, 6], [8, 10], [5, 10]]);
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const lace = foundry.utils.deepClone(cat['core_drugs:black-lace']);
        lace.system.quantidade = 2;
        const a = await Actor.implementation.create({ name: 'Teste Usuário', type: 'personagem', system: { atributos: { will: { valor: 6 }, int: { valor: 6 } }, pericias: { 'resist-torture-drugs': { nivel: 4 } } },
          items: [lace, foundry.utils.deepClone(cat['core_drugs:boost'])] });
        const [blackLace, boost] = ['Black Lace', 'Boost'].map(nome => a.items.getName(nome));
        const ligado = (droga, nome) => !droga.effects.getName(nome).disabled;
        const ultimo = () => game.messages.contents.at(-1).getFlag('${S}', 'droga');
        const f = () => a.sheet.element;
        const botao = (droga, acao) => f()?.querySelector('li[data-item-id="' + droga.id + '"] [data-action="' + acao + '"]');
        try {
          const humanidade = a.system.humanidade.value;
          await a.sheet.render({ force: true });
          a.sheet.changeTab('equipamento', 'primary');
          await __esperar(() => botao(blackLace, 'usarDroga'));
          const semAcabou = !botao(blackLace, 'acabouDroga');
          let antes = game.messages.size;
          botao(blackLace, 'usarDroga').click();
          await __esperar(() => game.messages.size > antes && ultimo() && botao(blackLace, 'acabouDroga'));
          const usou = { doses: blackLace.system.quantidade, primario: ligado(blackLace, 'Black Lace Primary'), perdeu: humanidade - a.system.humanidade.value, flag: ultimo().humanidade };
          antes = game.messages.size;
          botao(blackLace, 'acabouDroga').click();
          await __esperar(() => game.messages.size > antes + 1 && ultimo()?.resultado && !botao(blackLace, 'acabouDroga'));
          const acabou = { resultado: ultimo().resultado, total: ultimo().total, dv: ultimo().dv, humanidade: a.system.humanidade.value === humanidade, primario: ligado(blackLace, 'Black Lace Primary'), vicio: ligado(blackLace, 'Black Lace Addiction') };
          // O Boost: +2 INT sob efeito; falhando no teste, o vício (−2 INT) fica, com a marca.
          antes = game.messages.size;
          botao(boost, 'usarDroga').click();
          await __esperar(() => game.messages.size > antes && a.system.atributos.int.valor === 8);
          const sobBoost = a.system.atributos.int.valor;
          antes = game.messages.size;
          botao(boost, 'acabouDroga').click();
          await __esperar(() => game.messages.size > antes + 1 && ultimo()?.resultado === 'viciou' && f()?.querySelector('li[data-item-id="' + boost.id + '"] .viciado'));
          const viciou = { int: a.system.atributos.int.valor, vicio: ligado(boost, 'Boost Addiction'), doses: boost.system.quantidade, texto: new DOMParser().parseFromString(game.messages.contents.at(-1).content, 'text/html').body.textContent.trim() };
          return { semAcabou, usou, acabou, sobBoost, viciou };
        } finally {
          await a.sheet.close();
          await a.delete();
        }
      })()`);
      const { semAcabou, usou, acabou, sobBoost, viciou } = info;
      const ok = semAcabou && usou.doses === 1 && usou.primario && usou.perdeu === 7 && usou.flag === 7
        && acabou.resultado === 'passou' && acabou.total === 18 && acabou.dv === 17 && acabou.humanidade && !acabou.primario && !acabou.vicio
        && sobBoost === 8 && viciou.int === 4 && viciou.vicio && viciou.doses === 0 && viciou.texto === 'Teste Usuário ficou viciado em Boost (15 contra DV17): o efeito secundário fica, até a terapia.';
      return [ok, JSON.stringify(info)];
    });

    await r.passo('fundação e opções do cyberware (wiki: "Um implante-base abre slots para opções compatíveis"): a opção entra na fundação instalada do mesmo tipo com slot livre; sem ela, entra "sem fundação", com o recado (a fashionware não pede); a aba Cyberware mostra a fundação com as opções logo abaixo e os slots; a fundação que sai deixa as opções sem fundação', async () => {
      // O Anti-Dazzle antes do Cybereye: sem fundação. O Kerenzikov no Neural Link (1 de 5); o Low Light/IR/UV (2) no
      // Cybereye (3); o Dartgun (3) não cabe mais: sem fundação. O Techhair (fashionware) não pede fundação.
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const ator = await Actor.implementation.create({ name: 'Teste Fundações', type: 'personagem' });
        // O recado do sem fundação (info: a instalação deu certo).
        const avisos = [];
        ui.notifications.info = mensagem => { avisos.push(String(mensagem)); };
        try {
          const ids = ['core_cyberware:neural-link', 'core_cyberware:kerenzikov', 'core_cyberware:cybereye', 'core_cyberware:low-light-ir-uv', 'core_cyberware:dartgun', 'core_cyberware:anti-dazzle', 'core_cyberware:techhair'];
          await ator.createEmbeddedDocuments('Item', ids.map(id => foundry.utils.deepClone(cat[id])));
          const [link, keren, olho, lowLight, dartgun, antiDazzle, techhair] = ids.map(id => ator.items.find(item => item.getFlag('${S}', 'catalogo') === id));
          await ator.instalarCyberware(antiDazzle, { rolar: false });
          const r = { semOlho: { em: antiDazzle.system.instaladoEm, sem: antiDazzle.semFundacao } };
          for (const item of [link, keren, olho, lowLight, dartgun, techhair]) await ator.instalarCyberware(item, { rolar: false });
          Object.assign(r, {
            keren: keren.system.instaladoEm === link.id, lowLight: lowLight.system.instaladoEm === olho.id, dartgun: { em: dartgun.system.instaladoEm, sem: dartgun.semFundacao },
            techhair: { em: techhair.system.instaladoEm, sem: techhair.semFundacao }, slots: [link.slotsUsados, link.system.slots, olho.slotsUsados, olho.system.slots], avisos: avisos.slice()
          });
          await ator.sheet.render({ force: true });
          ator.sheet.changeTab('cyberware', 'primary');
          await __esperar(() => ator.sheet.element?.querySelectorAll('.tab.cyberware .coluna-principal li[data-item-id]').length === 7);
          r.linhas = [...ator.sheet.element.querySelectorAll('.tab.cyberware .coluna-principal li[data-item-id]')].map(li => (li.classList.contains('opcao') ? '└' : '')
            + li.querySelector('.nome').textContent.replace('└', '').trim() + (li.querySelector('.slots') ? ' ' + li.querySelector('.slots').textContent.trim() : '') + (li.querySelector('.sem-fundacao') ? ' !' : ''));
          // O Neural Link sai: o Kerenzikov fica instalado, sem fundação.
          await ator.desinstalarCyberware(link);
          r.saiu = { instalado: keren.system.instalado, em: keren.system.instaladoEm, sem: keren.semFundacao, aviso: avisos.at(-1), avisos: avisos.length };
          return r;
        } finally {
          delete ui.notifications.info;
          await ator.sheet.close();
          await ator.delete();
        }
      })()`);
      const l = info.linhas ?? [];
      const embaixo = (fundacao, opcao) => l.indexOf(fundacao) >= 0 && l[l.indexOf(fundacao) + 1] === opcao;
      const ok = !info.semOlho.em && info.semOlho.sem && info.keren && info.lowLight && !info.dartgun.em && info.dartgun.sem && !info.techhair.em && !info.techhair.sem && info.slots.join() === '1,5,2,3'
        && info.avisos.join(' | ') === 'Anti-Dazzle entrou sem fundação: nenhuma instalada tem o encaixe e o slot livre. | Dartgun entrou sem fundação: nenhuma instalada tem o encaixe e o slot livre.'
        && l.length === 7 && embaixo('Neural Link 1 / 5 slots', '└Kerenzikov') && embaixo('Cybereye 2 / 3 slots', '└Low Light/IR/UV') && l.includes('Anti-Dazzle !') && l.includes('Dartgun !') && l.includes('Techhair')
        && info.saiu.instalado && !info.saiu.em && info.saiu.sem && info.saiu.aviso === 'Neural Link saiu: Kerenzikov ficou sem fundação.' && info.saiu.avisos === 3;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('"Proteger-se" na aba Combate (as maquetes; a decisão do usuário: só a marca, wiki p. 182): o botão marca o Alvo "Em cobertura"; o tiro contra ele avisa o mestre no cartão, que decide; o botão de novo tira a marca', async () => {
      // Ataque: d10 7 → 19 contra DV 16. Dano 5d6, 1 em cada = 5 contra SP 11: a armadura segura, e o Alvo não muda.
      await fixar(edge, [[7, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]]);
      const info = await edge.evaluate(`(async () => {
        const alvo = __ator('Alvo');
        const rifle = __ator('Atiradora').items.getName('Assault Rifle');
        const pente = rifle.system.pente.value;
        const botao = () => alvo.sheet.element?.querySelector('[data-action="protegerSe"]');
        try {
          await alvo.sheet.render({ force: true });
          alvo.sheet.changeTab('combate', 'primary');
          await __esperar(() => botao());
          const antes = { texto: botao().textContent.trim(), marca: alvo.statuses.has('${S}-em-cobertura') };
          botao().click();
          await __esperar(() => alvo.statuses.has('${S}-em-cobertura') && botao()?.textContent.trim() === 'EM COBERTURA');
          const marcado = { texto: botao().textContent.trim(), noToken: __token('Alvo').object.document.hasStatusEffect('${S}-em-cobertura') };
          const r = await rifle.atacar({ alvo: __token('Alvo') });
          const tiro = { resultado: r.linhas[0].resultado, notas: r.linhas[0].notas.join(' '), hp: alvo.system.hp.value };
          botao().click();
          await __esperar(() => !alvo.statuses.has('${S}-em-cobertura') && botao()?.textContent.trim() === 'PROTEGER-SE');
          return { antes, marcado, tiro, depois: alvo.statuses.has('${S}-em-cobertura') };
        } finally {
          await alvo.sheet.close();
          if (alvo.statuses.has('${S}-em-cobertura')) await alvo.toggleStatusEffect('${S}-em-cobertura', { active: false });
          await rifle.update({ 'system.pente.value': pente });
        }
      })()`);
      const { antes, marcado, tiro } = info;
      const ok = antes.texto === 'PROTEGER-SE' && !antes.marca && marcado.texto === 'EM COBERTURA' && marcado.noToken
        && tiro.resultado === 'acertou' && tiro.notas.includes('Alvo está em cobertura') && tiro.notas.includes('o mestre decide') && tiro.hp === 45 && !info.depois;
      return [ok, JSON.stringify(info)];
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

    await r.passo('Solo, Consciência de Combate: Reação de Iniciativa, Detecção de Ameaça, Ataque de Precisão e Recuperação de Falhas', async () => {
      // Pontos: Reação 2, Precisão 3 (+1), Detecção 2, Recuperação 4. Ataque com o 1 natural: sem tirar d10 (o 9 da fila
      // não é usado). 8 + 4 + 1 (Precisão) + 1 = 14 contra DV 16: erra.
      await fixar(edge, [[1, 10], [9, 10]]);
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const pente = a.items.getName('Assault Rifle').system.pente.value;
        await a.update({ 'system.role.habilidades': _replace({ 'Initiative Reaction': 2, 'Precision Attack': 3, 'Threat Detection': 2, 'Fumble Recovery': 4 }) });
        const partes = a.items.getName('Assault Rifle').partesDoAtaque().partes.map(p => p.rotulo + ' ' + p.valor);
        const r = await a.items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') });
        const m = game.messages.contents.findLast(x => x.getFlag('${S}', 'teste')?.ataque);
        const resultado = { ini: a.system.iniciativa, percepcao: a.system.pericia('perception').bonus, partes, ataque: r.ataque, critico: m.getFlag('${S}', 'teste').critico, formula: m.rolls[0].formula, sobrou: window.__fila.length };
        window.__fila = [];
        await a.update({ 'system.role.habilidades': _replace({}) });
        await a.items.getName('Assault Rifle').update({ 'system.pente.value': pente });
        return resultado;
      })()`);
      return [info.ini === 12 && info.percepcao === 2 && info.partes.includes('Ataque de Precisão 1') && info.ataque === 14 && info.critico === null && /1d10xo/.test(info.formula) && info.sobrou === 1, JSON.stringify(info)];
    });

    await r.passo('Solo: Ponto Fraco (+2 no dano) e Deflexão de Dano (−1) só no primeiro acerto e no primeiro dano da rodada; o Desfazer devolve; voltam na rodada seguinte', async () => {
      // Atiradora com Ponto Fraco 2; Alvo com Deflexão 2 (−1). Rodada 1: um tiro desfeito e mais dois; rodada 2: um tiro.
      // Cada tiro: d10 8 → 8 + 4 + 8 = 20 contra DV 16. Dano 5d6: 3 + 3 + 3 + 3 + 3 = 15.
      const tiro = '[[8, 10], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]';
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const alvo = __ator('Alvo');
        const pente = a.items.getName('Assault Rifle').system.pente.value;
        await a.update({ 'system.role.habilidades': _replace({ 'Spot Weakness': 2 }) });
        await alvo.update({ 'system.role.habilidades': _replace({ 'Damage Deflection': 2 }), 'system.hp.value': 45 });
        const cena = canvas.scene;
        const combate = await Combat.implementation.create({ scene: cena.id, active: true });
        await combate.createEmbeddedDocuments('Combatant', ['Atiradora', 'Alvo'].map(n => ({ tokenId: __token(n).id, sceneId: cena.id, actorId: __ator(n).id })));
        await combate.startCombat();
        const tiros = [];
        const atirar = async () => {
          window.__fila = ${tiro};
          const sp = alvo.system.armadura.corpo.sp;
          const r = await a.items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') });
          const d = r.linhas[0].dano;
          tiros.push({ rodada: combate.round, sp, dano: d.dano, pontoFraco: d.pontoFraco, deflexao: d.deflexao, recebido: d.recebido });
        };
        await atirar();
        const desfeito = await game.system.api.combate.desfazer(game.messages.contents.findLast(m => m.getFlag('${S}', 'desfazer')?.length));
        const hpDesfeito = alvo.system.hp.value;
        await atirar();
        await atirar();
        await combate.nextRound();
        await atirar();
        await combate.delete();
        await a.update({ 'system.role.habilidades': _replace({}) });
        await a.items.getName('Assault Rifle').update({ 'system.pente.value': pente });
        await alvo.update({ 'system.role.habilidades': _replace({}), 'system.hp.value': 45 });
        return { desfeito, hpDesfeito, tiros };
      })()`);
      const [t0, t1, t2, t3] = info.tiros;
      const ok = info.desfeito === true && info.hpDesfeito === 45 && t0.dano === 17 && t0.pontoFraco === 2 && t0.deflexao === 1 && t1.sp === t0.sp
        && t1.rodada === 1 && t1.dano === 17 && t1.pontoFraco === 2 && t1.deflexao === 1 && t1.recebido === 17 - t1.sp - 1
        && t2.rodada === 1 && t2.dano === 15 && t2.pontoFraco === 0 && t2.deflexao === 0 && t2.recebido === 15 - t2.sp
        && t3.rodada === 2 && t3.dano === 17 && t3.pontoFraco === 2 && t3.deflexao === 1 && t3.recebido === 17 - t3.sp - 1;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('munição de borracha: não mata (fica com 1 HP), não tira SP e não causa lesão crítica, nem com dois 6', async () => {
      // Pistola pesada com borracha, a 10 m do Alvo (HP 10): d10 9 → REF 8 + Pistola 4 + 9 = 21 contra DV 15.
      // Dano 3d6: 6 + 6 + 5 = 17, crítico (+5). Letal, passaria do HP; de borracha, o Alvo fica com 1.
      await fixar(edge, [[9, 10], [6, 6], [6, 6], [5, 6]]);
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const alvo = __ator('Alvo');
        const balas = foundry.utils.deepClone(cat['core_ammo:heavy-pistol-rubber']);
        balas.system.quantidade = 8;
        const pistola = foundry.utils.deepClone(cat['core_weapons:heavy-pistol']);
        pistola.system.equipada = true;
        const criados = await a.createEmbeddedDocuments('Item', [pistola, balas]);
        // O Foundry não garante a ordem do que cria: cada um pelo tipo.
        const arma = criados.find(i => i.type === 'arma');
        const municao = criados.find(i => i.type === 'municao');
        await arma.recarregar();
        await alvo.update({ 'system.hp.value': 10 });
        const sp = alvo.system.armadura.corpo.sp;
        const r = await arma.atacar({ alvo: __token('Alvo') });
        const [l] = r.linhas;
        const resultado = {
          ataque: r.ataque, dv: l.dv, resultado: l.resultado, critico: l.dano?.critico, lesoesNoCartao: l.dano?.lesoes.length, notas: l.notas, ablacao: municao.system.ablacao,
          sp, spDepois: alvo.system.armadura.corpo.sp, hp: alvo.system.hp.value, lesoes: alvo.items.filter(i => i.type === 'lesao').length, sobrou: window.__fila.length
        };
        await a.deleteEmbeddedDocuments('Item', [arma.id, municao.id]);
        await alvo.update({ 'system.hp.value': 45 });
        return resultado;
      })()`);
      return [info.ataque === 21 && info.dv === 15 && info.resultado === 'acertou' && info.critico === true && info.lesoesNoCartao === 0 && info.lesoes === 0 && info.notas.includes('Munição de borracha: sem lesão crítica.')
        && info.hp === 1 && info.ablacao === 0 && info.spDepois === info.sp && info.sobrou === 0, JSON.stringify(info)];
    });

    await r.passo('munição que não causa dano (granada venenosa): explode na área, mas ninguém perde HP; o cartão diz o efeito da wiki', async () => {
      // Lança-granadas com a granada venenosa, no Alvo a 10 m: d10 9 → REF 8 + Armas Pesadas 4 + 9 = 21 contra DV 15. O
      // Capanga, a 2 m do Alvo, também é pego. Nenhum dado de dano é rolado.
      await fixar(edge, [[9, 10]]);
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const granada = foundry.utils.deepClone(cat['core_ammo:grenade-poison']);
        granada.system.quantidade = 1;
        const lanca = foundry.utils.deepClone(cat['core_weapons:grenade-launcher']);
        lanca.system.equipada = true;
        const criados = await a.createEmbeddedDocuments('Item', [lanca, granada]);
        // O Foundry não garante a ordem do que cria: cada um pelo tipo.
        const arma = criados.find(i => i.type === 'arma');
        const municao = criados.find(i => i.type === 'municao');
        await a.update({ 'system.pericias.heavy-weapons.nivel': 4 });
        await arma.recarregar();
        const antes = { alvo: __ator('Alvo').system.hp.value, capanga: __ator('Capanga').system.hp.value };
        const r = await arma.atacar({ alvo: __token('Alvo') });
        const cartao = game.messages.contents.at(-1);
        const resultado = {
          cabecalho: r.cabecalho, linhas: r.linhas.map(l => ({ nome: l.nome, resultado: l.resultado, dano: l.dano, notas: l.notas })), antes,
          depois: { alvo: __ator('Alvo').system.hp.value, capanga: __ator('Capanga').system.hp.value }, desfazer: cartao.getFlag('${S}', 'desfazer')?.length ?? null, sobrou: window.__fila.length
        };
        await a.deleteEmbeddedDocuments('Item', [arma.id, municao.id]);
        return resultado;
      })()`);
      const nota = 'Grenade (Poison): não causa dano. Quem é atingido faz Resistir a Tortura/Drogas DV13 ou sofre 2d6 direto no HP. O mestre resolve.';
      const ok = /explodiu/.test(info.cabecalho) && info.linhas.length === 2 && info.linhas.every(l => l.resultado === 'acertou' && !l.dano && l.notas.includes(nota))
        && info.depois.alvo === info.antes.alvo && info.depois.capanga === info.antes.capanga && info.desfazer === 0 && info.sobrou === 0;
      return [ok, JSON.stringify(info)];
    });

    // ---------- Armas de 2077 (a página de 2077 da wiki) ----------
    // Ajudantes no navegador do mestre: pôr uma arma de 2077 (e a munição, carregada) na Atiradora; a linha dela na
    // ficha; os avisos que o ataque daria; a fórmula e as partes do último teste de ataque.
    await edge.evaluate(`(() => {
      window.__arma2077 = async (idArma, idMunicao, quantidade) => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const arma = foundry.utils.deepClone(cat[idArma]);
        arma.system.equipada = true;
        const municao = foundry.utils.deepClone(cat[idMunicao]);
        municao.system.quantidade = quantidade;
        const criados = await __ator('Atiradora').createEmbeddedDocuments('Item', [arma, municao]);
        const pronta = criados.find(i => i.type === 'arma');
        await pronta.recarregar();
        return { arma: pronta, municao: criados.find(i => i.type === 'municao') };
      };
      // Instala um cyberware de 2077 na Atiradora e, ao tirar, devolve a Humanidade de antes: desinstalar não a devolve
      // (só a terapia), e os passos seguintes contam com ela.
      window.__humanidadeAntes = {};
      window.__cyber2077 = async id => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const [item] = await __ator('Atiradora').createEmbeddedDocuments('Item', [foundry.utils.deepClone(cat[id])]);
        window.__humanidadeAntes[item.id] = __ator('Atiradora').system.humanidade.value;
        await __ator('Atiradora').instalarCyberware(item, { rolar: false });
        return item;
      };
      window.__tirarCyber = async item => {
        await __ator('Atiradora').desinstalarCyberware(item);
        await item.delete();
        const antes = window.__humanidadeAntes[item.id];
        if (antes !== undefined) await __ator('Atiradora').update({ 'system.humanidade.value': antes });
        delete window.__humanidadeAntes[item.id];
      };
      window.__linhaDaArma = arma => document.querySelector('.application.ficha-personagem tr[data-item-id="' + arma.id + '"]');
      window.__comAvisos = async acao => {
        const avisos = [];
        ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
        try { return { r: await acao(), avisos }; } finally { delete ui.notifications.warn; }
      };
      window.__ultimoTeste = () => {
        const m = game.messages.contents.findLast(x => x.getFlag('${S}', 'teste')?.ataque);
        return { formula: m.rolls[0].formula, partes: [...new DOMParser().parseFromString(m.content, 'text/html').querySelectorAll('.partes li')].map(li => li.textContent.trim()) };
      };
      window.__armaduraDoAlvo = sp => __ator('Alvo').items.getName('Light Armorjack (Body)').update({ 'system.sp.corpo.value': sp });
      return true;
    })()`);

    await r.passo('arma Smart (2077): sem o Smart Link não dispara nem gasta bala; com ele, o tiro é o teste Smart 12 + 1d10 (+1 da qualidade) no lugar de REF + perícia; o mirado continua REF + perícia; na configuração "alternativa", só pelo botão Smart', async () => {
      // Yukimura (Smart de três balas, excelente) contra o Alvo a 10 m: DV 15 (Pistol). Com o Smart Link: d10 5 → 12 + 1 + 5
      // = 18, acerta (2d6: 5 + 4 = 9, a armadura segura). Mirado na cabeça: d10 9 → 8 + 4 + 1 − 8 + 9 = 14, erra.
      // Alternativa: o "Atacar" d10 2 → 8 + 4 + 1 + 2 = 15, erra; o botão Smart d10 4 → 12 + 1 + 4 = 17, acerta (1 + 1).
      await fixar(edge, [[5, 10], [5, 6], [4, 6], [9, 10], [2, 10], [4, 10], [1, 6], [1, 6]]);
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const alvo = __token('Alvo');
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        await __armaduraDoAlvo(11);
        const { arma, municao } = await __arma2077('armas-2077:arasaka-hjke-11-yukimura', 'core_ammo:medium-pistol-basic', 30);
        await a.sheet.render({ force: true });
        await __esperar(() => __linhaDaArma(arma));
        const linha = () => ({ avisos: [...(__linhaDaArma(arma)?.querySelectorAll('.aviso-2077') ?? [])].map(e => e.textContent.trim()), ataque: __linhaDaArma(arma)?.querySelector('td.num')?.textContent.trim(),
          dica: __linhaDaArma(arma)?.querySelector('td.num')?.dataset.tooltip ?? '', botoes: [...(__linhaDaArma(arma)?.querySelectorAll('button[data-modo]') ?? [])].map(b => b.dataset.modo) });
        const semLink = { ...(await __comAvisos(() => arma.atacar({ alvo }))), pente: arma.system.pente.value, ficha: linha() };
        const link = await __cyber2077('cyberware-2077:smart-link');
        await __esperar(() => !linha().avisos.length);
        const ficha = linha();
        const tiro = await arma.atacar({ alvo });
        const teste = __ultimoTeste();
        const mirado = await arma.atacar({ alvo, local: 'cabeca' });
        const testeMirado = __ultimoTeste();
        await game.settings.set('${S}', 'smartAtaque', 'alternativa');
        await a.sheet.render();
        await __esperar(() => linha().botoes.includes('smart'));
        const fichaAlternativa = linha();
        const comum = await arma.atacar({ alvo });
        const peloBotao = await arma.atacar({ alvo, modo: 'smart' });
        await game.settings.set('${S}', 'smartAtaque', 'substitui');
        const resultado = {
          semLink: { r: semLink.r, avisos: semLink.avisos, pente: semLink.pente, ficha: semLink.ficha }, ficha, fichaAlternativa,
          tiro: { ataque: tiro.ataque, descricao: tiro.descricao, notas: tiro.notas, linhas: __linhas(tiro), teste },
          mirado: { ataque: mirado.ataque, descricao: mirado.descricao, formula: testeMirado.formula },
          comum: { ataque: comum.ataque, descricao: comum.descricao }, peloBotao: { ataque: peloBotao.ataque, descricao: peloBotao.descricao },
          pente: arma.system.pente.value, sobrou: window.__fila.length
        };
        await a.sheet.close();
        await __tirarCyber(link);
        await a.deleteEmbeddedDocuments('Item', [arma.id, municao.id]);
        return resultado;
      })()`);
      const { semLink, ficha, fichaAlternativa, tiro, mirado, comum, peloBotao } = info;
      const [l] = tiro.linhas;
      const ok = semLink.r === null && semLink.pente === 30 && semLink.avisos.join() === 'Arasaka HJKE-11 Yukimura: arma Smart, só dispara com o cyberware Smart Link instalado.'
        && semLink.ficha.avisos.join() === 'sem Smart Link' && semLink.ficha.dica === ''
        && ficha.avisos.length === 0 && ficha.ataque === '+13' && /Teste Smart: 12 \+ 1d10/.test(ficha.dica) && !ficha.botoes.includes('smart')
        && tiro.ataque === 18 && tiro.descricao === 'Tiro Smart' && tiro.notas.includes('Teste Smart: 12 + 1d10 no lugar de REF + perícia.')
        && tiro.teste.formula === '1d10crit + 12 + 1' && tiro.teste.partes.includes('Teste Smart +12') && !tiro.teste.partes.some(p => /^REF/.test(p))
        && l.dv === 15 && l.resultado === 'acertou' && l.dano?.dano === 9 && l.dano.recebido === 0
        && mirado.ataque === 14 && mirado.descricao === 'Tiro mirado na cabeça' && mirado.formula === '1d10crit + 8 + 4 + 1 - 8'
        && fichaAlternativa.botoes.includes('smart') && comum.ataque === 15 && comum.descricao === 'Tiro' && peloBotao.ataque === 17 && peloBotao.descricao === 'Tiro Smart'
        && info.pente === 26 && info.sobrou === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('ricochete (Power, 2077): DV da tabela de autofogo da SMG (17 a 10 m) e um dado a menos de dano; o Ballistic Coprocessor dá +2; arma que não é Power não ricocheteia', async () => {
      // Liberty (pistola pesada Power, 3d6) contra o Alvo a 10 m (SP 5): d10 6 → 8 + 4 + 6 = 18 contra 17. Dano 2d6 (o
      // terceiro dado da fila sobra): 5 + 4 = 9, passam 4. Com o coprocessador: d10 6 → 20 (dano 1 + 1, a armadura segura).
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const alvo = __token('Alvo');
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        await __armaduraDoAlvo(5);
        const { arma, municao } = await __arma2077('armas-2077:constitutional-arms-liberty', 'core_ammo:heavy-pistol-basic', 12);
        await a.sheet.render({ force: true });
        await __esperar(() => __linhaDaArma(arma));
        const botao = () => __linhaDaArma(arma)?.querySelector('button[data-modo="ricochete"]');
        const ficha = { botao: Boolean(botao()), dica: botao()?.dataset.tooltip ?? '' };
        window.__fila = [[6, 10], [5, 6], [4, 6], [3, 6]];
        const r1 = await arma.atacar({ alvo, modo: 'ricochete' });
        const sobrou = window.__fila.length;
        const teste1 = __ultimoTeste();
        const cop = await __cyber2077('cyberware-2077:ballistic-coprocessor');
        await __esperar(() => /Coprocessor/.test(botao()?.dataset.tooltip ?? ''));
        window.__fila = [[6, 10], [1, 6], [1, 6]];
        const r2 = await arma.atacar({ alvo, modo: 'ricochete' });
        const teste2 = __ultimoTeste();
        const rifle = a.items.getName('Assault Rifle');
        const penteDoRifle = rifle.system.pente.value;
        const naoPower = await __comAvisos(() => rifle.atacar({ alvo, modo: 'ricochete' }));
        const resultado = {
          ficha, coprocessadorNaFicha: botao()?.dataset.tooltip ?? '',
          r1: { ataque: r1.ataque, descricao: r1.descricao, notas: r1.notas, linhas: __linhas(r1), formula: teste1.formula }, sobrou,
          r2: { ataque: r2.ataque, formula: teste2.formula, partes: teste2.partes, linhas: __linhas(r2) },
          naoPower: { r: naoPower.r, avisos: naoPower.avisos, gastou: penteDoRifle - rifle.system.pente.value },
          pente: arma.system.pente.value, sp: __ator('Alvo').system.armadura.corpo.sp, hp: __ator('Alvo').system.hp.value, fila: window.__fila.length
        };
        await a.sheet.close();
        await __tirarCyber(cop);
        await a.deleteEmbeddedDocuments('Item', [arma.id, municao.id]);
        await __armaduraDoAlvo(11);
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        return resultado;
      })()`);
      const { r1, r2, naoPower } = info;
      const [l1] = r1.linhas;
      const ok = info.ficha.botao && !/Coprocessor/.test(info.ficha.dica) && /Ballistic Coprocessor: \+2/.test(info.coprocessadorNaFicha)
        && r1.ataque === 18 && r1.descricao === 'Ricochete' && r1.formula === '1d10crit + 8 + 4' && l1.dv === 17 && l1.resultado === 'acertou'
        && l1.dano?.dano === 9 && l1.dano.recebido === 4 && l1.dano.ablado === 1 && info.sobrou === 1
        && r1.notas.includes('Ricochete: DV da tabela SMG (Autofire) e 2d6 de dano (um dado a menos).')
        && r2.ataque === 20 && r2.formula === '1d10crit + 8 + 4 + 2' && r2.partes.includes('Ballistic Coprocessor +2') && r2.linhas[0].dano?.recebido === 0
        && naoPower.r === null && naoPower.gastou === 0 && naoPower.avisos.join() === 'Assault Rifle: só as armas Power de tiro único ricocheteiam (as que disparam três balas ou mais, não).'
        && info.pente === 10 && info.hp === 41 && info.sp === 4 && info.fila === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('carga Tech (2077): a janela pergunta a cobertura; através da fina chega metade e a armadura perde 2; a arma esfria (bloqueada nas rodadas 1 e 2, carrega na 3); sem cobertura abla 4; o Desfazer tira a marca; a rajada (×2, 2 balas, tabela de autofogo da SMG) passa 25% da fina e nem oferece a grossa', async () => {
      // Kenshin (Tech, 2d6, excelente) com flechettes, contra o Alvo a 10 m (DV 15). Rodada 1, carga através de cobertura
      // fina: d10 6 → 8 + 4 + 1 + 6 = 19; dano 6 + 5 = 11, chegam 5 contra SP 4: passa 1; a armadura perde 2 (não o 2
      // da flechette por acaso: a carga sem cobertura abla 4). Rodada 3, pela ficha, sem cobertura (SP 6): dano 4 + 3 = 7,
      // passa 1, a armadura perde 4. Desfeita, a rajada através da fina (SP 2): d10 8 → 8 + 4 + 1 + 8 = 21 contra 17 (SMG
      // Autofire): ×2 (o máximo da Kenshin); 2d6 5 + 4 = 9 × 2 = 18, chegam 4, passam 2; a armadura perde 2.
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const alvo = __token('Alvo');
        await a.update({ 'system.pericias.autofire.nivel': 4 });
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        await __armaduraDoAlvo(4);
        const { arma, municao } = await __arma2077('armas-2077:arasaka-jke-x2-kenshin', 'armas-2077:flechettes-tech-pistola-media', 12);
        const cena = canvas.scene;
        const combate = await Combat.implementation.create({ scene: cena.id, active: true });
        await combate.createEmbeddedDocuments('Combatant', ['Atiradora', 'Alvo'].map(n => ({ tokenId: __token(n).id, sceneId: cena.id, actorId: __ator(n).id })));
        await combate.startCombat();
        await a.sheet.render({ force: true });
        await __esperar(() => __linhaDaArma(arma));
        const linha = () => ({ avisos: [...(__linhaDaArma(arma)?.querySelectorAll('.aviso-2077') ?? [])].map(e => e.textContent.trim()), botoes: [...(__linhaDaArma(arma)?.querySelectorAll('button[data-modo]') ?? [])].map(b => b.textContent.trim()) });
        // A janela que fecha fica no DOM até a animação acabar (classe "minimizing"): só a aberta conta.
        const janela = () => document.querySelector('.application.dialog.cobertura:not(.minimizing)');
        // Responde a janela da cobertura e devolve as opções que ela tinha.
        const responder = async escolha => {
          await __esperar(() => janela()?.querySelector('button[data-action="' + escolha + '"]'));
          const opcoes = [...janela().querySelectorAll('.form-footer button')].map(b => b.dataset.action);
          janela().querySelector('button[data-action="' + escolha + '"]').click();
          return opcoes;
        };
        try {
          const fichaAntes = linha();
          // Rodada 1: carga através de cobertura fina (pela janela).
          window.__fila = [[6, 10], [6, 6], [5, 6]];
          const promessa1 = arma.atacar({ alvo, modo: 'carga' });
          const opcoesDaCarga = await responder('fina');
          const r1 = await promessa1;
          const marca1 = arma.getFlag('${S}', 'carga');
          const fila1 = window.__fila.length;
          const sp1 = __ator('Alvo').system.armadura.corpo.sp;
          await __esperar(() => linha().avisos.length);
          const fichaEsfriando = linha();
          const bloqueio1 = await __comAvisos(() => arma.atacar({ alvo, modo: 'carga', cobertura: 'nenhuma' }));
          await combate.nextRound();
          const bloqueio2 = await __comAvisos(() => arma.atacar({ alvo, modo: 'rajadaTech', cobertura: 'nenhuma' }));
          await combate.nextRound();
          await __esperar(() => !linha().avisos.length);
          const fichaRodada3 = linha();
          // Rodada 3: carga sem cobertura, pelo botão da ficha, no alvo marcado.
          await __armaduraDoAlvo(6);
          canvas.tokens.setTargets([alvo.id]);
          window.__fila = [[6, 10], [4, 6], [3, 6]];
          const antes = game.messages.size;
          // Ctrl + clique: direto, sem a janela de rolagem (o passo da janela confere o clique comum).
          __linhaDaArma(arma).querySelector('button[data-modo="carga"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          const opcoesPelaFicha = await responder('nenhuma');
          await __esperar(() => game.messages.contents.slice(antes).some(m => m.getFlag('${S}', 'ataque')));
          const cartao3 = game.messages.contents.slice(antes).find(m => m.getFlag('${S}', 'ataque'));
          const r3 = cartao3.getFlag('${S}', 'ataque');
          const marca3 = arma.getFlag('${S}', 'carga');
          const depois3 = { sp: __ator('Alvo').system.armadura.corpo.sp, hp: __ator('Alvo').system.hp.value, pente: arma.system.pente.value };
          const desfeito = await game.system.api.combate.desfazer(cartao3);
          const depoisDoDesfazer = { marca: arma.getFlag('${S}', 'carga') ?? null, esfria: game.system.api.combate.esfriaAte(arma), sp: __ator('Alvo').system.armadura.corpo.sp, hp: __ator('Alvo').system.hp.value };
          // Ainda na rodada 3 (a marca saiu): a rajada através da fina; a janela não oferece a grossa.
          await __armaduraDoAlvo(2);
          window.__fila = [[8, 10], [5, 6], [4, 6]];
          const promessa4 = arma.atacar({ alvo, modo: 'rajadaTech' });
          const opcoesDaRajada = await responder('fina');
          const r4 = await promessa4;
          await __esperar(() => linha().avisos.length);
          const fichaDepoisDaRajada = linha();
          // O combate acaba: a ficha aberta deixa de mostrar a arma esfriando.
          await combate.delete();
          await __esperar(() => !linha().avisos.length);
          const fichaSemCombate = linha();
          const resultado = {
            fichaAntes, fichaEsfriando, fichaRodada3, fichaDepoisDaRajada, fichaSemCombate, opcoesDaCarga, opcoesPelaFicha, opcoesDaRajada,
            r1: { ataque: r1.ataque, descricao: r1.descricao, notas: r1.notas, linhas: __linhas(r1), notasDaLinha: r1.linhas[0].notas }, marca1: marca1 && { ok: marca1.combate === combate.id, rodada: marca1.rodada }, fila1, sp1,
            bloqueio1: { r: bloqueio1.r, avisos: bloqueio1.avisos }, bloqueio2: { r: bloqueio2.r, avisos: bloqueio2.avisos },
            r3: { descricao: r3.descricao, dano: r3.linhas[0].dano && { dano: r3.linhas[0].dano.dano, recebido: r3.linhas[0].dano.recebido, ablado: r3.linhas[0].dano.ablado } }, marca3: marca3?.rodada, depois3,
            desfeito, depoisDoDesfazer,
            r4: { ataque: r4.ataque, descricao: r4.descricao, linhas: __linhas(r4), notasDaLinha: r4.linhas[0].notas },
            pente: arma.system.pente.value, sp: __ator('Alvo').system.armadura.corpo.sp, hp: __ator('Alvo').system.hp.value, fila: window.__fila.length
          };
          return resultado;
        } finally {
          // Mesmo se algo falhar no meio: nenhuma janela, alvo marcado, combate ou arma fica para os passos seguintes.
          for (const app of [...foundry.applications.instances.values()].filter(app => app.options.classes?.includes('cobertura'))) await app.close();
          canvas.tokens.setTargets([]);
          await a.sheet.close();
          if (game.combats.has(combate.id)) await combate.delete();
          await a.deleteEmbeddedDocuments('Item', [arma.id, municao.id]);
          await __armaduraDoAlvo(11);
          await __ator('Alvo').update({ 'system.hp.value': 45 });
        }
      })()`);
      const { r1, r3, r4, depois3, depoisDoDesfazer } = info;
      const [l1] = r1.linhas;
      const [l4] = r4.linhas;
      const esfriando = 'Arasaka JKE-X2 Kenshin: ainda está esfriando: carrega de novo na rodada 3.';
      const ok = info.fichaAntes.botoes.join() === 'Carga,Rajada ×2' && info.fichaAntes.avisos.length === 0 && info.fichaEsfriando.avisos.join() === 'esfriando: carga na rodada 3' && info.fichaRodada3.avisos.length === 0
        && info.fichaDepoisDaRajada.avisos.join() === 'esfriando: carga na rodada 5' && info.fichaSemCombate.avisos.length === 0
        && info.opcoesDaCarga.join() === 'nenhuma,fina,grossa' && info.opcoesPelaFicha.join() === 'nenhuma,fina,grossa' && info.opcoesDaRajada.join() === 'nenhuma,fina'
        && r1.ataque === 19 && r1.descricao === 'Carga Tech através de cobertura fina' && l1.dv === 15 && l1.dano?.dano === 5 && l1.dano.recebido === 1 && l1.dano.ablado === 2
        && r1.notasDaLinha.includes('5 dos 11 de dano atravessaram a cobertura fina; o resto ficou nela.')
        && r1.notas.includes('Carga Tech através de cobertura fina: chega 50% do dano, e a armadura perde 2 de SP se o dano passar dela. A arma esfria uma rodada.')
        && info.marca1?.ok && info.marca1.rodada === 1 && info.fila1 === 0 && info.sp1 === 2
        && info.bloqueio1.r === null && info.bloqueio1.avisos.join() === esfriando && info.bloqueio2.r === null && info.bloqueio2.avisos.join() === esfriando
        && r3.descricao === 'Carga Tech' && r3.dano?.dano === 7 && r3.dano.recebido === 1 && r3.dano.ablado === 4 && info.marca3 === 3 && depois3.sp === 2 && depois3.hp === 43 && depois3.pente === 10
        && info.desfeito === true && depoisDoDesfazer.marca === null && depoisDoDesfazer.esfria === null && depoisDoDesfazer.sp === 6 && depoisDoDesfazer.hp === 44
        && r4.ataque === 21 && r4.descricao === 'Rajada Tech através de cobertura fina' && l4.dv === 17 && l4.mult === 2 && l4.dano?.dano === 4 && l4.dano.recebido === 2 && l4.dano.ablado === 2
        && r4.notasDaLinha.includes('4 dos 18 de dano atravessaram a cobertura fina; o resto ficou nela.')
        && info.pente === 8 && info.sp === 0 && info.hp === 42 && info.fila === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('os dois canos (2077): a Palica dispara os dois com o teste Smart 12 + 1d10; a Testera, com 4d6; cada um gasta 2 cartuchos, e com 1 no pente não dá; nas que só disparam cartucho não há Ricochete', async () => {
      // O Capanga vai para x 500 (4 m), dentro dos 6 m do cartucho. Palica, os dois canos: d10 3 → 12 + 3 = 15 > 13; dano
      // 3d6: 2 + 2 + 2 = 6. Testera, os dois cartuchos: d10 5 → REF 8 + Armas Pesadas 4 + 5 = 17 > 13; dano 4d6:
      // 1 + 2 + 3 + 4 = 10 (o quinto dado da fila sobra).
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const capanga = __token('Capanga');
        const hpDoCapanga = __ator('Capanga').system.hp.value;
        const criados = [];
        let link = null;
        try {
          await capanga.update({ x: 500 }, { animate: false });
          await __esperar(() => canvas.tokens.get(capanga.id)?.document.x === 500);
          link = await __cyber2077('cyberware-2077:smart-link');
          const palica = await __arma2077('armas-2077:rostovic-db-4-palica', 'core_ammo:shotgun-shell-basic', 4);
          const testera = await __arma2077('armas-2077:rostovic-db-2-testera', 'core_ammo:shotgun-shell-basic', 4);
          criados.push(palica.arma.id, palica.municao.id, testera.arma.id, testera.municao.id);
          await a.update({ 'system.pericias.heavy-weapons.nivel': 4 });
          await a.sheet.render({ force: true });
          await __esperar(() => __linhaDaArma(palica.arma) && __linhaDaArma(testera.arma));
          const botoes = arma => [...(__linhaDaArma(arma)?.querySelectorAll('button[data-modo]') ?? [])].map(b => b.dataset.modo);
          const ficha = { palica: botoes(palica.arma), testera: botoes(testera.arma) };
          window.__fila = [[3, 10], [2, 6], [2, 6], [2, 6]];
          const r1 = await palica.arma.atacar({ alvo: capanga, modo: 'doisCanos' });
          const teste1 = __ultimoTeste();
          window.__fila = [[5, 10], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]];
          const r2 = await testera.arma.atacar({ alvo: capanga, modo: 'doisCanos' });
          const teste2 = __ultimoTeste();
          const penteDaTestera = testera.arma.system.pente.value;
          const sobrou = window.__fila.length;
          window.__fila = [];
          await testera.arma.update({ 'system.pente.value': 1 });
          const umSo = await __comAvisos(() => testera.arma.atacar({ alvo: capanga, modo: 'doisCanos' }));
          const resumo = r => ({ ataque: r.ataque, descricao: r.descricao, notas: r.notas, linhas: __linhas(r) });
          return {
            ficha, r1: { ...resumo(r1), formula: teste1.formula, pente: palica.arma.system.pente.value }, r2: { ...resumo(r2), formula: teste2.formula, pente: penteDaTestera }, sobrou,
            umSo: { r: umSo.r, avisos: umSo.avisos, pente: testera.arma.system.pente.value }, perdeu: hpDoCapanga - __ator('Capanga').system.hp.value
          };
        } finally {
          await a.sheet.close();
          if (link) await __tirarCyber(link);
          await a.deleteEmbeddedDocuments('Item', criados);
          await __ator('Capanga').update({ 'system.hp.value': hpDoCapanga });
          await capanga.update({ x: 900 }, { animate: false });
          await __esperar(() => canvas.tokens.get(capanga.id)?.document.x === 900);
        }
      })()`);
      const { r1, r2, umSo } = info;
      const ok = info.ficha.palica.join() === 'doisCanos' && info.ficha.testera.join() === 'doisCanos'
        && r1.ataque === 15 && r1.formula === '1d10crit + 12' && r1.descricao === 'Espingarda com cartucho (Smart), os dois canos' && r1.pente === 0
        && r1.notas.includes('Teste Smart: 12 + 1d10 no lugar de REF + perícia.') && r1.notas.includes('Os dois canos de uma vez: gastou 2 cartuchos.')
        && r1.linhas[0].resultado === 'acertou' && r1.linhas[0].dano?.dano === 6
        && r2.ataque === 17 && r2.formula === '1d10crit + 8 + 4' && r2.descricao === 'Espingarda com cartucho, os dois canos'
        && r2.notas.includes('Os dois canos de uma vez: gastou 2 cartuchos, e o dano é 4d6.') && r2.linhas[0].dano?.dano === 10 && r2.pente === 0 && info.sobrou === 1
        && umSo.r === null && umSo.pente === 1 && umSo.avisos.join() === 'Rostovic DB-2 Testera: precisa de 2 balas no pente (tem 1). Recarregue.'
        && info.perdeu === 16;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('Dian e Lexington (2077): a coronha recolhida pelo botão da ficha dá −1 no ataque (o aviso aparece, e o botão estende de volta); o autofogo da Lexington gasta 7 balas, e com menos não dá', async () => {
      // Dian (Smart, excelente) contra o Alvo a 10 m (DV 13, SMG): com a coronha recolhida, d10 7 → 10 + 1 − 1 + 7 = 17;
      // dano 2d6: 1 + 1. Lexington, autofogo no Alvo a 10 m: d10 9 → REF 8 + Autofogo 4 + 9 = 21 contra 17 (SMG Autofire):
      // ×2 (o máximo da arma), 2d6: 1 + 1 = 2 × 2 = 4, a armadura segura.
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const alvo = __token('Alvo');
        const hpDoAlvo = __ator('Alvo').system.hp.value;
        const criados = [];
        let link = null;
        try {
          link = await __cyber2077('cyberware-2077:smart-link');
          const dian = await __arma2077('armas-2077:kang-tao-g-58-dian', 'core_ammo:medium-pistol-basic', 30);
          const lex = await __arma2077('armas-2077:militech-m-10af-lexington', 'core_ammo:medium-pistol-basic', 21);
          criados.push(dian.arma.id, dian.municao.id, lex.arma.id, lex.municao.id);
          await a.update({ 'system.pericias.autofire.nivel': 4 });
          await a.sheet.render({ force: true });
          await __esperar(() => __linhaDaArma(dian.arma) && __linhaDaArma(lex.arma));
          const linha = arma => ({ ataque: __linhaDaArma(arma)?.querySelector('td.num')?.textContent.trim(), avisos: [...(__linhaDaArma(arma)?.querySelectorAll('.aviso-2077') ?? [])].map(e => e.textContent.trim()),
            alternar: [...(__linhaDaArma(arma)?.querySelectorAll('button[data-action="alternarCoronha"]') ?? [])].map(b => b.textContent.trim()) });
          const estendida = linha(dian.arma);
          __linhaDaArma(dian.arma).querySelector('button[data-action="alternarCoronha"]').click();
          await __esperar(() => linha(dian.arma).avisos.length);
          const recolhida = linha(dian.arma);
          window.__fila = [[7, 10], [1, 6], [1, 6]];
          const tiro = await dian.arma.atacar({ alvo });
          const testeDian = __ultimoTeste();
          __linhaDaArma(dian.arma).querySelector('button[data-action="alternarCoronha"]').click();
          await __esperar(() => !linha(dian.arma).avisos.length);
          const deVolta = { ...linha(dian.arma), flag: dian.arma.getFlag('${S}', 'coronhaRecolhida') };
          const dicaDoAutofogo = __linhaDaArma(lex.arma)?.querySelector('button[data-modo="autofogo"]')?.dataset.tooltip ?? '';
          window.__fila = [[9, 10], [1, 6], [1, 6]];
          const rajada = await lex.arma.atacar({ alvo, modo: 'autofogo' });
          const penteDepois = lex.arma.system.pente.value;
          await lex.arma.update({ 'system.pente.value': 5 });
          const poucas = await __comAvisos(() => lex.arma.atacar({ alvo, modo: 'autofogo' }));
          return {
            estendida, recolhida, deVolta, tiro: { ataque: tiro.ataque, formula: testeDian.formula, partes: testeDian.partes }, dicaDoAutofogo,
            rajada: { ataque: rajada.ataque, linhas: __linhas(rajada) }, penteDepois, poucas: { r: poucas.r, avisos: poucas.avisos, pente: lex.arma.system.pente.value }, fila: window.__fila.length
          };
        } finally {
          await a.sheet.close();
          if (link) await __tirarCyber(link);
          await a.deleteEmbeddedDocuments('Item', criados);
          await __ator('Alvo').update({ 'system.hp.value': hpDoAlvo });
        }
      })()`);
      const { estendida, recolhida, deVolta, tiro, rajada, poucas } = info;
      const [l] = rajada.linhas;
      const ok = estendida.ataque === '+11' && estendida.avisos.length === 0 && estendida.alternar.join() === 'Recolher'
        && recolhida.ataque === '+10' && recolhida.avisos.join() === 'coronha recolhida (−1)' && recolhida.alternar.join() === 'Estender'
        && tiro.ataque === 17 && tiro.formula === '1d10crit + 10 + 1 - 1' && tiro.partes.includes('Coronha recolhida -1')
        && deVolta.ataque === '+11' && deVolta.alternar.join() === 'Recolher' && deVolta.flag === false
        && info.dicaDoAutofogo === 'Autofogo (×2): 7 balas'
        && rajada.ataque === 21 && l.dv === 17 && l.mult === 2 && l.dano?.dano === 4 && info.penteDepois === 14
        && poucas.r === null && poucas.pente === 5 && poucas.avisos.join() === 'Militech M-10AF Lexington: precisa de 7 balas no pente (tem 5). Recarregue.' && info.fila === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('Kappa (2077), dois alvos: o Alvo (REF 8) esquiva do tiro Smart e as balas vão para o Capanga, a 2 m dele; com o segundo a 18 m, não mudam; com três marcados, o terceiro fica de fora', async () => {
      // Kappa (Smart de três balas, excelente): d10 6 → 12 + 1 + 6 = 19. O Alvo esquiva pela janela do mestre: DEX 7 +
      // Evasão 2 + 10 + 1 = 20 (empate e acima são dele). O Capanga (REF 6) não esquiva: 19 contra DV 15 (12 m); dano 2d6:
      // 3 + 4 = 7. Com o Longe (18 m do Alvo), as balas não mudam. Com o Capanga primeiro (pega), dano 1 + 1 = 2.
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const [alvo, capanga, longe] = ['Alvo', 'Capanga', 'Longe'].map(__token);
        const hpDoCapanga = __ator('Capanga').system.hp.value;
        const criados = [];
        let link = null;
        // A janela da defesa do NPC (do mestre): só a que está aberta.
        // A janela da defesa do NPC não tem prazo. Uma que não devia aparecer (um alvo perguntado fora da vez) fecha
        // sozinha e fica anotada: o passo falha em vez de travar. A que fecha depois do clique não conta (não está rendered).
        const janelasDeDefesa = () => [...foundry.applications.instances.values()].filter(app => app.rendered && app.options.classes?.includes('janela-defesa'));
        // Esquiva pela janela do mestre e espera ela começar a fechar (o fechamento começa depois do clique).
        const esquivar = async () => {
          await __esperar(() => janelasDeDefesa()[0]?.element.querySelector('button.opcao[data-escolha="esquivar"]'));
          const [janela] = janelasDeDefesa();
          janela.element.querySelector('button.opcao[data-escolha="esquivar"]').click();
          await __esperar(() => !janela.rendered);
        };
        const inesperadas = [];
        const vigiar = async promessa => {
          let ativo = true;
          (async () => {
            while (ativo) {
              for (const app of janelasDeDefesa()) { inesperadas.push(app.options.window?.title ?? ''); await app.close(); }
              await new Promise(r => setTimeout(r, 200));
            }
          })();
          try { return await promessa; } finally { ativo = false; }
        };
        try {
          await __ator('Alvo').update({ 'system.atributos.ref.valor': 8 });
          link = await __cyber2077('cyberware-2077:smart-link');
          const kappa = await __arma2077('armas-2077:tsunami-kappa', 'core_ammo:medium-pistol-basic', 30);
          criados.push(kappa.arma.id, kappa.municao.id);
          await a.sheet.render({ force: true });
          await __esperar(() => __linhaDaArma(kappa.arma));
          const dica = __linhaDaArma(kappa.arma).querySelector('td.num')?.dataset.tooltip ?? '';
          window.__fila = [[6, 10], [10, 10], [1, 10], [3, 6], [4, 6]];
          let promessa = kappa.arma.atacar({ alvos: [alvo, capanga] });
          await esquivar();
          const r1 = await vigiar(promessa);
          const sobrou1 = window.__fila.length;
          window.__fila = [[6, 10], [10, 10], [1, 10]];
          promessa = kappa.arma.atacar({ alvos: [alvo, longe] });
          await esquivar();
          const r2 = await vigiar(promessa);
          window.__fila = [[6, 10], [1, 6], [1, 6]];
          const r3 = await vigiar(kappa.arma.atacar({ alvos: [capanga, alvo, longe] }));
          const resumo = r => ({ ataque: r.ataque, notas: r.notas, linhas: r.linhas.map(l => ({ nome: l.nome, resultado: l.resultado, escolha: l.escolha, defesa: l.defesa, dano: l.dano?.dano ?? null, notas: l.notas })) });
          return { dica, r1: resumo(r1), sobrou1, r2: resumo(r2), r3: resumo(r3), inesperadas, perdeu: hpDoCapanga - __ator('Capanga').system.hp.value, fila: window.__fila.length };
        } finally {
          await a.sheet.close();
          if (link) await __tirarCyber(link);
          await a.deleteEmbeddedDocuments('Item', criados);
          for (const app of janelasDeDefesa()) await app.close();
          await __ator('Alvo').update({ 'system.atributos.ref.valor': 6 });
          await __ator('Capanga').update({ 'system.hp.value': hpDoCapanga });
        }
      })()`);
      const { r1, r2, r3 } = info;
      const linha = (r, nome) => r.linhas.find(l => l.nome === nome);
      const ok = /Trava dois alvos/.test(info.dica) && info.inesperadas.length === 0
        && r1.ataque === 19 && r1.linhas.length === 2 && linha(r1, 'Alvo')?.resultado === 'esquivou' && linha(r1, 'Alvo').defesa === 20
        && linha(r1, 'Capanga')?.resultado === 'acertou' && linha(r1, 'Capanga').dano === 7 && linha(r1, 'Capanga').notas.includes('As balas Smart mudaram de alvo: Alvo não foi atingido.') && info.sobrou1 === 0
        && r2.linhas.length === 1 && linha(r2, 'Alvo')?.resultado === 'esquivou' && r2.notas.includes('Longe está a mais de 4 m de Alvo: as balas Smart não mudam de alvo.')
        && r3.linhas.length === 1 && linha(r3, 'Capanga')?.resultado === 'acertou' && linha(r3, 'Capanga').dano === 2 && r3.notas.includes('Tsunami Kappa trava dois alvos: Longe ficou de fora.')
        && info.perdeu === 9 && info.fila === 0;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('escudo e a janela do mestre: o Capanga (NPC) pode aguentar ou usar o escudo; o mestre vê o total, escolhe o escudo, que leva os 10 PV dele; o Desfazer devolve; fechada no X, o sistema escolhe (sem esquiva, o escudo)', async () => {
      // Ataque: d10 8 → REF 8 + Armas de Ombro 4 + 8 = 20 contra DV 16 (12 m). Dano 5d6: 3 × 5 = 15; o escudo (10 PV) leva
      // 10, e o resto de um tiro se perde (wiki: cobertura).
      await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const escudo = foundry.utils.deepClone(cat['core_armor:bullet-proof-shield']);
        escudo.system.equipada = true;
        await __ator('Capanga').createEmbeddedDocuments('Item', [escudo]);
        return true;
      })()`);
      await fixar(edge, [[8, 10], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]);
      await edge.evaluate(`(() => {
        window.__pente = __ator('Atiradora').items.getName('Assault Rifle').system.pente.value;
        window.__hp = __ator('Capanga').system.hp.value;
        window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Capanga') });
        return true;
      })()`);
      await edge.evaluate(`__esperar(() => document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing) button.opcao'))`);
      await edge.sleep(300);
      await edge.shot('defesa-mestre');
      const janela = await responder(edge, 'escudo');
      const info = await edge.evaluate(`window.__ataque.then(async r => {
        const capanga = __ator('Capanga');
        const escudo = capanga.items.getName('Bullet Proof Shield');
        const [l] = r.linhas;
        const depois = { hp: capanga.system.hp.value, pv: escudo.system.pvEscudo.value };
        const desfeito = await game.system.api.combate.desfazer(game.messages.contents.at(-1));
        await __ator('Atiradora').items.getName('Assault Rifle').update({ 'system.pente.value': window.__pente });
        return { escolha: l.escolha, resultado: l.resultado, escudoAblado: l.dano?.escudoAblado, recebido: l.dano?.recebido, hpAntes: window.__hp, depois, desfeito, pvDesfeito: escudo.system.pvEscudo.value };
      })`);
      // Fechada no X, a janela do mestre fica sem resposta, e o sistema escolhe como na defesa automática: sem a esquiva,
      // o escudo (a escolha padrão do jogador seria aguentar).
      await fixar(edge, [[8, 10], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]);
      await edge.evaluate(`(() => { window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Capanga') }); return true; })()`);
      const fechar = `document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing) .window-header [data-action="close"]')`;
      await edge.evaluate(`__esperar(() => ${fechar})`);
      await edge.evaluate(`${fechar}.click()`);
      const noX = await edge.evaluate(`window.__ataque.then(async r => {
        const capanga = __ator('Capanga');
        const [l] = r.linhas;
        const desfeito = await game.system.api.combate.desfazer(game.messages.contents.at(-1));
        await __ator('Atiradora').items.getName('Assault Rifle').update({ 'system.pente.value': window.__pente });
        window.__fila = [];
        return { escolha: l.escolha, resultado: l.resultado, desfeito, hp: capanga.system.hp.value, pv: capanga.items.getName('Bullet Proof Shield').system.pvEscudo.value };
      })`);
      return [/^Ataque em Capanga /.test(janela) && /Total do ataque: 20 · DV 16 Fechada sem escolher, o sistema escolhe \(como na defesa automática\)\./.test(janela)
        && /Usar o escudo Bullet Proof Shield \(10 PV\) recebe o ataque todo\. Sem esquiva\. O tiro precisa passar da DV 16/.test(janela) && info.escolha === 'escudo' && info.resultado === 'acertou' && info.escudoAblado === 10 && info.recebido === 0
        && info.depois.hp === info.hpAntes && info.depois.pv === 0 && info.desfeito && info.pvDesfeito === 10
        && noX.escolha === 'escudo' && noX.resultado === 'acertou' && noX.desfeito && noX.hp === info.hpAntes && noX.pv === 10, `janela: ${janela} · ${JSON.stringify({ ...info, noX })}`];
    });

    await r.passo('escudo destruído: o resto de um tiro se perde; o explosivo que destrói o escudo passa inteiro; o que não destrói, não passa (wiki: cobertura e explosivos)', async () => {
      const info = await edge.evaluate(`(async () => {
        const capanga = __ator('Capanga');
        const escudo = capanga.items.getName('Bullet Proof Shield');
        const hp = capanga.system.hp.value;
        const caso = async (pv, opcoes) => {
          await escudo.update({ 'system.pvEscudo.value': pv });
          await capanga.update({ 'system.hp.value': hp });
          const r = await capanga.receberDano({ dano: 12, escudo: true, ...opcoes });
          return { escudoAblado: r.escudoAblado, recebido: r.recebido, pv: escudo.system.pvEscudo.value, perdeu: hp - capanga.system.hp.value };
        };
        const resultado = { tiro: await caso(5, {}), explosivo: await caso(5, { explosivo: true }), explosivoSegura: await caso(20, { explosivo: true }) };
        await capanga.update({ 'system.hp.value': hp });
        await capanga.deleteEmbeddedDocuments('Item', [escudo.id]);
        return resultado;
      })()`);
      const { tiro, explosivo, explosivoSegura } = info;
      return [tiro.pv === 0 && tiro.perdeu === 0 && explosivo.pv === 0 && explosivo.perdeu === 12 && explosivoSegura.pv === 8 && explosivoSegura.perdeu === 0, JSON.stringify(info)];
    });

    await r.passo('corpo a corpo: DEX + Arma Branca; o Capanga (REF 6) esquiva assim mesmo, sem janela; empate é dele; acertando, a arma branca leva 2d6; em cobertura, o golpe não ganha o aviso do tiro', async () => {
      // Atiradora: DEX 7 + Arma Branca 3. 1º golpe: d10 3 → 13 contra a esquiva do Capanga, DEX 5 + d10 8 = 13: empate,
      // esquivou. 2º golpe: d10 8 → 18 contra 5 + 2 = 7: acertou. Dano 2d6: 4 + 3 = 7 (o Capanga não tem armadura).
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const capanga = __ator('Capanga');
        const lamina = foundry.utils.deepClone(cat['core_weapons:medium-melee']);
        lamina.system.equipada = true;
        const [arma] = await a.createEmbeddedDocuments('Item', [lamina]);
        await a.update({ 'system.pericias.melee-weapon.nivel': 3 });
        const hp = capanga.system.hp.value;
        // As janelas de defesa abertas (a do passo do escudo pode ainda estar fechando: essa não conta).
        const janelas = () => [...document.querySelectorAll('.application.cpr-fieldbook.janela-defesa:not(.minimizing)')].map(d => d.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80));
        const golpe = async fila => {
          window.__fila = fila;
          const r = await arma.atacar({ alvo: __token('Capanga') });
          const [l] = r.linhas;
          return { ataque: r.ataque, escolha: l.escolha, defesa: l.defesa, resultado: l.resultado, recebido: l.dano?.recebido ?? null, notas: l.notas.join(' ') };
        };
        // A cobertura para a bala (wiki, p. 182): no golpe, o cartão não avisa o mestre.
        await capanga.toggleStatusEffect('${S}-em-cobertura', { active: true });
        let resultado;
        try {
          resultado = { partes: arma.partesDoAtaque().partes.map(p => p.rotulo + ' ' + p.valor), primeiro: await golpe([[3, 10], [8, 10]]), segundo: await golpe([[8, 10], [2, 10], [4, 6], [3, 6]]), perdeu: hp - capanga.system.hp.value };
        } finally {
          await capanga.toggleStatusEffect('${S}-em-cobertura', { active: false });
        }
        resultado.janelas = janelas();
        await a.deleteEmbeddedDocuments('Item', [arma.id]);
        await capanga.update({ 'system.hp.value': hp });
        return resultado;
      })()`);
      const { primeiro: p, segundo: s } = info;
      return [info.partes[0] === 'DEX 7' && p.ataque === 13 && p.escolha === 'esquivar' && p.defesa === 13 && p.resultado === 'esquivou'
        && s.ataque === 18 && s.defesa === 7 && s.resultado === 'acertou' && s.recebido === 7 && info.perdeu === 7 && !info.janelas.length
        && !p.notas.includes('em cobertura') && !s.notas.includes('em cobertura'), JSON.stringify(info)];
    });

    await r.passo('Agarrar (wiki, p. 177; as maquetes): DEX + Briga + 1d10 contra o do Capanga (NPC: o mestre rola, sem janela); empate é dele; pelo botão da aba Combate, vence: os dois agarrados, com −2 em todas as ações, e a ficha mostra; "Soltar" tira as duas marcas', async () => {
      // Atiradora: DEX 7 + Briga 3. 1º (pela API): d10 3 → 13 contra o Capanga, DEX 5 + Briga 2 + d10 6 = 13: empate,
      // resistiu. 2º (pelo botão, com o Capanga marcado): d10 8 → 18 contra 5 + 2 + 2 = 9: agarrou.
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const capanga = __ator('Capanga');
        const marcas = ator => ['agarrando', 'agarrado'].filter(papel => ator.statuses.has('${S}-' + papel));
        const botao = acao => a.sheet.element?.querySelector('.tab.combate [data-action="' + acao + '"]');
        const cartoes = () => game.messages.contents.filter(m => m.getFlag('${S}', 'agarrao')).map(m => m.getFlag('${S}', 'agarrao'));
        const antes = { atiradora: a.system.pericia('brawling').nivel, capanga: capanga.system.pericia('brawling').nivel, cartoes: cartoes().length };
        await a.update({ 'system.pericias.brawling.nivel': 3 });
        await capanga.update({ 'system.pericias.brawling.nivel': 2 });
        try {
          window.__fila = [[3, 10], [6, 10]];
          const empate = await game.system.api.agarrao.agarrar(a, { alvo: __token('Capanga') });
          const depoisDoEmpate = [...marcas(a), ...marcas(capanga)];
          await a.sheet.render({ force: true });
          a.sheet.changeTab('combate', 'primary');
          await __esperar(() => botao('agarrar'));
          canvas.tokens.setTargets([__token('Capanga').id]);
          window.__fila = [[8, 10], [2, 10]];
          botao('agarrar').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await __esperar(() => marcas(a).join() === 'agarrando' && marcas(capanga).join() === 'agarrado' && botao('soltar'));
          const agarrados = {
            cartao: cartoes().at(-1), linha: [...a.sheet.element.querySelector('.tab.combate .medida.agarrao')?.children ?? []].map(parte => parte.textContent.trim()).join(' | '),
            penalidade: [a, capanga].map(ator => ator.partesDaPericia('evasion').partes.find(p => p.rotulo === 'Agarrão')?.valor ?? null)
          };
          botao('soltar').click();
          await __esperar(() => !marcas(a).length && !marcas(capanga).length && botao('agarrar'));
          const soltou = game.messages.contents.at(-1).content.replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
          const depoisDeSoltar = [...marcas(a), ...marcas(capanga)];
          return { empate, depoisDoEmpate, agarrados, soltou, depoisDeSoltar, novos: cartoes().length - antes.cartoes, linhaDepois: Boolean(a.sheet.element.querySelector('.tab.combate .medida.agarrao')) };
        } finally {
          await a.sheet.close();
          canvas.tokens.setTargets([]);
          for (const ator of [a, capanga]) for (const papel of marcas(ator)) await ator.toggleStatusEffect('${S}-' + papel, { active: false }).catch(() => {});
          await a.update({ 'system.pericias.brawling.nivel': antes.atiradora });
          await capanga.update({ 'system.pericias.brawling.nivel': antes.capanga });
        }
      })()`);
      const { empate, agarrados: g } = info;
      const ok = empate.resultado === 'resistiu' && empate.ataque === 13 && empate.defesa === 13 && !info.depoisDoEmpate.length
        && g.cartao.resultado === 'agarrou' && g.cartao.ataque === 18 && g.cartao.defesa === 9 && g.linha === 'AGARRANDO | Capanga · −2 em tudo' && g.penalidade.join() === '-2,-2'
        && info.soltou === 'Atiradora soltou Capanga: o agarrão acabou.' && !info.depoisDeSoltar.length && info.novos === 2 && !info.linhaDepois;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('o resto do agarrão (wiki, p. 177): Estrangular (o BODY direto no HP, sem a armadura; fora de combate, toda vez conta, e na 3ª desmaia; abaixo de 0, fica com 1 e desmaia), Derrubar (cai, e o agarrão acaba) e Escapar (o empate é de quem segura); os botões da aba Combate de cada lado', async () => {
      // A Atiradora (BODY 6, DEX 7, Briga 3) agarra o Capanga (DEX 5, Briga 2, HP 20): d10 8 → 18 contra 5 + 2 + 2 = 9.
      // Estrangula três vezes: 20 → 14 → 8 → 2, e na 3ª desmaia. Com 4 de HP: levaria a −2, fica com 1 e desmaia. Com 20,
      // derruba: 14, caído, e o agarrão acaba. Agarrado de novo, o Capanga tenta escapar, os dois com o −2 do agarrão:
      // 5 + 2 − 2 + d10 6 = 11 contra 7 + 3 − 2 + d10 3 = 11, a Atiradora segura; depois, d10 9 → 14 contra d10 2 → 10.
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        const capanga = __ator('Capanga');
        const api = game.system.api.agarrao;
        const marcas = ator => ['agarrando', 'agarrado'].filter(papel => ator.statuses.has('${S}-' + papel));
        const botoes = ator => [...(ator.sheet.element?.querySelectorAll('.tab.combate .botoes-resumo.agarrao [data-action]') ?? [])].map(b => b.dataset.action).join();
        const ultimo = () => game.messages.contents.at(-1).content.replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
        const estado = () => ({ hp: capanga.system.hp.value, desmaiado: capanga.statuses.has('unconscious'), caido: capanga.statuses.has('prone'), marcas: [...marcas(a), ...marcas(capanga)].join() });
        const tirar = async status => { if (capanga.statuses.has(status)) await capanga.toggleStatusEffect(status, { active: false }); };
        const agarrar = async () => { window.__fila = [[8, 10], [2, 10]]; return (await api.agarrar(a, { alvo: __token('Capanga') }))?.resultado; };
        const antes = { body: a.system.atributos.body.valor, briga: [a.system.pericia('brawling').nivel, capanga.system.pericia('brawling').nivel], hp: capanga.system.hp.value };
        await a.update({ 'system.pericias.brawling.nivel': 3 });
        await capanga.update({ 'system.pericias.brawling.nivel': 2, 'system.hp.value': 20 });
        try {
          const r = { body: a.system.atributos.body.valor, agarrou: await agarrar(), estrangulou: [] };
          for (let i = 0; i < 3; i++) {
            const c = await api.estrangular(a);
            r.estrangulou.push({ hp: c.hp, vezes: c.vezes, desmaiou: c.desmaiou, ...estado() });
          }
          r.cartaoDoTerceiro = ultimo();
          await tirar('unconscious');
          await capanga.update({ 'system.hp.value': 4 });
          const quarta = await api.estrangular(a);
          r.abaixoDeZero = { hp: quarta.hp, ...estado(), cartao: ultimo() };
          await tirar('unconscious');
          await capanga.update({ 'system.hp.value': 20 });
          await api.derrubar(a);
          r.derrubou = { cartao: ultimo() };
          await __esperar(() => !marcas(capanga).length);
          Object.assign(r.derrubou, estado());
          await tirar('prone');
          // Com 14 de 35, o Capanga estaria gravemente ferido (−2 na fuga).
          await capanga.update({ 'system.hp.value': capanga.system.hp.max });
          r.deNovo = await agarrar();
          for (const ator of [a, capanga]) { await ator.sheet.render({ force: true }); ator.sheet.changeTab('combate', 'primary'); }
          await __esperar(() => botoes(capanga) === 'escapar' && botoes(a) === 'estrangular,derrubar,soltar');
          r.botoes = { capanga: botoes(capanga), atiradora: botoes(a) };
          window.__fila = [[6, 10], [3, 10]];
          const segurou = await api.escapar(capanga);
          r.segurou = { resultado: segurou.resultado, ataque: segurou.ataque, defesa: segurou.defesa, cartao: ultimo(), marcas: estado().marcas };
          window.__fila = [[9, 10], [2, 10]];
          const escapou = await api.escapar(capanga);
          r.escapou = { resultado: escapou.resultado, ataque: escapou.ataque, defesa: escapou.defesa, cartao: ultimo() };
          await __esperar(() => !marcas(a).length && botoes(capanga) === 'agarrar');
          Object.assign(r.escapou, { marcas: estado().marcas, botoes: botoes(capanga) });
          return r;
        } finally {
          for (const ator of [a, capanga]) await ator.sheet.close();
          for (const ator of [a, capanga]) for (const papel of marcas(ator)) await ator.toggleStatusEffect('${S}-' + papel, { active: false }).catch(() => {});
          for (const status of ['unconscious', 'prone']) await tirar(status);
          await a.update({ 'system.pericias.brawling.nivel': antes.briga[0] });
          await capanga.update({ 'system.pericias.brawling.nivel': antes.briga[1], 'system.hp.value': antes.hp });
        }
      })()`);
      const [e1, e2, e3] = info.estrangulou;
      const ok = info.body === 6 && info.agarrou === 'agarrou'
        && e1.hp === 14 && e1.vezes === 1 && !e1.desmaiado && e2.hp === 8 && e2.vezes === 2 && !e2.desmaiado && e3.hp === 2 && e3.vezes === 3 && e3.desmaiou && e3.desmaiado && e3.marcas === 'agarrando,agarrado'
        && info.cartaoDoTerceiro === 'Atiradora estrangulou Capanga: 6 de dano direto no HP, sem a armadura (8 → 2): é a 3ª rodada seguida, e Capanga desmaia.'
        && info.abaixoDeZero.hp === 1 && info.abaixoDeZero.desmaiado && info.abaixoDeZero.cartao === 'Atiradora estrangulou Capanga: 6 de dano direto no HP, sem a armadura (4 → 1): o dano o levaria abaixo de 0, então fica com 1 e desmaia.'
        && info.derrubou.hp === 14 && info.derrubou.caido && !info.derrubou.marcas && info.derrubou.cartao === 'Atiradora derrubou Capanga: 6 de dano direto no HP, sem a armadura (20 → 14); Capanga caiu, e o agarrão acabou.'
        && info.deNovo === 'agarrou' && info.botoes.capanga === 'escapar' && info.botoes.atiradora === 'estrangular,derrubar,soltar'
        && info.segurou.resultado === 'segurou' && info.segurou.ataque === 11 && info.segurou.defesa === 11 && info.segurou.marcas === 'agarrando,agarrado'
        && info.segurou.cartao === 'Atiradora segurou Capanga (11 contra 11: o empate é de quem segura): o agarrão continua.'
        && info.escapou.resultado === 'escapou' && info.escapou.ataque === 14 && info.escapou.defesa === 10 && !info.escapou.marcas && info.escapou.botoes === 'agarrar'
        && info.escapou.cartao === 'Capanga escapou do agarrão de Atiradora (14 contra 10): o agarrão acabou.';
      return [ok, JSON.stringify(info)];
    });

    await r.passo('Reflex Tuner (2077, wiki): no combate, o Capanga atingido ganha +1 para se esquivar pelo resto da rodada (nas partes da Evasão e na esquiva do golpe); o Desfazer do tiro tira o +1; na rodada seguinte, acaba', async () => {
      // O tiro da Atiradora no Capanga (REF 6: só aguenta): d10 9 → 8 + 4 + 9 = 21 contra a DV 16; dano 5d6 de 1 = 5
      // (o Capanga não tem armadura). O golpe de lâmina: DEX 7 + Arma Branca 3 + d10 2 = 12 contra a esquiva do Capanga,
      // com o +1, e o d10 9.
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const capanga = __ator('Capanga');
        const rifle = a.items.getName('Assault Rifle');
        const inicio = { hp: capanga.system.hp.value, pente: rifle.system.pente.value, humanidade: capanga.system.humanidade.value };
        const [tuner] = await capanga.createEmbeddedDocuments('Item', [foundry.utils.deepClone(cat['cyberware-2077:reflex-tuner'])]);
        await capanga.instalarCyberware(tuner, { rolar: false });
        const lamina = foundry.utils.deepClone(cat['core_weapons:medium-melee']);
        lamina.system.equipada = true;
        const [arma] = await a.createEmbeddedDocuments('Item', [lamina]);
        const cena = canvas.scene;
        const combate = await Combat.implementation.create({ scene: cena.id, active: true });
        const partes = () => __ator('Capanga').partesDaPericia('evasion').partes;
        const lista = () => partes().map(p => p.rotulo + ' ' + p.valor);
        const soma = () => partes().reduce((total, p) => total + p.valor, 0);
        try {
          await combate.createEmbeddedDocuments('Combatant', ['Atiradora', 'Capanga'].map(n => ({ tokenId: __token(n).id, sceneId: cena.id, actorId: __ator(n).id })));
          await combate.startCombat();
          const antes = lista();
          const somaAntes = soma();
          // 1. O tiro que pega: a marca (e o +1).
          window.__fila = [[9, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]];
          const tiro = await rifle.atacar({ alvo: __token('Capanga') });
          const atingido = lista();
          // 2. O Desfazer do tiro tira a marca (e o +1).
          const desfeito = await game.system.api.combate.desfazer(game.messages.contents.at(-1));
          const semMarca = lista();
          // 3. O tiro de novo e, depois, o golpe: a esquiva do Capanga com o +1.
          window.__fila = [[9, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6]];
          await rifle.atacar({ alvo: __token('Capanga') });
          const somaAtingido = soma();
          window.__fila = [[2, 10], [9, 10]];
          const golpe = await arma.atacar({ alvo: __token('Capanga') });
          // 4. Na rodada seguinte, acabou.
          await combate.nextRound();
          const depois = lista();
          return {
            antes, somaAntes, tiro: tiro.linhas[0].resultado, atingido, desfeito, semMarca, somaAtingido, depois,
            golpe: { ataque: golpe.ataque, escolha: golpe.linhas[0].escolha, defesa: golpe.linhas[0].defesa, resultado: golpe.linhas[0].resultado }
          };
        } finally {
          await combate.delete();
          await a.deleteEmbeddedDocuments('Item', [arma.id]);
          await capanga.desinstalarCyberware(tuner);
          await tuner.delete();
          await capanga.unsetFlag('${S}', 'atingido');
          // Desinstalar não devolve a Humanidade (só a terapia): o passo a devolve.
          await capanga.update({ 'system.hp.value': inicio.hp, 'system.humanidade.value': inicio.humanidade });
          await rifle.update({ 'system.pente.value': inicio.pente });
          window.__fila = [];
        }
      })()`);
      const comTuner = lista => lista.includes('Reflex Tuner 1');
      const ok = !comTuner(info.antes) && info.tiro === 'acertou' && comTuner(info.atingido) && info.desfeito && !comTuner(info.semMarca)
        && info.somaAtingido === info.somaAntes + 1 && info.golpe.ataque === 12 && info.golpe.escolha === 'esquivar' && info.golpe.defesa === info.somaAtingido + 9
        && info.golpe.resultado === 'esquivou' && !comTuner(info.depois);
      return [ok, JSON.stringify(info)];
    });

    await r.passo('armadura pesada: a maior penalidade das vestidas sai de REF, DEX e MOVE (e da iniciativa); o SP é o maior de cada local', async () => {
      // Heavy Armorjack no corpo (SP 13, −2) e Metalgear na cabeça (SP 18, −4): vale o −4. Tirada a Metalgear, o −2.
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const vestida = id => { const d = foundry.utils.deepClone(cat[id]); d.system.equipada = true; return d; };
        const a = await Actor.implementation.create({ name: 'Blindado', type: 'personagem', system: { atributos: { ref: { valor: 8 }, dex: { valor: 7 }, move: { valor: 6 } } },
          items: [vestida('core_armor:heavy-armorjack-body'), vestida('core_armor:metalgear-head')] });
        const ver = () => ({ ref: a.system.atributos.ref.valor, dex: a.system.atributos.dex.valor, move: a.system.atributos.move.valor, ini: a.system.iniciativa, sp: [a.system.armadura.cabeca.sp, a.system.armadura.corpo.sp] });
        const duas = ver();
        await a.items.getName('Metalgear® (Head)').update({ 'system.equipada': false });
        const uma = ver();
        await a.delete();
        return { duas, uma };
      })()`);
      const { duas, uma } = info;
      return [duas.ref === 4 && duas.dex === 3 && duas.move === 2 && duas.ini === 4 && duas.sp.join() === '18,13' && uma.ref === 6 && uma.dex === 5 && uma.move === 4 && uma.ini === 6 && uma.sp.join() === '0,13',
        JSON.stringify(info)];
    });

    // ---------- O jogador do alvo defende no computador dele ----------
    await r.passo('jogador: entra no mesmo mundo, dono do Alvo (agora REF 8, pode esquivar de tiro)', async () => {
      await edge.evaluate(`(async () => {
        // Com o personagem já escolhido, o Foundry não abre a configuração do jogador na primeira entrada.
        const u = await User.implementation.create({ name: 'Jogador', role: CONST.USER_ROLES.PLAYER, character: __ator('Alvo').id });
        await __ator('Alvo').update({ ownership: { [u.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }, 'system.atributos.ref.valor': 8, 'system.hp.value': 45 });
      })()`);
      jogador = await abrirEdge({ porta: 9460, saida: path.join(servidores.raiz, 'tests', '.saida'), prefixo: 'v14-jogador-' });
      await foundry14.capturarAvisos(jogador);
      await foundry14.entrarComo(jogador, mesa.url, 'Jogador');
      // "Rolar direto" neste navegador: a esquiva, o dano e o Death Save do jogador rolam sem a janela de rolagem nos
      // passos do combate; o passo da janela do jogador desliga e confere a janela.
      await jogador.evaluate(`game.settings.set('${S}', 'rolarDireto', true).then(() => true)`);
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
        janela = await jogador.evaluate(`(() => {
          const d = document.querySelector('.application.cpr-fieldbook.janela-defesa');
          return d && { titulo: d.querySelector('.window-title')?.textContent.trim(), texto: d.querySelector('.window-content').textContent.replace(/\\s+/g, ' ').trim(), total: Boolean(d.querySelector('.total')), botoes: [...d.querySelectorAll('button.opcao[data-escolha]')].map(b => b.dataset.escolha) };
        })()`);
      }
      // O total do ataque (16) não aparece para o jogador antes da defesa: a rolagem foi só para o mestre. O Foundry mostra
      // que houve uma rolagem privada (visible), mas não o conteúdo (isContentVisible).
      const ultimoAtaque = `game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.ataque).at(-1)`;
      const antes = await jogador.evaluate(`Boolean(${ultimoAtaque}?.isContentVisible)`);
      await jogador.shot('defesa');
      // A barra do tempo (60 s) já andou um pouco.
      const barra = await jogador.evaluate(`parseFloat(document.querySelector('.application.cpr-fieldbook.janela-defesa .tempo span')?.style.width)`);
      await jogador.evaluate(`document.querySelector('.application.cpr-fieldbook.janela-defesa button.opcao[data-escolha="esquivar"]').click()`);
      const info = await edge.evaluate(`window.__ataque.then(r => ({ ataque: r.ataque, linhas: __linhas(r), hp: __ator('Alvo').system.hp.value }))`);
      await jogador.sleep(500);
      const depois = await jogador.evaluate(`Boolean(${ultimoAtaque}?.isContentVisible)`);
      const [l] = info.linhas;
      // O texto da janela, na ordem: o duelo, a arma, a nota sem o total, as escolhas com a conta e o tempo.
      const textos = [/^Atiradora Alvo Assault Rifle · Tiro · 10 m Você não vê o total do ataque: decida antes\. /,
        / Esquivar DEX 7 \+ Evasão 2 \+ 1d10 \(média 14,5\) vira a DV do ataque\. Empate é seu\. /, / Aguentar O tiro precisa passar da DV 16 \(10 m\)\. /, / Sem resposta em 60 s: aguenta\.$/];
      return [janela && janela.titulo === 'Você está sendo atacado!' && janela.botoes.join() === 'esquivar,aguentar' && !janela.total && !/Total do ataque/.test(janela.texto) && textos.every(t => t.test(janela.texto))
        && barra > 50 && barra < 100 && !antes && depois && l.escolha === 'esquivar' && l.defesa === 25 && l.resultado === 'esquivou' && info.hp === 45,
        `janela ${JSON.stringify(janela)} · barra ${barra} · total visível ao jogador antes ${antes}, depois ${depois} · ${JSON.stringify(info)}`];
    });

    await r.passo('jogador: o agarrão no Alvo chega na janela de reação dele ("Estão agarrando você!": só Resistir, com a conta DEX + Briga, sem o total); ele rola, perde e fica agarrado, com o −2 também no computador dele; o "Soltar" tira as marcas', async () => {
      // Mestre: Atiradora DEX 7 + Briga 3 + d10 9 = 19. Jogador: Alvo DEX 7 + Briga 1 + d10 4 = 12.
      await edge.evaluate(`(async () => {
        window.__briga = [__ator('Atiradora').system.pericia('brawling').nivel, __ator('Alvo').system.pericia('brawling').nivel];
        await __ator('Atiradora').update({ 'system.pericias.brawling.nivel': 3 });
        await __ator('Alvo').update({ 'system.pericias.brawling.nivel': 1 });
        return true;
      })()`);
      await fixar(edge, [[9, 10]]);
      await fixar(jogador, [[4, 10]]);
      const marcas = `(ator => ['agarrando', 'agarrado'].filter(papel => ator.statuses.has('${S}-' + papel)))`;
      // O total de quem agarrou, escondido do jogador até a resistência ("Esconder o total do ataque"), como no ataque.
      const totalVisivel = `Boolean(game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.agarrar).at(-1)?.isContentVisible)`;
      try {
        await edge.evaluate(`(() => { window.__agarrao = game.system.api.agarrao.agarrar(__ator('Atiradora'), { alvo: __token('Alvo') }); return true; })()`);
        let janela = null;
        for (let i = 0; i < 40 && !janela; i++) {
          await jogador.sleep(250);
          janela = await jogador.evaluate(`(() => {
            const d = document.querySelector('.application.cpr-fieldbook.janela-defesa');
            return d && { titulo: d.querySelector('.window-title')?.textContent.trim(), texto: d.querySelector('.window-content').textContent.replace(/\\s+/g, ' ').trim(), total: Boolean(d.querySelector('.total')), botoes: [...d.querySelectorAll('button.opcao[data-escolha]')].map(b => b.dataset.escolha) };
          })()`);
        }
        const antes = await jogador.evaluate(totalVisivel);
        if (janela) await jogador.evaluate(`document.querySelector('.application.cpr-fieldbook.janela-defesa button.opcao[data-escolha="resistir"]').click()`);
        const resumo = await edge.evaluate(`window.__agarrao`);
        const noJogador = await jogador.evaluate(`(async () => {
          const alvo = game.actors.getName('Alvo');
          for (let i = 0; i < 30 && !(alvo.statuses.has('${S}-agarrado') && ${totalVisivel}); i++) await new Promise(resolve => setTimeout(resolve, 100));
          return { marcas: ${marcas}(alvo), penalidade: alvo.partesDaPericia('evasion').partes.find(p => p.rotulo === 'Agarrão')?.valor ?? null, totalVisivel: ${totalVisivel} };
        })()`);
        const soltou = await edge.evaluate(`(async () => {
          await game.system.api.agarrao.soltar(__ator('Atiradora'));
          await __esperar(() => !${marcas}(__ator('Atiradora')).length && !${marcas}(__ator('Alvo')).length);
          return [...${marcas}(__ator('Atiradora')), ...${marcas}(__ator('Alvo'))];
        })()`);
        const textos = [/^Atiradora Alvo Agarrar · DEX \+ Briga \+ 1d10 Você não vê o total do ataque: decida antes\. /,
          / Resistir DEX 7 \+ Briga 1 \+ 1d10 \(média 13,5\) contra o agarrão\. Empate é seu\. /, / Sem resposta em \d+ s: rola a resistência\.$/];
        const info = { janela, antes, resumo, noJogador, soltou };
        return [janela && janela.titulo === 'Estão agarrando você!' && janela.botoes.join() === 'resistir' && !janela.total && textos.every(t => t.test(janela.texto))
          && resumo?.resultado === 'agarrou' && resumo.ataque === 19 && resumo.defesa === 12 && noJogador.marcas.join() === 'agarrado' && noJogador.penalidade === -2 && !antes && noJogador.totalVisivel && !soltou.length,
          JSON.stringify(info)];
      } finally {
        await jogador.evaluate(`(async () => { for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-defesa')) await app.close(); return true; })()`).catch(() => {});
        await edge.evaluate(`(async () => {
          for (const ator of [__ator('Atiradora'), __ator('Alvo')]) for (const papel of ${marcas}(ator)) await ator.toggleStatusEffect('${S}-' + papel, { active: false }).catch(() => {});
          await __ator('Atiradora').update({ 'system.pericias.brawling.nivel': window.__briga[0] });
          await __ator('Alvo').update({ 'system.pericias.brawling.nivel': window.__briga[1] });
          return true;
        })()`);
      }
    });

    await r.passo('jogador: o Alvo agarra o Capanga, e a fuga do Capanga chega na janela de reação dele ("Estão escapando do seu agarrão!": só Resistir, com a conta da Briga e o −2 do agarrão); ele empata e segura', async () => {
      // Mestre: o Alvo (DEX 7, Briga 1) agarra o Capanga (DEX 5, Briga 2): d10 9 → 17 contra 5 + 2 + d10 2 = 9. A fuga,
      // os dois com o −2: Capanga 5 + 2 − 2 + d10 5 = 10; Jogador: 7 + 1 − 2 + d10 4 = 10, empate: segura.
      await edge.evaluate(`(async () => {
        window.__briga = [__ator('Alvo').system.pericia('brawling').nivel, __ator('Capanga').system.pericia('brawling').nivel];
        window.__hpCapanga = __ator('Capanga').system.hp.value;
        await __ator('Alvo').update({ 'system.pericias.brawling.nivel': 1 });
        // Com o HP cheio, o Capanga não tem a penalidade de ferido.
        await __ator('Capanga').update({ 'system.pericias.brawling.nivel': 2, 'system.hp.value': __ator('Capanga').system.hp.max });
        return true;
      })()`);
      const marcas = `(ator => ['agarrando', 'agarrado'].filter(papel => ator.statuses.has('${S}-' + papel)))`;
      try {
        await fixar(edge, [[9, 10], [2, 10]]);
        const agarrou = await edge.evaluate(`game.system.api.agarrao.agarrar(__ator('Alvo'), { alvo: __token('Capanga') }).then(r => r?.resultado)`);
        await fixar(edge, [[5, 10]]);
        await fixar(jogador, [[4, 10]]);
        await edge.evaluate(`(() => { window.__fuga = game.system.api.agarrao.escapar(__ator('Capanga')); return true; })()`);
        let janela = null;
        for (let i = 0; i < 40 && !janela; i++) {
          await jogador.sleep(250);
          janela = await jogador.evaluate(`(() => {
            const d = document.querySelector('.application.cpr-fieldbook.janela-defesa');
            return d && { titulo: d.querySelector('.window-title')?.textContent.trim(), texto: d.querySelector('.window-content').textContent.replace(/\\s+/g, ' ').trim(), botoes: [...d.querySelectorAll('button.opcao[data-escolha]')].map(b => b.dataset.escolha) };
          })()`);
        }
        if (janela) await jogador.evaluate(`document.querySelector('.application.cpr-fieldbook.janela-defesa button.opcao[data-escolha="resistir"]').click()`);
        const fuga = await edge.evaluate(`window.__fuga.then(r => r && { resultado: r.resultado, ataque: r.ataque, defesa: r.defesa, marcas: [...${marcas}(__ator('Alvo')), ...${marcas}(__ator('Capanga'))].join() })`);
        const textos = [/^Capanga Alvo Escapar do agarrão · DEX \+ Briga \+ 1d10 /, / Resistir DEX 7 \+ Briga 1 − Agarrão 2 \+ 1d10 \(média 11,5\) contra a fuga\. Empate é seu\. Perdeu: o agarrão acaba\. /];
        const info = { agarrou, janela, fuga };
        return [agarrou === 'agarrou' && janela && janela.titulo === 'Estão escapando do seu agarrão!' && janela.botoes.join() === 'resistir' && textos.every(t => t.test(janela.texto))
          && fuga?.resultado === 'segurou' && fuga.ataque === 10 && fuga.defesa === 10 && fuga.marcas === 'agarrando,agarrado', JSON.stringify(info)];
      } finally {
        await jogador.evaluate(`(async () => { for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-defesa')) await app.close(); return true; })()`).catch(() => {});
        await edge.evaluate(`(async () => {
          for (const ator of [__ator('Alvo'), __ator('Capanga')]) for (const papel of ${marcas}(ator)) await ator.toggleStatusEffect('${S}-' + papel, { active: false }).catch(() => {});
          await __esperar(() => !${marcas}(__ator('Alvo')).length && !${marcas}(__ator('Capanga')).length);
          await __ator('Alvo').update({ 'system.pericias.brawling.nivel': window.__briga[0] });
          await __ator('Capanga').update({ 'system.pericias.brawling.nivel': window.__briga[1], 'system.hp.value': window.__hpCapanga });
          return true;
        })()`);
      }
    });

    await r.passo('jogador demora: depois de 8 s o mestre ganha o cartão para responder por ele, escolhe Aguentar; a janela do jogador fecha e o cartão de espera some', async () => {
      // Ataque: d10 8 → 8 + 4 + 8 = 20 contra DV 16. Dano 5d6: 2 × 5 = 10 contra o SP do Alvo.
      await fixar(edge, [[8, 10], [2, 6], [2, 6], [2, 6], [2, 6], [2, 6]]);
      await edge.evaluate(`(() => {
        window.__pente = __ator('Atiradora').items.getName('Assault Rifle').system.pente.value;
        window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') });
        return true;
      })()`);
      const janelaDoJogador = `Boolean(document.querySelector('.application.cpr-fieldbook.janela-defesa'))`;
      const botao = `document.querySelector('.cartao.espera [data-cprf-acao="responder"][data-escolha="aguentar"]')`;
      let abriu = false;
      for (let i = 0; i < 40 && !abriu; i++) { await jogador.sleep(250); abriu = await jogador.evaluate(janelaDoJogador); }
      let cartao = false;
      for (let i = 0; i < 60 && !cartao; i++) { await edge.sleep(250); cartao = await edge.evaluate(`Boolean(${botao})`); }
      await edge.evaluate(`${botao}?.click()`);
      const info = await edge.evaluate(`window.__ataque.then(r => ({ linha: __linhas(r)[0], notas: r.notas }))`);
      await edge.sleep(600);
      const fechou = !(await jogador.evaluate(janelaDoJogador));
      const cartaoSumiu = !(await edge.evaluate(`game.messages.contents.some(m => m.content.includes('cartao espera'))`));
      await edge.evaluate(`(async () => {
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        await __ator('Atiradora').items.getName('Assault Rifle').update({ 'system.pente.value': window.__pente });
        return true;
      })()`);
      const l = info.linha;
      return [abriu && cartao && l.escolha === 'aguentar' && l.resultado === 'acertou' && info.notas.some(n => /O mestre respondeu por Jogador: Alvo aguentou/.test(n)) && fechou && cartaoSumiu,
        JSON.stringify({ abriu, cartao, fechou, cartaoSumiu, ...info })];
    });

    await r.passo('jogador fecha a janela de reação no X, e depois não responde no tempo (10 s): vale a escolha padrão; no corpo a corpo, a esquiva, que o computador dele rola direto, sem a janela de rolagem; o mestre anota cada caso', async () => {
      // A Atiradora golpeia o Alvo com a lâmina (DEX 7 + Arma Branca 3 + d10 2), duas vezes. No corpo a corpo, o Alvo só
      // esquiva: no X, a esquiva rola com o d10 5; sem resposta, com o d10 6. O Alvo (DEX 7 + Evasão 2) passa as duas.
      await jogador.evaluate(`game.settings.set('${S}', 'rolarDireto', false).then(() => true)`);
      const janela = `document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing)')`;
      const rolagemAberta = `Boolean(document.querySelector('.application.janela-rolagem'))`;
      // No navegador do jogador: espera a janela de reação e devolve o texto dela.
      const esperarReacao = async () => {
        for (let i = 0; i < 40; i++) {
          await jogador.sleep(250);
          const texto = await jogador.evaluate(`${janela}?.querySelector('.window-content').textContent.replace(/\\s+/g, ' ').trim() ?? null`).catch(() => null);
          if (texto) return texto;
        }
        return null;
      };
      try {
        const base = await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const lamina = foundry.utils.deepClone(cat['core_weapons:medium-melee']);
          lamina.system.equipada = true;
          [window.__lamina] = await __ator('Atiradora').createEmbeddedDocuments('Item', [lamina]);
          window.__tempoAntes = game.settings.get('${S}', 'tempo');
          await game.settings.set('${S}', 'tempo', 10);
          const soma = partes => partes.reduce((total, parte) => total + parte.valor, 0);
          return { ataque: soma(window.__lamina.partesDoAtaque().partes), esquiva: soma(__ator('Alvo').partesDaPericia('evasion').partes) };
        })()`);
        const golpear = () => edge.evaluate(`(() => { window.__golpe = window.__lamina.atacar({ alvo: __token('Alvo') }); return true; })()`);
        const resultado = () => edge.evaluate(`window.__golpe.then(r => ({ ataque: r.ataque, linha: __linhas(r)[0], notas: r.notas }))`);

        // 1. O X: vale a esquiva (a única escolha), rolada direto.
        await fixar(edge, [[2, 10]]);
        await fixar(jogador, [[5, 10]]);
        await golpear();
        const textoX = await esperarReacao();
        await jogador.evaluate(`${janela}.querySelector('.window-header [data-action="close"]').click()`);
        const x = await resultado();
        const rolagemNoX = await jogador.evaluate(rolagemAberta);

        // 2. Sem resposta: a barra acaba em 10 s, e vale a esquiva, rolada direto.
        await fixar(edge, [[2, 10]]);
        await fixar(jogador, [[6, 10]]);
        const inicio = Date.now();
        await golpear();
        const textoTempo = await esperarReacao();
        const t = await resultado();
        const segundos = Math.round((Date.now() - inicio) / 100) / 10;
        const rolagemNoTempo = await jogador.evaluate(rolagemAberta);
        const ataque = base.ataque + 2;
        const ok = /^Atiradora Alvo .* · Corpo a corpo Você não vê o total do ataque: decida antes\. Esquivar .* contra o golpe\. Empate é seu\. Sem resposta em 10 s: esquiva\.$/.test(textoX ?? '')
          && x.ataque === ataque && x.linha.escolha === 'esquivar' && x.linha.defesa === base.esquiva + 5 && x.linha.resultado === 'esquivou'
          && x.notas.includes('Jogador fechou a janela: Alvo esquivou.') && !rolagemNoX && Boolean(textoTempo)
          && t.ataque === ataque && t.linha.escolha === 'esquivar' && t.linha.defesa === base.esquiva + 6 && t.linha.resultado === 'esquivou'
          && t.notas.includes('Jogador não respondeu a tempo: Alvo esquivou.') && segundos >= 9.5 && segundos < 20 && !rolagemNoTempo;
        return [ok, JSON.stringify({ base, textoX, x, rolagemNoX, textoTempo, t, segundos, rolagemNoTempo })];
      } finally {
        await jogador.evaluate(`(async () => {
          await game.settings.set('${S}', 'rolarDireto', true);
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-rolagem') || app.options.classes?.includes('janela-defesa')) await app.close();
          window.__fila = [];
          return true;
        })()`);
        await edge.evaluate(`(async () => {
          window.__fila = [];
          if (window.__lamina) await __ator('Atiradora').deleteEmbeddedDocuments('Item', [window.__lamina.id]);
          window.__lamina = null;
          if (window.__tempoAntes) await game.settings.set('${S}', 'tempo', window.__tempoAntes);
          return true;
        })()`);
      }
    });

    await r.passo('o que a mesa vê do ataque (como o Fluxo): um ataque por vez no mestre (o segundo espera o primeiro); o texto em cima do token para quem vê o cartão; "Quem vê o cartão do resultado" (só o mestre, os envolvidos); "Efeitos na mesa" desligado; e, com "Esconder o total do ataque" desligado, o total à vista desde o começo, também na janela de reação', async () => {
      // Seis tiros da Atiradora no Alvo, que aguenta: d10 2 → REF 8 + Armas de Ombro 4 + 2 = 14 (e d10 3 → 15) contra a
      // DV 16 (10 m): errou, sem dano.
      const janela = `document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing)')`;
      const contarJanelas = `document.querySelectorAll('.application.cpr-fieldbook.janela-defesa:not(.minimizing)').length`;
      const rifle = `__ator('Atiradora').items.getName('Assault Rifle')`;
      // Os textos em cima do token, nos dois navegadores: o createScrollingText grava o que mostra.
      const gravar = `(() => {
        window.__textos = [];
        const original = canvas.interface.constructor.prototype.createScrollingText;
        canvas.interface.createScrollingText = function (origem, texto, opcoes) { window.__textos.push(texto); return original.call(this, origem, texto, opcoes); };
        return true;
      })()`;
      const textos = async () => [await edge.evaluate(`window.__textos.splice(0)`), await jogador.evaluate(`window.__textos.splice(0)`)];
      const configurar = (chave, valor) => edge.evaluate(`game.settings.set('${S}', '${chave}', ${JSON.stringify(valor)}).then(() => true)`);
      // No jogador: espera uma janela de reação que não é a anterior (pelo id) e aguenta nela.
      const proximaJanela = async (anterior = null) => {
        for (let i = 0; i < 60; i++) {
          const id = await jogador.evaluate(`${janela}?.id ?? null`);
          if (id && id !== anterior) return id;
          await jogador.sleep(250);
        }
        return null;
      };
      const aguentar = id => jogador.evaluate(`document.getElementById('${id}').querySelector('button.opcao[data-escolha="aguentar"]').click()`);
      // Um tiro do mestre no Alvo; o jogador aguenta. Devolve o resumo, quem recebeu o cartão do resultado e se o jogador
      // vê o conteúdo dele. "antes" roda com a janela de reação aberta.
      const tiro = async (d10, antes = null) => {
        await fixar(edge, [[d10, 10]]);
        await edge.evaluate(`(() => { window.__tiro = ${rifle}.atacar({ alvo: __token('Alvo') }); return true; })()`);
        const lido = antes ? await antes() : null;
        const texto = await responder(jogador, 'aguentar');
        const r = await edge.evaluate(`window.__tiro.then(r => {
          const cartao = game.messages.contents.findLast(m => m.getFlag('${S}', 'ataque')?.id === r.id);
          return { id: r.id, ataque: r.ataque, resultado: r.linhas[0]?.resultado, whisper: cartao.whisper.map(id => game.users.get(id).name).sort() };
        })`);
        await jogador.sleep(400);
        const viu = await jogador.evaluate(`Boolean(game.messages.contents.find(m => m.getFlag('${S}', 'ataque')?.id === '${r.id}')?.isContentVisible)`);
        return { ...r, viu, texto, lido };
      };
      try {
        await edge.evaluate(gravar);
        await jogador.evaluate(gravar);
        await edge.evaluate(`(() => { window.__penteAntes = ${rifle}.system.pente.value; return true; })()`);

        // 1. A fila: o segundo tiro sai enquanto o primeiro espera a defesa, e a janela dele só abre depois.
        await fixar(edge, [[2, 10], [3, 10]]);
        await edge.evaluate(`(() => { window.__primeiro = ${rifle}.atacar({ alvo: __token('Alvo') }); return true; })()`);
        const primeira = await proximaJanela();
        await edge.evaluate(`(() => { window.__segundo = ${rifle}.atacar({ alvo: __token('Alvo') }); return true; })()`);
        await jogador.sleep(1500);
        const juntas = await jogador.evaluate(contarJanelas);
        if (primeira) await aguentar(primeira);
        const segunda = await proximaJanela(primeira);
        if (segunda) await aguentar(segunda);
        const fila = await edge.evaluate(`Promise.all([window.__primeiro, window.__segundo]).then(rs => rs.map(r => r.ataque + ' ' + r.linhas[0]?.resultado))`);
        await jogador.sleep(400);
        const [textosA, textosAJogador] = await textos();

        // 2. Só o mestre vê o cartão (e o texto); 3. os envolvidos (o mestre e o dono do Alvo); 4. sem efeitos na mesa.
        await configurar('resultado', 'mestre');
        const soMestre = await tiro(2);
        const [textosB, textosBJogador] = await textos();
        await configurar('resultado', 'envolvidos');
        const envolvidos = await tiro(2);
        const [textosC, textosCJogador] = await textos();
        await configurar('resultado', 'publico');
        await configurar('animacoes', 'nao');
        const semEfeito = await tiro(2);
        const [textosD, textosDJogador] = await textos();

        // 5. O total à vista: o cartão do ataque é de todos antes da defesa, e a janela de reação mostra o total.
        await configurar('animacoes', 'auto');
        await configurar('escondeAtaque', false);
        const aVista = await tiro(2, async () => {
          await proximaJanela();
          return jogador.evaluate(`Boolean(game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.ataque).at(-1)?.isContentVisible)`);
        });
        const info = {
          primeira: Boolean(primeira), juntas, segunda: Boolean(segunda) && segunda !== primeira, fila, textosA, textosAJogador,
          soMestre: { ...soMestre, texto: undefined }, textosB, textosBJogador, envolvidos: { ...envolvidos, texto: undefined }, textosC, textosCJogador,
          semEfeito: { ...semEfeito, texto: undefined }, textosD, textosDJogador, aVista
        };
        const ok = info.primeira && juntas === 1 && info.segunda && fila.join() === '14 errou,15 errou' && textosA.join() === 'Errou,Errou' && textosAJogador.join() === 'Errou,Errou'
          && soMestre.whisper.join() === 'Gamemaster' && !soMestre.viu && soMestre.resultado === 'errou' && textosB.join() === 'Errou' && textosBJogador.length === 0
          && envolvidos.whisper.join() === 'Gamemaster,Jogador' && envolvidos.viu && textosC.join() === 'Errou' && textosCJogador.join() === 'Errou'
          && semEfeito.whisper.length === 0 && semEfeito.viu && textosD.length === 0 && textosDJogador.length === 0
          && aVista.lido === true && /Total do ataque: 14 · DV 16/.test(aVista.texto ?? '') && !/Você não vê o total/.test(aVista.texto ?? '') && aVista.resultado === 'errou';
        return [ok, JSON.stringify(info)];
      } finally {
        await jogador.evaluate(`(async () => {
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-defesa')) await app.close();
          window.__fila = [];
          delete canvas.interface.createScrollingText;
          return true;
        })()`);
        await edge.evaluate(`(async () => {
          for (const [chave, valor] of [['resultado', 'publico'], ['animacoes', 'auto'], ['escondeAtaque', true]]) await game.settings.set('${S}', chave, valor);
          if (window.__penteAntes !== undefined) await ${rifle}.update({ 'system.pente.value': window.__penteAntes });
          window.__fila = [];
          delete canvas.interface.createScrollingText;
          return true;
        })()`);
      }
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

    await r.passo('jogador ataca: sem mestre não gasta bala; com mestre, rola no computador dele, o mestre resolve e pede o dano, que o jogador rola (12)', async () => {
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
      const semMestre = await jogador.evaluate(`(async () => {
        const pistola = game.actors.getName('Alvo').items.getName('Heavy Pistol');
        const pente = pistola.system.pente.value;
        const mensagens = game.messages.size;
        const avisos = [];
        Object.defineProperty(game.users, 'activeGM', { value: null, configurable: true });
        ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
        let r;
        try { r = await pistola.atacar({ alvo: canvas.scene.tokens.find(t => t.name === 'Capanga') }); } finally { delete game.users.activeGM; delete ui.notifications.warn; }
        return { resultado: r, avisos, gastou: pente - pistola.system.pente.value, rolou: game.messages.size - mensagens, mestreDeVolta: Boolean(game.users.activeGM) };
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
      return [semMestre.resultado === null && /Sem mestre na mesa/.test(semMestre.avisos.join()) && semMestre.gastou === 0 && semMestre.rolou === 0 && semMestre.mestreDeVolta && pedido?.total === 20 && depois === antes - 12 && autorDoDano === 'Jogador',
        JSON.stringify({ semMestre, pedido, antes, depois, autorDoDano })];
    });

    await r.passo('janela de rolagem do jogador (no computador dele): a esquiva, com o modificador do mestre e a Sorte; o prazo (o mestre responde por ele, e a janela de rolagem do jogador fecha); o dano que ele rola, com o modificador do mestre; o Death Save que o mestre pede, com o modificador', async () => {
      await jogador.evaluate(`game.settings.set('${S}', 'rolarDireto', false).then(() => true)`);
      const janelaDoJogador = `document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)')`;
      // No navegador do jogador: espera a janela de rolagem e devolve o que ela mostra.
      const esperarJanela = async () => {
        for (let i = 0; i < 60; i++) {
          await jogador.sleep(250);
          const lido = await jogador.evaluate(`(() => {
            const j = ${janelaDoJogador};
            return j && { titulo: j.querySelector('.window-title').textContent.trim(), partes: [...j.querySelectorAll('.partes li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim()), sorte: j.querySelector('[name="sorte"]')?.value ?? null };
          })()`).catch(() => null);
          if (lido) return lido;
        }
        return null;
      };
      // No navegador do jogador: põe o modificador do mestre (e a Sorte) e rola.
      const rolarNaJanela = ({ outro = 0, sorte = null } = {}) => jogador.evaluate(`(() => {
        const j = ${janelaDoJogador};
        const campo = (nome, valor) => { const c = j.querySelector('[name="' + nome + '"]'); if (c && valor !== null) { c.value = valor; c.dispatchEvent(new Event('input', { bubbles: true })); } };
        campo('outro', ${outro});
        campo('sorte', ${sorte === null ? 'null' : sorte});
        j.querySelector('button[data-action="rolar"]').click();
        return true;
      })()`);
      // A soma das partes fixas que a janela mostra ("DEX +7", "Evasão +2", "Gravemente ferido −2").
      const somaDasPartes = partes => partes.reduce((soma, parte) => { const m = parte.match(/([+−-])(\d+)$/); return m ? soma + (m[1] === '+' ? 1 : -1) * Number(m[2]) : soma; }, 0);
      try {
        // O estado do começo (o pente do rifle, o HP e a Sorte do Alvo) volta no fim: os passos seguintes contam com ele.
        await edge.evaluate(`(() => { window.__inicioDaJanela = { pente: __ator('Atiradora').items.getName('Assault Rifle').system.pente.value, hp: __ator('Alvo').system.hp.value, sorte: __ator('Alvo').system.sorte.value }; return true; })()`);
        // 1. A esquiva: o mestre ataca o Alvo (d10 4 → 16); o jogador esquiva na janela, com +1 do mestre e Sorte 1, d10 9.
        const sorteAntes = await edge.evaluate(`__ator('Alvo').system.sorte.value`);
        await fixar(edge, [[4, 10]]);
        await fixar(jogador, [[9, 10]]);
        await edge.evaluate(`(() => { window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') }); return true; })()`);
        const escolheu = Boolean(await responder(jogador, 'esquivar'));
        const esquiva = await esperarJanela();
        await rolarNaJanela({ outro: 1, sorte: 1 });
        const r1 = await edge.evaluate(`window.__ataque.then(r => ({ linha: __linhas(r)[0], sorte: __ator('Alvo').system.sorte.value }))`);

        // 2. O prazo: o mestre ataca de novo (d10 4; o dano 5 × 2 não passa do SP); o jogador escolhe Esquivar e não rola;
        //    depois de 8 s, o mestre responde Aguentar, e a janela de rolagem do jogador fecha.
        await fixar(edge, [[4, 10], [2, 6], [2, 6], [2, 6], [2, 6], [2, 6]]);
        await edge.evaluate(`(() => {
          window.__estado = { hp: __ator('Alvo').system.hp.value, pente: __ator('Atiradora').items.getName('Assault Rifle').system.pente.value };
          window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') });
          return true;
        })()`);
        await responder(jogador, 'esquivar');
        const abriuNoPrazo = Boolean(await esperarJanela());
        const botao = `document.querySelector('.cartao.espera [data-cprf-acao="responder"][data-escolha="aguentar"]')`;
        let cartao = false;
        for (let i = 0; i < 60 && !cartao; i++) { await edge.sleep(250); cartao = await edge.evaluate(`Boolean(${botao})`); }
        await edge.evaluate(`${botao}?.click()`);
        const r2 = await edge.evaluate(`window.__ataque.then(r => ({ linha: __linhas(r)[0], notas: r.notas }))`);
        let fechou = false;
        for (let i = 0; i < 20 && !fechou; i++) { await jogador.sleep(250); fechou = !(await jogador.evaluate(`Boolean(${janelaDoJogador})`)); }
        await edge.evaluate(`(async () => {
          await __ator('Alvo').update({ 'system.hp.value': window.__estado.hp });
          await __ator('Atiradora').items.getName('Assault Rifle').update({ 'system.pente.value': window.__estado.pente });
          return true;
        })()`);

        // 3. O dano: o jogador ataca, com a pistola do Alvo, um saco de pancadas a 2 m dele (d10 9 → 20 contra DV 13); o
        //    mestre pede o dano, e a janela abre no jogador; +2 do mestre: 4 + 4 + 4 + 2 = 14.
        await edge.evaluate(`(async () => {
          const saco = await Actor.implementation.create({ name: 'Saco de Pancadas', type: 'personagem', system: { hp: { value: 40 } } });
          const alvo = __token('Alvo');
          await canvas.scene.createEmbeddedDocuments('Token', [(await saco.getTokenDocument({ x: alvo.x, y: alvo.y + 100 })).toObject()]);
          await __esperar(() => canvas.tokens.placeables.some(t => t.document.name === 'Saco de Pancadas'));
          return true;
        })()`);
        await fixar(jogador, [[9, 10], [4, 6], [4, 6], [4, 6]]);
        await jogador.evaluate(`(() => {
          const saco = canvas.scene.tokens.find(t => t.name === 'Saco de Pancadas');
          window.__ataque = game.actors.getName('Alvo').items.getName('Heavy Pistol').atacar({ alvo: saco });
          return true;
        })()`);
        const dano = await esperarJanela();
        await rolarNaJanela({ outro: 2 });
        let hpDoSaco = 40;
        for (let i = 0; i < 40 && hpDoSaco === 40; i++) { await edge.sleep(250); hpDoSaco = await edge.evaluate(`__ator('Saco de Pancadas').system.hp.value`); }

        // 4. O Death Save que o mestre pede ao jogador (o do começo do turno): a janela abre; +1 do mestre; d10 3.
        const ds = await edge.evaluate(`(() => { const s = __ator('Alvo').system.deathSave; return { base: s.base, penalidade: s.penalidade, body: s.body }; })()`);
        await fixar(jogador, [[3, 10]]);
        await edge.evaluate(`(() => { window.__ds = game.system.api.combate.pedir(game.users.getName('Jogador'), 'deathSave', { ator: __ator('Alvo').uuid }); return true; })()`);
        const deathSave = await esperarJanela();
        await rolarNaJanela({ outro: 1 });
        const r4 = await edge.evaluate(`window.__ds`);
        await edge.evaluate(`__ator('Alvo').update({ 'system.deathSave.penalidade': ${ds.penalidade} }).then(() => true)`);

        const info = { escolheu, esquiva, r1, abriuNoPrazo, cartao, r2: { linha: r2.linha, notas: r2.notas }, fechou, dano, hpDoSaco, ds, deathSave, r4 };
        const esperado = somaDasPartes(esquiva?.partes ?? []) + 1 + 1 + 9;
        const ok = escolheu && esquiva?.titulo === 'Teste: Esquiva de Alvo' && esquiva.sorte !== null && r1.linha.escolha === 'esquivar' && r1.linha.defesa === esperado && r1.linha.resultado === 'esquivou' && r1.sorte === sorteAntes - 1
          && abriuNoPrazo && cartao && r2.linha.escolha === 'aguentar' && r2.notas.some(n => /O mestre respondeu por Jogador/.test(n)) && fechou
          && dano?.titulo === 'Dano: Heavy Pistol' && dano.partes.join() === 'Heavy Pistol: 3d6' && hpDoSaco === 40 - 14
          && deathSave?.titulo === 'Death Save de Alvo' && r4?.total === 3 + ds.base + ds.penalidade + 1 && r4.passou === (3 + ds.base + ds.penalidade + 1 < ds.body);
        return [ok, JSON.stringify({ ...info, esperado })];
      } finally {
        await jogador.evaluate(`(async () => {
          await game.settings.set('${S}', 'rolarDireto', true);
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-rolagem') || app.options.classes?.includes('defesa')) await app.close();
          return true;
        })()`);
        await edge.evaluate(`(async () => {
          // Os dados fixos que sobraram no mestre (o dano do ataque da parte 2, que não acertou) saem.
          window.__fila = [];
          const inicio = window.__inicioDaJanela;
          if (inicio) {
            await __ator('Atiradora').items.getName('Assault Rifle').update({ 'system.pente.value': inicio.pente });
            await __ator('Alvo').update({ 'system.hp.value': inicio.hp, 'system.sorte.value': inicio.sorte });
          }
          const tokens = canvas.scene.tokens.filter(t => t.name === 'Saco de Pancadas').map(t => t.id);
          if (tokens.length) await canvas.scene.deleteEmbeddedDocuments('Token', tokens);
          for (const a of game.actors.filter(a => a.name === 'Saco de Pancadas')) await a.delete();
          return true;
        })()`);
      }
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

    await r.passo('linha de visão: o fogo supressivo não pega quem está atrás de uma parede; tirada a parede, pega', async () => {
      // Atrás: a 8 m da Atiradora, com uma parede no meio. O Alvo fica escondido (sem pergunta ao jogador); o Capanga está
      // derrotado e o Longe, a 28 m: ninguém mais conta. Ataque: d10 5 → REF 8 + Autofogo 4 + 5 = 17.
      const info = await edge.evaluate(`(async () => {
        const cena = canvas.scene;
        const atras = await Actor.implementation.create({ name: 'Atrás', type: 'personagem', system: { hp: { value: 40 } } });
        await cena.createEmbeddedDocuments('Token', [(await atras.getTokenDocument({ x: 300, y: 900 })).toObject()]);
        await __token('Alvo').update({ hidden: true });
        const [parede] = await cena.createEmbeddedDocuments('Wall', [{ c: [150, 750, 550, 750] }]);
        await __esperar(() => canvas.tokens.placeables.some(t => t.name === 'Atrás'));
        await new Promise(r => setTimeout(r, 500));
        const rifle = __ator('Atiradora').items.getName('Assault Rifle');
        await rifle.recarregar();
        window.__fila = [[5, 10]];
        const comParede = await rifle.atacar({ modo: 'supressivo' });
        await parede.delete();
        await new Promise(r => setTimeout(r, 500));
        await rifle.recarregar();
        window.__fila = [[5, 10], [3, 10]];
        const semParede = await rifle.atacar({ modo: 'supressivo' });
        await __token('Alvo').update({ hidden: false });
        return { comParede: { cabecalho: comParede.cabecalho, alvos: comParede.linhas.map(l => l.nome) }, semParede: { cabecalho: semParede.cabecalho, alvos: semParede.linhas.map(l => l.nome) } };
      })()`);
      return [info.comParede.alvos.length === 0 && /ninguém/.test(info.comParede.cabecalho) && info.semParede.alvos.join() === 'Atrás', JSON.stringify(info)];
    });

    // ---------- Importar da wiki ----------
    await r.passo('capanga (o mook do CORE): o token nasce solto, com o HP na barra; a ficha é uma página só (o painel geral sem as armas, a tabela de armas, o agarrão, os itens e as notas); o que se arrasta para ela entra equipado (a pistola, a armadura, o Medscanner) ou instalado (o Kerenzikov rola a perda de Humanidade; com Shift, o Grip Foot fica com a média); dois capangas na cena: o tiro num muda só o HP e a SP dele, o outro recarrega e atira com a própria munição, e o Death Save no turno é só do que caiu', async () => {
      // Kerenzikov: 4d6 3 + 3 + 3 + 3 = 12. Tiro no capanga 1 (10 m, DV 15): REF 6 + Pistola 6 + d10 9 = 21; dano 3d6 6 + 5 +
      // 5 = 16, a SP 11 segura 11 e entram 5. Tiro do capanga 2 no atirador (14 m, DV 20): 6 + 6 + 9 = 21; dano 3d6 4 + 4 + 4
      // = 12, sem armadura. Death Save do capanga 1 (HP 0): d10 3 < BODY 5. O 6 depois do Kerenzikov seria o 1d6 do Grip Foot
      // se o Shift não valesse.
      await fixar(edge, []);
      const nomes = ['Teste Capanga', 'Teste Atirador', 'Capanga Dois'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const cat = await game.system.api.wiki.carregarCatalogo();
          // O capanga: REF 6, DEX 6, BODY 5 e WILL 5 (HP 35), EMP 5 (Humanidade 50), Pistola 6.
          const capanga = await Actor.implementation.create({ name: 'Teste Capanga', type: 'capanga', system: {
            atributos: { ref: { valor: 6 }, dex: { valor: 6 }, body: { valor: 5 }, will: { valor: 5 }, emp: { valor: 5 } }, hp: { value: 35 }, humanidade: { value: 50 }, pericias: { handgun: { nivel: 6 } }
          } });
          const token = { ligado: capanga.prototypeToken.actorLink, barra: capanga.prototypeToken.bar1.attribute, visao: capanga.prototypeToken.sight.enabled };

          // 1. A ficha do ator: uma página, sem abas.
          await capanga.sheet.render({ force: true });
          const f = () => capanga.sheet.element;
          await esperar(() => f()?.querySelector('.corpo-capanga'));
          const ficha = {
            classes: ['ficha-capanga', 'ficha-personagem'].every(classe => f().classList.contains(classe)), abas: f().querySelectorAll('nav.tabs').length,
            modelo: textoDe(f().querySelector('.linha-id .modelo')), titulos: [...f().querySelectorAll('.corpo-capanga .titulo')].map(titulo => titulo.firstChild.textContent.trim()), agarrar: Boolean(f().querySelector('.agarrao-capanga [data-action="agarrar"]'))
          };

          // 2. Os itens do compêndio arrastados para a ficha (o drop, como o do mouse).
          const uuidDe = (pack, nome) => { const p = game.packs.get('${S}.' + pack); const e = p.index.find(x => x.name === nome); return e.uuid ?? ('Compendium.' + p.collection + '.Item.' + e._id); };
          const soltar = async (pack, nome, pronto, shiftKey = false) => {
            const dados = new DataTransfer();
            dados.setData('text/plain', JSON.stringify({ type: 'Item', uuid: uuidDe(pack, nome) }));
            f().querySelector('.corpo-capanga').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dados, shiftKey }));
            await esperar(() => { const item = capanga.items.getName(nome); return Boolean(item && pronto(item)); });
            return capanga.items.getName(nome);
          };
          window.__fila = [[3, 6], [3, 6], [3, 6], [3, 6], [6, 6]];
          const pistola = await soltar('armas', 'Heavy Pistol', item => item.system.equipada);
          const armadura = await soltar('armaduras', 'Light Armorjack (Body)', item => item.system.equipada);
          const kerenzikov = await soltar('cyberware', 'Kerenzikov', item => item.system.instalado);
          const grip = await soltar('cyberware', 'Grip Foot', item => item.system.instalado, true);
          const medscanner = await soltar('equipamento', 'Medscanner', item => item.system.uso === 'equipado');
          const bala = await soltar('municao', 'Heavy Pistol (Basic)', () => true);
          await esperar(() => capanga.system.humanidade.value === 35 && f().querySelectorAll('.itens-capanga li[data-item-id]').length === 6);
          const s = capanga.system;
          const recebidos = {
            pistola: pistola.system.equipada, armadura: armadura.system.equipada, kerenzikov: kerenzikov.system.perdaHumanidade.sofrida, grip: grip.system.perdaHumanidade.sofrida,
            instalados: [kerenzikov, grip].every(item => item.system.instalado), medscanner: medscanner.system.uso, bala: bala.system.quantidade,
            hum: s.humanidade.value, humMax: s.humanidade.max, ini: s.iniciativa, sp: s.armadura.corpo.sp,
            itens: [...f().querySelectorAll('.itens-capanga li[data-item-id]')].map(li => [textoDe(li.querySelector('.nome')), textoDe(li.querySelector('button.alternar'))]),
            tabela: [...f().querySelectorAll('table.lista.armas tbody tr')].map(tr => textoDe(tr.querySelector('td.nome a'))),
            cabecalho: [...f().querySelectorAll('.topo .indicador:not(.hp)')].map(textoDe)
          };
          await capanga.sheet.close();

          // 3. Dois capangas na cena, soltos, e quem atira neles.
          const pistolaDoAtirador = foundry.utils.deepClone(cat['core_weapons:heavy-pistol']);
          pistolaDoAtirador.system.equipada = true;
          const atirador = await Actor.implementation.create({ name: 'Teste Atirador', type: 'personagem', system: { atributos: { ref: { valor: 6 }, body: { valor: 6 }, will: { valor: 6 } }, hp: { value: 40 }, pericias: { handgun: { nivel: 6 } } }, items: [pistolaDoAtirador, foundry.utils.deepClone(cat['core_ammo:heavy-pistol-basic'])] });
          await atirador.items.getName('Heavy Pistol').recarregar();
          const cena = canvas.scene;
          const ids = [foundry.utils.randomID(), foundry.utils.randomID(), foundry.utils.randomID()];
          const doc = async (ator, x, _id) => ({ ...(await ator.getTokenDocument({ x, y: 900 })).toObject(), _id });
          await cena.createEmbeddedDocuments('Token', [await doc(atirador, 300, ids[0]), await doc(capanga, 800, ids[1]), await doc(capanga, 1000, ids[2])], { keepId: true });
          await esperar(() => ids.every(id => canvas.tokens.get(id)));
          await new Promise(r => setTimeout(r, 500));
          const [tA, t1, t2] = ids.map(id => cena.tokens.get(id));
          const soltos = [t1, t2].map(t => !t.actorLink && t.actor !== capanga && t.actor.isToken);

          // O tiro no capanga 1.
          window.__fila = [[9, 10], [6, 6], [5, 6], [5, 6]];
          const r1 = await atirador.items.getName('Heavy Pistol').atacar({ alvo: t1 });
          const vida = t => [t.actor.system.hp.value, t.actor.system.armadura.corpo.sp];
          const tiro1 = { linha: __linhas(r1)[0], t1: vida(t1), t2: vida(t2), ator: [capanga.system.hp.value, capanga.system.armadura.corpo.sp] };

          // O capanga 2 recarrega e atira no atirador, com a pistola e a munição dele.
          const pistola2 = t2.actor.items.getName('Heavy Pistol');
          await pistola2.recarregar();
          window.__fila = [[9, 10], [4, 6], [4, 6], [4, 6]];
          const r2 = await pistola2.atacar({ alvo: tA });
          const municao = t => [t.items.getName('Heavy Pistol').system.pente.value, t.items.getName('Heavy Pistol (Basic)').system.quantidade];
          const tiro2 = { linha: __linhas(r2)[0], atirador: atirador.system.hp.value, t2: municao(t2.actor), t1: municao(t1.actor), ator: municao(capanga) };

          // 4. O Death Save no turno: só o capanga 1, que caiu.
          await t1.actor.update({ 'system.hp.value': 0 });
          const combate = await Combat.implementation.create({ scene: cena.id, active: true });
          await combate.createEmbeddedDocuments('Combatant', [{ tokenId: tA.id, sceneId: cena.id, actorId: atirador.id }, { tokenId: t1.id, sceneId: cena.id, actorId: capanga.id }]);
          for (const [t, valor] of [[tA, 20], [t1, 10]]) await combate.setInitiative(combate.combatants.find(c => c.tokenId === t.id).id, valor);
          await combate.startCombat();
          await new Promise(r => setTimeout(r, 400));
          window.__fila = [[3, 10]];
          await combate.nextTurn();
          await esperar(() => t1.actor.system.deathSave.penalidade === 1, 50);
          const morte = { vez: combate.combatant?.tokenId === t1.id, t1: t1.actor.system.deathSave.penalidade, t2: t2.actor.system.deathSave.penalidade, ator: capanga.system.deathSave.penalidade };
          await combate.delete();

          // 5. A ficha do token: a dele, com o HP dele; o nome novo vai para o token na cena, e só para ele.
          await t2.actor.sheet.render({ force: true });
          await esperar(() => t2.actor.sheet.element?.querySelector('.corpo-capanga'));
          const g = () => t2.actor.sheet.element;
          const fichaDoToken = { modelo: textoDe(g().querySelector('.linha-id .modelo')), hp: g().querySelector('.topo [name="system.hp.value"]').value, pente: textoDe(g().querySelector('table.lista.armas tbody tr td:nth-child(5)')) };
          const campo = g().querySelector('.topo input[name="name"]');
          campo.value = 'Capanga Dois';
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          await esperar(() => t2.name === 'Capanga Dois');
          await esperar(() => g()?.querySelector('.topo input[name="name"]')?.value === 'Capanga Dois');
          fichaDoToken.nomes = [t2.name, t1.name, capanga.name, g().querySelector('.topo input[name="name"]').value];
          return { token, ficha, recebidos, soltos, tiro1, tiro2, morte, fichaDoToken };
        })()`);
        await edge.sleep(400);
        await edge.shot('capanga');
        const { token, ficha, recebidos: c, soltos, tiro1, tiro2, morte, fichaDoToken } = info;
        const ok = !token.ligado && token.barra === 'hp' && token.visao
          && ficha.classes && ficha.abas === 0 && ficha.modelo === 'MODELO DOS TOKENS'
          && ficha.titulos.join() === 'ATRIBUTOS,VITAIS,PERÍCIAS,ARMADURA,CYBERWARE,LESÕES CRÍTICAS,ARMAS,AGARRÃO,ITENS,NOTAS' && ficha.agarrar
          && c.pistola && c.armadura && c.instalados && c.kerenzikov === 12 && c.grip === 3 && c.medscanner === 'equipado' && c.bala === 10
          && c.hum === 35 && c.humMax === 46 && c.ini === 8 && c.sp === 11
          && JSON.stringify(c.itens) === JSON.stringify([['Heavy Pistol', 'Equipada'], ['Light Armorjack (Body)', 'Vestida'], ['Heavy Pistol (Basic)', ''], ['Grip Foot', 'Instalado'], ['Kerenzikov', 'Instalado'], ['Medscanner', 'Equipado']])
          && c.tabela.join() === 'Heavy Pistol' && c.cabecalho.join('|') === '0/11 SP CABEÇA/CORPO|8 INICIATIVA|6 ESQUIVA|REPUTAÇÃO|5 FACEDOWN'
          && soltos.every(Boolean)
          && tiro1.linha.resultado === 'acertou' && tiro1.linha.dv === 15 && tiro1.linha.dano?.dano === 16 && tiro1.linha.dano.recebido === 5
          && tiro1.t1.join() === '30,10' && tiro1.t2.join() === '35,11' && tiro1.ator.join() === '35,11'
          && tiro2.linha.resultado === 'acertou' && tiro2.linha.dv === 20 && tiro2.atirador === 28 && tiro2.t2.join() === '7,2' && tiro2.t1.join() === '0,10' && tiro2.ator.join() === '0,10'
          && morte.vez && morte.t1 === 1 && morte.t2 === 0 && morte.ator === 0
          && fichaDoToken.modelo === 'ESTE TOKEN' && fichaDoToken.hp === '35' && /^7\/8/.test(fichaDoToken.pente) && fichaDoToken.nomes.join() === 'Capanga Dois,Teste Capanga,Teste Capanga,Capanga Dois';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          const nomes = ${JSON.stringify(nomes)};
          for (const combate of game.combats.filter(c => c.combatants.some(x => nomes.includes(x.name)))) await combate.delete();
          const tokens = canvas.scene.tokens.filter(t => nomes.includes(t.name));
          for (const t of tokens) await t.actor?.sheet?.close();
          await canvas.scene.deleteEmbeddedDocuments('Token', tokens.map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('capanga, a ficha limitada (como o CORE): o jogador só com a permissão Limitada vê a imagem, o nome e as notas, numa janela menor; com a de Observador, vê a ficha inteira, sem editar', async () => {
      const nomes = ['Teste Limitado', 'Teste Observador'];
      try {
        await edge.evaluate(`(async () => {
          const jogador = game.users.getName('Jogador');
          const { LIMITED, OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
          const pistola = foundry.utils.deepClone((await game.system.api.wiki.carregarCatalogo())['core_weapons:heavy-pistol']);
          pistola.system.equipada = true;
          for (const [name, nivel] of [['Teste Limitado', LIMITED], ['Teste Observador', OBSERVER]]) {
            await Actor.implementation.create({ name, type: 'capanga', ownership: { default: 0, [jogador.id]: nivel }, system: { notas: '<p>Capanga dos Tyger Claws. Fala pouco e atira primeiro.</p>', pericias: { handgun: { nivel: 6 } } }, items: [pistola] });
          }
          return true;
        })()`);
        const info = await jogador.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const ver = async (nome, fechar = true) => {
            await esperar(() => game.actors.getName(nome));
            const ator = game.actors.getName(nome);
            await ator.sheet.render({ force: true });
            await esperar(() => ator.sheet.element?.querySelector('.capanga-limitado, .corpo-capanga'));
            const f = ator.sheet.element;
            const visto = {
              limitado: Boolean(f.querySelector('.capanga-limitado')), corpo: Boolean(f.querySelector('.corpo-capanga')), nome: textoDe(f.querySelector('.capanga-limitado .nome')),
              notas: textoDe(f.querySelector('.notas .texto')), campos: f.querySelector('.window-content').querySelectorAll('input:not([disabled]), select:not([disabled]), button:not([disabled])').length,
              armas: f.querySelectorAll('table.lista.armas tbody tr').length, largura: ator.sheet.position.width
            };
            if (fechar) await ator.sheet.close();
            return visto;
          };
          // A limitada fica aberta para a captura.
          return { observador: await ver('Teste Observador'), limitado: await ver('Teste Limitado', false) };
        })()`);
        await jogador.sleep(400);
        await jogador.shot('capanga-limitada');
        const { limitado: l, observador: o } = info;
        const notas = 'Capanga dos Tyger Claws. Fala pouco e atira primeiro.';
        const ok = l.limitado && !l.corpo && l.nome === 'Teste Limitado' && l.notas === notas && l.campos === 0 && l.armas === 0 && l.largura === 560
          && !o.limitado && o.corpo && o.notas === notas && o.armas === 1 && o.campos === 0 && o.largura === 980;
        return [ok, JSON.stringify(info)];
      } finally {
        await jogador.evaluate(`(async () => { for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) await a.sheet?.close(); return true; })()`);
        await edge.evaluate(`(async () => { for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) await a.delete(); return true; })()`);
      }
    });

    await r.passo('wiki: importa o Solo com STATs, HP, perícias, Role, armas carregadas, armadura vestida, cyberware instalado e o inventário (equipamento e roupas, com o uso da wiki)', async () => {
      await edge.evaluate(`game.settings.set('${S}', 'wikiUrl', ${JSON.stringify(wiki)})`);
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(solo.id)}, '');
        const s = ator.system;
        return {
          nome: ator.name, stats: Object.fromEntries(Object.entries(s.atributos).map(([k, v]) => [k, v.valor])), hp: [s.hp.value, s.hp.max], hum: [s.humanidade.value, s.humanidade.max],
          role: [s.role.nome, s.role.rank, s.role.habilidades], pericias: Object.keys(s.pericias).length, evasao: s.pericias.evasion?.nivel, lingua: Object.keys(s.pericias).filter(k => k.startsWith('language-')),
          armas: ator.items.filter(i => i.type === 'arma').map(i => [i.name, i.system.equipada, i.system.pente.value, i.system.pente.max]),
          armaduras: ator.items.filter(i => i.type === 'armadura').map(i => [i.name, i.system.equipada]), sp: s.armadura.corpo.sp,
          cyber: ator.items.filter(i => i.type === 'cyberware').map(i => [i.name, i.system.instalado]), dinheiro: s.dinheiro, notas,
          extrato: Object.values(s.extratos).map(linhas => linhas.map(l => [l.acao, l.delta, l.saldo, l.motivo].join(' '))),
          pecasComPerda: ator.items.filter(i => i.type === 'cyberware' && i.system.instalado && i.system.perdaHumanidade.media > 0 && i.system.tipo !== 'borgware').length, emp: s.atributos.emp.valor,
          porUid: ator.items.map(i => [i.getFlag('${S}', 'wikiUid'), i.type, i.system.uso ?? null, i.system.quantidade ?? null])
        };
      })()`);
      // O inventário da wiki (equipamento, roupa e droga do CORE; os cyberdecks ainda não têm tipo aqui) entra todo, com o
      // uso da montagem, e nenhum vira aviso.
      const doInventario = solo.resultado.itens.filter(i => /^core_(gear|clothing|drugs):/.test(i.id) && !/^core_gear:cyberdeck/.test(i.id));
      const naFicha = new Map(info.porUid.map(([uid, tipo, uso, qtd]) => [uid, { tipo, uso, qtd }]));
      const inventarioOk = doInventario.length > 0 && doInventario.every(i => naFicha.has(i.uid) && (naFicha.get(i.uid).uso === null || naFicha.get(i.uid).uso === i.uso))
        && !info.notas.some(nota => doInventario.some(i => nota.startsWith(`${i.nome}:`)));
      const st = solo.resultado.stats;
      const statsOk = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'move', 'body'].every(k => info.stats[k] === st[k.toUpperCase()]);
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const armasOk = info.armas.length > 0 && info.armas.filter(([, , , max]) => max > 0).every(([, equipada, valor, max]) => equipada && valor === max);
      return [info.nome === 'Teste Sistema' && statsOk && info.hp[0] === solo.resultado.derivados.hp && info.hp[1] === solo.resultado.derivados.hp && info.role[0] === 'Solo' && info.role[1] === 4
        && info.role[2]['Initiative Reaction'] === 2 && info.evasao >= 2 && info.lingua.length >= 1 && armasOk && info.armaduras.every(([, v]) => v) && info.sp === 11 && info.cyber.every(([, inst]) => inst) && info.hum[0] === solo.resultado.humanidade.atual && info.hum[1] === info.emp * 10 - 2 * info.pecasComPerda && info.pecasComPerda > 0 && info.dinheiro === solo.resultado.dinheiro.saldo
        && JSON.stringify(info.extrato) === JSON.stringify([[`definir ${info.dinheiro} ${info.dinheiro} Dinheiro inicial (criador da wiki)`], [], []])
        && inventarioOk && doc.foundry?.ator,
        `inventário da wiki: ${doInventario.map(i => `${i.nome} (${i.uso})`).join(', ')} · ${JSON.stringify({ ...info, porUid: undefined })} · wiki: ${doc.estadoFoundry} ${doc.foundry?.ator || ''}`];
    });
    await edge.evaluate(`game.actors.find(a => a.getFlag('${S}', 'wiki'))?.sheet.render({ force: true })`);
    await edge.sleep(1200);
    await edge.shot('importado');

    await r.passo('ficha nova: o cabeçalho (Role, Rank, nome e apelido da wiki), a aba Role com as habilidades do Solo em português e o efeito delas, a aba Vida com o Lifepath da wiki, o painel geral (armas equipadas, SP, vitais) e a perícia de família criada e tirada pela ficha; as abas Combate, Equipamento, Cyberware, Role e Vida no jeito das maquetes (a iniciativa, o dinheiro, a Humanidade e a Role na coluna dos números, com 290 px; as armas, as lesões, a munição, o cyberware e as especialidades com as caixas dos pontos; o Lifepath em cinco painéis; as notas da Role e as de ciberpsicose, que gravam)', async () => {
      const lp = solo.resultado.lifepath;
      const info = await edge.evaluate(`(async () => {
        const ator = game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)});
        await ator.sheet.render({ force: true });
        await __esperar(() => ator.sheet.element?.querySelector('.tab.role .habilidade'));
        const f = () => ator.sheet.element;
        const valor = nome => f().querySelector('[name="' + nome + '"]')?.value;
        const texto = seletor => f().querySelector(seletor)?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
        const topo = { role: valor('system.role.nome'), rank: valor('system.role.rank'), nome: valor('name'), apelido: valor('system.apelido') };
        const role = {
          nome: texto('.tab.role .role-nome'), titulo: texto('.tab.role .painel.especialidades .titulo'),
          habilidades: [...f().querySelectorAll('.tab.role .habilidade')].map(li => [li.querySelector('.nome').firstChild.textContent.trim(), li.querySelector('input').value, li.querySelector('.efeito')?.textContent.trim() ?? ''])
        };
        // A conferência dos pontos: um ponto a mais no Ponto Fraco passa do total do Rank 4; tirado, volta.
        const mudar = async (nome, valorNovo) => { const campo = f().querySelector('[name="' + nome + '"]'); campo.value = valorNovo; campo.dispatchEvent(new Event('change', { bubbles: true })); };
        const tituloDaRole = () => texto('.tab.role .painel.especialidades .titulo span');
        await mudar('system.role.habilidades.Spot Weakness', 1);
        await __esperar(() => tituloDaRole().startsWith('5 DE 4'));
        role.passou = { titulo: tituloDaRole(), vermelho: Boolean(f().querySelector('.tab.role .titulo .conta-erro')), aviso: texto('.tab.role .conferencia.erro') };
        await mudar('system.role.habilidades.Spot Weakness', 0);
        await __esperar(() => tituloDaRole().startsWith('4 DE 4'));
        role.devolta = tituloDaRole();
        const vida = { origem: valor('system.lifepath.origem'), meta: valor('system.lifepath.meta'), campos: f().querySelectorAll('.tab.vida textarea').length };
        const equipadas = ator.items.filter(i => i.type === 'arma' && i.system.equipada).length;
        const geral = {
          atacar: f().querySelectorAll('.tab.pericias .item-linha [data-action="atacar"]').length, equipadas,
          sp: [...f().querySelectorAll('.tab.pericias .sp-caixas b')].map(b => b.textContent.trim()), barraHp: f().querySelector('.tab.pericias .barra .hp')?.style.width,
          pericias: f().querySelectorAll('.tab.pericias .pericia').length, comNivel: Object.values(ator.system.pericias).filter(p => p.nivel > 0).length
        };
        // A perícia de família: ver todas, "+ perícia de família", Linguagem "Japonês"; depois o ✕ tira.
        f().querySelector('[data-action="alternarPericias"]').click();
        await __esperar(() => f()?.querySelector('[data-action="novaPericia"]'));
        f().querySelector('[data-action="novaPericia"]').click();
        const janela = classe => document.querySelector('.application.dialog.' + classe + ':not(.minimizing)');
        await __esperar(() => janela('nova-pericia')?.querySelector('input[name="nome"]'));
        janela('nova-pericia').querySelector('select[name="familia"]').value = 'language';
        janela('nova-pericia').querySelector('input[name="nome"]').value = 'Japonês';
        janela('nova-pericia').querySelector('button[data-action="ok"]').click();
        await __esperar(() => f()?.querySelector('.pericia[data-pericia="language-japones"] .tirar'));
        const nova = { dados: ator.system.pericias['language-japones'] ?? null, linha: texto('.pericia[data-pericia="language-japones"] .nome') };
        f().querySelector('.pericia[data-pericia="language-japones"] .tirar').click();
        await __esperar(() => janela('dialog')?.querySelector('button[data-action="yes"]'));
        janela('dialog').querySelector('button[data-action="yes"]').click();
        await __esperar(() => !ator.system.pericias['language-japones']);
        const tirada = !ator.system.pericias['language-japones'] && !f()?.querySelector('.pericia[data-pericia="language-japones"]');
        // De volta ao modo compacto (o do modelo), para a captura.
        f().querySelector('[data-action="alternarPericias"]').click();
        await __esperar(() => f()?.querySelector('[data-action="alternarPericias"]')?.textContent.trim() === 'VER TODAS');
        // As abas no jeito das maquetes: a coluna dos números (a iniciativa e o dinheiro em grande) e o conteúdo ao lado.
        const abas = {
          iniciativa: texto('.tab.combate .coluna-resumo .numero-grande b'), ini: String(ator.system.iniciativa), resumo: f().querySelectorAll('.tab.combate .coluna-resumo .painel').length,
          grade: getComputedStyle(f().querySelector('.tab.combate .aba-colunas')).gridTemplateColumns,
          armas: f().querySelectorAll('.tab.combate .coluna-principal tr[data-item-id]').length, armasDoAtor: ator.items.filter(i => i.type === 'arma').length,
          lesoes: Boolean(f().querySelector('.tab.combate .coluna-principal .lesoes')),
          dinheiro: texto('.tab.equipamento .coluna-resumo .numero-grande b'), saldo: String(ator.system.dinheiro),
          municao: f().querySelectorAll('.tab.equipamento .coluna-resumo li[data-item-id]').length, municoes: ator.items.filter(i => i.type === 'municao').length,
          humanidade: texto('.tab.cyberware .coluna-resumo .numero-grande b'), hum: String(ator.system.humanidade.value),
          cyber: f().querySelectorAll('.tab.cyberware .coluna-principal li[data-item-id]').length, cyberDoAtor: ator.items.filter(i => i.type === 'cyberware').length,
          // A Role (o nome na coluna dos números; cada especialidade com as caixas iguais ao número do campo) e a Vida
          // (os campos do Lifepath em painéis).
          roleNoResumo: Boolean(f().querySelector('.tab.role .coluna-resumo .role-nome')), especialidades: f().querySelectorAll('.tab.role .coluna-principal .especialidades .habilidade').length,
          caixas: [...f().querySelectorAll('.tab.role .especialidades .habilidade')].map(li => (li.querySelector('.pontos-visuais')?.style.getPropertyValue('--pontos').trim() ?? '') + '=' + li.querySelector('input').value).join(),
          grupos: [...f().querySelectorAll('.tab.vida .grupo-lifepath')].map(g => g.querySelectorAll('textarea').length).join()
        };
        // As notas da Role e as de ciberpsicose (as maquetes): campos de texto na coluna dos números, que gravam no ator.
        const escrever = async (nome, texto, pronto) => {
          const campo = f().querySelector('[name="' + nome + '"]');
          campo.value = texto;
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          await __esperar(pronto);
        };
        abas.notas = { naRole: Boolean(f().querySelector('.tab.role .coluna-resumo [name="system.role.notas"]')), naCyberware: Boolean(f().querySelector('.tab.cyberware .coluna-resumo [name="system.notasCiberpsicose"]')),
          antes: [ator.system.role.notas, ator.system.notasCiberpsicose].join('|') };
        await escrever('system.role.notas', 'Deve um favor ao fixer.', () => ator.system.role.notas === 'Deve um favor ao fixer.');
        await escrever('system.notasCiberpsicose', 'Sessão 2: surto leve.', () => ator.system.notasCiberpsicose === 'Sessão 2: surto leve.');
        await __esperar(() => valor('system.notasCiberpsicose') === 'Sessão 2: surto leve.');
        Object.assign(abas.notas, { role: ator.system.role.notas, ciber: ator.system.notasCiberpsicose, naFicha: [valor('system.role.notas'), valor('system.notasCiberpsicose')].join('|') });
        return { topo, role, vida, geral, nova, tirada, abas };
      })()`);
      // As outras abas, para a conferência visual (a ficha fica aberta; o passo seguinte fecha).
      for (const aba of ['pericias', 'combate', 'equipamento', 'cyberware', 'role', 'vida']) {
        await edge.evaluate(`game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)}).sheet.changeTab('${aba}', 'primary')`);
        await edge.sleep(400);
        await edge.shot(`ficha-${aba}`);
      }
      await edge.evaluate(`game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)}).sheet.close().then(() => true)`);
      const { topo, role, vida, geral, nova, abas } = info;
      const habilidade = nome => role.habilidades.find(([n]) => n === nome);
      const ok = topo.role === 'Solo' && topo.rank === '4' && topo.nome === 'Teste Sistema' && topo.apelido === 'Lab'
        && /SOLO/i.test(role.nome) && /Consciência de Combate/.test(role.nome) && /4 DE 4 PONTOS/.test(role.titulo) && role.habilidades.length === 6
        && role.passou.titulo.includes('5 DE 4 PONTOS') && role.passou.vermelho && role.passou.aviso === 'PASSOU DO TOTAL DO RANK 4: 5 DE 4 PONTOS' && role.devolta === '4 DE 4 PONTOS · RED p. 146'
        && habilidade('Reação de Iniciativa')?.[1] === '2' && habilidade('Reação de Iniciativa')[2] === '+2 na Iniciativa'
        && habilidade('Detecção de Ameaça')?.[1] === '2' && habilidade('Detecção de Ameaça')[2] === '+2 em Percepção' && habilidade('Ponto Fraco')?.[1] === '0'
        && vida.campos === 17 && vida.origem && vida.origem === lp.culturalOrigin && vida.meta === lp.lifeGoals
        && geral.atacar === geral.equipadas && geral.equipadas > 0 && geral.sp[1] === '11' && geral.barraHp === '100%' && geral.pericias === geral.comNivel
        && nova.dados?.familia === 'language' && nova.dados.nome === 'Japonês' && nova.dados.nivel === 0 && /Linguagem \(Japonês\)/.test(nova.linha) && info.tirada
        && abas.iniciativa === abas.ini && abas.resumo === 3 && abas.armas === abas.armasDoAtor && abas.armas > 0 && abas.lesoes && /^290px /.test(abas.grade)
        && abas.dinheiro === abas.saldo && abas.municao === abas.municoes && abas.municoes > 0
        && abas.humanidade === abas.hum && abas.cyber === abas.cyberDoAtor && abas.cyber > 0
        && abas.notas.naRole && abas.notas.naCyberware && abas.notas.antes === '|' && abas.notas.role === 'Deve um favor ao fixer.' && abas.notas.ciber === 'Sessão 2: surto leve.'
        && abas.notas.naFicha === 'Deve um favor ao fixer.|Sessão 2: surto leve.'
        && abas.roleNoResumo && abas.especialidades === 6 && abas.caixas.split(',').every(par => { const [c, v] = par.split('='); return c === v && v !== ''; })
        && abas.grupos === '5,4,3,4,1';
      return [ok, JSON.stringify(info)];
    });

    await r.passo('na mesa: a cada mudança, a ficha volta para a wiki no formato que ela já lê (HP, dinheiro, armas com o pente, armadura, cyberware, inventário, perícias, Role)', async () => {
      // O Solo importado perde 15 HP e gasta 100eb; a volta espera 4 s depois da última mudança.
      await edge.evaluate(`(async () => {
        const a = game.actors.find(x => x.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)});
        await a.update({ 'system.hp.value': 30, 'system.dinheiro': a.system.dinheiro - 100 });
        return true;
      })()`);
      let mesa = null;
      for (let i = 0; i < 40 && mesa?.hp?.atual !== 30; i++) { await edge.sleep(250); mesa = (await api(`/api/personagens/${solo.id}`)).personagem.mesa; }
      const itens = mesa?.itens || [];
      const rifle = itens.find(i => i.nome === 'Assault Rifle');
      const ok = mesa?.hp?.atual === 30 && mesa.hp.max === 45 && mesa.dinheiro === solo.resultado.dinheiro.saldo - 100
        && rifle?.tipo === 'weapon' && rifle.uso === 'equipped' && rifle.pente?.atual === 25 && rifle.municao === 'Rifle (Basic)' && rifle.pericia === 'Shoulder Arms'
        && itens.some(i => i.tipo === 'armor' && i.corpo === 11 && i.uso === 'equipped') && itens.some(i => i.tipo === 'cyberware' && i.instalado)
        && itens.some(i => i.tipo === 'gear' && i.nome === 'Agent' && i.uso === 'carried') && itens.some(i => i.tipo === 'clothing' && i.uso === 'equipped')
        && mesa.stats.REF === solo.resultado.stats.REF && mesa.pericias.some(p => p.nome === 'Evasion' && p.stat === 'DEX')
        && mesa.role?.habilidades.some(([nome, rank]) => nome === 'Initiative Reaction' && rank === 2) && itens.every(i => i.uid);
      return [ok, JSON.stringify({ ...mesa, itens: itens.map(i => `${i.tipo}:${i.nome}:${i.uso}`) }).slice(0, 1500)];
    });

    await r.passo('pedidos da loja: o aprovado na wiki entra na ficha (o carregador estendido no rifle, 10 balas), desconta 110eb e fica entregue; não sai em dobro; o caro demais fica aprovado com o erro', async () => {
      const rifleDaWiki = solo.resultado.itens.find(i => i.id === 'core_weapons:assault-rifle');
      // Pedido 1: Extended Magazine (Assault Rifle) no rifle e 10 balas de rifle (10eb o pacote) = 110eb.
      const { pedido } = await api(`/api/personagens/${solo.id}/pedidos`, 'POST', {
        itens: [{ id: 'core_upgrades:extended-magazine-assault-rifle', qtd: 1, em: rifleDaWiki.uid }, { id: 'core_ammo:rifle-basic', qtd: 10 }]
      });
      await api(`/api/personagens/${solo.id}/pedidos/${pedido.id}/aprovar`, 'POST', {});
      // Pedido 2, caro demais para o que vai sobrar: Linear Frame β (5.000eb).
      const caro = (await api(`/api/personagens/${solo.id}/pedidos`, 'POST', { itens: [{ id: 'core_gear:linear-frame-beta', qtd: 1 }] })).pedido;
      await api(`/api/personagens/${solo.id}/pedidos/${caro.id}/aprovar`, 'POST', {});
      const info = await edge.evaluate(`(async () => {
        const a = game.actors.find(x => x.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)});
        const antes = a.system.dinheiro;
        // As mensagens da entrega (a do pedido sem dinheiro é um aviso) ficam aqui, conferidas, e não no console.
        const mensagens = [];
        ui.notifications.info = m => { mensagens.push(String(m)); };
        ui.notifications.warn = m => { mensagens.push(String(m)); };
        let resultados;
        try { resultados = await game.system.api.wiki.entregarPedidos(); } finally { delete ui.notifications.info; delete ui.notifications.warn; }
        const rifle = a.items.getName('Assault Rifle');
        const extrato = a.system.extratos.dinheiro.slice(-2).map(l => [l.acao, l.delta, l.motivo].join(' '));
        const depois = {
          dinheiro: a.system.dinheiro, pente: rifle.system.pente.max, acessorios: rifle.instalados.map(i => i.name),
          municao: a.items.filter(i => i.type === 'municao').map(i => i.name + ' ' + i.system.quantidade), linear: a.items.filter(i => i.name.startsWith('Linear Frame')).length
        };
        // Entregar de novo o mesmo pedido, inteiro: os itens dele já estão na ficha (o uid "pedido:<id>:<n>"), então nada sai
        // em dobro, e a wiki recusa marcar de novo (já resolvido).
        const itensAntes = a.items.size;
        const deNovo = await game.system.api.wiki.entregarPedido(a, ${JSON.stringify(solo.id)}, ${JSON.stringify(pedido)}).then(r => r.ok, e => e.message);
        return { antes, resultados: resultados.map(r => r.ok), mensagens, depois, extrato, deNovo, itensAntes, itensDepois: a.items.size, dinheiroDepois: a.system.dinheiro, linhasDepois: a.system.extratos.dinheiro.length };
      })()`);
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const status = id => doc.pedidos.find(p => p.id === id);
      const d = info.depois;
      const ok = info.resultados.join() === 'true,false' && d.dinheiro === info.antes - 110 && d.pente === 35 && d.acessorios.join() === 'Extended Magazine (Assault Rifle)'
        && d.municao.includes('Rifle (Basic) 10') && d.linear === 0 && status(pedido.id).status === 'entregue' && status(caro.id).status === 'aprovado' && /Dinheiro insuficiente/.test(status(caro.id).erro)
        && info.mensagens.some(m => /entregue na ficha/.test(m)) && info.mensagens.some(m => /não foi entregue/.test(m)) && /já foi resolvido/.test(info.deNovo) && info.itensDepois === info.itensAntes && info.dinheiroDepois === d.dinheiro
        // No extrato: a mudança da mesa no passo anterior (−100 por fora, sem motivo) e a compra, com os itens.
        && info.extrato.join(' / ') === `definir -100  / subtrair -110 Compra na wiki: ${pedido.itens.map(linha => linha.nome).join(', ')}` && info.linhasDepois === 3;
      return [ok, JSON.stringify({ ...info, wiki: [status(pedido.id).status, status(caro.id).status, status(caro.id).erro] })];
    });

    await r.passo('migração: "Importar da mesa" monta o ator pela ficha que o Foundry 12 mandou (HP, dinheiro, lesão, itens pelo uid e pelo nome, o pente, o SP que sobrou, os programas no deck)', async () => {
      // Um personagem da wiki de teste com a criação mínima e a ficha da mesa no formato do cpr-2077 (Foundry 12).
      const { personagem } = await api('/api/personagens', 'POST', {
        nome: 'Teste Migração', apelido: 'Foundry 12', resultado: {
          stats: { INT: 6, REF: 8, DEX: 7, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 6, EMP: 5 }, derivados: { hp: 40 }, humanidade: { atual: 48 }, dinheiro: { saldo: 500 },
          pericias: [], veiculos: [],
          itens: [
            { uid: 'pacote:armas:0', id: 'core_weapons:heavy-pistol', nome: 'Pistola pesada', qtd: 1 }, { uid: 'pacote:armas:1', id: 'core_ammo:heavy-pistol-basic', nome: 'Munição', qtd: 30 },
            { uid: 'pacote:armas:2', id: 'core_armor:light-armorjack-body', nome: 'Armorjack', qtd: 1 }
          ]
        }
      });
      await api(`/api/personagens/${personagem.id}/mesa`, 'PUT', {
        ator: 'atorDoF12', nomeAtor: 'Teste Migração', quando: '2026-10-01T22:00:00.000Z',
        stats: { INT: 6, REF: 8, DEX: 7, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 2, BODY: 6, EMP: 4 },
        hp: { atual: 20, max: 40 }, humanidade: { atual: 41, max: 48 }, sorte: { atual: 3, max: 5 }, sp: { cabeca: 0, corpo: 10 }, dinheiro: 1234, ip: 12, reputacao: 2,
        role: { nome: 'Solo', rank: 4, habilidades: [['Initiative Reaction', 2], ['Threat Detection', 2]] },
        pericias: [{ nome: 'Handgun', nivel: 6, stat: 'REF' }, { nome: 'Language (Streetslang)', nivel: 4, stat: 'INT' }],
        lesoes: ['Broken Leg'],
        itens: [
          { nome: 'Heavy Pistol', tipo: 'weapon', qtd: 1, uso: 'equipped', uid: 'pacote:armas:0', dano: '3d6', cdt: 2, pericia: 'Handgun', distancia: true, maos: 1, pente: { atual: 5, max: 8 }, municao: 'Heavy Pistol (Basic)', dentro: ['Heavy Pistol (Basic)'] },
          { nome: 'Heavy Pistol (Basic)', tipo: 'ammo', qtd: 17, uso: 'carried', uid: 'pacote:armas:1' },
          { nome: 'Light Armorjack (Body)', tipo: 'armor', qtd: 1, uso: 'equipped', uid: 'pacote:armas:2', cabeca: 0, corpo: 10 },
          { nome: 'Combat Knife', tipo: 'weapon', qtd: 1, uso: 'carried', uid: '', dano: '1d6', cdt: 2, pericia: 'Melee Weapon', distancia: false, maos: 1, pente: null, municao: '' },
          { nome: 'Agent', tipo: 'gear', qtd: 1, uso: 'carried', uid: '' },
          { nome: 'Cyberdeck', tipo: 'cyberdeck', qtd: 1, uso: 'equipped', uid: '', dentro: ['Sword', 'Worm'] },
          { nome: 'Sword', tipo: 'program', qtd: 1, uso: '', uid: '' }, { nome: 'Worm', tipo: 'program', qtd: 1, uso: '', uid: '' },
          { nome: 'Kerenzikov', tipo: 'cyberware', qtd: 1, uso: '', uid: '', instalado: true, base: false },
          { nome: 'Coisa Desconhecida', tipo: 'gear', qtd: 1, uso: 'carried', uid: '' }
        ]
      });
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarDaMesa(${JSON.stringify(personagem.id)}, '');
        const s = ator.system;
        const item = nome => ator.items.getName(nome);
        const pistola = item('Heavy Pistol');
        const resultado = {
          hp: [s.hp.value, s.hp.max], hum: [s.humanidade.value, s.humanidade.max], sorte: s.sorte.value, dinheiro: s.dinheiro, ip: s.pontosDeMelhoria, rep: s.reputacao,
          move: s.atributos.move.valor, ref: s.atributos.ref.valor, pericias: [s.pericias.handgun?.nivel, s.pericias['language-streetslang']?.nivel], habilidades: s.role.habilidades,
          lesoes: ator.items.filter(i => i.type === 'lesao').map(i => i.name),
          pistola: [pistola.system.equipada, pistola.system.pente.value, pistola.municaoCarregada?.name, pistola.municaoCarregada?.system.quantidade],
          faca: item('Combat Knife')?.system.equipada, agent: item('Agent')?.system.uso, sp: s.armadura.corpo.sp,
          deck: item('Cyberdeck')?.instalados.map(i => i.name), ker: item('Kerenzikov')?.system.instalado, notas,
          extrato: Object.values(s.extratos).map(linhas => linhas.map(l => [l.acao, l.saldo, l.motivo].join(' ')).join())
        };
        await ator.delete();
        return resultado;
      })()`);
      const ok = info.hp.join() === '20,40' && info.hum.join() === '41,48' && info.sorte === 3 && info.dinheiro === 1234 && info.ip === 12 && info.rep === 2
        && info.move === 2 && info.ref === 8 && info.pericias.join() === '6,4' && info.habilidades['Initiative Reaction'] === 2 && info.lesoes.join() === 'Perna quebrada'
        && info.pistola.join() === 'true,5,Heavy Pistol (Basic),17' && info.faca === false && info.agent === 'carregando' && info.sp === 10
        && info.deck.join() === 'Sword,Worm' && info.ker === true && info.notas.length === 1 && info.notas[0].startsWith('Coisa Desconhecida:')
        && info.extrato.join(' / ') === ['definir 1234', 'definir 12', 'definir 2'].map(t => t + ' Migrado da ficha da mesa do Foundry 12').join(' / ');
      return [ok, JSON.stringify(info)];
    });

    await r.passo('migração: a ficha da mesa que este sistema manda volta igual pelo "Importar da mesa" (ida e volta)', async () => {
      const info = await edge.evaluate(`(async () => {
        await game.system.api.wiki.mandarPendentes();
        const original = game.actors.find(x => x.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)});
        const resumo = a => {
          const rifle = a.items.getName('Assault Rifle');
          return { hp: a.system.hp.value, dinheiro: a.system.dinheiro, hum: a.system.humanidade.value, itens: a.items.map(i => i.name).sort(), rifle: [rifle.system.pente.value, rifle.system.pente.max, rifle.instalados.map(i => i.name)] };
        };
        const antes = resumo(original);
        const { ator, notas } = await game.system.api.wiki.importarDaMesa(${JSON.stringify(solo.id)}, '');
        const depois = resumo(ator);
        await ator.delete();
        return { antes, depois, notas, original: { id: original.id, nome: original.name } };
      })()`);
      // A wiki ficou ligada ao ator da importação, que o passo apagou. Ela só aceita a ficha e os pedidos do ator ligado
      // (o "ator antigo" leva 409): a ligação volta para o Solo do começo, com o que ele já recebeu.
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const religado = await api(`/api/personagens/${solo.id}/foundry`, 'PUT', { ator: info.original.id, nomeAtor: info.original.nome, versao: doc.versao, entregues: doc.foundry?.entregues ?? [] });
      return [JSON.stringify(info.antes) === JSON.stringify(info.depois) && info.notas.length === 0 && religado.foundry?.ator === info.original.id,
        JSON.stringify({ ...info, religado: religado.foundry?.ator ?? religado })];
    });

    await r.passo('Role do RED: quem era Face (na criação da wiki ou na ficha da mesa do Foundry 12) entra como Rockerboy, como a wiki faz com os personagens antigos, e a ficha antiga com "Face" lê o Rockerboy; a aba Role mostra o Impacto Carismático, sem bônus nas perícias; o Nomad soma o Moto nas seis perícias de veículo', async () => {
      const stats = { INT: 6, REF: 6, DEX: 6, TECH: 5, COOL: 8, WILL: 6, LUCK: 5, MOVE: 6, BODY: 6, EMP: 7 };
      const pericias = [{ nome: 'Conversation', nivel: 4 }, { nome: 'Drive Land Vehicle', nivel: 3 }];
      // Um personagem antigo da wiki, ainda com a Role Face do suplemento de fã (e a especialização dela).
      const { personagem } = await api('/api/personagens', 'POST', {
        nome: 'Teste Face', apelido: 'Voz', resultado: {
          stats, derivados: { hp: 40 }, humanidade: { atual: 70 }, dinheiro: { saldo: 0 }, pericias, itens: [], veiculos: [],
          role: { nome: 'Face', rank: 4, especializacao: { nome: 'Siren', pericias: ['Conversation', 'Personal Grooming'] } }
        }
      });
      // A ficha da mesa do Foundry 12 com a Role Face (o formato do cpr-2077).
      await api(`/api/personagens/${personagem.id}/mesa`, 'PUT', {
        ator: 'atorFace', nomeAtor: 'Teste Face', quando: '2026-10-01T22:00:00.000Z', stats,
        hp: { atual: 40, max: 40 }, humanidade: { atual: 70, max: 70 }, sorte: { atual: 5, max: 5 }, sp: { cabeca: 0, corpo: 0 }, dinheiro: 0, ip: 0, reputacao: 0,
        role: { nome: 'Face', rank: 4, habilidades: [] }, pericias: pericias.map(p => ({ ...p, stat: 'EMP' })), lesoes: [], itens: []
      });
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const importado = (await game.system.api.wiki.importarPersonagem(${JSON.stringify(personagem.id)}, '')).ator;
          const daImportacao = { role: importado.system.role.nome, campos: Object.keys(importado.toObject().system.role).sort().join() };
          await importado.delete();
          const { ator } = await game.system.api.wiki.importarDaMesa(${JSON.stringify(personagem.id)}, '');
          // ator.system, a cada vez: o Foundry monta um objeto novo a cada mudança.
          const s = () => ator.system;
          const papel = id => s().pericia(id).role;
          const daMesa = { role: s().role.nome, conversa: papel('conversation'), dirigir: papel('drive-land-vehicle') };
          await ator.sheet.render({ force: true });
          const f = () => ator.sheet.element;
          const texto = seletor => f()?.querySelector(seletor)?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          await esperar(() => texto('.tab.role .role-nome').startsWith('Rockerboy'));
          const rockerboy = { nome: texto('.tab.role .role-nome'), bonus: Boolean(f().querySelector('.tab.role .bonus-role')) };
          // A ficha antiga, com "Face" no campo da Role: lê o Rockerboy.
          await ator.update({ 'system.role.nome': 'Face' });
          await esperar(() => s().role.nome === 'Face' && texto('.tab.role .role-nome').startsWith('Rockerboy'));
          const antiga = { nome: texto('.tab.role .role-nome'), conversa: papel('conversation') };
          // O Nomad: o Moto soma o Rank nas seis perícias de veículo, no total da ficha e na aba Role.
          await ator.update({ 'system.role.nome': 'Nomad' });
          await esperar(() => texto('.tab.role .bonus-role .soma').startsWith('Moto'));
          const esperado = 'Moto +4 em ' + game.system.api.regras.PERICIAS_DO_MOTO.map(id => s().pericia(id).nome).join(', ') + '.';
          const nomad = { dirigir: papel('drive-land-vehicle'), conversa: papel('conversation'), soma: texto('.tab.role .bonus-role .soma'), esperado, total: texto('.tab.pericias .pericia[data-pericia="drive-land-vehicle"] .total') };
          // De volta ao Rockerboy, na aba Role, para a captura (o finally fecha e apaga).
          await ator.update({ 'system.role.nome': 'Rockerboy' });
          await esperar(() => texto('.tab.role .role-nome').startsWith('Rockerboy') && !f().querySelector('.tab.role .bonus-role'));
          ator.sheet.changeTab('role', 'primary');
          return { daImportacao, daMesa, rockerboy, antiga, nomad, ref: s().atributos.ref.valor };
        })()`);
        await edge.sleep(400);
        await edge.shot('role-rockerboy');
        const { daImportacao, daMesa, rockerboy, antiga, nomad } = info;
        const moto = b => b?.rotulo === 'Moto' && b.valor === 4;
        // Os campos da Role são os do modelo (as notas da Role, vazias, desde o ciclo 68), sem nada a mais da importação.
        const ok = daImportacao.role === 'Rockerboy' && daImportacao.campos === 'habilidades,nome,notas,rank'
          && daMesa.role === 'Rockerboy' && daMesa.conversa === null && daMesa.dirigir === null
          && /^Rockerboy \/\/ Impacto Carismático/.test(rockerboy.nome) && !rockerboy.bonus
          && /^Rockerboy \/\/ Impacto Carismático/.test(antiga.nome) && antiga.conversa === null
          && moto(nomad.dirigir) && nomad.conversa === null && nomad.soma === nomad.esperado && nomad.total === String(info.ref + 3 + 4);
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { for (const a of game.actors.filter(a => a.name === 'Teste Face')) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('rolagens de Role do RED pela aba Role: o Impacto Carismático do Rockerboy (Rank + 1d10, pela janela, com o modificador do mestre); a pechincha do Fixer (COOL + Negociação + Operator + 1d10, com Ctrl + clique); o Backup do Lawman (1d10 até o Rank: vem, com o d6 das rodadas, ou ninguém responde); o Solo não tem rolagem', async () => {
      // d10 5: 4 + 5 + 2 (mestre) = 11. d10 7: COOL 8 + Negociação 3 + Operator 4 + 7 = 22. Backup: d10 3 até o Rank 4, e o
      // d6 5; depois o d10 6, maior que o Rank.
      await fixar(edge, [[5, 10], [7, 10], [3, 10], [5, 6], [6, 10]]);
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const a = await Actor.implementation.create({ name: 'Teste Roles', type: 'personagem', system: { atributos: { cool: { valor: 8 } }, pericias: { trading: { nivel: 3 } }, role: { nome: 'Rockerboy', rank: 4 } } });
          await a.sheet.render({ force: true });
          a.sheet.changeTab('role', 'primary');
          const f = () => a.sheet.element;
          const botoes = () => [...(f()?.querySelectorAll('.tab.role .rolagens-role [data-action="rolarRole"]') ?? [])].map(b => b.dataset.rolagem);
          const botao = id => f().querySelector('.tab.role .rolagens-role [data-rolagem="' + id + '"]');
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await esperar(() => botoes().length);

          // 1. Rockerboy: o clique abre a janela, com o Rank; +2 do mestre.
          const rockerboy = { botoes: botoes(), texto: textoDe(botao('impacto-carismatico')) };
          botao('impacto-carismatico').click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          rockerboy.titulo = textoDe(janela().querySelector('.window-title'));
          rockerboy.partes = [...janela().querySelectorAll('.partes li')].map(textoDe);
          const outro = janela().querySelector('[name="outro"]');
          outro.value = 2;
          outro.dispatchEvent(new Event('input', { bubbles: true }));
          let antes = game.messages.size;
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          Object.assign(rockerboy, { total: m.rolls[0].total, cartao: partesDa(m), sabor: textoDe(html(m).querySelector('.sabor')) });

          // 2. Fixer: Ctrl + clique rola direto.
          await a.update({ 'system.role.nome': 'Fixer' });
          await esperar(() => botoes().join() === 'pechinchar');
          antes = game.messages.size;
          ctrl(botao('pechinchar'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const fixer = { total: m.rolls[0].total, cartao: partesDa(m), janela: Boolean(janela()) };

          // 3. Lawman: o Backup, que vem e que não vem.
          await a.update({ 'system.role.nome': 'Lawman' });
          await esperar(() => botoes().join() === 'backup');
          const lerBackup = msg => ({ flag: msg.getFlag('${S}', 'backup'), texto: textoDe(html(msg).querySelector('.cartao')), falhou: html(msg).querySelector('.cartao').classList.contains('falhou') });
          antes = game.messages.size;
          botao('backup').click();
          await esperar(() => game.messages.size > antes);
          const veio = lerBackup(game.messages.contents.at(-1));
          antes = game.messages.size;
          botao('backup').click();
          await esperar(() => game.messages.size > antes);
          const naoVeio = lerBackup(game.messages.contents.at(-1));

          // 4. Solo: sem rolagem de Role.
          await a.update({ 'system.role.nome': 'Solo' });
          await esperar(() => !f().querySelector('.tab.role .rolagens-role'));
          return { rockerboy, fixer, veio, naoVeio, solo: botoes() };
        })()`);
        const { rockerboy, fixer, veio, naoVeio } = info;
        const ok = rockerboy.botoes.join() === 'impacto-carismatico' && rockerboy.texto === 'Impacto Carismático Rank + 1d10'
          && rockerboy.titulo === 'Teste: Impacto Carismático' && rockerboy.partes.join() === 'Impacto Carismático +4,1d10' && rockerboy.total === 11
          && rockerboy.cartao.join() === '1d10,Impacto Carismático +4,Modificador do mestre +2' && rockerboy.sabor === 'DV 8 para uma pessoa, 10 para até seis, 12 para um grupo maior.'
          && !fixer.janela && fixer.total === 22 && fixer.cartao.join() === '1d10,COOL +8,Negociação +3,Operator +4'
          && veio.flag?.veio && veio.flag.d10 === 3 && veio.flag.d6 === 5 && veio.flag.rodadas === 5 && !veio.falhou && /1d10 = 3: o reforço vem\. Chega em 5 rodadas \(1d6\)\./.test(veio.texto)
          && naoVeio.flag?.veio === false && naoVeio.flag.d10 === 6 && naoVeio.flag.d6 === null && naoVeio.falhou && /1d10 = 6: maior que o Rank, ninguém responde\./.test(naoVeio.texto)
          && info.solo.length === 0;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { window.__fila = []; for (const a of game.actors.filter(a => a.name === 'Teste Roles')) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('rolagens de Role do Tech e do Medtech pela aba Role: a Especialização de Campo pergunta a perícia de TECH (da mais alta para a mais baixa, com as de família) e rola TECH + a perícia + os pontos + 1d10 pela janela, e fechar a pergunta não rola; a Cirurgia do Medtech (2 por ponto de Cirurgia, até 10) rola TECH + Cirurgia + 1d10 com Ctrl + clique; o painel de Medicina mostra as perícias que vêm das especialidades, e a importada fica de fora das outras habilidades', async () => {
      // d10 6: TECH 7 + Tecnologia de Armas 5 + Campo 3 + 6 = 21. d10 4: TECH 7 + Cirurgia 6 (3 pontos) + 4 = 17.
      await fixar(edge, [[6, 10], [4, 10]]);
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const a = await Actor.implementation.create({ name: 'Teste Roles', type: 'personagem', system: {
            atributos: { tech: { valor: 7 } }, pericias: { weaponstech: { nivel: 5 }, 'basic-tech': { nivel: 2 }, 'play-instrument-guitarra': { familia: 'play-instrument', nome: 'Guitarra', nivel: 3 } },
            role: { nome: 'Tech', rank: 4, habilidades: { 'Field Expertise': 3, 'Upgrade Expertise': 1 } }
          } });
          await a.sheet.render({ force: true });
          a.sheet.changeTab('role', 'primary');
          const f = () => a.sheet.element;
          const botoes = () => [...(f()?.querySelectorAll('.tab.role .rolagens-role [data-action="rolarRole"]') ?? [])].map(b => b.dataset.rolagem);
          const botao = id => f().querySelector('.tab.role .rolagens-role [data-rolagem="' + id + '"]');
          const pergunta = () => document.querySelector('.application.dialog.escolher-pericia:not(.minimizing)');
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await esperar(() => botoes().length);

          // 1. Tech: o clique pergunta a perícia; fechada a pergunta, não rola.
          const tech = { botoes: botoes(), texto: textoDe(botao('campo')) };
          let antes = game.messages.size;
          botao('campo').click();
          await esperar(() => pergunta()?.querySelector('select[name="pericia"]'));
          tech.titulo = textoDe(pergunta().querySelector('.window-title'));
          tech.opcoes = [...pergunta().querySelectorAll('select[name="pericia"] option')].map(o => o.value);
          pergunta().querySelector('.window-header [data-action="close"]').click();
          await esperar(() => !pergunta());
          await new Promise(r => setTimeout(r, 300));
          tech.fechada = { mensagens: game.messages.size - antes, janela: Boolean(janela()) };
          // De novo: Tecnologia de Armas, e a janela de rolagem.
          botao('campo').click();
          await esperar(() => pergunta()?.querySelector('select[name="pericia"]'));
          pergunta().querySelector('select[name="pericia"]').value = 'weaponstech';
          pergunta().querySelector('button[data-action="ok"]').click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          tech.janela = { titulo: textoDe(janela().querySelector('.window-title')), partes: [...janela().querySelectorAll('.partes li')].map(textoDe) };
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          Object.assign(tech, { total: m.rolls[0].total, cartao: partesDa(m), rotulo: m.getFlag('${S}', 'teste')?.rotulo, sabor: textoDe(html(m).querySelector('.sabor')) });

          // 2. Medtech: 3 pontos em Cirurgia, 1 em Farmacêutica e 2 em Criossistemas; a "Surgery Skill" 8 que veio de uma
          // importação antiga não vale (a ficha calcula) e não fica entre as outras habilidades.
          await a.update({ 'system.role.nome': 'Medtech', 'system.role.habilidades.Surgery': 3, 'system.role.habilidades.Medical Tech (Pharmaceuticals)': 1, 'system.role.habilidades.Medical Tech (Cryosystem Operation)': 2, 'system.role.habilidades.Surgery Skill': 8 });
          await esperar(() => botoes().join() === 'cirurgia,tecnologia-medica' && f().querySelector('.tab.role .derivadas'));
          const medtech = {
            botoes: botoes(), niveis: { ...a.system.periciasDeRole },
            derivadas: [...f().querySelectorAll('.tab.role .derivadas li')].map(li => [li.dataset.derivada, textoDe(li.querySelector('b')), textoDe(li.querySelector('small'))]),
            outras: [...f().querySelectorAll('.tab.role input[name^="system.role.habilidades."]')].map(input => input.name.slice('system.role.habilidades.'.length)).sort()
          };
          antes = game.messages.size;
          ctrl(botao('cirurgia'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          Object.assign(medtech, { total: m.rolls[0].total, cartao: partesDa(m), janela: Boolean(janela()) });
          return { tech, medtech };
        })()`);
        await edge.sleep(400);
        await edge.shot('role-medtech');
        const { tech, medtech } = info;
        const ok = tech.botoes.join() === 'campo,upgrade,fabricacao,invencao' && tech.texto === 'Especialização de Campo TECH + perícia + pontos + 1d10'
          && tech.titulo === 'Especialização de Campo' && tech.opcoes.length === 16 && tech.opcoes.slice(0, 3).join() === 'weaponstech,play-instrument-guitarra,basic-tech'
          && tech.fechada.mensagens === 0 && !tech.fechada.janela
          && tech.janela.titulo === 'Teste: Especialização de Campo (Tecnologia de Armas)' && tech.janela.partes.join() === 'TECH +7,Tecnologia de Armas +5,Especialização de Campo +3,1d10'
          && tech.total === 21 && tech.cartao.join() === '1d10,TECH +7,Tecnologia de Armas +5,Especialização de Campo +3'
          && tech.rotulo === 'Especialização de Campo (Tecnologia de Armas)' && tech.sabor === 'Testes técnicos fora do Artífice e reparos temporários (como uma Ação).'
          && medtech.botoes.join() === 'cirurgia,tecnologia-medica' && medtech.niveis['Surgery Skill'] === 6 && medtech.niveis['Medical Tech Skill'] === 3
          && JSON.stringify(medtech.derivadas) === JSON.stringify([['Surgery Skill', 'Perícia Cirurgia: 6', '2 por ponto de Cirurgia, até 10'], ['Medical Tech Skill', 'Perícia Tecnologia Médica: 3', 'Farmacêutica + Operação de Criossistemas']])
          && medtech.outras.join() === 'Field Expertise,Medical Tech (Cryosystem Operation),Medical Tech (Pharmaceuticals),Surgery,Upgrade Expertise'
          && !medtech.janela && medtech.total === 17 && medtech.cartao.join() === '1d10,TECH +7,Cirurgia +6';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { window.__fila = []; for (const a of game.actors.filter(a => a.name === 'Teste Roles')) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('Facedown (wiki, RED p. 194; o CORE): COOL + Reputação + 1d10 pela aba Combate do personagem, com a janela e a regra do empate no cartão; Ctrl + clique rola direto, e gravemente ferido entra o −2; no capanga, a Reputação no cabeçalho (a de covarde, negativa, tira) e o botão do Facedown', async () => {
      // d10 6: COOL 7 + Reputação 3 + 6 + 2 do mestre = 18. Gravemente ferido (HP 19 de 40), d10 5: 7 + 3 − 2 + 5 = 13.
      // Capanga: COOL 6, Reputação −2 (covarde), d10 4: 6 − 2 + 4 = 8.
      await fixar(edge, []);
      const nomes = ['Teste Facedown', 'Teste Capanga Facedown'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));

          // 1. O personagem: COOL 7, Reputação 3, BODY 6 e WILL 6 (HP 40); na aba Combate, pela janela, com +2 do mestre.
          const a = await Actor.implementation.create({ name: 'Teste Facedown', type: 'personagem', system: { atributos: { cool: { valor: 7 }, body: { valor: 6 }, will: { valor: 6 } }, hp: { value: 40 }, reputacao: 3 } });
          await a.sheet.render({ force: true });
          a.sheet.changeTab('combate', 'primary');
          const f = () => a.sheet.element;
          const botao = () => f().querySelector('.tab.combate .medida.rolavel [data-action="rolarFacedown"]');
          await esperar(() => botao());
          const linha = { texto: textoDe(f().querySelector('.tab.combate .medida.rolavel b')), dica: botao().dataset.tooltip };
          let antes = game.messages.size;
          window.__fila = [[6, 10]];
          botao().click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          const daJanela = { titulo: textoDe(janela().querySelector('.window-title')), partes: [...janela().querySelectorAll('.partes li')].map(textoDe) };
          const outro = janela().querySelector('[name="outro"]');
          outro.value = 2;
          outro.dispatchEvent(new Event('input', { bubbles: true }));
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          const pelaJanela = { total: m.rolls[0].total, cartao: partesDa(m), sabor: textoDe(html(m).querySelector('.sabor')), rotulo: m.getFlag('${S}', 'teste')?.rotulo };

          // 2. Gravemente ferido (HP 19 de 40): o −2 entra; Ctrl + clique rola sem a janela.
          await a.update({ 'system.hp.value': 19 });
          await esperar(() => textoDe(f().querySelector('.tab.combate .medida.rolavel b')) === '8 + 1d10');
          const linhaFerido = textoDe(f().querySelector('.tab.combate .medida.rolavel b'));
          antes = game.messages.size;
          window.__fila = [[5, 10]];
          ctrl(botao());
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const ferido = { linha: linhaFerido, total: m.rolls[0].total, cartao: partesDa(m), janela: Boolean(janela()) };
          await a.sheet.close();

          // 3. O capanga: COOL 6; a Reputação de covarde (−2) pelo cabeçalho; o botão do Facedown, com Ctrl + clique.
          const c = await Actor.implementation.create({ name: 'Teste Capanga Facedown', type: 'capanga', system: { atributos: { cool: { valor: 6 } } } });
          await c.sheet.render({ force: true });
          const g = () => c.sheet.element;
          await esperar(() => g()?.querySelector('.topo [name="system.reputacao"]'));
          const campo = g().querySelector('.topo [name="system.reputacao"]');
          campo.value = -2;
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          await esperar(() => c.system.reputacao === -2 && textoDe(g().querySelector('.topo .facedown b')) === '4');
          antes = game.messages.size;
          window.__fila = [[4, 10]];
          ctrl(g().querySelector('.topo [data-action="rolarFacedown"]'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const capanga = { reputacao: c.system.reputacao, base: textoDe(g().querySelector('.topo .facedown b')), total: m.rolls[0].total, cartao: partesDa(m) };
          await c.sheet.close();
          return { linha, daJanela, pelaJanela, ferido, capanga };
        })()`);
        const { linha, daJanela: j, pelaJanela: p, ferido, capanga } = info;
        const ok = linha.texto === '10 + 1d10' && linha.dica === 'COOL 7 + Reputação 3 + 1d10: teste enfrentado'
          && j.titulo === 'Teste: Facedown' && j.partes.join() === 'COOL +7,Reputação +3,1d10'
          && p.total === 18 && p.cartao.join() === '1d10,COOL +7,Reputação +3,Modificador do mestre +2' && p.rotulo === 'Facedown'
          && p.sabor === 'Teste enfrentado. Empate: nada acontece. Quem perde recua ou fica com −2 nas ações contra o outro até derrotá-lo uma vez.'
          && ferido.linha === '8 + 1d10' && !ferido.janela && ferido.total === 13 && ferido.cartao.join() === '1d10,COOL +7,Reputação +3,Gravemente ferido -2'
          && capanga.reputacao === -2 && capanga.base === '4' && capanga.total === 8 && capanga.cartao.join() === '1d10,COOL +6,Reputação -2';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { window.__fila = []; for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('Interface do Netrunner (wiki, RED p. 197–207; o CORE): na aba NET (no jeito da maquete: a Interface em grande na coluna dos números, as habilidades em cartões), as 9 habilidades, a Defesa e a Velocidade pelo cyberdeck equipado, com as Ações NET pelo Rank; o Cloak pela janela; o Eraser só soma ativo e no deck; Ctrl + clique; o dano do Zap; a Velocidade com o Speedy Gonzalvez e gravemente ferido; sem deck equipado, o aviso; quem não é Netrunner não tem Interface', async () => {
      // Rank 4 (3 Ações NET). Cloak, d10 6: Interface 4 + 6 + 2 do mestre = 12; com o Eraser ativo, d10 5: 4 + 2 + 5 = 11.
      // Zap: 1d6 4. Velocidade com o Speedy Gonzalvez, gravemente ferido (HP 19 de 40), d10 3: 4 + 2 − 2 + 3 = 7.
      await fixar(edge, []);
      const nomes = ['Teste Netrunner', 'Teste Sem Interface'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          const cat = await game.system.api.wiki.carregarCatalogo();
          const item = id => foundry.utils.deepClone(cat[id]);

          // O Netrunner Rank 4 com um cyberdeck (carregando) e dois boosters instalados nele, inativos.
          const a = await Actor.implementation.create({ name: 'Teste Netrunner', type: 'personagem', system: { atributos: { body: { valor: 6 }, will: { valor: 6 } }, hp: { value: 40 }, role: { nome: 'Netrunner', rank: 4 } },
            items: [item('core_gear:cyberdeck'), item('core_programs:eraser'), item('core_programs:speedy-gonzalvez')] });
          const deck = a.items.find(i => i.type === 'cyberdeck');
          await a.updateEmbeddedDocuments('Item', a.items.filter(i => i.type === 'programa').map(p => ({ _id: p.id, 'system.instaladoEm': deck.id })));
          await a.sheet.render({ force: true });
          a.sheet.changeTab('net', 'primary');
          const f = () => a.sheet.element;
          const titulo = () => textoDe(f().querySelector('.tab.net .interface-net .titulo span'));
          await esperar(() => f()?.querySelector('.tab.net .interface-net'));
          const semDeck = { titulo: titulo(), aviso: textoDe(f().querySelector('.tab.net .interface-net .caixa-vazia')), botoes: f().querySelectorAll('.tab.net [data-action="rolarInterface"]').length };

          // Com o deck equipado: as 11 rolagens e o valor sem o dado.
          await deck.update({ 'system.uso': 'equipado' });
          const botao = id => f().querySelector('.tab.net [data-action="rolarInterface"][data-habilidade="' + id + '"]');
          const valor = id => textoDe(botao(id)?.querySelector('b'));
          await esperar(() => botao('cloak'));
          const lista = { titulo: titulo(), ids: [...f().querySelectorAll('.tab.net [data-action="rolarInterface"]')].map(b => b.dataset.habilidade), cloak: valor('cloak'), velocidade: valor('velocidade'),
            programas: [...f().querySelectorAll('.tab.net [data-action="ativarPrograma"]')].map(textoDe),
            // A aba no jeito da maquete: a Interface em grande na coluna dos números e as habilidades em cartões ao lado.
            rankGrande: textoDe(f().querySelector('.tab.net .coluna-resumo .numero-grande b')), cartoes: f().querySelectorAll('.tab.net .coluna-principal .interface-net .habilidades-interface li').length,
            // Os slots do deck em caixas e o estado de cada programa (as maquetes): os dois boosters no deck, carregados.
            slots: (s => s && s.style.getPropertyValue('--pontos').trim() + '/' + s.style.getPropertyValue('--max').trim())(f().querySelector('.tab.net .coluna-resumo .pontos-visuais.slots')), slotsDoDeck: deck.slotsUsados + '/' + deck.system.slots,
            estados: [...f().querySelectorAll('.tab.net .estado-programa')].map(textoDe).join() };

          // 1. O Cloak pela janela, com +2 do mestre (o Eraser inativo não soma).
          let antes = game.messages.size;
          window.__fila = [[6, 10]];
          botao('cloak').click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          const daJanela = { titulo: textoDe(janela().querySelector('.window-title')), partes: [...janela().querySelectorAll('.partes li')].map(textoDe) };
          const outro = janela().querySelector('[name="outro"]');
          outro.value = 2;
          outro.dispatchEvent(new Event('input', { bubbles: true }));
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          const cloak = { total: m.rolls[0].total, cartao: partesDa(m), sabor: textoDe(html(m).querySelector('.sabor')) };

          // 2. O Eraser ativo: +2 no Cloak, e só nele; Ctrl + clique rola sem a janela.
          const eraser = () => f().querySelector('.tab.net li[data-item-id="' + a.items.getName('Eraser').id + '"] [data-action="ativarPrograma"]');
          eraser().click();
          await esperar(() => a.items.getName('Eraser').system.ativo && valor('cloak') === '6');
          const ativo = { cloak: valor('cloak'), pathfinder: valor('pathfinder'), botao: textoDe(eraser()), bonus: a.system.bonus.interface.cloak,
            estado: textoDe(f().querySelector('.tab.net li[data-item-id="' + a.items.getName('Eraser').id + '"] .estado-programa')) };
          antes = game.messages.size;
          window.__fila = [[5, 10]];
          ctrl(botao('cloak'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const comEraser = { total: m.rolls[0].total, cartao: partesDa(m), janela: Boolean(janela()) };

          // 3. O dano do Zap.
          antes = game.messages.size;
          window.__fila = [[4, 6]];
          f().querySelector('.tab.net [data-action="rolarDanoDoZap"]').click();
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const zap = { total: m.rolls[0].total, formula: m.rolls[0].formula, titulo: textoDe(html(m).querySelector('h3')), botoes: [...html(m).querySelectorAll('[data-cprf-acao="aplicarNet"]')].map(b => b.dataset.onde) };

          // 4. A Velocidade com o Speedy Gonzalvez ativo, gravemente ferido.
          await a.items.getName('Speedy Gonzalvez').update({ 'system.ativo': true });
          await a.update({ 'system.hp.value': 19 });
          await esperar(() => valor('velocidade') === '4' && valor('cloak') === '4');
          antes = game.messages.size;
          window.__fila = [[3, 10]];
          ctrl(botao('velocidade'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const velocidade = { valor: valor('velocidade'), total: m.rolls[0].total, cartao: partesDa(m), rotulo: m.getFlag('${S}', 'teste')?.rotulo };

          // 5. O Eraser fora do deck não soma, mesmo ativo.
          await a.items.getName('Eraser').update({ 'system.instaladoEm': '' });
          await esperar(() => valor('cloak') === '2');
          const foraDoDeck = { cloak: valor('cloak'), bonus: a.system.bonus.interface.cloak, botao: Boolean(eraser()) };

          // 6. Quem não é Netrunner não tem Interface, mesmo com um deck equipado.
          const b = await Actor.implementation.create({ name: 'Teste Sem Interface', type: 'personagem', system: { role: { nome: 'Solo', rank: 4 } }, items: [item('core_gear:cyberdeck')] });
          await b.items.find(i => i.type === 'cyberdeck').update({ 'system.uso': 'equipado' });
          await b.sheet.render({ force: true });
          b.sheet.changeTab('net', 'primary');
          await esperar(() => b.sheet.element?.querySelector('.tab.net .interface-net'));
          const solo = { titulo: textoDe(b.sheet.element.querySelector('.tab.net .interface-net .titulo span')), botoes: b.sheet.element.querySelectorAll('.tab.net [data-action="rolarInterface"]').length,
            rola: b.rolarInterface('cloak') === null, acoes: b.system.acoesDeNet };
          await b.sheet.close();
          // A aba NET do Netrunner fica aberta para a captura.
          a.sheet.bringToFront();
          return { semDeck, lista, daJanela, cloak, ativo, comEraser, zap, velocidade, foraDoDeck, solo };
        })()`);
        await edge.sleep(400);
        await edge.shot('ficha-net-interface');
        const { semDeck, lista, daJanela: j, cloak, ativo, comEraser, zap, velocidade: v, foraDoDeck, solo } = info;
        const ok = semDeck.titulo === 'RANK 4 · 3 AÇÕES NET POR TURNO' && semDeck.aviso === 'EQUIPE UM CYBERDECK PARA USAR A INTERFACE' && semDeck.botoes === 0
          && lista.ids.join() === 'scanner,backdoor,cloak,control,eyedee,pathfinder,slide,virus,zap,defesa,velocidade' && lista.cloak === '4' && lista.velocidade === '4' && lista.programas.join() === 'Inativo,Inativo'
          && lista.rankGrande === '4' && lista.cartoes === 11 && lista.slots === '2/7' && lista.slotsDoDeck === '2/7' && lista.estados === 'carregado,carregado' && info.ativo.estado === 'ativo'
          && j.titulo === 'Teste: Cloak' && j.partes.join() === 'Interface +4,1d10'
          && cloak.total === 12 && cloak.cartao.join() === '1d10,Interface +4,Modificador do mestre +2' && cloak.sabor === '1 Ação NET. O resultado vira a DV: esconde seus rastros e seus vírus.'
          && ativo.cloak === '6' && ativo.pathfinder === '4' && ativo.botao === 'Ativo' && ativo.bonus === 2
          && comEraser.total === 11 && comEraser.cartao.join() === '1d10,Interface +4,Programas +2' && !comEraser.janela
          && zap.total === 4 && zap.formula === '1d6' && zap.titulo === 'Dano: Zap (no REZ de um programa ou no cérebro)' && zap.botoes.join() === 'cerebro,programa,rez'
          && v.valor === '4' && v.total === 7 && v.cartao.join() === '1d10,Interface +4,Programas +2,Gravemente ferido -2' && v.rotulo === 'Velocidade'
          && foraDoDeck.cloak === '2' && foraDoDeck.bonus === 0 && !foraDoDeck.botao
          && solo.titulo === 'SÓ O NETRUNNER' && solo.botoes === 0 && solo.rola && solo.acoes === 0;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { window.__fila = []; for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('programas no combate da NET (wiki; o CORE): na aba NET, o Sword e o Hellbolt atacam (Interface + ATK + 1d10, pela janela ou com Ctrl + clique) e rolam o dano só contra o que atingem, sem crítico; o DeckKRASH ataca sem dano; o Armor perde REZ (−1), volta (↺) e, em 0, desativa', async () => {
      // Rank 4. Sword, d10 7: 4 + 1 + 7 = 12. Sword em Black ICE, 3d6 6 + 6 + 2 = 14 (dois 6, sem crítico). Hellbolt, d10 3:
      // 4 + 2 + 3 = 9; no cérebro, 2d6 3 + 4 = 7.
      await fixar(edge, []);
      const nomes = ['Teste Netrunner Combate'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const janela = () => document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)');
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          const cat = await game.system.api.wiki.carregarCatalogo();
          const item = id => foundry.utils.deepClone(cat[id]);

          // O Netrunner Rank 4 com o deck equipado e quatro programas instalados nele.
          const a = await Actor.implementation.create({ name: 'Teste Netrunner Combate', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } },
            items: ['core_gear:cyberdeck', 'core_programs:sword', 'core_programs:hellbolt', 'core_programs:armor', 'core_programs:deckkrash'].map(item) });
          const deck = a.items.find(i => i.type === 'cyberdeck');
          await deck.update({ 'system.uso': 'equipado' });
          await a.updateEmbeddedDocuments('Item', a.items.filter(i => i.type === 'programa').map(p => ({ _id: p.id, 'system.instaladoEm': deck.id })));
          await a.sheet.render({ force: true });
          a.sheet.changeTab('net', 'primary');
          const f = () => a.sheet.element;
          const linha = nome => f().querySelector('.tab.net li[data-item-id="' + a.items.getName(nome).id + '"]');
          await esperar(() => linha('Sword')?.querySelector('[data-action="atacarComPrograma"]'));
          const botoes = nome => [...linha(nome).querySelectorAll('button')].map(textoDe);
          const lista = { sword: botoes('Sword'), hellbolt: botoes('Hellbolt'), armor: botoes('Armor'), deckkrash: botoes('DeckKRASH'), rezArmor: textoDe(linha('Armor').querySelector('.rez')) };

          // 1. O ataque do Sword pela janela.
          let antes = game.messages.size;
          window.__fila = [[7, 10]];
          linha('Sword').querySelector('[data-action="atacarComPrograma"]').click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          const daJanela = { titulo: textoDe(janela().querySelector('.window-title')), partes: [...janela().querySelectorAll('.partes li')].map(textoDe) };
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          const ataque = { total: m.rolls[0].total, cartao: partesDa(m), sabor: textoDe(html(m).querySelector('.sabor')) };

          // 2. O dano do Sword em Black ICE: 3d6 com dois 6, sem crítico.
          antes = game.messages.size;
          window.__fila = [[6, 6], [6, 6], [2, 6]];
          linha('Sword').querySelector('[data-action="rolarDanoDePrograma"][data-contra="blackIce"]').click();
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const danoSword = { total: m.rolls[0].total, titulo: textoDe(html(m).querySelector('h3')), critico: Boolean(html(m).querySelector('.critico')), flag: m.getFlag('${S}', 'danoDePrograma') };

          // 3. O Hellbolt: o ataque com Ctrl + clique, sem a janela, e o dano no cérebro.
          antes = game.messages.size;
          window.__fila = [[3, 10]];
          ctrl(linha('Hellbolt').querySelector('[data-action="atacarComPrograma"]'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const ataqueHellbolt = { total: m.rolls[0].total, janela: Boolean(janela()) };
          antes = game.messages.size;
          window.__fila = [[3, 6], [4, 6]];
          linha('Hellbolt').querySelector('[data-action="rolarDanoDePrograma"]').click();
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const danoHellbolt = { total: m.rolls[0].total, titulo: textoDe(html(m).querySelector('h3')) };

          // 4. O Armor: ativo, perde 1 de REZ, volta ao máximo; perde tudo e desativa.
          linha('Armor').querySelector('[data-action="ativarPrograma"]').click();
          await esperar(() => a.items.getName('Armor').system.ativo);
          linha('Armor').querySelector('[data-action="perderRez"]').click();
          await esperar(() => textoDe(linha('Armor').querySelector('.rez')) === 'REZ 6/7');
          const perdeu = textoDe(linha('Armor').querySelector('.rez'));
          linha('Armor').querySelector('[data-action="restaurarRez"]').click();
          await esperar(() => textoDe(linha('Armor').querySelector('.rez')) === 'REZ 7/7');
          await a.items.getName('Armor').perderRez(9);
          await esperar(() => textoDe(linha('Armor').querySelector('.rez')) === 'REZ 0/7');
          const armor = a.items.getName('Armor');
          const zerou = { rez: textoDe(linha('Armor').querySelector('.rez')), zerada: linha('Armor').querySelector('.rez').classList.contains('zerada'), ativo: armor.system.ativo, perdida: armor.system.rezPerdida };
          return { lista, daJanela, ataque, danoSword, ataqueHellbolt, danoHellbolt, perdeu, zerou };
        })()`);
        await edge.sleep(400);
        await edge.shot('ficha-net-programas');
        const { lista, daJanela: j, ataque, danoSword: s, ataqueHellbolt: h, danoHellbolt: d, perdeu, zerou } = info;
        const ok = lista.sword.join('|') === 'ATK +5|2d6 em programa|3d6 em Black ICE|✕' && lista.hellbolt.join('|') === 'ATK +6|2d6 no cérebro|✕'
          && lista.armor.join('|') === '−1|↺|Inativo|✕' && lista.deckkrash.join('|') === 'ATK +4|✕' && lista.rezArmor === 'REZ 7/7'
          && j.titulo === 'Teste: Sword: ataque' && j.partes.join() === 'Interface +4,ATK +1,1d10'
          && ataque.total === 12 && ataque.cartao.join() === '1d10,Interface +4,ATK +1'
          && ataque.sabor === 'Contra a Interface + 1d10 do netrunner ou a DEF + 1d10 do programa. O programa de ataque desativa sozinho depois de usado.'
          && s.total === 14 && s.titulo === 'Dano: Sword (em Black ICE)' && !s.critico && s.flag?.contra === 'blackIce' && s.flag.total === 14
          && h.total === 9 && !h.janela && d.total === 7 && d.titulo === 'Dano: Hellbolt (no cérebro)'
          && perdeu === 'REZ 6/7' && zerou.rez === 'REZ 0/7' && zerou.zerada && !zerou.ativo && zerou.perdida === 7;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { window.__fila = []; for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) { await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('dano da NET aplicado pelo mestre (wiki; o CORE): o botão do cartão leva o dano do Hellbolt ao cérebro do alvo marcado (sem a armadura), com o Armor ativo reduzindo 4 e o Shield ativo anulando e se desativando; o do Sword vai à REZ do programa ativo do alvo, que em 0 desativa; o do Zap passa pelo Shield', async () => {
      // Hellbolt 2d6 3 + 4 = 7 (três vezes). Sword 2d6 3 + 3 = 6 (duas vezes). Zap 1d6 5.
      await fixar(edge, []);
      const nomes = ['Teste Netrunner Atacante', 'Teste Netrunner Alvo'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const cat = await game.system.api.wiki.carregarCatalogo();
          const item = id => foundry.utils.deepClone(cat[id]);
          const netrunner = async (name, programas, extra = {}) => {
            const ator = await Actor.implementation.create({ name, type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 }, ...extra }, items: ['core_gear:cyberdeck', ...programas].map(item) });
            const deck = ator.items.find(i => i.type === 'cyberdeck');
            await deck.update({ 'system.uso': 'equipado' });
            await ator.updateEmbeddedDocuments('Item', ator.items.filter(i => i.type === 'programa').map(p => ({ _id: p.id, 'system.instaladoEm': deck.id })));
            return ator;
          };
          // O atacante (com Hellbolt e Sword) e o alvo (HP 40, com Armor e Shield, inativos), o alvo com um token na cena.
          const a = await netrunner('Teste Netrunner Atacante', ['core_programs:hellbolt', 'core_programs:sword']);
          const b = await netrunner('Teste Netrunner Alvo', ['core_programs:armor', 'core_programs:shield'], { atributos: { body: { valor: 6 }, will: { valor: 6 } }, hp: { value: 40 } });
          const [tb] = await canvas.scene.createEmbeddedDocuments('Token', [(await b.getTokenDocument({ x: 1500, y: 1000 })).toObject()]);
          await esperar(() => canvas.tokens.get(tb.id));
          canvas.tokens.setTargets([tb.id]);
          // Rola o dano e clica no botão do cartão; devolve o cartão do resultado.
          const aplicar = async (rolar, onde, fila) => {
            window.__fila = fila;
            let antes = game.messages.size;
            await rolar();
            await esperar(() => game.messages.size > antes);
            const m = game.messages.contents.at(-1);
            await esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarNet"]'));
            // A mensagem aparece no chat e na notificação: os botões de uma delas.
            const botoes = [...document.querySelector('[data-message-id="' + m.id + '"]').querySelectorAll('[data-cprf-acao="aplicarNet"]')].map(bt => bt.dataset.onde);
            antes = game.messages.size;
            document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarNet"][data-onde="' + onde + '"]').click();
            await esperar(() => game.messages.size > antes);
            const r = game.messages.contents.at(-1);
            return { botoes, titulo: textoDe(new DOMParser().parseFromString(m.content, 'text/html').querySelector('h3')), resultado: textoDe(new DOMParser().parseFromString(r.content, 'text/html').querySelector('.cartao')), flag: r.getFlag('${S}', 'danoDaNet') };
          };
          const hellbolt = () => a.items.getName('Hellbolt').rolarDanoDePrograma('padrao');
          const sword = () => a.items.getName('Sword').rolarDanoDePrograma('padrao');
          const ativar = nome => b.items.getName(nome).update({ 'system.ativo': true });

          // 1. No cérebro, sem defensor: 40 → 33.
          const semDefesa = { ...(await aplicar(hellbolt, 'cerebro', [[3, 6], [4, 6]])), hp: b.system.hp.value };
          // 2. Com o Armor ativo: 7 − 4 = 3 (33 → 30).
          await ativar('Armor');
          const comArmor = { ...(await aplicar(hellbolt, 'cerebro', [[3, 6], [4, 6]])), hp: b.system.hp.value };
          // 3. Com o Shield ativo: anula e se desativa (fica 30).
          await ativar('Shield');
          const comShield = { ...(await aplicar(hellbolt, 'cerebro', [[3, 6], [4, 6]])), hp: b.system.hp.value, shield: b.items.getName('Shield').system.ativo };
          // 4. O Sword num programa: o Armor, o único ativo com REZ, perde 6 (7 → 1); de novo, vai a 0 e desativa.
          const swordUm = { ...(await aplicar(sword, 'programa', [[3, 6], [3, 6]])), rez: b.items.getName('Armor').rezAtual };
          const swordDois = { ...(await aplicar(sword, 'programa', [[3, 6], [3, 6]])), rez: b.items.getName('Armor').rezAtual, armor: b.items.getName('Armor').system.ativo };
          // 5. O Zap no cérebro, com o Shield ativo de novo: o Zap não é programa, e o Shield não o para (30 → 25).
          await ativar('Shield');
          const zap = { ...(await aplicar(() => a.rolarDanoDoZap(), 'cerebro', [[5, 6]])), hp: b.system.hp.value, shield: b.items.getName('Shield').system.ativo };
          canvas.tokens.setTargets([]);
          return { semDefesa, comArmor, comShield, swordUm, swordDois, zap };
        })()`);
        const { semDefesa: s, comArmor: ar, comShield: sh, swordUm: s1, swordDois: s2, zap: z } = info;
        const ok = s.botoes.join() === 'cerebro' && s.titulo === 'Dano: Hellbolt (no cérebro)' && s.hp === 33 && s.resultado === 'Dano da NET: 7 no cérebro Teste Netrunner Alvo: perdeu 7 HP no cérebro (40 → 33).' && s.flag?.onde === 'cerebro'
          && ar.hp === 30 && ar.resultado === 'Dano da NET: 7 no cérebro Teste Netrunner Alvo: perdeu 3 HP no cérebro (33 → 30); o Armor reduziu 4.'
          && sh.hp === 30 && !sh.shield && sh.resultado === 'Dano da NET: 7 no cérebro Teste Netrunner Alvo: o Shield anulou o dano e se desativou.'
          && s1.botoes.join() === 'programa' && s1.rez === 1 && s1.resultado === 'Dano da NET: 6 num programa Teste Netrunner Alvo: o Armor perdeu 6 de REZ (7 → 1).'
          && s2.rez === 0 && !s2.armor && s2.resultado === 'Dano da NET: 6 num programa Teste Netrunner Alvo: o Armor perdeu 1 de REZ (1 → 0) e desativou.'
          && z.botoes.join() === 'cerebro,programa,rez' && z.titulo === 'Dano: Zap (no REZ de um programa ou no cérebro)' && z.hp === 25 && z.shield
          && z.resultado === 'Dano da NET: 5 no cérebro Teste Netrunner Alvo: perdeu 5 HP no cérebro (30 → 25).';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          canvas.tokens.setTargets([]);
          const nomes = ${JSON.stringify(nomes)};
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('Black ICE e demônio como atores (wiki, RED p. 204–212; o blackIce e o demon do CORE): o ator novo tem o token solto com a REZ na barra; na ficha, o modelo da wiki preenche o Hellhound e o Efreet; os números rolam + 1d10, pela janela do modificador do mestre ou com Ctrl + clique; na ficha do token, a REZ e o nome são do token', async () => {
      // Hellhound: SPD 6, d10 7 + 1 do mestre = 14 (pela janela); ATK 6, d10 4 = 10 (Ctrl + clique). Efreet: Interface 4, d10 5 = 9.
      await fixar(edge, []);
      const nomes = ['Teste Black ICE', 'Hellhound', 'Cão de Guarda', 'Teste Demônio', 'Efreet'];
      try {
        const ice = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const html = m => new DOMParser().parseFromString(m.content, 'text/html');
          const partesDa = m => [...html(m).querySelectorAll('.partes li')].map(textoDe);
          const janela = () => document.querySelector('.application.dialog.janela-rolagem.modificador:not(.minimizing)');
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          const mudar = (f, nome, valor) => { const campo = f.querySelector('[name="' + nome + '"]'); campo.value = valor; campo.dispatchEvent(new Event('change', { bubbles: true })); };

          // 1. O Black ICE novo: o token solto, com a REZ na barra; os valores iniciais do CORE (REZ 10, custo 100).
          const a = await Actor.implementation.create({ name: 'Teste Black ICE', type: 'blackice' });
          const novo = { link: a.prototypeToken.actorLink, barra: a.prototypeToken.bar1.attribute, rez: [a.system.rez.value, a.system.rez.max], custo: a.system.custo, classe: a.system.classe };
          await a.sheet.render({ force: true });
          const f = () => a.sheet.element;
          await esperar(() => f()?.querySelector('[name="system.modelo"]'));
          const opcoes = [...f().querySelectorAll('[name="system.modelo"] option')].map(o => o.textContent.trim());
          // 2. O modelo da wiki: o Hellhound preenche o nome e os números.
          mudar(f(), 'system.modelo', 'hellhound');
          await esperar(() => a.name === 'Hellhound' && f()?.querySelector('.nome-linha .nome')?.value === 'Hellhound');
          const s = a.system;
          const hellhound = {
            nome: a.name, modelo: s.modelo, classe: s.classe, numeros: [s.per, s.spd, s.atk, s.def], rez: [s.rez.value, s.rez.max], efeito: s.efeito, dano: s.dano, custo: s.custo,
            botoes: [...f().querySelectorAll('[data-action="rolarDaNet"]')].map(b => b.textContent.trim()), campos: ['system.spd', 'system.dano', 'system.classe'].map(nome => f().querySelector('[name="' + nome + '"]').value)
          };
          // 3. A SPD pela janela, com +1 do mestre.
          let antes = game.messages.size;
          window.__fila = [[7, 10]];
          f().querySelector('[data-action="rolarDaNet"][data-numero="spd"]').click();
          await esperar(() => janela()?.querySelector('[name="outro"]'));
          const daJanela = { titulo: textoDe(janela().querySelector('.window-title')), linhas: [...janela().querySelectorAll('.partes li')].map(textoDe) };
          janela().querySelector('[name="outro"]').value = 1;
          janela().querySelector('button[data-action="rolar"]').click();
          await esperar(() => game.messages.size > antes && !janela());
          let m = game.messages.contents.at(-1);
          const spd = { total: m.rolls[0].total, cartao: partesDa(m), titulo: textoDe(html(m).querySelector('h3')), sabor: textoDe(html(m).querySelector('.sabor')), falante: m.speaker.alias };
          // 4. O ATK com Ctrl + clique: direto, sem a janela.
          antes = game.messages.size;
          window.__fila = [[4, 10]];
          ctrl(f().querySelector('[data-action="rolarDaNet"][data-numero="atk"]'));
          await esperar(() => game.messages.size > antes);
          m = game.messages.contents.at(-1);
          const atk = { total: m.rolls[0].total, cartao: partesDa(m), janela: Boolean(janela()) };
          await a.sheet.close();

          // 5. Na cena: o token solto, com a REZ na barra; na ficha do token, a REZ e o nome mudam só no token.
          const [t] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x: 1700, y: 1100 })).toObject()]);
          await esperar(() => canvas.tokens.get(t.id));
          const barra = t.getBarAttribute('bar1');
          await t.actor.sheet.render({ force: true });
          const g = () => t.actor.sheet.element;
          await esperar(() => g()?.querySelector('[name="system.rez.value"]'));
          const daCena = textoDe(g().querySelector('.linha-id .modelo'));
          mudar(g(), 'system.rez.value', 12);
          await esperar(() => t.actor.system.rez.value === 12);
          mudar(g(), 'name', 'Cão de Guarda');
          await esperar(() => t.name === 'Cão de Guarda');
          const token = { barra: [barra?.attribute, barra?.value, barra?.max], daCena, rezDoToken: t.actor.system.rez.value, rezDoAtor: a.system.rez.value, nome: t.name, nomeDoAtor: a.name };
          await t.actor.sheet.close();
          // A ficha do Hellhound fica aberta para a captura.
          await a.sheet.render({ force: true });
          await esperar(() => f()?.querySelector('[name="system.modelo"]'));
          return { novo, opcoes, hellhound, daJanela, spd, atk, token };
        })()`);
        await edge.sleep(400);
        await edge.shot('ficha-black-ice');
        const demonio = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const ctrl = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
          await game.actors.getName('Hellhound')?.sheet.close();
          // 6. O demônio novo: o token solto, com a REZ na barra; o Efreet da wiki; a Interface com Ctrl + clique.
          const d = await Actor.implementation.create({ name: 'Teste Demônio', type: 'demonio' });
          const novo = { link: d.prototypeToken.actorLink, barra: d.prototypeToken.bar1.attribute, numeros: [d.system.rez.max, d.system.interface, d.system.acoes, d.system.valorDeCombate] };
          await d.sheet.render({ force: true });
          const h = () => d.sheet.element;
          await esperar(() => h()?.querySelector('[name="system.modelo"]'));
          const campo = h().querySelector('[name="system.modelo"]');
          campo.value = 'efreet';
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          await esperar(() => d.name === 'Efreet' && h()?.querySelector('.nome-linha .nome')?.value === 'Efreet');
          const efreet = { nome: d.name, numeros: [d.system.rez.value, d.system.rez.max, d.system.interface, d.system.acoes, d.system.valorDeCombate], botoes: [...h().querySelectorAll('[data-action="rolarDaNet"]')].map(b => b.textContent.trim()) };
          const antes = game.messages.size;
          window.__fila = [[5, 10]];
          ctrl(h().querySelector('[data-action="rolarDaNet"][data-numero="interface"]'));
          await esperar(() => game.messages.size > antes);
          const m = game.messages.contents.at(-1);
          const partes = [...new DOMParser().parseFromString(m.content, 'text/html').querySelectorAll('.partes li')].map(textoDe);
          // A ficha do Efreet fica aberta para a captura.
          return { novo, efreet, interface: { total: m.rolls[0].total, cartao: partes, sabor: textoDe(new DOMParser().parseFromString(m.content, 'text/html').querySelector('.sabor')) } };
        })()`);
        await edge.sleep(400);
        await edge.shot('ficha-demonio');
        const info = { ice, demonio };
        const { novo, opcoes, hellhound: hh, daJanela: j, spd, atk, token } = ice;
        const ok = !novo.link && novo.barra === 'rez' && novo.rez.join() === '10,10' && novo.custo === 100 && novo.classe === 'antipersonnel'
          && opcoes.length === 13 && opcoes[0] === 'À mão' && opcoes.includes('Hellhound') && opcoes.includes('Sabertooth')
          && hh.nome === 'Hellhound' && hh.modelo === 'hellhound' && hh.classe === 'antipersonnel' && hh.numeros.join() === '6,6,6,2' && hh.rez.join() === '20,20'
          && hh.efeito === '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).' && hh.dano === '2d6' && hh.custo === 500
          && hh.botoes.join() === 'PER,SPD,ATK,DEF' && hh.campos.join() === '6,2d6,antipersonnel'
          && j.titulo === 'Hellhound: SPD' && j.linhas.join() === 'SPD 6 + 1d10'
          && spd.total === 14 && spd.cartao.join() === '1d10,SPD +6,Modificador do mestre +1' && spd.titulo === 'SPD' && spd.falante === 'Hellhound'
          && spd.sabor === 'Ao ser encontrado à espreita, contra a Interface + velocidade + 1d10 do netrunner: se o ICE vencer, o netrunner sofre o efeito na hora.'
          && atk.total === 10 && atk.cartao.join() === '1d10,ATK +6' && !atk.janela
          && token.barra.join() === 'rez,20,20' && token.daCena === 'ESTE TOKEN' && token.rezDoToken === 12 && token.rezDoAtor === 20 && token.nome === 'Cão de Guarda' && token.nomeDoAtor === 'Hellhound'
          && !demonio.novo.link && demonio.novo.barra === 'rez' && demonio.novo.numeros.join() === '10,0,2,14'
          && demonio.efreet.nome === 'Efreet' && demonio.efreet.numeros.join() === '25,25,4,3,14' && demonio.efreet.botoes.join() === 'Interface,Valor de combate'
          && demonio.interface.total === 9 && demonio.interface.cartao.join() === '1d10,Interface +4' && demonio.interface.sabor === 'Sem DEF: defende com Interface + 1d10. Só usa Zap e Control.';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-rolagem')) await app.close();
          const nomes = ${JSON.stringify(nomes)};
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('iniciativa do Black ICE e do demônio (wiki: "entra no topo da fila"; o CPRCombat do CORE): sozinho na fila, 30; no "rolar todos", o netrunner rola e o ICE e o demônio entram acima, um de cada vez; a arma não atinge o Black ICE marcado', async () => {
      // O netrunner: REF 6, d10 7 = 13; o ICE, 14; o demônio, 15.
      await fixar(edge, []);
      const nomes = ['Teste Netrunner Fila', 'Teste ICE Fila', 'Teste Demônio Fila'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const cat = await game.system.api.wiki.carregarCatalogo();
          const n = await Actor.implementation.create({ name: 'Teste Netrunner Fila', type: 'personagem', system: { atributos: { ref: { valor: 6 } } }, items: [foundry.utils.deepClone(cat['core_weapons:heavy-pistol'])] });
          const ice = await Actor.implementation.create({ name: 'Teste ICE Fila', type: 'blackice', system: { spd: 6 } });
          const dem = await Actor.implementation.create({ name: 'Teste Demônio Fila', type: 'demonio', system: { interface: 4 } });
          const docs = [];
          for (const [ator, x] of [[n, 1500], [ice, 1600], [dem, 1700]]) docs.push((await ator.getTokenDocument({ x, y: 900 })).toObject());
          // Um por vez: a lista que o createEmbeddedDocuments devolve nem sempre vem na ordem pedida (QUALITY_GATES).
          const tokens = [];
          for (const doc of docs) tokens.push((await canvas.scene.createEmbeddedDocuments('Token', [doc]))[0]);
          const [tn, ti, td] = tokens;
          await esperar(() => canvas.tokens.get(td.id));
          const combate = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
          const combatentes = [];
          for (const t of tokens) combatentes.push((await combate.createEmbeddedDocuments('Combatant', [{ tokenId: t.id, sceneId: canvas.scene.id, actorId: t.actorId }]))[0]);
          const [cn, ci, cd] = combatentes;
          const iniciativa = c => combate.combatants.get(c.id).initiative;
          // 1. O "rolar todos" do começo da luta: o netrunner rola (13), e o ICE e o demônio entram acima, um de cada vez.
          window.__fila = [[7, 10]];
          await combate.rollAll();
          const todos = [cn, ci, cd].map(iniciativa);
          const ordem = combate.turns.map(c => c.name);
          // 2. Sozinho na fila (ninguém rolou): 30. Noutro combate, só com o ICE.
          const outro = await Combat.implementation.create({ scene: canvas.scene.id, active: false });
          const [so] = await outro.createEmbeddedDocuments('Combatant', [{ tokenId: ti.id, sceneId: canvas.scene.id, actorId: ti.actorId }]);
          await outro.rollInitiative([so.id]);
          const sozinho = outro.combatants.get(so.id).initiative;
          // 3. A arma com só o Black ICE marcado: o aviso, e não ataca.
          canvas.tokens.setTargets([ti.id]);
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          const mensagens = game.messages.size;
          let ataque;
          try { ataque = await game.system.api.combate.atacar(n.items.getName('Heavy Pistol')); } finally { delete ui.notifications.warn; canvas.tokens.setTargets([]); }
          return { sozinho, todos, ordem, ataque, avisos, rolou: game.messages.size - mensagens, pente: n.items.getName('Heavy Pistol').system.pente.value };
        })()`);
        const ok = info.sozinho === 30 && info.todos.join() === '13,14,15' && info.ordem.join() === 'Teste Demônio Fila,Teste ICE Fila,Teste Netrunner Fila'
          && info.ataque === null && info.avisos.join() === 'O Black ICE e o demônio estão na NET: a arma não os atinge.' && info.rolou === 0;
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          canvas.tokens.setTargets([]);
          const nomes = ${JSON.stringify(nomes)};
          for (const combate of game.combats.filter(c => c.combatants.some(cb => nomes.includes(cb.name)))) await combate.delete();
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('dano do Black ICE e na REZ dele (wiki; o NET Architect da mesa; o CORE): o Hellhound, pela ficha, no cérebro do netrunner marcado passa pelo Shield ativo (o Armor reduz 4); o Killer num programa leva o Armor a 0, e o cartão diz que o anti-programa o destrói (o programa fica); o dano do Sword em Black ICE e o Zap do netrunner na REZ do Black ICE e do demônio marcados; o Zap do demônio só no intruso', async () => {
      // Hellhound 2d6: 3 + 4 = 7 (40 → 37, com o Armor). Killer 4d6: 2 + 2 + 2 + 1 = 7 (o Armor, 7 → 0). Sword em Black ICE
      // 3d6: 2 + 2 + 2 = 6 (o Hellhound na cena, 20 → 14). Zap 1d6: 5 (o Imp na cena, 15 → 10). Zap do Imp 1d6: 3 (37 → 34).
      await fixar(edge, []);
      const nomes = ['Teste Netrunner Ofensivo', 'Teste Netrunner Defensor', 'Hellhound', 'Killer', 'Imp'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const cat = await game.system.api.wiki.carregarCatalogo();
          const item = id => foundry.utils.deepClone(cat[id]);
          const netrunner = async (name, programas, extra = {}) => {
            const ator = await Actor.implementation.create({ name, type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 }, ...extra }, items: ['core_gear:cyberdeck', ...programas].map(item) });
            const deck = ator.items.find(i => i.type === 'cyberdeck');
            await deck.update({ 'system.uso': 'equipado' });
            await ator.updateEmbeddedDocuments('Item', ator.items.filter(i => i.type === 'programa').map(p => ({ _id: p.id, 'system.instaladoEm': deck.id })));
            return ator;
          };
          // O netrunner que ataca (com o Sword) e o que defende (HP 40, com o Armor e o Shield ativos); o Hellhound, o Killer e o Imp.
          const a = await netrunner('Teste Netrunner Ofensivo', ['core_programs:sword']);
          const b = await netrunner('Teste Netrunner Defensor', ['core_programs:armor', 'core_programs:shield'], { atributos: { body: { valor: 6 }, will: { valor: 6 } }, hp: { value: 40 } });
          await b.updateEmbeddedDocuments('Item', ['Armor', 'Shield'].map(nome => ({ _id: b.items.getName(nome).id, 'system.ativo': true })));
          const ice = (name, system) => Actor.implementation.create({ name, type: 'blackice', system });
          const hellhound = await ice('Hellhound', { classe: 'antipersonnel', per: 6, spd: 6, atk: 6, def: 2, rez: { value: 20, max: 20 }, dano: '2d6' });
          const killer = await ice('Killer', { classe: 'antiprogram', per: 4, spd: 8, atk: 6, def: 2, rez: { value: 20, max: 20 }, dano: '4d6' });
          const imp = await Actor.implementation.create({ name: 'Imp', type: 'demonio', system: { rez: { value: 15, max: 15 }, interface: 3, acoes: 2 } });
          const docs = [];
          for (const [ator, x] of [[b, 1500], [hellhound, 1600], [imp, 1700]]) docs.push((await ator.getTokenDocument({ x, y: 1100 })).toObject());
          // Um por vez: a lista que o createEmbeddedDocuments devolve nem sempre vem na ordem pedida (QUALITY_GATES).
          const tokens = [];
          for (const doc of docs) tokens.push((await canvas.scene.createEmbeddedDocuments('Token', [doc]))[0]);
          const [tb, th, ti] = tokens;
          await esperar(() => canvas.tokens.get(ti.id));
          // Marca o alvo, rola o dano e clica no botão do cartão; devolve o cartão do dano e o do resultado.
          const aplicar = async (rolar, onde, fila, alvo) => {
            canvas.tokens.setTargets([alvo]);
            window.__fila = fila;
            let antes = game.messages.size;
            await rolar();
            await esperar(() => game.messages.size > antes);
            const m = game.messages.contents.at(-1);
            await esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarNet"]'));
            const botoes = [...document.querySelector('[data-message-id="' + m.id + '"]').querySelectorAll('[data-cprf-acao="aplicarNet"]')].map(bt => bt.dataset.onde);
            antes = game.messages.size;
            document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="aplicarNet"][data-onde="' + onde + '"]').click();
            await esperar(() => game.messages.size > antes);
            const r = game.messages.contents.at(-1);
            return { botoes, titulo: textoDe(new DOMParser().parseFromString(m.content, 'text/html').querySelector('h3')), resultado: textoDe(new DOMParser().parseFromString(r.content, 'text/html').querySelector('.cartao')) };
          };

          // 1. O Hellhound pelo botão da ficha, no cérebro do defensor: o Shield ativo não para Black ICE; o Armor reduz 4.
          await hellhound.sheet.render({ force: true });
          await esperar(() => hellhound.sheet.element?.querySelector('[data-action="rolarDanoDoIce"]'));
          const botaoDaFicha = textoDe(hellhound.sheet.element.querySelector('[data-action="rolarDanoDoIce"]'));
          const cerebro = { ...(await aplicar(() => hellhound.sheet.element.querySelector('[data-action="rolarDanoDoIce"]').click(), 'cerebro', [[3, 6], [4, 6]], tb.id)), hp: b.system.hp.value, shield: b.items.getName('Shield').system.ativo };
          await hellhound.sheet.close();
          // 2. O Killer num programa: só o Armor ativo (o Shield desligado antes); vai a 0, e o cartão diz que é destruído.
          await b.items.getName('Shield').update({ 'system.ativo': false });
          const programa = { ...(await aplicar(() => killer.rolarDanoDoIce(), 'programa', [[2, 6], [2, 6], [2, 6], [1, 6]], tb.id)), rez: b.items.getName('Armor').rezAtual, ativo: b.items.getName('Armor').system.ativo, existe: Boolean(b.items.getName('Armor')) };
          // 3. O Sword, em Black ICE, na REZ do Hellhound da cena (o token solto: o ator fica com 20).
          const sword = { ...(await aplicar(() => a.items.getName('Sword').rolarDanoDePrograma('blackIce'), 'rez', [[2, 6], [2, 6], [2, 6]], th.id)), rezNaCena: th.actor.system.rez.value, rezDoAtor: hellhound.system.rez.value };
          // 4. O Zap do netrunner na REZ do Imp da cena.
          const zap = { ...(await aplicar(() => a.rolarDanoDoZap(), 'rez', [[5, 6]], ti.id)), rez: ti.actor.system.rez.value };
          // 5. O Zap do Imp: só no intruso (no cérebro, sem o Armor, que desativou).
          const doDemonio = { ...(await aplicar(() => imp.rolarDanoDoZap(), 'cerebro', [[3, 6]], tb.id)), hp: b.system.hp.value };
          canvas.tokens.setTargets([]);
          return { botaoDaFicha, cerebro, programa, sword, zap, doDemonio };
        })()`);
        const { botaoDaFicha, cerebro: c, programa: p, sword: s, zap: z, doDemonio: d } = info;
        const ok = botaoDaFicha === 'Rolar o dano: 2d6'
          && c.titulo === 'Dano: Hellhound (no cérebro)' && c.botoes.join() === 'cerebro' && c.hp === 37 && c.shield
          && c.resultado === 'Dano da NET: 7 no cérebro Teste Netrunner Defensor: perdeu 3 HP no cérebro (40 → 37); o Armor reduziu 4.'
          && p.titulo === 'Dano: Killer (num programa)' && p.botoes.join() === 'programa' && p.rez === 0 && !p.ativo && p.existe
          && p.resultado === 'Dano da NET: 7 num programa Teste Netrunner Defensor: o Armor perdeu 7 de REZ (7 → 0) e desativou: o Black ICE anti-programa o destrói (o mestre apaga o programa).'
          && s.titulo === 'Dano: Sword (em Black ICE)' && s.botoes.join() === 'rez' && s.rezNaCena === 14 && s.rezDoAtor === 20
          && s.resultado === 'Dano da NET: 6 na REZ Hellhound: perdeu 6 de REZ (20 → 14).'
          && z.botoes.join() === 'cerebro,programa,rez' && z.rez === 10 && z.resultado === 'Dano da NET: 5 na REZ Imp: perdeu 5 de REZ (15 → 10).'
          && d.botoes.join() === 'cerebro,programa' && d.hp === 34 && d.resultado === 'Dano da NET: 3 no cérebro Teste Netrunner Defensor: perdeu 3 HP no cérebro (37 → 34).';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          canvas.tokens.setTargets([]);
          const nomes = ${JSON.stringify(nomes)};
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('programa de Black ICE do netrunner (wiki: "Black ICE próprio ocupa 2 slots no deck"; o programa blackice do CORE): o Hellhound do compêndio de Netrunning, instalado no deck com o Sword, ocupa 2 slots (3 de 7); a aba NET mostra o tipo e os números, com a REZ e o botão Ativo; a ficha do item tem o tipo de Black ICE, PER e SPD, e a do Sword não', async () => {
      const nomes = ['Teste Netrunner Black ICE'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const pack = game.packs.get('${S}.netrunning');
          const doPack = async nome => (await pack.getDocument(pack.index.find(e => e.name === nome)._id)).toObject();
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = await Actor.implementation.create({
            name: 'Teste Netrunner Black ICE', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } },
            items: [foundry.utils.deepClone(cat['core_gear:cyberdeck']), await doPack('Hellhound'), await doPack('Sword')]
          });
          const deck = a.items.find(i => i.type === 'cyberdeck');
          await deck.update({ 'system.uso': 'equipado' });
          await a.updateEmbeddedDocuments('Item', a.items.filter(i => i.type === 'programa').map(p => ({ _id: p.id, 'system.instaladoEm': deck.id })));
          const hh = a.items.getName('Hellhound');
          await a.sheet.render({ force: true });
          a.sheet.changeTab('net', 'primary');
          const f = () => a.sheet.element;
          await esperar(() => f()?.querySelector('.tab.net li[data-item-id="' + hh.id + '"]'));
          const linha = f().querySelector('.tab.net li[data-item-id="' + hh.id + '"]');
          const naNet = {
            detalhe: textoDe(linha.querySelector('.detalhe')), rez: textoDe(linha.querySelector('.rez')), ativar: textoDe(linha.querySelector('[data-action="ativarPrograma"]')),
            deck: textoDe(f().querySelector('.tab.net li[data-item-id="' + deck.id + '"] .detalhe'))
          };
          await a.sheet.close();
          // A ficha do item: o tipo de Black ICE, PER e SPD no Hellhound; o Sword não tem.
          const campos = async item => {
            await item.sheet.render({ force: true });
            await esperar(() => item.sheet.element?.querySelector('[name="system.classe"]'));
            const lidos = ['system.classe', 'system.tipoDeIce', 'system.per', 'system.spd', 'system.tamanho'].map(nome => item.sheet.element.querySelector('[name="' + nome + '"]')?.value ?? null);
            await item.sheet.close();
            return lidos;
          };
          return { naNet, slots: deck.slotsUsados, hellhound: await campos(hh), sword: await campos(a.items.getName('Sword')), img: hh.img, origem: hh.getFlag('${S}', 'catalogo') };
        })()`);
        const { naNet: n, hellhound: h, sword: w } = info;
        const ok = n.detalhe === 'Black ICE · Anti-pessoal · PER 6 · SPD 6 · ATK 6 · DEF 2 · no Cyberdeck' && n.rez === 'REZ 20/20' && n.ativar === 'Inativo'
          && n.deck.startsWith('3/7 slots') && info.slots === 3 && info.img === 'icons/svg/ice-aura.svg' && info.origem === 'black-ice:hellhound'
          && h.join() === 'blackice,antipersonnel,6,6,2' && w[0] === 'antiprogramattacker' && w.slice(1, 4).every(valor => valor === null);
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { for (const a of game.actors.filter(a => ${JSON.stringify(nomes)}.includes(a.name))) { for (const i of a.items) await i.sheet?.close(); await a.sheet?.close(); await a.delete(); } return true; })()`);
      }
    });

    await r.passo('Black ICE rezzado (o _rezBlackIceToken do CORE): ativar o Hellhound do netrunner no deck põe o token dele ao lado do netrunner (solto, com os números e a REZ do programa, o ator na pasta "Black ICE rezzado"); a REZ que o token perde volta para o programa; desativar tira o token; com a REZ do token em 0, o programa desativa e o token sai; o jogador ativa no computador dele, e o mestre põe o token', async () => {
      const nomes = ['Teste Netrunner ICE', 'Teste Netrunner do Jogador', 'Hellhound'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const pack = game.packs.get('${S}.netrunning');
          const hellhound = (await pack.getDocument(pack.index.find(e => e.name === 'Hellhound')._id)).toObject();
          const cat = await game.system.api.wiki.carregarCatalogo();
          // O netrunner com o deck equipado e o Hellhound instalado nele, com o token na cena.
          const netrunner = async (name, x, extra = {}) => {
            const a = await Actor.implementation.create({ name, type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } }, items: [foundry.utils.deepClone(cat['core_gear:cyberdeck']), foundry.utils.deepClone(hellhound)], ...extra });
            const deck = a.items.find(i => i.type === 'cyberdeck');
            await deck.update({ 'system.uso': 'equipado' });
            await a.items.getName('Hellhound').update({ 'system.instaladoEm': deck.id });
            const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x, y: 900 })).toObject()]);
            await esperar(() => canvas.tokens.get(token.id));
            return { a, token };
          };
          const doIce = programa => canvas.scene.tokens.find(t => t.getFlag('${S}', 'programa') === programa.uuid);
          const { a, token: ta } = await netrunner('Teste Netrunner ICE', 1500);
          const hh = a.items.getName('Hellhound');

          // 1. Ativar: o token do Hellhound ao lado do netrunner, solto, com os números e a REZ do programa.
          await hh.update({ 'system.ativo': true });
          await esperar(() => doIce(hh) && hh.getFlag('${S}', 'iceRezzado'));
          let t = doIce(hh);
          const s = t?.actor.system;
          const rezzado = {
            nome: t?.name, dx: t ? t.x - ta.x : null, dy: t ? t.y - ta.y : null, grade: canvas.scene.grid.size, solto: t ? !t.actorLink : null, tipo: t?.actor.type,
            numeros: s && [s.classe, s.per, s.spd, s.atk, s.def, s.rez.value, s.rez.max, s.dano], barra: t?.getBarAttribute('bar1')?.attribute,
            marca: hh.getFlag('${S}', 'iceRezzado')?.token === t?.id, pasta: game.actors.find(x => x.type === 'blackice' && x.name === 'Hellhound')?.folder?.name
          };
          // 2. A REZ que o token perde volta para o programa (20 → 14).
          await t.actor.receberDanoNaRez(6);
          await esperar(() => hh.rezAtual === 14);
          const rez = { token: t.actor.system.rez.value, programa: hh.rezAtual };
          // 3. Desativar tira o token.
          await hh.update({ 'system.ativo': false });
          await esperar(() => !doIce(hh) && !hh.getFlag('${S}', 'iceRezzado'));
          const desativado = { token: Boolean(doIce(hh)), marca: Boolean(hh.getFlag('${S}', 'iceRezzado')) };
          // 4. De novo ativo, com a REZ 14 do programa; a REZ do token a 0: o programa desativa e o token sai.
          await hh.update({ 'system.ativo': true });
          await esperar(() => doIce(hh));
          t = doIce(hh);
          const rezDeNovo = t?.actor.system.rez.value;
          await t.actor.receberDanoNaRez(20);
          await esperar(() => !hh.system.ativo && !doIce(hh));
          const zerado = { ativo: hh.system.ativo, programa: hh.rezAtual, token: Boolean(doIce(hh)) };

          // O netrunner do jogador (dono dele), com o token na cena, para o passo 5.
          const jogador = game.users.getName('Jogador');
          if (jogador) await netrunner('Teste Netrunner do Jogador', 1700, { ownership: { default: 0, [jogador.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
          return { rezzado, rez, desativado, rezDeNovo, zerado };
        })()`);
        // 5. O jogador ativa o Hellhound do netrunner dele, no computador dele: quem põe o token é o mestre.
        let doJogador = 'sem o navegador do jogador';
        if (jogador) {
          const pediu = await jogador.evaluate(`(async () => {
            for (let i = 0; i < 50 && !game.actors.getName('Teste Netrunner do Jogador')?.items.getName('Hellhound'); i++) await new Promise(r => setTimeout(r, 100));
            const hh = game.actors.getName('Teste Netrunner do Jogador')?.items.getName('Hellhound');
            if (!hh) return 'o jogador não vê o Hellhound';
            await hh.update({ 'system.ativo': true });
            return { gm: game.user.isGM, podeCriarToken: game.user.can('TOKEN_CREATE') };
          })()`);
          doJogador = await edge.evaluate(`(async () => {
            const hh = game.actors.getName('Teste Netrunner do Jogador').items.getName('Hellhound');
            const doIce = () => canvas.scene.tokens.find(t => t.getFlag('${S}', 'programa') === hh.uuid);
            await window.__esperar(() => doIce());
            return { pediu: ${JSON.stringify(pediu)}, ativo: hh.system.ativo, token: doIce()?.name ?? null };
          })()`);
        }
        const { rezzado: z, rez, desativado: d, rezDeNovo, zerado: zr } = info;
        const ok = z.nome === 'Hellhound' && z.dx === z.grade && z.dy === 0 && z.solto && z.tipo === 'blackice' && z.numeros?.join() === 'antipersonnel,6,6,6,2,20,20,2d6'
          && z.barra === 'rez' && z.marca && z.pasta === 'Black ICE rezzado'
          && rez.token === 14 && rez.programa === 14 && !d.token && !d.marca && rezDeNovo === 14 && !zr.ativo && zr.programa === 0 && !zr.token
          && (!jogador || (doJogador.ativo && doJogador.token === 'Hellhound' && doJogador.pediu?.gm === false && doJogador.pediu?.podeCriarToken === false));
        return [ok, JSON.stringify({ ...info, doJogador })];
      } finally {
        await edge.evaluate(`(async () => {
          const nomes = ${JSON.stringify(nomes)};
          // Os tokens antes dos atores: apagar o netrunner faz o mestre tirar o token do Black ICE dele.
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => nomes.includes(t.name)).map(t => t.id));
          for (const a of game.actors.filter(a => nomes.includes(a.name))) { await a.sheet?.close(); await a.delete(); }
          for (const pasta of game.folders.filter(f => f.type === 'Actor' && f.name === 'Black ICE rezzado' && !f.contents.length)) await pasta.delete();
          return true;
        })()`);
      }
    });

    await r.passo('arquitetura da NET (o netarch do CORE; o NET Architect da mesa): o item com os andares da clínica de ripperdoc; a ficha mostra a tabela e o mapa (o ramo B sai do andar 2); "+ Andar" põe o andar 6 do ramo A; a linha que vira Black ICE troca o DV pela lista, e o mapa mostra o Hellhound; tirar o Wisp do andar 2 faz o 3A e o 3B saírem do 1A', async () => {
      const nomes = ['Teste Clínica'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const item = await Item.implementation.create({ name: 'Teste Clínica', type: 'arquitetura', system: { andares: [
            { andar: 1, ramo: 'a', tipo: 'senha', dv: 8 }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'wisp' }, { andar: 3, ramo: 'a', tipo: 'arquivo', dv: 8, descricao: 'Prontuários' },
            { andar: 4, ramo: 'a', tipo: 'ice', ice: 'killer' }, { andar: 5, ramo: 'a', tipo: 'arquivo', dv: 10 },
            { andar: 3, ramo: 'b', tipo: 'controle', dv: 8 }, { andar: 4, ramo: 'b', tipo: 'senha', dv: 10 }, { andar: 5, ramo: 'b', tipo: 'controle', dv: 10 }
          ] } });
          await item.sheet.render({ force: true });
          const f = () => item.sheet.element;
          await esperar(() => f()?.querySelector('.mapa-net .no'));
          const mapa = () => [...f().querySelectorAll('.mapa-net .no')].map(textoDe);
          const linhas = () => f().querySelectorAll('table.andares tbody tr').length;
          const antes = { linhas: linhas(), mapa: mapa(), dv: textoDe(f().querySelector('.campos label small')), rotulo: game.i18n.localize(CONFIG.Item.typeLabels.arquitetura), largura: item.sheet.position.width };
          // + Andar: o andar 6 do ramo A, uma senha DV 6.
          f().querySelector('[data-action="novaLinha"]').click();
          await esperar(() => item.system.andares.length === 9 && linhas() === 9);
          const nova = item.system.andares[8];
          const novaLinha = { andar: nova.andar, ramo: nova.ramo, tipo: nova.tipo, dv: nova.dv };
          // A linha nova vira Black ICE: o DV sai, entra a lista; o Hellhound.
          const tipo = f().querySelector('[name="system.andares.8.tipo"]');
          tipo.value = 'ice';
          tipo.dispatchEvent(new Event('change', { bubbles: true }));
          await esperar(() => item.system.andares[8].tipo === 'ice' && f()?.querySelector('[name="system.andares.8.ice"]'));
          const semDv = !f().querySelector('[name="system.andares.8.dv"]');
          const ice = f().querySelector('[name="system.andares.8.ice"]');
          ice.value = 'hellhound';
          ice.dispatchEvent(new Event('change', { bubbles: true }));
          await esperar(() => item.system.andares[8].ice === 'hellhound' && mapa().includes('6A Hellhound'));
          const comHellhound = { mapa: mapa(), outras: item.system.andares.slice(0, 8).map(l => l.andar + l.ramo + ':' + l.tipo).join() };
          // Tirar o Wisp (a linha 2): o 3A e o 3B passam a sair do 1A.
          f().querySelector('[data-action="tirarLinha"][data-indice="1"]').click();
          await esperar(() => item.system.andares.length === 8 && !mapa().some(t => t.includes('Wisp')));
          const semWisp = { mapa: mapa(), andares: item.system.andares.length };
          // A ficha fica aberta para a captura, no mapa.
          f().querySelector('.mapa-net').scrollIntoView();
          return { antes, novaLinha, semDv, comHellhound, semWisp };
        })()`);
        await edge.sleep(400);
        await edge.shot('ficha-arquitetura');
        const { antes: a, novaLinha: n, comHellhound: h, semWisp: w } = info;
        const ok = a.linhas === 8 && a.rotulo === 'Arquitetura da NET' && a.dv === 'o dos andares: 10' && a.largura === 900
          && a.mapa.join(' | ') === '1A Senha DV 8 | 2A Wisp | 3A Arquivo DV 8 | 3B de 2A Nó de controle DV 8 | 4A Killer | 4B Senha DV 10 | 5A Arquivo DV 10 | 5B Nó de controle DV 10'
          && n.andar === 6 && n.ramo === 'a' && n.tipo === 'senha' && n.dv === 6 && info.semDv
          && h.mapa.includes('6A Hellhound') && h.outras === '1a:senha,2a:ice,3a:arquivo,4a:ice,5a:arquivo,3b:controle,4b:senha,5b:controle'
          && w.andares === 8 && w.mapa.includes('3A de 1A Arquivo DV 8') && w.mapa.includes('3B de 1A Nó de controle DV 8');
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => { for (const i of game.items.filter(i => ${JSON.stringify(nomes)}.includes(i.name))) { await i.sheet?.close(); await i.delete(); } return true; })()`);
      }
    });

    await r.passo('compêndio "Arquiteturas da NET" (as da campanha, do documento da wiki; os exemplos do NET Architect): 7 arquiteturas, na pasta do sistema e escondidas dos jogadores; O Gatilho mostra os 6 andares no mapa', async () => {
      const info = await edge.evaluate(`(async () => {
        const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
        const pack = game.packs.get('${S}.arquiteturas');
        const indice = await pack.getIndex();
        const gatilho = await pack.getDocument(indice.find(e => e.name.startsWith('O Gatilho'))._id);
        await gatilho.sheet.render({ force: true });
        await window.__esperar(() => gatilho.sheet.element?.querySelector('.mapa-net .no'));
        const mapa = [...gatilho.sheet.element.querySelectorAll('.mapa-net .no')].map(textoDe);
        await gatilho.sheet.close();
        return { tamanho: indice.size, nomes: [...indice].map(e => e.name).sort(), tipos: [...new Set([...indice].map(e => e.type))], pasta: pack.folder?.name, mapa };
      })()`);
      const doJogador = jogador ? await jogador.evaluate(`({ visivel: game.packs.get('${S}.arquiteturas')?.visible })`) : { visivel: 'sem o navegador do jogador' };
      const ok = info.tamanho === 7 && info.tipos.join() === 'arquitetura' && info.pasta === 'Cyberpunk RED — Fieldbook'
        && ['Apartamento de um fixer', 'Armazém da TLB (exemplo do livro)', 'A Coleira (datafort da Militech, Arroyo)', 'Clínica de ripperdoc (ramificada)', 'O Gatilho (hospital queimado, Northside)', 'O Núcleo (rede de emergência, sob o City Center)', 'O retransmissor RT-07 (depósito de Kabuki)'].every(nome => info.nomes.includes(nome))
        && info.mapa.join(' | ') === '1A Senha DV 8 | 2A Raven | 3A Arquivo DV 10 | 4A Nó de controle DV 10 | 5A Hellhound | 6A Arquivo DV 12'
        && (!jogador || doJogador.visivel === false);
      return [ok, JSON.stringify({ ...info, doJogador })];
    });

    await r.passo('arquitetura pelas tabelas (wiki, RED p. 210–211; o CORE): "Gerar pelas tabelas" na ficha, na Padrão, com os dados fixos: 6 andares e um ramo; o lobby 1 e 1; a padrão 9, 9 (não repete), 3, 18 e 11; o ramo B do andar 3, com os dois Hellhound, sai do 2A; a janela avisa que os andares de agora saem', async () => {
      await fixar(edge, []);
      const nomes = ['Teste Gerada'];
      try {
        const info = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const textoDe = el => el?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const item = await Item.implementation.create({ name: 'Teste Gerada', type: 'arquitetura', system: { andares: [{ andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }] } });
          await item.sheet.render({ force: true });
          const f = () => item.sheet.element;
          await esperar(() => f()?.querySelector('[data-action="gerar"]'));
          // Um dado por par [face, lados]: 3d6 = 6; 1d10 = 8 e 2; 1d6 = 1 e 1; 3d6 = 9, 9, 3, 18 e 11.
          window.__fila = [[2, 6], [2, 6], [2, 6], [8, 10], [2, 10], [1, 6], [1, 6], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6], [1, 6], [1, 6], [1, 6], [6, 6], [6, 6], [6, 6], [3, 6], [4, 6], [4, 6]];
          f().querySelector('[data-action="gerar"]').click();
          const janela = () => document.querySelector('.application.dialog.gerar-arquitetura:not(.minimizing)');
          await esperar(() => janela()?.querySelector('button[data-action="padrao"]'));
          const aviso = textoDe(janela().querySelector('.window-content'));
          // Só os do rodapé: os controles do cabeçalho da janela também têm data-action (QUALITY_GATES).
          const botoes = [...janela().querySelectorAll('footer button[data-action]')].map(b => b.dataset.action);
          janela().querySelector('button[data-action="padrao"]').click();
          await esperar(() => item.system.andares.length === 8 && f()?.querySelectorAll('.mapa-net .no').length === 6);
          const mapa = [...f().querySelectorAll('.mapa-net .no')].map(textoDe);
          return {
            aviso, botoes, sobrou: window.__fila.length, mapa, descricao: item.system.andares[3].descricao,
            linhas: item.system.andares.map(l => l.andar + l.ramo + ' ' + l.tipo + ' ' + (l.dv || l.ice))
          };
        })()`);
        const ok = /Os andares de agora saem/.test(info.aviso) && info.botoes.join() === 'basica,padrao,incomum,avancada' && info.sobrou === 0
          && info.linhas.join() === '1a arquivo 6,2a arquivo 6,3a senha 8,3b ice hellhound,3b ice hellhound,4b ice liche,4b ice raven,5b controle 8'
          && info.mapa.join(' | ') === '1A Arquivo DV 6 | 2A Arquivo DV 6 | 3A Senha DV 8 | 3B de 2A Hellhound Hellhound | 4B Liche Raven | 5B Nó de controle DV 8'
          && info.descricao === 'Padrão, 3: Hellhound ×2';
        return [ok, JSON.stringify(info)];
      } finally {
        await edge.evaluate(`(async () => {
          window.__fila = [];
          for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('gerar-arquitetura')) await app.close();
          for (const i of game.items.filter(i => ${JSON.stringify(nomes)}.includes(i.name))) { await i.sheet?.close(); await i.delete(); }
          return true;
        })()`);
      }
    });

    await r.passo('ponto de acesso à NET (o NET Architect da mesa; wiki: "a até 6 m de um ponto de acesso ... 8 m com o upgrade de alcance" e "sair do alcance conectado = desconexão insegura"): o botão no HUD do Tile abre a configuração, que lista as arquiteturas do mundo e do compêndio e põe a imagem de terminal no Tile sem imagem; o marcador aparece para o jogador (o oculto, só para o mestre); a 7 m o jogador não conecta, nem pedindo direto ao mestre; com o Range Upgrade no deck, conecta: o token ganha a flag, o status e o anel, e a janela da NET mostra o andar 1 como "?" e o registro; saindo do alcance, cai (desconexão insegura) e a janela fecha; o "Desconectar" da janela; só o mestre reinicia; o token apagado e o Tile apagado tiram o netrunner da NET', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner NET';
      const ARQ = 'Teste Arquitetura do Terminal';
      const CONECTADO = 'cprf-conectado-na-net';
      try {
        // 1. O mestre: a arquitetura do mundo, o Tile sem imagem e a configuração pelo botão do HUD do Tile; o netrunner do
        // jogador (Rank 4, o deck equipado) com o token a 7 m do Tile.
        const m = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const api = game.system.api.netrun;
          const arq = await Item.implementation.create({ name: '${ARQ}', type: 'arquitetura', system: { andares: [
            { andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'hellhound' },
            { andar: 3, ramo: 'a', tipo: 'arquivo', dv: 8 }, { andar: 3, ramo: 'b', tipo: 'controle', dv: 8 }
          ] } });
          const [tile] = await canvas.scene.createEmbeddedDocuments('Tile', [{ x: 1800, y: 800, width: 200, height: 200 }]);
          await esperar(() => canvas.tiles.get(tile.id));
          canvas.tiles.activate();
          await canvas.tiles.hud.bind(canvas.tiles.get(tile.id));
          await esperar(() => document.querySelector('#tile-hud .${S}-ponto'));
          const botao = document.querySelector('#tile-hud .${S}-ponto');
          botao?.click();
          const config = () => foundry.applications.instances.get('${S}-ponto-' + tile.id);
          await esperar(() => config()?.element?.querySelector('select[name=arquitetura]'));
          const form = config().element;
          const grupos = [...form.querySelectorAll('select[name=arquitetura] optgroup')].map(g => g.label + ':' + g.querySelectorAll('option').length);
          const avisoDaImagem = Boolean(form.querySelector('[name=imagemPadrao]')?.checked);
          form.querySelector('[name=nome]').value = 'Terminal da clínica';
          form.querySelector('[name=arquitetura]').value = arq.uuid;
          form.querySelector('button[type=submit]').click();
          await esperar(() => tile.getFlag('${S}', 'pontoDeAcesso') && tile.texture.src && !config());
          await canvas.tiles.hud.close();
          canvas.tokens.activate();
          const ponto = tile.getFlag('${S}', 'pontoDeAcesso');
          await esperar(() => api.pontosDesenhados().length);
          const cat = await game.system.api.wiki.carregarCatalogo();
          const jogador = game.users.getName('Jogador');
          const a = await Actor.implementation.create({ name: '${NOME}', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } }, items: [foundry.utils.deepClone(cat['core_gear:cyberdeck'])],
            ownership: { default: 0, [jogador.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
          await a.items.find(i => i.type === 'cyberdeck').update({ 'system.uso': 'equipado' });
          const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x: 1400, y: 900 })).toObject()]);
          await esperar(() => canvas.tokens.get(token.id));
          return {
            botao: Boolean(botao), grupos, avisoDaImagem, imagem: tile.texture.src, tile: tile.id, token: token.id, marcadores: api.pontosDesenhados().map(p => p.nome),
            ponto: ponto && [ponto.ativo, ponto.nome, ponto.arquitetura === arq.uuid, ponto.alcance, ponto.dv, ponto.exigeDeck, ponto.rankMinimo, ponto.oculto, ponto.reiniciar].join()
          };
        })()`);
        const JANELA = `${S}-net-${m.tile}-${m.token}`;
        // 2. O jogador vê o marcador; seleciona o netrunner e clica: a 7 m (alcance 6) não conecta, nem pedindo direto ao mestre.
        const longe = await jogador.evaluate(`(async () => {
          window.__esperar ??= async (condicao, vezes = 100) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
          const api = game.system.api.netrun;
          await window.__esperar(() => canvas.tokens.get('${m.token}') && api.pontosDesenhados().length);
          const marcadores = api.pontosDesenhados().map(p => p.nome);
          canvas.tokens.get('${m.token}').control({ releaseOthers: true });
          const tile = canvas.scene.tiles.get('${m.tile}');
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          let direto;
          try {
            await api.abrir(tile);
            direto = await api.pedir('conectar', { tile: tile.uuid, token: '${m.token}' }).then(() => 'conectou', falha => falha.message);
          } finally { delete ui.notifications.warn; }
          return { cena: canvas.scene.name, marcadores, avisos, direto, conexao: canvas.scene.tokens.get('${m.token}').getFlag('${S}', 'conexaoNaNet') ?? null };
        })()`);
        // 3. O ponto oculto: o jogador não vê o marcador; o mestre vê.
        const oculto = await edge.evaluate(`(async () => {
          await canvas.scene.tiles.get('${m.tile}').setFlag('${S}', 'pontoDeAcesso', { oculto: true });
          await new Promise(r => setTimeout(r, 300));
          return game.system.api.netrun.pontosDesenhados().map(p => p.nome);
        })()`);
        const ocultoNoJogador = await jogador.evaluate(`(async () => { await window.__esperar(() => !game.system.api.netrun.pontosDesenhados().length, 30); return game.system.api.netrun.pontosDesenhados().length; })()`);
        // 4. O mestre tira o oculto e instala o Range Upgrade no deck do netrunner.
        await edge.evaluate(`(async () => {
          await canvas.scene.tiles.get('${m.tile}').setFlag('${S}', 'pontoDeAcesso', { oculto: false });
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = game.actors.getName('${NOME}');
          const range = foundry.utils.deepClone(cat['core_upgrades:range-upgrade']);
          range.system.instaladoEm = a.items.find(i => i.type === 'cyberdeck').id;
          await a.createEmbeddedDocuments('Item', [range]);
          return true;
        })()`);
        // 5. Com o Range Upgrade (alcance 8), o jogador conecta a 7 m: a janela da NET abre com ele no ponto de acesso, o
        // andar 1 como "?" e o registro.
        const conectou = await jogador.evaluate(`(async () => {
          const esperar = window.__esperar;
          const api = game.system.api.netrun;
          await esperar(() => game.actors.getName('${NOME}')?.items.some(i => i.type === 'upgrade') && api.pontosDesenhados().length);
          canvas.tokens.get('${m.token}').control({ releaseOthers: true });
          await api.abrir(canvas.scene.tiles.get('${m.tile}'));
          const janela = () => foundry.applications.instances.get('${JANELA}');
          await esperar(() => janela()?.element?.querySelector('.corredores li[data-token]'));
          const el = janela()?.element;
          const token = canvas.tokens.get('${m.token}');
          await esperar(() => token.children.some(c => c['${S}']));
          return {
            titulo: janela()?.title, corredor: el?.querySelector('.corredores li[data-token]')?.textContent.replace(/\\s+/g, ' ').trim(),
            mapa: [...(el?.querySelectorAll('.mapa-net .no') ?? [])].map(no => no.dataset.no + (no.classList.contains('desconhecido') ? '?' : '')),
            registro: el?.querySelector('.registro li')?.textContent, botao: Boolean(el?.querySelector('.corredores button[data-action=desconectar]')),
            anel: token.children.some(c => c['${S}'])
          };
        })()`);
        await jogador.shot('janela-net');
        // 6. No mestre: o estado no Tile, a flag, o status e o anel do token; a janela do mestre com o botão de desconectar.
        const noMestre = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          const token = canvas.scene.tokens.get('${m.token}');
          await window.__esperar(() => token.actor.statuses.has('${CONECTADO}') && canvas.tokens.get(token.id).children.some(c => c['${S}']));
          const est = tile.getFlag('${S}', 'netrun');
          const c = est?.corredores[0];
          const janela = game.system.api.netrun.janela(tile, { gm: true });
          await window.__esperar(() => janela.element?.querySelector('.corredores li[data-token]'));
          const doMestre = { titulo: janela.title, botao: Boolean(janela.element?.querySelector('.corredores button[data-action=desconectar]')) };
          await janela.close();
          return {
            corredor: c && [c.nome, c.no, c.usuario === game.users.getName('Jogador').id, c.acoes, c.max].join(), nos: est?.nos.map(n => n.id + ':' + n.visto).join(),
            conexao: token.getFlag('${S}', 'conexaoNaNet')?.tile === tile.uuid, status: token.actor.statuses.has('${CONECTADO}'),
            anel: canvas.tokens.get(token.id).children.some(c => c['${S}']), arquitetura: est?.nome, dv: est?.dv, doMestre
          };
        })()`);
        // 7. O jogador sai do alcance (9 m): cai da NET (desconexão insegura) e a janela fecha. O aviso do mestre ("saiu do
        // alcance") é capturado aqui. No Foundry 14, no gancho do movimento, o token.x do mestre ainda é o de antes: a
        // queda vem pelo _source (o destino), na hora, e não no movimento seguinte.
        await edge.evaluate(`(() => {
          window.__avisosNet = [];
          ui.notifications.warn = mensagem => { window.__avisosNet.push(String(mensagem)); };
          return true;
        })()`);
        const saiu = await jogador.evaluate(`(async () => {
          await canvas.scene.tokens.get('${m.token}').update({ x: 1300 });
          await window.__esperar(() => !foundry.applications.instances.get('${JANELA}'));
          return { janela: Boolean(foundry.applications.instances.get('${JANELA}')) };
        })()`);
        const caiu = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          const token = canvas.scene.tokens.get('${m.token}');
          try {
            await window.__esperar(() => !tile.getFlag('${S}', 'netrun')?.corredores.length && !token.actor.statuses.has('${CONECTADO}') && !token.getFlag('${S}', 'conexaoNaNet')
              && window.__avisosNet.length);
          } finally { delete ui.notifications.warn; }
          const est = tile.getFlag('${S}', 'netrun');
          return {
            corredores: est.corredores.length, log: est.log.map(l => l.texto), conexao: Boolean(token.getFlag('${S}', 'conexaoNaNet')), status: token.actor.statuses.has('${CONECTADO}'),
            anel: canvas.tokens.get(token.id).children.some(c => c['${S}']), avisos: window.__avisosNet
          };
        })()`);
        // 8. De volta a 3 m, conecta de novo e sai pelo "Desconectar" da janela; o jogador não reinicia a arquitetura.
        const pelaJanela = await jogador.evaluate(`(async () => {
          const esperar = window.__esperar;
          const api = game.system.api.netrun;
          await canvas.scene.tokens.get('${m.token}').update({ x: 1600 });
          canvas.tokens.get('${m.token}').control({ releaseOthers: true });
          await api.abrir(canvas.scene.tiles.get('${m.tile}'));
          await esperar(() => foundry.applications.instances.get('${JANELA}')?.element?.querySelector('button[data-action=desconectar]'));
          const abriu = Boolean(foundry.applications.instances.get('${JANELA}'));
          foundry.applications.instances.get('${JANELA}')?.element.querySelector('button[data-action=desconectar]').click();
          await esperar(() => !foundry.applications.instances.get('${JANELA}'));
          const reiniciar = await api.pedir('reiniciar', { tile: canvas.scene.tiles.get('${m.tile}').uuid }).then(() => 'reiniciou', falha => falha.message);
          canvas.tokens.releaseAll();
          return { abriu, fechou: !foundry.applications.instances.get('${JANELA}'), reiniciar };
        })()`);
        // 9. O mestre: o registro do "Desconectar"; reinicia; conecta o token e o apaga; conecta outro e apaga o Tile.
        const fim = await edge.evaluate(`(async () => {
          const esperar = window.__esperar;
          const api = game.system.api.netrun;
          const tile = canvas.scene.tiles.get('${m.tile}');
          const textos = () => tile.getFlag('${S}', 'netrun').log.map(l => l.texto);
          await esperar(() => !tile.getFlag('${S}', 'netrun')?.corredores.length);
          const desconectou = textos();
          await api.pedir('reiniciar', { tile: tile.uuid });
          const reiniciado = textos();
          const a = game.actors.getName('${NOME}');
          await api.conectar(tile, canvas.scene.tokens.get('${m.token}'));
          const peloMestre = tile.getFlag('${S}', 'netrun').corredores.length;
          await canvas.scene.tokens.get('${m.token}').delete();
          await esperar(() => !tile.getFlag('${S}', 'netrun').corredores.length);
          const apagado = textos();
          const [outro] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x: 1600, y: 900 })).toObject()]);
          await esperar(() => canvas.tokens.get(outro.id));
          await api.conectar(tile, outro);
          const antes = Boolean(outro.getFlag('${S}', 'conexaoNaNet')) && a.statuses.has('${CONECTADO}');
          await tile.delete();
          await esperar(() => !outro.getFlag('${S}', 'conexaoNaNet') && !a.statuses.has('${CONECTADO}'));
          // A janela do mestre fecha com o Tile (o close espera a animação).
          await esperar(() => !foundry.applications.instances.get('${S}-net-${m.tile}-mestre'));
          return {
            desconectou, reiniciado, peloMestre, apagado, antes, depois: Boolean(outro.getFlag('${S}', 'conexaoNaNet')) || a.statuses.has('${CONECTADO}'),
            janelaDoMestre: Boolean(foundry.applications.instances.get('${S}-net-${m.tile}-mestre')), marcadores: api.pontosDesenhados().length
          };
        })()`);
        const marcadoresNoFim = await jogador.evaluate(`(async () => { await window.__esperar(() => !game.system.api.netrun.pontosDesenhados().length, 30); return game.system.api.netrun.pontosDesenhados().length; })()`);
        const tem = (lista, texto) => lista.some(linha => linha.includes(texto));
        const [c, n] = [conectou, noMestre];
        const ok = m.botao && m.avisoDaImagem && m.imagem === `systems/${S}/icones/terminal.svg` && m.grupos.includes('Arquiteturas da NET:7') && m.grupos.includes('Itens do mundo:1')
          && m.ponto === 'true,Terminal da clínica,true,6,,true,1,false,true' && m.marcadores.join() === 'Terminal da clínica'
          && longe.cena === 'Teste de combate' && longe.marcadores.join() === 'Terminal da clínica' && longe.conexao === null
          && tem(longe.avisos, 'está longe demais: 7.0 m (alcance 6)') && longe.direto === 'Longe demais do ponto de acesso: 7.0 m (alcance 6).'
          && oculto.join() === 'Terminal da clínica' && ocultoNoJogador === 0
          && c.titulo === 'NET: Terminal da clínica' && c.corredor === `${NOME} no ponto de acesso Desconectar` && c.mapa.join() === '1a?'
          && c.registro === `${NOME} conectou em Terminal da clínica.` && c.botao && c.anel
          && n.corredor === `${NOME},entrada,true,0,3` && n.nos === '1a:false' && n.conexao && n.status && n.anel && n.arquitetura === ARQ && n.dv === 8
          && n.doMestre.titulo === 'NET: Terminal da clínica (mestre)' && n.doMestre.botao
          && !saiu.janela && caiu.corredores === 0 && tem(caiu.log, `${NOME} desconectou de forma insegura (saiu do alcance do ponto de acesso).`)
          && tem(caiu.log, 'a arquitetura reiniciou as defesas') && !caiu.conexao && !caiu.status && !caiu.anel && caiu.avisos.join() === `${NOME} saiu do alcance e caiu da NET.`
          && pelaJanela.abriu && pelaJanela.fechou && pelaJanela.reiniciar === 'Só o mestre reinicia a arquitetura.'
          && fim.desconectou.includes(`${NOME} desconectou.`) && fim.reiniciado.join() === 'O mestre reiniciou a arquitetura.' && fim.peloMestre === 1
          && tem(fim.apagado, `${NOME} desconectou (o token saiu da cena).`) && fim.antes && !fim.depois && !fim.janelaDoMestre && fim.marcadores === 0 && marcadoresNoFim === 0;
        return [ok, JSON.stringify({ m, longe, oculto, ocultoNoJogador, conectou, noMestre, saiu, caiu, pelaJanela, fim, marcadoresNoFim })];
      } finally {
        const fechar = `for (const app of [...foundry.applications.instances.values()].filter(app => String(app.id).startsWith('${S}-net-') || String(app.id).startsWith('${S}-ponto-'))) await app.close();`;
        await jogador.evaluate(`(async () => { ${fechar} canvas.tokens.releaseAll(); return true; })()`).catch(() => null);
        await edge.evaluate(`(async () => {
          ${fechar}
          await canvas.tiles.hud?.close();
          canvas.tokens.activate();
          await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => t.name === '${NOME}').map(t => t.id));
          await canvas.scene.deleteEmbeddedDocuments('Tile', canvas.scene.tiles.filter(t => t.x === 1800 && t.y === 800).map(t => t.id));
          for (const a of game.actors.filter(a => a.name === '${NOME}')) { await a.sheet?.close(); await a.delete(); }
          for (const i of game.items.filter(i => i.name === '${ARQ}')) await i.delete();
          return true;
        })()`);
      }
    });

    // Os passos da NET desde o ciclo 51: a arquitetura, o ponto de acesso no Tile e o netrunner do jogador (Rank 4, o deck
    // equipado) a 3 m do Tile; no navegador do jogador, os ajudantes para clicar na janela da NET e esperar o registro. A
    // configuração "Inimigos da NET no combate" fica desligada, menos no passo do combate (combate: true): os outros passos
    // conferem a NET sem os inimigos na iniciativa. Do mesmo jeito, "O jogador rola as rolagens da NET" fica desligada (o
    // mestre rola, com os dados fixos no navegador dele), menos no passo da rolagem do jogador (jogadorRola: true).
    const montarNet = async ({ nome, arquitetura, andares, combate = false, jogadorRola = false }) => {
      const m = await edge.evaluate(`(async () => {
        await game.settings.set('${S}', 'netNoCombate', ${combate});
        await game.settings.set('${S}', 'netJogadorRola', ${jogadorRola});
        const arq = await Item.implementation.create({ name: '${arquitetura}', type: 'arquitetura', system: { andares: ${JSON.stringify(andares)} } });
        const ponto = { ativo: true, nome: 'Terminal do andar', arquitetura: arq.uuid, dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, dvScanner: 10, reiniciar: true, ligacoes: [], revelados: [] };
        const [tile] = await canvas.scene.createEmbeddedDocuments('Tile', [{ x: 1800, y: 800, width: 200, height: 200, texture: { src: 'systems/${S}/icones/terminal.svg' }, flags: { '${S}': { pontoDeAcesso: ponto } } }]);
        const cat = await game.system.api.wiki.carregarCatalogo();
        const jogador = game.users.getName('Jogador');
        const a = await Actor.implementation.create({ name: '${nome}', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } }, items: [foundry.utils.deepClone(cat['core_gear:cyberdeck'])],
          ownership: { default: 0, [jogador.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
        await a.items.find(i => i.type === 'cyberdeck').update({ 'system.uso': 'equipado' });
        const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x: 1600, y: 900 })).toObject()]);
        await window.__esperar(() => canvas.tokens.get(token.id) && canvas.tiles.get(tile.id));
        return { tile: tile.id, token: token.id };
      })()`);
      await jogador.evaluate(`(async () => {
        window.__esperar ??= async (condicao, vezes = 100) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const tile = () => canvas.scene.tiles.get('${m.tile}');
        const net = window.__net = {
          janela: () => foundry.applications.instances.get('${S}-net-${m.tile}-${m.token}'),
          el: () => net.janela()?.element,
          texto: seletor => net.el()?.querySelector(seletor)?.textContent.replace(/\\s+/g, ' ').trim() ?? null,
          clicar: seletor => { const alvo = net.el()?.querySelector(seletor); alvo?.click(); return Boolean(alvo); },
          registro: () => (game.system.api.netrun.estado(tile())?.log ?? []).map(linha => linha.texto),
          eu: () => game.system.api.netrun.estado(tile())?.corredores.find(c => c.token === '${m.token}') ?? null,
          // Pronta: o pedido acabou e a janela já redesenhou sem o estado ocupado (os botões valem).
          pronta: () => Boolean(net.janela()?.rendered && !net.janela().ocupado && net.el()?.querySelector('.janela-net-corpo:not(.ocupada)')),
          esperarRegistro: async texto => { await window.__esperar(() => net.registro().some(linha => linha.includes(texto)) && net.pronta()); return net.registro().at(-1); },
          // Escolhe o andar no mapa e clica em "Ir para cá"; espera chegar (ou o aviso).
          ir: async (no, { espera = true } = {}) => {
            net.clicar('[data-action=selecionar][data-no="' + no + '"]');
            await window.__esperar(() => net.el()?.querySelector('.andar-escolhido button[data-action=mover]'));
            net.clicar('.andar-escolhido button[data-action=mover]');
            if (espera) await window.__esperar(() => net.eu()?.no === no && net.pronta());
            return net.eu()?.no;
          }
        };
        canvas.tokens.get('${m.token}').control({ releaseOthers: true });
        await game.system.api.netrun.abrir(tile());
        await window.__esperar(() => net.el()?.querySelector('.mapa-net .no') && net.pronta());
        return true;
      })()`);
      return m;
    };
    const desmontarNet = async ({ nome, arquitetura }) => {
      const fechar = `for (const app of [...foundry.applications.instances.values()].filter(app => String(app.id).startsWith('${S}-net-'))) await app.close();`;
      await jogador.evaluate(`(async () => {
        ${fechar}
        for (const app of [...foundry.applications.instances.values()].filter(app => app.options.classes?.includes('janela-rolagem'))) await app.close();
        canvas.tokens.releaseAll();
        return true;
      })()`).catch(() => null);
      await edge.evaluate(`(async () => {
        ${fechar}
        window.__fila = [];
        for (const app of [...foundry.applications.instances.values()].filter(app => app.options.classes?.includes('net-vez'))) await app.close();
        for (const combate of game.combats.filter(c => c.combatants.some(cb => cb.name === '${nome}'))) await combate.delete();
        await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => t.name === '${nome}' || t.getFlag('${S}', 'inimigoDaNet')).map(t => t.id));
        for (const a of game.actors.filter(a => a.getFlag('${S}', 'modeloDaNet'))) await a.delete();
        for (const f of game.folders.filter(f => f.type === 'Actor' && f.name === 'Inimigos da NET')) await f.delete();
        await game.settings.set('${S}', 'netNoCombate', true);
        await game.settings.set('${S}', 'netJogadorRola', true);
        await canvas.scene.deleteEmbeddedDocuments('Tile', canvas.scene.tiles.filter(t => t.x === 1800 && t.y === 800).map(t => t.id));
        for (const a of game.actors.filter(a => a.name === '${nome}')) { await a.sheet?.close(); await a.delete(); }
        for (const i of game.items.filter(i => i.name === '${arquitetura}')) await i.delete();
        return true;
      })()`);
    };

    await r.passo('"Conectar" e "Desconectar" na aba NET da ficha (as maquetes do usuário): a 7 m de um ponto de alcance 6, o aviso de longe demais e nada muda; com o Range Upgrade (alcance 8), conecta no ponto mais perto (a ficha mostra o nome dele, "Abrir a NET", "Desconectar" e a arquitetura ao vivo, que acompanha o netrunner descer); "Desconectar" sai com segurança', async () => {
      const info = await edge.evaluate(`(async () => {
        const esperar = window.__esperar;
        const { PONTO_PADRAO } = await import('/systems/${S}/scripts/netrun/constantes.mjs');
        const cat = await game.system.api.wiki.carregarCatalogo();
        const criados = { atores: [], itens: [], tiles: [] };
        const avisos = [];
        try {
          const arq = await Item.implementation.create({ name: 'Teste Arquitetura da Ficha', type: 'arquitetura', system: { andares: [{ andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }] } });
          criados.itens.push(arq);
          const [tile] = await canvas.scene.createEmbeddedDocuments('Tile', [{ x: 1800, y: 800, width: 200, height: 200, flags: { '${S}': { pontoDeAcesso: { ...PONTO_PADRAO, nome: 'Terminal da ficha', arquitetura: arq.uuid } } } }]);
          criados.tiles.push(tile);
          const a = await Actor.implementation.create({ name: 'Teste Netrunner da Ficha', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 4 } }, items: [foundry.utils.deepClone(cat['core_gear:cyberdeck'])] });
          criados.atores.push(a);
          await a.items.find(i => i.type === 'cyberdeck').update({ 'system.uso': 'equipado' });
          const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await a.getTokenDocument({ x: 1400, y: 900 })).toObject()]);
          await esperar(() => canvas.tokens.get(token.id));
          await a.sheet.render({ force: true });
          await esperar(() => a.sheet.element?.querySelector('[data-action="conectarNaNet"]'));
          a.sheet.changeTab('net', 'primary');
          const f = () => a.sheet.element;
          const texto = seletor => f()?.querySelector(seletor)?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
          const antes = texto('.tab.net .conexao');
          // A 7 m (alcance 6): o aviso, e o token não conecta.
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            f().querySelector('[data-action="conectarNaNet"]').click();
            await esperar(() => avisos.length === 1);
            await new Promise(r => setTimeout(r, 300));
          } finally { delete ui.notifications.warn; }
          const longe = { avisos: [...avisos], conexao: token.getFlag('${S}', 'conexaoNaNet') ?? null };
          // Com o Range Upgrade no deck (alcance 8): conecta.
          const range = foundry.utils.deepClone(cat['core_upgrades:range-upgrade']);
          range.system.instaladoEm = a.items.find(i => i.type === 'cyberdeck').id;
          await a.createEmbeddedDocuments('Item', [range]);
          await esperar(() => f()?.querySelector('[data-action="conectarNaNet"]'));
          f().querySelector('[data-action="conectarNaNet"]').click();
          await esperar(() => token.getFlag('${S}', 'conexaoNaNet')?.tile === tile.uuid && f()?.querySelector('[data-action="desconectarDaNet"]'));
          const perto = { conexao: token.getFlag('${S}', 'conexaoNaNet')?.tile === tile.uuid, nome: texto('.tab.net .conexao'), corredores: game.system.api.netrun.estado(tile)?.corredores?.length ?? 0,
            botoes: [...f().querySelectorAll('.tab.net .coluna-resumo .botoes-resumo [data-action]')].map(b => b.dataset.action).join() };
          // A arquitetura ao vivo (as maquetes): o andar 1 como "?"; o netrunner desce, e a ficha mostra a senha, sem reabrir.
          const andares = () => [...(f()?.querySelectorAll('.tab.net .arquitetura-ao-vivo li') ?? [])].map(li => ['.rotulo-andar', '.detalhe', '.estado-andar'].map(seletor => li.querySelector(seletor)?.textContent.trim()).join('|')).join(';');
          perto.andares = andares();
          await game.system.api.netrun.pedir('mover', { tile: tile.uuid, token: token.id, destino: '1a' });
          await esperar(() => andares() !== perto.andares);
          perto.desceu = andares();
          // "Desconectar": sai com segurança, e a ficha volta ao "Conectar".
          f().querySelector('[data-action="desconectarDaNet"]').click();
          await esperar(() => !token.getFlag('${S}', 'conexaoNaNet') && f()?.querySelector('[data-action="conectarNaNet"]'));
          const saiu = { conexao: token.getFlag('${S}', 'conexaoNaNet') ?? null, nome: texto('.tab.net .conexao'), corredores: game.system.api.netrun.estado(tile)?.corredores?.length ?? 0, painel: Boolean(f()?.querySelector('.tab.net .arquitetura-ao-vivo')) };
          return { antes, longe, perto, saiu };
        } finally {
          for (const a of criados.atores) await a.sheet?.close();
          for (const tile of criados.tiles) if (canvas.scene.tiles.has(tile.id)) await tile.delete();
          for (const a of criados.atores) {
            await canvas.scene.deleteEmbeddedDocuments('Token', canvas.scene.tokens.filter(t => t.actorId === a.id).map(t => t.id));
            await a.delete();
          }
          for (const item of criados.itens) await item.delete();
        }
      })()`);
      const ok = info.antes === 'desconectado' && info.longe.avisos.length === 1 && /longe demais/.test(info.longe.avisos[0]) && !info.longe.conexao
        && info.perto.conexao && info.perto.nome === 'Terminal da ficha' && info.perto.botoes === 'abrirNet,desconectarDaNet' && info.perto.corredores === 1
        && !info.saiu.conexao && info.saiu.nome === 'desconectado' && info.saiu.corredores === 0
        && info.perto.andares === '1A|?|desconhecido' && info.perto.desceu === '1A|Senha DV 6|trancado' && !info.saiu.painel;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('andar e as habilidades na NET (wiki, "Ações NET" e "Habilidades de Interface", RED p. 198–201; o NET Architect da mesa): na janela do jogador, o "?" do andar 1 vira a senha DV 6 ao chegar; a senha trava a descida; o Backdoor rola no mestre (6 contra a DV 6 não passa; 9 passa); o Eye-Dee mostra o arquivo; o Pathfinder com 7 revela o 3A e o 3B e para no nó DV 8; o Control toma o nó e o comando vai ao registro; no andar mais fundo, o Virus com a DV e as Ações NET do mestre; o mestre vê o andar 4 escondido e o revela. O visual: o andar com a cor da senha (limpo depois do Backdoor), o cabo em degrau do 3B (do 2A), a base do Backdoor (1d10+4), as Ações NET livres fora de combate, a hora no registro e os botões do cabeçalho da janela com os ícones', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Andar';
      const ARQ = 'Teste Arquitetura do Andar';
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [
          { andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }, { andar: 2, ramo: 'a', tipo: 'arquivo', dv: 8, nome: 'Folha de pagamento', descricao: 'Os salários da clínica.' },
          { andar: 3, ramo: 'a', tipo: 'controle', dv: 8, descricao: 'As câmeras do saguão' }, { andar: 3, ramo: 'b', tipo: 'vazio' }, { andar: 4, ramo: 'a', tipo: 'vazio' }
        ] });
        // 1. Até o andar 1 pelo mapa; a senha trava a descida (o aviso).
        const andou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          const antes = net.texto('[data-no="1a"]') + (net.el().querySelector('[data-no="1a"]').classList.contains('desconhecido') ? ' desconhecido' : '');
          const no = await net.ir('1a');
          const resultado = { antes, no, detalhe: net.texto('.andar-escolhido li'), registro: net.registro().at(-1),
            habilidades: [...net.el().querySelectorAll('button[data-action=habilidade]')].map(b => b.dataset.habilidade + (b.disabled ? '-' : '+')).join(), acoes: net.texto('.netrunner .acoes'),
            // O visual: as classes do andar (a cor e o cabo), a base da rolagem no botão, os losangos das Ações NET, a hora do
            // registro (desenhada pelo CSS) e a fonte do botão de fechar (o ícone; o tema da janela não pode tirá-la).
            visual: { no1a: net.el().querySelector('[data-no="1a"]').className, base: net.texto('button[data-habilidade=backdoor] small'),
              pips: [...net.el().querySelectorAll('.netrunner .acoes .pips i')].map(i => i.className).join(), hora: net.el().querySelector('.registro li')?.dataset.hora,
              fechar: getComputedStyle(net.el().querySelector('.window-header [data-action=close]')).fontFamily } };
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            await net.ir('2a', { espera: false });
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return { ...resultado, avisos, depois: net.eu()?.no };
        })()`);
        // 2. O Backdoor: o mestre rola (os dados fixos no navegador dele): 4 + 2 = 6 não passa da DV 6; 4 + 5 = 9 passa.
        await fixar(edge, [[2, 10]]);
        const backdoor1 = await jogador.evaluate(`(async () => { window.__net.clicar('button[data-habilidade=backdoor]'); return window.__net.esperarRegistro('Backdoor ('); })()`);
        await fixar(edge, [[5, 10]]);
        const backdoor2 = await jogador.evaluate(`(async () => { window.__net.clicar('button[data-habilidade=backdoor]'); return window.__net.esperarRegistro('quebrou a senha'); })()`);
        const cartao = await edge.evaluate(`(() => { const msg = game.messages.contents.at(-1); return { rotulo: msg?.getFlag('${S}', 'teste')?.rotulo, total: msg?.getFlag('${S}', 'teste')?.total, quem: msg?.speaker.alias, autor: msg?.author?.isGM }; })()`);
        // 3. Desce ao 2A; o Eye-Dee (4 + 6 = 10 contra a DV 8) mostra o arquivo; o Pathfinder com 7 revela o 3A e o 3B.
        const desceu = await jogador.evaluate(`(async () => { await window.__net.ir('2a'); return window.__net.registro().at(-1); })()`);
        await fixar(edge, [[6, 10]]);
        const eyedee = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-habilidade=eyedee]');
          const linha = await net.esperarRegistro('Eye-Dee (');
          await window.__esperar(() => net.el().querySelector('.andar-escolhido li p'));
          return { linha, detalhe: net.texto('.andar-escolhido li') };
        })()`);
        await fixar(edge, [[3, 10]]);
        const pathfinder = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-habilidade=pathfinder]');
          const linha = await net.esperarRegistro('Pathfinder (');
          await window.__esperar(() => net.el().querySelector('[data-no="3b"]:not(.desconhecido)'));
          const no3b = net.el().querySelector('[data-no="3b"]');
          return { linha, mapa: [...net.el().querySelectorAll('.mapa-net .no')].map(no => no.dataset.no + (no.classList.contains('desconhecido') ? '?' : '')).join(),
            cabo: [no3b.classList.contains('ramifica') ? 'ramifica' : 'reto', no3b.style.getPropertyValue('--salto').trim()].join(' '), no1a: net.el().querySelector('[data-no="1a"]').className };
        })()`);
        // 4. No 3A, o Control (4 + 7 = 11 contra a DV 8) toma o nó; o comando, pela caixa de texto, vai ao registro.
        await fixar(edge, [[7, 10]]);
        const controle = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await net.ir('3a');
          const vizinho = net.texto('[data-no="4a"]');
          net.clicar('button[data-habilidade=control]');
          const linha = await net.esperarRegistro('Control (');
          await window.__esperar(() => net.el().querySelector('input[data-texto=comando]'));
          const caixa = net.el().querySelector('input[data-texto=comando]');
          caixa.value = 'Desligar as câmeras';
          caixa.dispatchEvent(new Event('input', { bubbles: true }));
          net.clicar('button[data-action=comandar]');
          const comando = await net.esperarRegistro('comanda o nó de controle');
          const habilidades = [...net.el().querySelectorAll('button[data-action=habilidade]')].map(b => b.dataset.habilidade + (b.disabled ? '-' : '+')).join();
          return { vizinho, linha, comando, detalhe: net.texto('.andar-escolhido li'), habilidades };
        })()`);
        await jogador.shot('janela-net-andar');
        // 5. O mestre, na janela dele: o andar 4 escondido dos jogadores; revelado, o jogador o vê.
        const mestre = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          const janela = game.system.api.netrun.janela(tile, { gm: true });
          await window.__esperar(() => janela.element?.querySelector('[data-no="4a"]'));
          const escondido = janela.element.querySelector('[data-no="4a"]').classList.contains('escondido');
          janela.element.querySelector('[data-action=selecionar][data-no="4a"]').click();
          await window.__esperar(() => janela.element.querySelector('button[data-action=revelar][data-no="4a"]'));
          const titulo = janela.element.querySelector('.andar-escolhido h3').textContent.replace(/\\s+/g, ' ').trim();
          janela.element.querySelector('button[data-action=revelar][data-no="4a"]').click();
          await window.__esperar(() => (game.system.api.netrun.estado(tile)?.vistos ?? []).includes('4a') && !janela.element.querySelector('[data-no="4a"]').classList.contains('escondido'));
          const depois = !janela.element.querySelector('[data-no="4a"]').classList.contains('escondido');
          return { escondido, titulo, depois, registro: game.system.api.netrun.estado(tile).log.at(-1).texto };
        })()`);
        await edge.shot('janela-net-mestre');
        await edge.evaluate(`game.system.api.netrun.janela(canvas.scene.tiles.get('${m.tile}'), { gm: true }).close().then(() => true)`);
        const revelado = await jogador.evaluate(`(async () => { await window.__esperar(() => window.__net.el()?.querySelector('[data-no="4a"]:not(.desconhecido)')); return window.__net.texto('[data-no="4a"]'); })()`);
        // 6. No 3B (o fundo, pelo 2A), o Virus: o mestre responde a DV 10 e 2 Ações NET; 4 + 8 = 12 passa.
        const fundo = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await net.ir('2a');
          await net.ir('3b');
          const virusPronto = !net.el().querySelector('button[data-habilidade=virus]').disabled;
          const caixa = net.el().querySelector('input[data-texto=virus]');
          caixa.value = 'Apagar o registro da portaria';
          caixa.dispatchEvent(new Event('input', { bubbles: true }));
          net.clicar('button[data-habilidade=virus]');
          return { no: net.eu()?.no, virusPronto };
        })()`);
        await fixar(edge, [[8, 10]]);
        const pergunta = await edge.evaluate(`(async () => {
          const dialogo = () => [...foundry.applications.instances.values()].find(app => app.options.classes?.includes('net-virus'));
          await window.__esperar(() => dialogo()?.element?.querySelector('input[name=dv]'));
          const el = dialogo().element;
          const texto = el.querySelector('blockquote').textContent;
          el.querySelector('input[name=dv]').value = '10';
          el.querySelector('input[name=acoes]').value = '2';
          el.querySelector('button[data-action=ok]').click();
          return { texto, exemplos: el.querySelectorAll('table.exemplos tbody tr').length };
        })()`);
        const virus = await jogador.evaluate(`(async () => window.__net.esperarRegistro('Virus ('))()`);
        const tem = (texto, parte) => String(texto ?? '').includes(parte);
        const classes = texto => String(texto ?? '').split(/\s+/);
        const visualOk = ['senha', 'atual', 'liga'].every(c => classes(andou.visual.no1a).includes(c)) && !classes(andou.visual.no1a).includes('feito')
          && andou.visual.base === '1d10+4' && andou.visual.pips === 'livre,livre,livre' && /^\d{2}:\d{2}:\d{2}$/.test(andou.visual.hora ?? '') && /Font Awesome/.test(andou.visual.fechar)
          && pathfinder.cabo === 'ramifica 1' && ['feito', 'livre'].every(c => classes(pathfinder.no1a).includes(c)) && !classes(pathfinder.no1a).includes('senha');
        const ok = visualOk && andou.antes === '1A ? desconhecido' && andou.no === '1a' && andou.detalhe === 'Senha DV 6 trancada' && andou.registro === `${NOME} desceu para o andar 1: Senha DV 6.`
          && andou.habilidades === 'pathfinder+,backdoor+,eyedee-,control-,cloak+,virus-,zap-,slide-' && tem(andou.acoes, 'livres fora de combate (3 por turno em combate)')
          && andou.avisos.join() === 'A senha deste andar (DV 6) trava a descida: use Backdoor.' && andou.depois === '1a'
          && backdoor1 === `Backdoor (6 contra DV 6): ${NOME} não passou a senha.` && backdoor2 === `Backdoor (9 contra DV 6): ${NOME} quebrou a senha.`
          && cartao.rotulo === 'Backdoor' && cartao.total === 9 && cartao.quem === NOME && cartao.autor
          && desceu === `${NOME} desceu para o andar 2: Arquivo DV 8.`
          && eyedee.linha === `Eye-Dee (10 contra DV 8): ${NOME} identificou o arquivo (Folha de pagamento: Os salários da clínica).` && eyedee.detalhe === 'Arquivo DV 8 identificado Folha de pagamento: Os salários da clínica.'
          && pathfinder.linha === `Pathfinder (7): ${NOME} revelou 2 andares.` && pathfinder.mapa === '1a,2a,3a,3b'
          && controle.vizinho === '4A ?' && controle.linha === `Control (11 contra DV 8): ${NOME} tomou o nó de controle (As câmeras do saguão).`
          && controle.habilidades === 'pathfinder+,backdoor-,eyedee-,control-,cloak+,virus-,zap-,slide-' && controle.comando === `${NOME} comanda o nó de controle: “Desligar as câmeras”.` && controle.detalhe === 'Nó de controle DV 8 tomado As câmeras do saguão'
          && mestre.escondido && mestre.titulo === 'Andar 4 escondido dos jogadores' && mestre.depois && mestre.registro === 'O mestre revelou o andar 4.' && revelado === '4A Andar vazio'
          && fundo.no === '3b' && fundo.virusPronto && pergunta.texto === 'Apagar o registro da portaria' && pergunta.exemplos === 5
          && virus === `Virus (12 contra DV 10): ${NOME} deixou o vírus “Apagar o registro da portaria” (DV 12 para tirá-lo).`;
        return [ok, JSON.stringify({ andou, backdoor1, backdoor2, cartao, desceu, eyedee, pathfinder, controle, mestre, revelado, fundo, pergunta, virus })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    await r.passo('Ações NET em combate e a desconexão insegura (wiki: "Conectar / Desconectar (1 Ação NET...)" e as Ações NET pelo Rank): em combate, a janela conta as que sobram (o texto e os losangos acesos); no andar mais fundo, o Virus que o mestre põe em 2 Ações NET e um Cloak gastam as 3 do Rank 4, e o Cloak seguinte é recusado, como o desconectar seguro; na rodada seguinte, no turno do netrunner, elas voltam; a desconexão insegura sai na hora, sem Ação NET', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Combate NET';
      const ARQ = 'Teste Arquitetura do Combate';
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [{ andar: 1, ramo: 'a', tipo: 'vazio' }] });
        // No 1A, o andar mais fundo desta arquitetura de um andar só (andar não é Ação NET).
        await jogador.evaluate(`window.__net.ir('1a')`);
        // O combate com o netrunner: no começo do turno dele, as Ações NET voltam (o mestre ativo).
        await edge.evaluate(`(async () => {
          const token = canvas.scene.tokens.get('${m.token}');
          const combate = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
          await combate.createEmbeddedDocuments('Combatant', [{ tokenId: token.id, sceneId: canvas.scene.id, actorId: token.actorId }]);
          await combate.startCombat();
          return true;
        })()`);
        // O Virus que o mestre põe em 2 Ações NET (4 + 8 = 12 contra a DV 6) e um Cloak (4 + 4) gastam as 3 do turno.
        await fixar(edge, [[8, 10], [4, 10]]);
        const inicio = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 3 de 3') && net.el().querySelector('input[data-texto=virus]'));
          const texto = net.texto('.netrunner .acoes');
          const caixa = net.el().querySelector('input[data-texto=virus]');
          caixa.value = 'Trancar a porta dos fundos';
          caixa.dispatchEvent(new Event('input', { bubbles: true }));
          net.clicar('button[data-habilidade=virus]');
          return texto;
        })()`);
        await edge.evaluate(`(async () => {
          const dialogo = () => [...foundry.applications.instances.values()].find(app => app.options.classes?.includes('net-virus'));
          await window.__esperar(() => dialogo()?.element?.querySelector('input[name=dv]'));
          dialogo().element.querySelector('input[name=dv]').value = '6';
          dialogo().element.querySelector('input[name=acoes]').value = '2';
          dialogo().element.querySelector('button[data-action=ok]').click();
          return true;
        })()`);
        const gastou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          const virus = await net.esperarRegistro('Virus (');
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 1 de 3'));
          const depoisDoVirus = net.texto('.netrunner .acoes');
          // Os losangos: o que sobra aceso.
          const losangos = () => [...net.el().querySelectorAll('.netrunner .acoes .pips i')].map(i => i.className).join();
          const pips = [losangos()];
          net.clicar('button[data-habilidade=cloak]');
          await net.esperarRegistro('Cloak (');
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 0 de 3'));
          const depois = net.texto('.netrunner .acoes');
          pips.push(losangos());
          // Sem Ação NET: o Cloak e o desconectar seguro são recusados (os avisos, capturados aqui).
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            net.clicar('button[data-habilidade=cloak]');
            await window.__esperar(() => avisos.length === 1 && net.pronta());
            net.clicar('.corredores button[data-action=desconectar]');
            await window.__esperar(() => avisos.length === 2);
          } finally { delete ui.notifications.warn; }
          return { virus, depoisDoVirus, depois, pips, avisos, acoes: net.eu()?.acoes, cloaks: net.registro().filter(l => l.startsWith('Cloak (')).length, conectado: Boolean(net.eu()) };
        })()`);
        // A rodada seguinte: o turno do netrunner começa e as Ações NET voltam.
        await edge.evaluate(`(async () => { await game.combats.find(c => c.combatants.some(cb => cb.tokenId === '${m.token}')).nextRound(); return true; })()`);
        const voltou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => net.eu()?.acoes === 0 && (net.texto('.netrunner .acoes') ?? '').includes('sobram 3 de 3'));
          return { acoes: net.eu()?.acoes, texto: net.texto('.netrunner .acoes'), pips: [...net.el().querySelectorAll('.netrunner .acoes .pips i')].map(i => i.className).join() };
        })()`);
        // A desconexão insegura: a pergunta, e sai na hora, sem gastar Ação NET.
        const saiu = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-action=desconectarInseguro]');
          const pergunta = () => [...foundry.applications.instances.values()].find(app => app.options.window?.title === 'Desconexão insegura');
          await window.__esperar(() => pergunta()?.element?.querySelector('button[data-action=yes]'));
          pergunta().element.querySelector('button[data-action=yes]').click();
          await window.__esperar(() => !net.janela());
          return { janela: Boolean(net.janela()), conectado: Boolean(net.eu()) };
        })()`);
        const registro = await edge.evaluate(`game.system.api.netrun.estado(canvas.scene.tiles.get('${m.tile}')).log.map(l => l.texto)`);
        const ok = inicio === 'Ações NET: sobram 3 de 3 neste turno' && gastou.virus === `Virus (12 contra DV 6): ${NOME} deixou o vírus “Trancar a porta dos fundos” (DV 12 para tirá-lo).`
          && gastou.depoisDoVirus === 'Ações NET: sobram 1 de 3 neste turno' && gastou.depois === 'Ações NET: sobram 0 de 3 neste turno' && gastou.cloaks === 1 && gastou.acoes === 3
          && gastou.avisos.join(' | ') === 'Sem Ações NET neste turno (3 de 3). | Sem Ações NET neste turno (3 de 3). Espere o seu turno ou faça a desconexão insegura.' && gastou.conectado
          && voltou.acoes === 0 && voltou.texto === 'Ações NET: sobram 3 de 3 neste turno'
          && gastou.pips.join(' | ') === 'cheio,gasto,gasto | gasto,gasto,gasto' && voltou.pips === 'cheio,cheio,cheio'
          && !saiu.janela && !saiu.conectado && registro.includes(`${NOME} desconectou de forma insegura.`);
        return [ok, JSON.stringify({ inicio, gastou, voltou, saiu, registro: registro.slice(-4) })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    await r.passo('os inimigos no andar (o NET Architect da mesa; wiki: o Zap e o Slide): o Hellhound do andar 1, com os números da wiki, segura a descida; o Zap (o mestre rola a DEF do Hellhound no nome dele) tira 4 da REZ; o Slide passa; no andar 2, o Imp segura e o Slide não vale contra ele; o mestre derruba a REZ do Imp pelo painel dele, e a descida fica livre', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Inimigos';
      const ARQ = 'Teste Arquitetura dos Inimigos';
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 2, ramo: 'a', tipo: 'demonio', demonio: 'imp' }, { andar: 3, ramo: 'a', tipo: 'vazio' }
        ] });
        // 1. No andar 1: o Hellhound (os números e a REZ), o registro, os botões; descer, o aviso. Na chegada, o netrunner
        // vence a velocidade (4 + 9 = 13 contra a SPD 6 + 2).
        await fixar(edge, [[9, 10], [2, 10]]);
        const chegou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await net.ir('1a');
          await window.__esperar(() => net.registro().some(l => l.startsWith('Velocidade (')));
          const resultado = { registro: net.registro().slice(-3), detalhe: net.texto('.andar-escolhido li'), mapa: net.texto('[data-no="1a"]'),
            habilidades: [...net.el().querySelectorAll('button[data-action=habilidade]')].map(b => b.dataset.habilidade + (b.disabled ? '-' : '+')).join() };
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            await net.ir('2a', { espera: false });
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return { ...resultado, avisos, no: net.eu()?.no };
        })()`);
        // 2. O Zap: 4 + 6 = 10 contra a DEF do Hellhound (2 + 3 = 5); o dano, 4, sai da REZ (20 → 16).
        await fixar(edge, [[6, 10], [3, 10], [4, 6]]);
        const zap = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-habilidade=zap]');
          const linha = await net.esperarRegistro('Zap (');
          await window.__esperar(() => (net.texto('[data-no="1a"]') ?? '').includes('16/20'));
          return { linha, mapa: net.texto('[data-no="1a"]') };
        })()`);
        const cartaoDoIce = await edge.evaluate(`(() => {
          const msg = game.messages.contents.filter(m => m.speaker.alias === 'Hellhound').at(-1);
          return { rotulo: msg?.getFlag('${S}', 'teste')?.rotulo, total: msg?.getFlag('${S}', 'teste')?.total };
        })()`);
        // 3. O Slide: 4 + 7 = 11 contra a PER do Hellhound (6 + 2 = 8); depois, desce ao 2A.
        await fixar(edge, [[7, 10], [2, 10]]);
        const slide = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-habilidade=slide]');
          const linha = await net.esperarRegistro('Slide (');
          const no = await net.ir('2a');
          return { linha, no, registro: net.registro().slice(-3),
            habilidades: [...net.el().querySelectorAll('button[data-action=habilidade]')].map(b => b.dataset.habilidade + (b.disabled ? '-' : '+')).join() };
        })()`);
        // 4. O Imp segura (o aviso); o mestre derruba a REZ dele pelo painel (−5 três vezes); a descida fica livre.
        const imp = await jogador.evaluate(`(async () => {
          const net = window.__net;
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            await net.ir('3a', { espera: false });
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return avisos;
        })()`);
        const mestre = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          const janela = game.system.api.netrun.janela(tile, { gm: true });
          await window.__esperar(() => janela.element?.querySelector('[data-action=selecionar][data-no="2a"]'));
          janela.element.querySelector('[data-action=selecionar][data-no="2a"]').click();
          await window.__esperar(() => janela.element.querySelector('.rez-inimigo button[data-delta="-5"]'));
          const antes = janela.element.querySelector('.rez-inimigo').textContent.replace(/\\s+/g, ' ').trim();
          const rez = () => (game.system.api.netrun.estado(tile)?.ices ?? []).find(i => i.chave === '2a.0')?.rez;
          for (const esperado of [10, 5, 0]) {
            await window.__esperar(() => janela.element.querySelector('.rez-inimigo button[data-delta="-5"]') && !janela.ocupado);
            janela.element.querySelector('.rez-inimigo button[data-delta="-5"]').click();
            await window.__esperar(() => rez() === esperado);
          }
          await janela.close();
          return { antes, rez: rez(), registro: game.system.api.netrun.estado(tile).log.at(-1).texto };
        })()`);
        // De volta ao 1A, o netrunner vence a velocidade de novo (13 contra 8).
        await fixar(edge, [[9, 10], [2, 10]]);
        const livre = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => (net.texto('[data-no="2a"]') ?? '').includes('derrubado'));
          const mapa = net.texto('[data-no="2a"]');
          const no = await net.ir('3a');
          // De volta ao 1A, o Slide de antes não vale mais: o Hellhound segura de novo.
          await net.ir('2a');
          await net.ir('1a');
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            await net.ir('2a', { espera: false });
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return { mapa, no, volta: avisos };
        })()`);
        const ok = chegou.registro.join(' | ') === `${NOME} desceu para o andar 1: Hellhound. | Hellhound está neste andar: o Black ICE e o demônio seguram a descida até caírem. | Velocidade (13 contra 8): ${NOME} viu o Hellhound a tempo.`
          && chegou.detalhe.startsWith('Hellhound Black ICE REZ 20/20 PER 6 · SPD 6 · ATK 6 · DEF 2. ') && chegou.mapa === `1A Hellhound (REZ 20/20) ${NOME}`
          && chegou.habilidades === 'pathfinder+,backdoor-,eyedee-,control-,cloak+,virus-,zap+,slide+'
          && chegou.avisos.join() === 'O Hellhound deste andar te segura: derrube a REZ dele ou use o Slide.' && chegou.no === '1a'
          && zap.linha === `Zap (10 contra 5): ${NOME} acertou o Hellhound: 4 de REZ, fica com 16.` && zap.mapa === `1A Hellhound (REZ 16/20) ${NOME}`
          && cartaoDoIce.rotulo === 'DEF' && cartaoDoIce.total === 5
          && slide.linha === `Slide (11 contra 8): ${NOME} escapou do Hellhound e pode seguir para um andar vizinho.` && slide.no === '2a'
          && slide.registro.join(' | ') === `${NOME} desceu para o andar 2: Imp. | Imp está neste andar: o Black ICE e o demônio seguram a descida até caírem. | O demônio Imp detectou ${NOME} (o demônio sempre vence a velocidade).`
          && slide.habilidades === 'pathfinder+,backdoor-,eyedee-,control-,cloak+,virus-,zap+,slide-'
          && imp.join() === 'O demônio Imp te segura: derrube a REZ dele (o Slide não funciona contra demônios).'
          && mestre.antes.startsWith('Imp REZ 15/15') && mestre.rez === 0 && mestre.registro === 'O mestre pôs a REZ do Imp em 0.'
          && livre.mapa === `2A Imp (derrubado) ${NOME}` && livre.no === '3a' && livre.volta.join() === 'O Hellhound deste andar te segura: derrube a REZ dele ou use o Slide.';
        return [ok, JSON.stringify({ chegou, zap, cartaoDoIce, slide, imp, mestre, livre })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    // O ataque de um inimigo pelo painel do mestre, na janela dele (a vez do inimigo); espera o registro.
    const ataqueDoMestre = (m, alvo, texto) => edge.evaluate(`(async () => {
      const tile = canvas.scene.tiles.get('${m.tile}');
      const janela = game.system.api.netrun.janela(tile, { gm: true });
      const botao = () => janela.element?.querySelector('button[data-action=inimigoAtaca][data-alvo="${alvo}"]');
      await window.__esperar(() => botao() && !janela.ocupado);
      const antes = game.system.api.netrun.estado(tile).log.length;
      botao().click();
      await window.__esperar(() => game.system.api.netrun.estado(tile).log.slice(antes).some(l => l.texto.includes(${JSON.stringify(texto)})) && !janela.ocupado);
      return game.system.api.netrun.estado(tile).log.slice(antes).map(l => l.texto);
    })()`);

    await r.passo('o encontro e o ataque dos inimigos (wiki, "Black ICE": a velocidade, o ATK + 1d10 contra a Interface + 1d10, os efeitos): ao chegar, o Wisp vence a velocidade e age na hora (1d6 no cérebro, 1 Ação NET a menos); o Hellhound e o Skunk perdem; o mestre faz o Hellhound atacar (2d6 no cérebro e o fogo) e o Skunk (−2 no Slide, no cartão do Slide e na base do botão); em combate, o Wisp tira 1 Ação NET no começo do turno e o fogo queima 2 no HP no fim; "Apagar o fogo" na janela', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Ataques';
      const ARQ = 'Teste Arquitetura dos Ataques';
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'wisp' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'skunk' },
          { andar: 2, ramo: 'a', tipo: 'vazio' }
        ] });
        const hp = () => edge.evaluate(`game.actors.getName('${NOME}').system.hp.value`);
        const hp0 = await hp();
        // 1. A chegada: o Wisp (4 + 2 = 6 contra SPD 4 + 5 = 9) age: 3 no cérebro; o Hellhound (13 contra 6 + 2) e o Skunk (13
        // contra 4 + 2) perdem a velocidade.
        await fixar(edge, [[2, 10], [5, 10], [3, 6], [9, 10], [2, 10], [9, 10], [2, 10]]);
        const chegou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await net.ir('1a');
          await window.__esperar(() => net.registro().some(l => l.includes('viu o Skunk a tempo')) && net.el().querySelector('.aviso-net'));
          return { registro: net.registro().slice(-8), avisos: [...net.el().querySelectorAll('.aviso-net')].map(a => a.textContent.replace(/\\s+/g, ' ').trim()) };
        })()`);
        const hp1 = await hp();
        // 2. O Hellhound ataca (6 + 5 = 11 contra a defesa 4 + 2 = 6): 3 + 4 = 7 no cérebro e o fogo.
        await fixar(edge, [[5, 10], [2, 10], [3, 6], [4, 6]]);
        const hellhound = await ataqueDoMestre(m, '1a.1', 'pegou fogo');
        const emChamas = await edge.evaluate(`game.actors.getName('${NOME}').statuses.has('cprf-em-chamas')`);
        await edge.shot('janela-net-mestre-ataques');
        const hp2 = await hp();
        // 3. O Skunk ataca (4 + 6 = 10 contra 6): −2 no Slide; o Slide no Wisp (4 − 2 + 9 = 11 contra a PER 4 + 2) passa.
        await fixar(edge, [[6, 10], [2, 10]]);
        const skunk = await ataqueDoMestre(m, '1a.2', 'Slide enquanto este Skunk');
        await fixar(edge, [[9, 10], [2, 10]]);
        const slide = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => net.el().querySelector('select[data-texto=alvo]') && (net.texto('.aviso-net:not(.fogo)') ?? '') && net.pronta());
          const avisos = [...net.el().querySelectorAll('.aviso-net')].map(a => a.textContent.replace(/\\s+/g, ' ').trim());
          // A base no botão do Slide já com o Skunk (a Interface 4 − 2), como o cartão.
          const base = net.texto('button[data-habilidade=slide] small');
          const escolha = net.el().querySelector('select[data-texto=alvo]');
          escolha.value = '1a.0';
          escolha.dispatchEvent(new Event('input', { bubbles: true }));
          net.clicar('button[data-habilidade=slide]');
          return { avisos, base, linha: await net.esperarRegistro('Slide (') };
        })()`);
        await jogador.shot('janela-net-avisos');
        const cartaoDoSlide = await edge.evaluate(`(() => { const msg = game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.rotulo === 'Slide').at(-1); return { total: msg?.getFlag('${S}', 'teste')?.total, skunk: msg?.content.includes('Skunk') }; })()`);
        // 4. Em combate: o começo do turno tira 1 Ação NET (o Wisp); a rodada seguinte, o fogo queima 2 no fim do turno.
        const combate = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          const token = canvas.scene.tokens.get('${m.token}');
          const c = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
          await c.createEmbeddedDocuments('Combatant', [{ tokenId: token.id, sceneId: canvas.scene.id, actorId: token.actorId }]);
          await c.startCombat();
          await window.__esperar(() => game.system.api.netrun.estado(tile).log.some(l => l.texto.includes('começa o turno com 1 Ação NET a menos')));
          const acoes = game.system.api.netrun.estado(tile).corredores[0].acoes;
          const hpAntes = token.actor.system.hp.value;
          await c.nextRound();
          await window.__esperar(() => token.actor.system.hp.value === hpAntes - 2 && game.messages.contents.some(m => m.content.includes('está em chamas')));
          const queimou = { hp: hpAntes - token.actor.system.hp.value, mensagem: game.messages.contents.filter(m => m.content.includes('está em chamas')).at(-1)?.content.replace(/<[^>]+>/g, '') };
          await window.__esperar(() => game.system.api.netrun.estado(tile).corredores[0].acoes === 0);
          const depois = game.system.api.netrun.estado(tile).corredores[0].acoes;
          await c.delete();
          return { acoes, queimou, depois };
        })()`);
        // 5. "Apagar o fogo" na janela do jogador (o pedido ao mestre).
        const apagou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => net.el().querySelector('button[data-action=apagarFogo]') && net.pronta());
          net.clicar('button[data-action=apagarFogo]');
          const linha = await net.esperarRegistro('apagou o fogo');
          await window.__esperar(() => !net.el().querySelector('button[data-action=apagarFogo]'));
          return { linha, botao: Boolean(net.el().querySelector('button[data-action=apagarFogo]')), status: game.actors.getName('${NOME}').statuses.has('cprf-em-chamas') };
        })()`);
        const tem = (lista, texto) => lista.some(linha => linha.includes(texto));
        const ok = tem(chegou.registro, 'Velocidade (6 contra 9): o Wisp foi mais rápido e age na hora.') && tem(chegou.registro, 'Wisp: 1d6 no cérebro e −1 Ação NET no próximo turno (mínimo 2).')
          && tem(chegou.registro, `${NOME} levou 3 no cérebro (o Wisp): HP ${hp0 - 3}/`) && tem(chegou.registro, `${NOME} terá 1 Ação NET a menos no próximo turno (no mínimo 2).`)
          && tem(chegou.registro, `Velocidade (13 contra 8): ${NOME} viu o Hellhound a tempo.`) && tem(chegou.registro, `Velocidade (13 contra 6): ${NOME} viu o Skunk a tempo.`)
          && chegou.avisos.join() === 'Wisp: 1 Ação NET a menos no próximo turno.' && hp1 === hp0 - 3
          && tem(hellhound, `O Hellhound ataca (11 contra 6) e acerta ${NOME}.`) && tem(hellhound, `${NOME} levou 7 no cérebro (o Hellhound): HP ${hp0 - 10}/`) && tem(hellhound, `${NOME} pegou fogo:`)
          && emChamas && hp2 === hp0 - 10
          && tem(skunk, `O Skunk ataca (10 contra 6) e acerta ${NOME}.`) && slide.avisos.includes('Skunk: −2 no Slide enquanto ele estiver ativo.') && slide.base === '1d10+2'
          && slide.linha === `Slide (11 contra 6): ${NOME} escapou do Wisp e pode seguir para um andar vizinho.` && cartaoDoSlide.total === 11 && cartaoDoSlide.skunk
          && combate.acoes === 1 && combate.queimou.hp === 2 && combate.queimou.mensagem.includes(`${NOME} está em chamas: 2 no HP`) && combate.depois === 0
          && apagou.linha === `${NOME} apagou o fogo (uma Ação Carnal).` && !apagou.botao && !apagou.status;
        return [ok, JSON.stringify({ hp0, hp1, hp2, chegou, hellhound, emChamas, skunk, slide, cartaoDoSlide, combate, apagou })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    await r.passo('os efeitos do Black ICE nos programas e na ficha (wiki, a tabela do Black ICE e o hardware do deck): o Killer zera a REZ do Armor ativo, que é destruído (fica, com "(destruído)", fora do deck); o Asp destrói o Sword; o Liche tira 4 de INT, REF e DEX por 1 hora; o Kraken prende (não avança nem desconecta com segurança); com a KRASH Barrier, o Giant não derruba; sem ela, derruba, e o Black ICE do andar age na desconexão insegura', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Efeitos';
      const ARQ = 'Teste Arquitetura dos Efeitos';
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'asp' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'killer' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'kraken' },
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'liche' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'giant' }, { andar: 2, ramo: 'a', tipo: 'vazio' }
        ] });
        // O deck com o Sword e o Armor (ativo); os atributos de antes.
        const antes = await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = game.actors.getName('${NOME}');
          const deck = a.items.find(i => i.type === 'cyberdeck');
          const programas = ['core_programs:sword', 'core_programs:armor'].map(id => ({ ...foundry.utils.deepClone(cat[id]), system: { ...cat[id].system, instaladoEm: deck.id, ativo: id.endsWith('armor') } }));
          for (const programa of programas) await a.createEmbeddedDocuments('Item', [programa]);
          return { int: a.system.atributos.int.valor, ref: a.system.atributos.ref.valor, dex: a.system.atributos.dex.valor, hp: a.system.hp.value };
        })()`);
        // A chegada: o netrunner (4 + 9 = 13) vence a velocidade dos cinco (SPD + 2).
        await fixar(edge, [[9, 10], [2, 10], [9, 10], [2, 10], [9, 10], [2, 10], [9, 10], [2, 10], [9, 10], [2, 10]]);
        const chegou = await jogador.evaluate(`(async () => { await window.__net.ir('1a'); await window.__esperar(() => window.__net.registro().some(l => l.includes('viu o Giant a tempo'))); return window.__net.registro().filter(l => l.startsWith('Velocidade (')); })()`);
        // O Killer (6 + 5 contra 4 + 2): 2 + 2 + 2 + 2 = 8 no REZ do Armor (7), que é destruído.
        await fixar(edge, [[5, 10], [2, 10], [2, 6], [2, 6], [2, 6], [2, 6]]);
        const killer = await ataqueDoMestre(m, '1a.1', 'foi destruído');
        // O Asp (2 + 8 contra 6): destrói o Sword, o único programa que sobrou no deck.
        await fixar(edge, [[8, 10], [2, 10]]);
        const asp = await ataqueDoMestre(m, '1a.0', 'O Asp destruiu');
        const programas = await edge.evaluate(`game.actors.getName('${NOME}').items.filter(i => i.type === 'programa').map(i => [i.name, i.system.instaladoEm, i.system.ativo, Boolean(i.getFlag('${S}', 'destruido'))].join('|')).sort()`);
        // O Liche (6 + 5 contra 6): −4 em INT, REF e DEX por 1 hora (um efeito na ficha).
        await fixar(edge, [[5, 10], [2, 10], [4, 6]]);
        const liche = await ataqueDoMestre(m, '1a.3', 'por 1 hora.');
        const ficha = await edge.evaluate(`(() => { const a = game.actors.getName('${NOME}'); const e = a.effects.find(ef => ef.getFlag('${S}', 'efeitoDaNet') === 'liche'); return { int: a.system.atributos.int.valor, ref: a.system.atributos.ref.valor, dex: a.system.atributos.dex.valor, efeito: e?.name, duracao: [e?.duration.value, e?.duration.units].join(' ') }; })()`);
        // O Kraken (8 + 5 contra 6): 2 + 2 + 2 = 6 no cérebro e a prisão: descer e o desconectar seguro, recusados.
        await fixar(edge, [[5, 10], [2, 10], [2, 6], [2, 6], [2, 6]]);
        const kraken = await ataqueDoMestre(m, '1a.2', 'prende');
        const preso = await jogador.evaluate(`(async () => {
          const net = window.__net;
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            await window.__esperar(() => net.el().querySelector('.aviso-net') && net.pronta());
            await net.ir('2a', { espera: false });
            await window.__esperar(() => avisos.length === 1 && net.pronta());
            net.clicar('.corredores button[data-action=desconectar]');
            await window.__esperar(() => avisos.length === 2);
          } finally { delete ui.notifications.warn; }
          return { avisos, aviso: [...net.el().querySelectorAll('.aviso-net')].map(a => a.textContent.replace(/\\s+/g, ' ').trim()) };
        })()`);
        // Com a KRASH Barrier no deck, o Giant (8 + 5 contra 6; 1 + 1 + 1 no cérebro) não derruba.
        await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = game.actors.getName('${NOME}');
          const krash = foundry.utils.deepClone(cat['core_upgrades:krash-barrier']);
          krash.system.instaladoEm = a.items.find(i => i.type === 'cyberdeck').id;
          await a.createEmbeddedDocuments('Item', [krash]);
          return true;
        })()`);
        await fixar(edge, [[5, 10], [2, 10], [1, 6], [1, 6], [1, 6]]);
        const comKrash = await ataqueDoMestre(m, '1a.4', 'KRASH Barrier');
        // Sem ela, o Giant derruba: a desconexão insegura, com o Kraken (1 + 1 + 1) e o Liche (−2) agindo de novo; o Asp e o
        // Killer não acham programa.
        await edge.evaluate(`(async () => { const a = game.actors.getName('${NOME}'); await a.items.find(i => i.name === 'KRASH Barrier').delete(); return true; })()`);
        await fixar(edge, [[5, 10], [2, 10], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6], [1, 6], [2, 6]]);
        const derrubado = await ataqueDoMestre(m, '1a.4', 'derrubado pelo Giant');
        const final = await edge.evaluate(`(async () => {
          const tile = canvas.scene.tiles.get('${m.tile}');
          await window.__esperar(() => !game.system.api.netrun.estado(tile).corredores.length);
          const a = game.actors.getName('${NOME}');
          return { log: game.system.api.netrun.estado(tile).log.map(l => l.texto).slice(-12), hp: a.system.hp.value, liches: a.effects.filter(ef => ef.getFlag('${S}', 'efeitoDaNet') === 'liche').length, conexao: Boolean(canvas.scene.tokens.get('${m.token}').getFlag('${S}', 'conexaoNaNet')) };
        })()`);
        const janelaFechou = await jogador.evaluate(`(async () => { await window.__esperar(() => !window.__net.janela()); return !window.__net.janela(); })()`);
        const tem = (lista, texto) => lista.some(linha => linha.includes(texto));
        const ok = chegou.length === 5 && chegou.every(l => l.startsWith('Velocidade (13 contra'))
          && tem(killer, `O Killer ataca (11 contra 6) e acerta ${NOME}.`) && tem(killer, 'Armor levou 8 de REZ, desativou e foi destruído.')
          && tem(asp, `O Asp ataca (10 contra 6) e acerta ${NOME}.`) && tem(asp, 'O Asp destruiu Sword.')
          && programas.join() === 'Armor (destruído)||false|true,Sword (destruído)||false|true'
          && tem(liche, `${NOME}: −4 em INT, REF e DEX por 1 hora.`) && ficha.int === antes.int - 4 && ficha.ref === antes.ref - 4 && ficha.dex === antes.dex - 4
          && ficha.efeito === 'Liche (−4 em INT, REF e DEX, 1 hora)' && ficha.duracao === '1 hours'
          && tem(kraken, `${NOME} levou 6 no cérebro (o Kraken): HP ${antes.hp - 6}/`) && tem(kraken, `O Kraken prende ${NOME}: até o fim do próximo turno, não avança nem desconecta com segurança.`)
          && preso.avisos.join(' | ') === 'O Kraken te prende: até o fim do seu próximo turno, não dá para avançar. | O Kraken te prende: até o fim do seu próximo turno, só a desconexão insegura.'
          && preso.aviso.includes('Preso pelo Kraken: não avança nem desconecta com segurança até o fim do próximo turno.')
          && tem(comKrash, `${NOME} levou 3 no cérebro (o Giant)`) && tem(comKrash, `A KRASH Barrier do deck segurou a conexão: o Giant não derrubou ${NOME}.`)
          && tem(derrubado, `${NOME} desconectou de forma insegura (derrubado pelo Giant).`) && tem(final.log, 'O Asp não achou programa no deck.')
          && tem(final.log, 'O Killer não achou programa ativo no deck.') && tem(final.log, `${NOME}: −2 em INT, REF e DEX por 1 hora.`)
          && final.hp === antes.hp - 6 - 3 - 3 - 3 && final.liches === 2 && !final.conexao && janelaFechou;
        return [ok, JSON.stringify({ antes, chegou, killer, asp, programas, liche, ficha, kraken, preso, comKrash, derrubado, final, janelaFechou })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    await r.passo('o deck na janela da NET (wiki: "Ativar ou desativar um programa: 1 Ação NET. Cada programa uma vez por rodada"; os programas de ataque "desativam sozinhos depois de usados"): em combate, o Sword ativado ataca o Hellhound (Interface + ATK + 1d10 contra a DEF + 1d10) e o 3d6 sai da REZ dele; o Sword desativa e não religa na mesma rodada; sem Ação NET, o Hellbolt não ataca; na rodada seguinte, o Hellbolt acerta a Raposa (o dano no cérebro da ficha dela); o Sword contra a Raposa é recusado (anti-programa)', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Deck';
      const ARQ = 'Teste Arquitetura do Deck';
      const RAPOSA = 'Teste Raposa';
      try {
        // A Raposa, netrunner inimiga com ficha (Interface 2), e a arquitetura com ela e o Hellhound no andar 1.
        const raposa = await edge.evaluate(`(async () => (await Actor.implementation.create({ name: '${RAPOSA}', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 2 } } })).uuid)()`);
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, andares: [
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa', ator: raposa }, { andar: 2, ramo: 'a', tipo: 'vazio' }
        ] });
        // O Sword e o Hellbolt instalados no deck, desativados; a chegada ao andar 1 (o netrunner vence a velocidade, 13 contra 8).
        const ids = await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = game.actors.getName('${NOME}');
          const deck = a.items.find(i => i.type === 'cyberdeck');
          for (const id of ['core_programs:sword', 'core_programs:hellbolt']) await a.createEmbeddedDocuments('Item', [{ ...foundry.utils.deepClone(cat[id]), system: { ...cat[id].system, instaladoEm: deck.id, ativo: false } }]);
          return { sword: a.items.getName('Sword').id, hellbolt: a.items.getName('Hellbolt').id };
        })()`);
        await fixar(edge, [[9, 10], [2, 10]]);
        await jogador.evaluate(`window.__net.ir('1a')`);
        // Em combate (o começo do turno do netrunner).
        await edge.evaluate(`(async () => {
          const token = canvas.scene.tokens.get('${m.token}');
          const c = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
          await c.createEmbeddedDocuments('Combatant', [{ tokenId: token.id, sceneId: canvas.scene.id, actorId: token.actorId }]);
          await c.startCombat();
          return true;
        })()`);
        const botao = (programa, acao) => `.deck .programa[data-programa="${programa}"] button[data-acao="${acao}"]`;
        // 1. Ativa o Sword (1 Ação NET) e ataca o Hellhound: 4 + 1 + 7 = 12 contra 2 + 6; 3 + 4 + 4 = 11 na REZ (20 → 9).
        const sword = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 3 de 3') && net.el().querySelector('${botao(ids.sword, 'ativar')}'));
          const linhaDoDeck = net.texto('.deck .programa[data-programa="${ids.sword}"]');
          const semAtaqueAntes = !net.el().querySelector('${botao(ids.sword, 'atacar')}');
          net.clicar('${botao(ids.sword, 'ativar')}');
          const ativou = await net.esperarRegistro('ativou Sword');
          await window.__esperar(() => net.el().querySelector('${botao(ids.sword, 'atacar')}') && net.pronta());
          const escolha = net.el().querySelector('select[data-texto=alvo]');
          escolha.value = '1a.0';
          escolha.dispatchEvent(new Event('input', { bubbles: true }));
          return { linhaDoDeck, semAtaqueAntes, ativou };
        })()`);
        // O deck na captura: o Sword ativo, com "Atacar"; o Hellbolt desativado.
        await jogador.shot('janela-net-deck');
        await fixar(edge, [[7, 10], [6, 10], [3, 6], [4, 6], [4, 6]]);
        const atacou = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('${botao(ids.sword, 'atacar')}');
          await net.esperarRegistro('Sword desativou depois do ataque');
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 1 de 3'));
          const registro = net.registro().slice(-2);
          // O Sword não religa na mesma rodada: o botão desligado e o pedido direto recusado.
          const desligado = net.el().querySelector('${botao(ids.sword, 'ativar')}')?.disabled;
          const direto = await game.system.api.netrun.pedir('programa', { tile: canvas.scene.tiles.get('${m.tile}').uuid, token: '${m.token}', programa: '${ids.sword}', acao: 'ativar' }).then(() => 'ativou', falha => falha.message);
          return { registro, desligado, direto, mapa: net.texto('[data-no="1a"]') };
        })()`);
        // 2. Ativa o Hellbolt (a 3ª Ação NET) e tenta atacar a Raposa: sem Ação NET.
        const semAcao = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('${botao(ids.hellbolt, 'ativar')}');
          await net.esperarRegistro('ativou Hellbolt');
          await window.__esperar(() => net.el().querySelector('${botao(ids.hellbolt, 'atacar')}') && net.pronta());
          const escolha = net.el().querySelector('select[data-texto=alvo]');
          escolha.value = '1a.1';
          escolha.dispatchEvent(new Event('input', { bubbles: true }));
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            net.clicar('${botao(ids.hellbolt, 'atacar')}');
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return avisos;
        })()`);
        // 3. A rodada seguinte: o Hellbolt acerta a Raposa (4 + 2 + 8 = 14 contra a Interface 2 + 3) e 5 + 5 vai ao cérebro dela.
        const hpDaRaposa = await edge.evaluate(`(async () => {
          const antes = game.actors.getName('${RAPOSA}').system.hp.value;
          await game.combats.find(c => c.combatants.some(cb => cb.tokenId === '${m.token}')).nextRound();
          await window.__esperar(() => game.system.api.netrun.estado(canvas.scene.tiles.get('${m.tile}')).corredores[0].acoes === 0);
          return antes;
        })()`);
        await fixar(edge, [[8, 10], [3, 10], [5, 6], [5, 6]]);
        const hellbolt = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 3 de 3') && net.el().querySelector('${botao(ids.hellbolt, 'atacar')}') && net.pronta());
          net.clicar('${botao(ids.hellbolt, 'atacar')}');
          await net.esperarRegistro('Hellbolt desativou depois do ataque');
          return net.registro().slice(-2);
        })()`);
        const raposaDepois = await edge.evaluate(`game.actors.getName('${RAPOSA}').system.hp.value`);
        // 4. O Sword (ativado de novo, na rodada nova) contra a Raposa: recusado, sem gastar a Ação NET do ataque.
        const antiPrograma = await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('${botao(ids.sword, 'ativar')}');
          await net.esperarRegistro('ativou Sword');
          await window.__esperar(() => net.el().querySelector('${botao(ids.sword, 'atacar')}') && net.pronta());
          const avisos = [];
          ui.notifications.warn = mensagem => { avisos.push(String(mensagem)); };
          try {
            net.clicar('${botao(ids.sword, 'atacar')}');
            await window.__esperar(() => avisos.length && net.pronta());
          } finally { delete ui.notifications.warn; }
          return { avisos, acoes: net.eu()?.acoes };
        })()`);
        const ok = sword.linhaDoDeck.startsWith('Sword Ataque anti-programa · ATK 1') && sword.semAtaqueAntes && sword.ativou === `${NOME} ativou Sword.`
          && atacou.registro.join(' | ') === `Sword (12 contra 8): ${NOME} acertou o Hellhound: 11 de REZ, fica com 9. | Sword desativou depois do ataque (o programa de ataque desativa sozinho depois de usado).`
          && atacou.desligado === true && atacou.direto === 'Cada programa só pode ser ativado ou desativado uma vez por rodada.' && atacou.mapa.startsWith('1A Hellhound (REZ 9/20)')
          && semAcao.join() === 'Sem Ações NET neste turno (3 de 3).'
          && hellbolt.join(' | ') === `Hellbolt (14 contra 5): ${NOME} acertou Raposa: 10 no cérebro. | Hellbolt desativou depois do ataque (o programa de ataque desativa sozinho depois de usado).`
          && raposaDepois === hpDaRaposa - 10
          && antiPrograma.avisos.join() === 'Sword é anti-programa: só afeta o Black ICE e os demônios.' && antiPrograma.acoes === 2;
        return [ok, JSON.stringify({ ids, sword, atacou, semAcao, hellbolt, hpDaRaposa, raposaDepois, antiPrograma })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
        await edge.evaluate(`(async () => { for (const a of game.actors.filter(a => a.name === '${RAPOSA}')) await a.delete(); return true; })()`);
      }
    });

    await r.passo('o combate na NET (wiki: o Black ICE "entra no topo da fila de iniciativa", e "O mestre joga todos os turnos do Black ICE"; o NET Architect da mesa): ao chegar ao andar do Hellhound e da Raposa, a frase só fala de quem segura a descida; os dois entram no combate da cena (criado, sem começar), com o token escondido no ponto de acesso, o Hellhound no topo; na vez dele, o mestre escolhe atacar o netrunner (8 contra 13); na da Raposa, pula; na do netrunner, o Zap tira 4 da REZ, e o token acompanha; a REZ do token em 0 derruba o Hellhound no estado (derrotado, sem a janela da vez na rodada seguinte), e a Raposa que o mestre marca derrotada também fica sem ela; a desconexão tira os inimigos do combate e da cena, e o Tile apagado também', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Combate';
      const ARQ = 'Teste Arquitetura do Combate';
      const RAPOSA = 'Teste Raposa do Combate';
      try {
        const raposa = await edge.evaluate(`(async () => (await Actor.implementation.create({ name: '${RAPOSA}', type: 'personagem', system: { role: { nome: 'Netrunner', rank: 2 } } })).uuid)()`);
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, combate: true, andares: [
          { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa', ator: raposa }, { andar: 2, ramo: 'a', tipo: 'vazio' }
        ] });
        // No mestre: o combate do netrunner, os tokens dos inimigos e a janela da vez.
        await edge.evaluate(`(async () => {
          window.__combateNet = {
            combate: () => game.combats.find(c => c.combatants.some(cb => cb.tokenId === '${m.token}')),
            inimigos: () => canvas.scene.tokens.filter(t => t.getFlag('${S}', 'inimigoDaNet')),
            vez: () => [...foundry.applications.instances.values()].find(app => app.options.classes?.includes('net-vez') && app.rendered),
            // Sem a janela da vez: de quem é a vez e a fila.
            semJanela: () => ({ semJanela: true, vez: window.__combateNet.combate()?.combatant?.name, comecou: window.__combateNet.combate()?.started, fila: window.__combateNet.combate()?.turns.map(cb => cb.name + ':' + cb.initiative) })
          };
          // O combate que um passo anterior deixou na cena (o dos turnos não apaga o dele) sai: este passo começa sem combate.
          for (const combate of game.combats.filter(c => c.scene?.id === canvas.scene.id)) await combate.delete();
          return true;
        })()`);
        // 1. A chegada ao 1A: a velocidade (4 + 9 = 13 contra 6 + 2) e a iniciativa da Raposa (o 1d10 com 5).
        await fixar(edge, [[9, 10], [2, 10], [5, 10]]);
        const chegada = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await net.ir('1a');
          await window.__esperar(() => net.registro().some(l => l.includes('um netrunner inimigo, está neste andar')) && net.pronta());
          return { registro: net.registro().slice(-4), acoes: net.texto('.netrunner .acoes') };
        })()`);
        const fila = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          await window.__esperar(() => c.combate()?.combatants.size === 3 && c.combate().combatants.every(cb => cb.tokenId === '${m.token}' || Number.isFinite(cb.initiative)));
          const combate = c.combate();
          const tile = canvas.scene.tiles.get('${m.tile}');
          const hellhound = c.inimigos().find(t => t.name === 'Hellhound');
          return {
            comecou: combate.started, ordem: combate.turns.map(cb => cb.name),
            hellhound: hellhound ? {
              escondido: hellhound.hidden, x: hellhound.x, y: hellhound.y, centro: [tile.x + tile.width / 2 - canvas.grid.size / 2, tile.y + tile.height / 2 - canvas.grid.size / 2],
              chave: hellhound.getFlag('${S}', 'inimigoDaNet').chave, tipo: hellhound.actor.type, rez: hellhound.actor.system.rez.value + '/' + hellhound.actor.system.rez.max,
              pasta: game.actors.get(hellhound.actorId)?.folder?.name ?? null
            } : null,
            raposa: c.inimigos().find(t => t.name === 'Raposa')?.actor?.name ?? null
          };
        })()`);
        // 2. O mestre começa o combate: a vez do Hellhound (no topo). Ele ataca o netrunner: 6 + 2 = 8 contra 4 + 9 = 13.
        await fixar(edge, [[2, 10], [9, 10]]);
        const vezDoHellhound = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          await c.combate().startCombat();
          await window.__esperar(() => c.vez());
          const app = c.vez();
          if (!app) return c.semJanela();
          const dados = { titulo: app.options.window.title, botoes: [...app.element.querySelectorAll('footer button[data-action]')].map(b => b.textContent.trim()) };
          app.element.querySelector('button[data-action="${m.token}"]').click();
          await window.__esperar(() => !app.rendered);
          return dados;
        })()`);
        if (vezDoHellhound.semJanela) return [false, JSON.stringify({ chegada, fila, vezDoHellhound })];
        const ataque = await jogador.evaluate(`window.__net.esperarRegistro('O Hellhound ataca (')`);
        // 3. A vez da Raposa: o mestre pula.
        const vezDaRaposa = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          await c.combate().nextTurn();
          await window.__esperar(() => c.vez());
          const app = c.vez();
          if (!app) return c.semJanela();
          const dados = { titulo: app.options.window.title, vez: c.combate().combatant?.name };
          app.element.querySelector('button[data-action=pular]').click();
          await window.__esperar(() => !app.rendered);
          return dados;
        })()`);
        if (vezDaRaposa.semJanela) return [false, JSON.stringify({ chegada, fila, vezDoHellhound, ataque, vezDaRaposa })];
        // 4. A vez do netrunner: as Ações NET voltam; o Zap (4 + 6 = 10 contra 2 + 3) tira 4 da REZ do Hellhound, e o token
        // dele acompanha (16).
        await edge.evaluate(`window.__combateNet.combate().nextTurn().then(() => true)`);
        await fixar(edge, [[6, 10], [3, 10], [4, 6]]);
        const zap = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => (net.texto('.netrunner .acoes') ?? '').includes('sobram 3 de 3') && net.pronta());
          const escolha = net.el().querySelector('select[data-texto=alvo]');
          escolha.value = '1a.0';
          escolha.dispatchEvent(new Event('input', { bubbles: true }));
          net.clicar('button[data-habilidade=zap]');
          return net.esperarRegistro('Zap (');
        })()`);
        const rezNoToken = await edge.evaluate(`(async () => {
          const hellhound = () => window.__combateNet.inimigos().find(t => t.name === 'Hellhound');
          await window.__esperar(() => hellhound()?.actor?.system.rez.value === 16);
          return hellhound()?.actor?.system.rez.value;
        })()`);
        // 5. O mestre zera a REZ no token: o estado acompanha (o Hellhound cai), e o combatente fica derrotado.
        const zerou = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          const hellhound = c.inimigos().find(t => t.name === 'Hellhound');
          const tile = canvas.scene.tiles.get('${m.tile}');
          const derrotado = () => c.combate().combatants.find(cb => cb.tokenId === hellhound.id)?.defeated;
          await hellhound.actor.update({ 'system.rez.value': 0 });
          await window.__esperar(() => (game.system.api.netrun.estado(tile).ices ?? []).some(i => i.chave === '1a.0' && i.rez === 0) && derrotado());
          return { registro: game.system.api.netrun.estado(tile).log.at(-1).texto, derrotado: derrotado() };
        })()`);
        // 6. A rodada seguinte começa na vez do Hellhound, derrotado: a janela da vez não abre. A Raposa, ainda na NET, o
        // mestre marca como derrotada no combate: na vez dela, a janela também não abre.
        const semVez = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          await c.combate().nextRound();
          await new Promise(r => setTimeout(r, 1500));
          const hellhound = { vez: c.combate().combatant?.name, janela: Boolean(c.vez()) };
          await c.combate().combatants.find(cb => cb.name === 'Raposa').update({ defeated: true });
          await c.combate().nextTurn();
          await new Promise(r => setTimeout(r, 1500));
          return { ...hellhound, vezDaRaposa: c.combate().combatant?.name, janelaDaRaposa: Boolean(c.vez()) };
        })()`);
        // 7. O netrunner desconecta: ninguém na NET, a arquitetura reinicia, e os inimigos saem do combate e da cena.
        await jogador.evaluate(`(async () => {
          const net = window.__net;
          net.clicar('button[data-action=desconectar]');
          await window.__esperar(() => !net.janela());
          return true;
        })()`);
        const limpou = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          await window.__esperar(() => !c.inimigos().length);
          return { tokens: c.inimigos().length, combatentes: c.combate()?.combatants.map(cb => cb.name) ?? [], registro: game.system.api.netrun.estado(canvas.scene.tiles.get('${m.tile}')).log.slice(-2).map(l => l.texto) };
        })()`);
        // 8. De volta à NET e ao 1A pelo mestre: os inimigos voltam ao combate (a REZ cheia); o Tile apagado os tira.
        await fixar(edge, [[9, 10], [2, 10], [5, 10]]);
        const tileApagado = await edge.evaluate(`(async () => {
          const c = window.__combateNet;
          const tile = canvas.scene.tiles.get('${m.tile}');
          await game.system.api.netrun.pedir('conectar', { tile: tile.uuid, token: '${m.token}' });
          await game.system.api.netrun.pedir('mover', { tile: tile.uuid, token: '${m.token}', destino: '1a' });
          await window.__esperar(() => c.inimigos().length === 2 && c.combate()?.combatants.size === 3);
          const antes = { tokens: c.inimigos().length, rez: c.inimigos().find(t => t.name === 'Hellhound')?.actor?.system.rez.value };
          await tile.delete();
          await window.__esperar(() => !c.inimigos().length);
          return { antes, depois: c.inimigos().length, combatentes: c.combate()?.combatants.map(cb => cb.name) ?? [] };
        })()`);
        const ok = chegada.registro.includes('Hellhound está neste andar: o Black ICE e o demônio seguram a descida até caírem.')
          && chegada.registro.includes('Raposa, um netrunner inimigo, está neste andar.') && !chegada.registro.some(l => l.includes('Hellhound e Raposa'))
          && fila.comecou === false && fila.ordem.join() === `Hellhound,Raposa,${NOME}` && fila.raposa === RAPOSA
          && fila.hellhound?.escondido === true && fila.hellhound.x === fila.hellhound.centro[0] && fila.hellhound.y === fila.hellhound.centro[1]
          && fila.hellhound.chave === '1a.0' && fila.hellhound.tipo === 'blackice' && fila.hellhound.rez === '20/20' && fila.hellhound.pasta === 'Inimigos da NET'
          && vezDoHellhound.titulo === 'A vez de Hellhound na NET' && vezDoHellhound.botoes.join() === `Atacar ${NOME},Pular a vez`
          && ataque === `O Hellhound ataca (8 contra 13), e ${NOME} se defende.`
          && vezDaRaposa.titulo === 'A vez de Raposa na NET' && vezDaRaposa.vez === 'Raposa'
          && zap === `Zap (10 contra 5): ${NOME} acertou o Hellhound: 4 de REZ, fica com 16.` && rezNoToken === 16
          && zerou.registro === 'A REZ do Hellhound mudou no token: ele caiu.' && zerou.derrotado === true
          && semVez.vez === 'Hellhound' && semVez.janela === false && semVez.vezDaRaposa === 'Raposa' && semVez.janelaDaRaposa === false
          && limpou.tokens === 0 && limpou.combatentes.join() === NOME && limpou.registro.at(-1).startsWith('Ninguém na NET: a arquitetura reiniciou as defesas')
          && tileApagado.antes.tokens === 2 && tileApagado.antes.rez === 20 && tileApagado.depois === 0 && tileApagado.combatentes.join() === NOME;
        return [ok, JSON.stringify({ chegada, fila, vezDoHellhound, ataque, vezDaRaposa, zap, rezNoToken, zerou, semVez, limpou, tileApagado })];
      } finally {
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
        await edge.evaluate(`(async () => { for (const a of game.actors.filter(a => a.name === '${RAPOSA}')) await a.delete(); return true; })()`);
      }
    });

    await r.passo('o jogador rola na NET (o NET Architect da mesa: "O jogador rola as próprias rolagens"): na janela de rolagem do computador dele, a velocidade ao chegar ao Hellhound; o Zap cancelado na janela não acontece; o Zap com 2 de Sorte (que sai da ficha); o ataque do Sword; e a defesa que ele não rola no prazo: o mestre rola, o registro avisa e a janela dele fecha', async () => {
      if (!jogador) return [false, 'sem o navegador do jogador'];
      const NOME = 'Teste Netrunner Rola';
      const ARQ = 'Teste Arquitetura da Rolagem';
      const tempoAntes = await edge.evaluate(`game.settings.get('${S}', 'tempo')`);
      try {
        const m = await montarNet({ nome: NOME, arquitetura: ARQ, jogadorRola: true, andares: [{ andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 2, ramo: 'a', tipo: 'vazio' }] });
        // A Sorte 6 e o Sword ativo no deck.
        await edge.evaluate(`(async () => {
          const cat = await game.system.api.wiki.carregarCatalogo();
          const a = game.actors.getName('${NOME}');
          await a.update({ 'system.atributos.luck.valor': 6, 'system.sorte.value': 6 });
          const deck = a.items.find(i => i.type === 'cyberdeck');
          await a.createEmbeddedDocuments('Item', [{ ...foundry.utils.deepClone(cat['core_programs:sword']), system: { ...cat['core_programs:sword'].system, instaladoEm: deck.id, ativo: true } }]);
          return true;
        })()`);
        await jogador.evaluate(`game.settings.set('${S}', 'rolarDireto', false).then(() => true)`);
        const janelaDoJogador = `document.querySelector('.application.dialog.janela-rolagem:not(.minimizing)')`;
        // No navegador do jogador: espera a janela de rolagem (o título) e clica num botão dela (com a Sorte).
        const esperarJanela = async () => {
          for (let i = 0; i < 60; i++) {
            await jogador.sleep(250);
            const titulo = await jogador.evaluate(`${janelaDoJogador}?.querySelector('.window-title')?.textContent.trim() ?? null`).catch(() => null);
            if (titulo) return titulo;
          }
          return null;
        };
        const naJanela = (acao, sorte = null) => jogador.evaluate(`(() => {
          const j = ${janelaDoJogador};
          if (!j) return false;
          if (${sorte} !== null) { const c = j.querySelector('[name="sorte"]'); c.value = ${sorte}; c.dispatchEvent(new Event('input', { bubbles: true })); }
          j.querySelector('button[data-action="${acao}"]').click();
          return true;
        })()`);
        // 1. A chegada ao 1A: a velocidade é do jogador (o d10 9 no navegador dele: 4 + 9 = 13) contra a SPD do Hellhound (6 + 2).
        await fixar(jogador, [[9, 10]]);
        await fixar(edge, [[2, 10]]);
        await jogador.evaluate(`window.__net.ir('1a', { espera: false }).then(() => true)`);
        const janelaDaVelocidade = await esperarJanela();
        await naJanela('rolar');
        const velocidade = await jogador.evaluate(`window.__net.esperarRegistro('Velocidade (')`);
        const autorDaVelocidade = await edge.evaluate(`game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.rotulo === 'Velocidade').at(-1)?.author?.name ?? null`);
        // 2. O Zap cancelado na janela: o aviso, e nada no registro.
        await jogador.evaluate(`(() => {
          window.__avisosNet = [];
          ui.notifications.warn = mensagem => { window.__avisosNet.push(String(mensagem)); };
          window.__registroAntes = window.__net.registro().length;
          window.__net.clicar('button[data-habilidade=zap]');
          return true;
        })()`);
        const janelaDoZap = await esperarJanela();
        await naJanela('cancelar');
        const cancelado = await jogador.evaluate(`(async () => {
          const net = window.__net;
          await window.__esperar(() => window.__avisosNet.length && net.pronta());
          delete ui.notifications.warn;
          return { avisos: window.__avisosNet, novas: net.registro().length - window.__registroAntes };
        })()`);
        // 3. O Zap com 2 de Sorte: 4 + 6 + 2 = 12 contra a DEF 2 + 3; o dano (4) sai da REZ (20 → 16); a Sorte, da ficha (6 → 4).
        await fixar(jogador, [[6, 10]]);
        await fixar(edge, [[3, 10], [4, 6]]);
        await jogador.evaluate(`(() => { window.__net.clicar('button[data-habilidade=zap]'); return true; })()`);
        await esperarJanela();
        await naJanela('rolar', 2);
        const zap = await jogador.evaluate(`window.__net.esperarRegistro('Zap (')`);
        const sorte = await edge.evaluate(`game.actors.getName('${NOME}').system.sorte.value`);
        // 4. O ataque do Sword (ativo): 4 + 1 + 7 = 12 contra 2 + 6; 3 + 4 + 4 = 11 na REZ (16 → 5).
        await fixar(jogador, [[7, 10]]);
        await fixar(edge, [[6, 10], [3, 6], [4, 6], [4, 6]]);
        await jogador.evaluate(`(() => { window.__net.clicar('.deck .programa button[data-acao="atacar"]'); return true; })()`);
        const janelaDoSword = await esperarJanela();
        await naJanela('rolar');
        const sword = await jogador.evaluate(`(async () => { await window.__net.esperarRegistro('Sword desativou'); return window.__net.registro().slice(-2); })()`);
        // 5. A defesa: o mestre faz o Hellhound atacar (6 + 2 = 8); o jogador não rola no prazo (10 s + 15); o mestre rola
        //    (4 + 9 = 13), o registro avisa, e a janela do jogador fecha.
        await edge.evaluate(`game.settings.set('${S}', 'tempo', 10).then(() => true)`);
        await fixar(edge, [[2, 10], [9, 10]]);
        await edge.evaluate(`(() => { window.__ataqueNet = game.system.api.netrun.pedir('inimigoAtaca', { tile: canvas.scene.tiles.get('${m.tile}').uuid, token: '${m.token}', alvo: '1a.0' }); return true; })()`);
        const janelaDaDefesa = await esperarJanela();
        const defesa = await edge.evaluate(`window.__ataqueNet.then(() => game.system.api.netrun.estado(canvas.scene.tiles.get('${m.tile}')).log.slice(-2).map(l => l.texto))`);
        await jogador.sleep(800);
        const fechou = !(await jogador.evaluate(`Boolean(${janelaDoJogador})`));
        const ok = janelaDaVelocidade === 'Teste: Velocidade' && velocidade === `Velocidade (13 contra 8): ${NOME} viu o Hellhound a tempo.` && autorDaVelocidade === 'Jogador'
          && janelaDoZap === 'Teste: Zap' && cancelado.avisos.join() === 'Rolagem cancelada: nada aconteceu.' && cancelado.novas === 0
          && zap === `Zap (12 contra 5): ${NOME} acertou o Hellhound: 4 de REZ, fica com 16.` && sorte === 4
          && janelaDoSword === 'Teste: Sword: ataque' && sword[0] === `Sword (12 contra 8): ${NOME} acertou o Hellhound: 11 de REZ, fica com 5.`
          && janelaDaDefesa === 'Teste: Defesa' && defesa.join(' | ') === `Jogador não rolou a tempo: o mestre rolou por ${NOME}. | O Hellhound ataca (8 contra 13), e ${NOME} se defende.` && fechou;
        return [ok, JSON.stringify({ janelaDaVelocidade, velocidade, autorDaVelocidade, janelaDoZap, cancelado, zap, sorte, janelaDoSword, sword, janelaDaDefesa, defesa, fechou })];
      } finally {
        await edge.evaluate(`game.settings.set('${S}', 'tempo', ${JSON.stringify(tempoAntes)}).then(() => true)`);
        await desmontarNet({ nome: NOME, arquitetura: ARQ });
      }
    });

    await r.passo('wiki: importa o Netrunner com o cyberdeck e os programas instalados nele, como a montagem da wiki', async () => {
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(netrunner.id)}, '');
        const deck = ator.items.find(i => i.type === 'cyberdeck');
        const resultado = {
          deck: deck && { nome: deck.name, slots: deck.system.slots, usados: deck.slotsUsados, uso: deck.system.uso },
          programas: ator.items.filter(i => i.type === 'programa').map(p => ({ uid: p.getFlag('${S}', 'wikiUid'), nome: p.name, noDeck: p.system.instaladoEm === deck?.id })),
          notas
        };
        // As fichas: a linha do deck e a lista de programas na aba NET da ficha do personagem; o "Instalado em" na ficha do
        // programa.
        const esperar = async condicao => { for (let i = 0; i < 50 && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        await ator.sheet.render({ force: true });
        await esperar(() => ator.sheet.element?.querySelector('li[data-item-id="' + deck.id + '"] .detalhe'));
        resultado.ficha = {
          deck: ator.sheet.element.querySelector('li[data-item-id="' + deck.id + '"] .detalhe').textContent,
          programas: [...ator.sheet.element.querySelectorAll('.tab.net li[data-item-id]')].filter(li => li.textContent.includes('ATK')).length
        };
        await ator.sheet.close();
        const programa = ator.items.find(i => i.type === 'programa');
        await programa.sheet.render({ force: true });
        await esperar(() => programa.sheet.element?.querySelector('select[name="system.instaladoEm"]'));
        resultado.ficha.instaladoEm = programa.sheet.element.querySelector('select[name="system.instaladoEm"]').value === deck.id;
        await programa.sheet.close();
        await ator.delete();
        return resultado;
      })()`);
      const itens = netrunner.resultado.itens;
      const deckDaWiki = itens.find(i => i.id.startsWith('core_gear:cyberdeck'));
      const programasDaWiki = itens.filter(i => i.id.startsWith('core_programs:'));
      const copias = programasDaWiki.reduce((soma, i) => soma + Math.max(1, Number(i.qtd) || 1), 0);
      const nomes = [deckDaWiki, ...programasDaWiki].map(i => i.nome);
      const ok = info.deck && info.deck.uso === deckDaWiki.uso && info.programas.length === copias
        && info.programas.every(p => p.noDeck === (programasDaWiki.find(i => i.uid === p.uid)?.em === deckDaWiki.uid))
        && info.deck.usados === info.programas.filter(p => p.noDeck).length && !info.notas.some(nota => nomes.some(nome => nota.startsWith(`${nome}:`)))
        && info.ficha.deck.startsWith(`${info.deck.usados}/${info.deck.slots} slots · `) && info.ficha.programas === info.programas.length && info.ficha.instaladoEm;
      return [ok, JSON.stringify(info)];
    });

    await r.passo('wiki: importa o Nomad com os veículos da família e os upgrades instalados (SDP 50 + 20, 4 + 2 assentos) e a arma de 2077 da loja (Smart); tudo entregue; o Moto soma o Rank nas perícias de veículo', async () => {
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(nomad.id)}, '');
        const veiculos = ator.items.filter(i => i.type === 'veiculo').map(v => ({
          nome: v.name, sdp: [v.system.sdp.value, v.system.sdp.max], assentos: v.system.assentos, familia: v.system.familia, upgrades: v.instalados.map(i => i.name)
        }));
        const de2077 = ator.items.filter(i => i.getFlag('${S}', 'arma2077')).map(i => [i.name, i.getFlag('${S}', 'arma2077').classe, i.system.pente.max, i.system.bonusAtaque]);
        // O Moto (Rank 4) nas seis perícias de veículo, e no teste como uma parte.
        const moto = {
          rank: ator.system.role.rank,
          pericias: ['drive-land-vehicle', 'pilot-air-vehicle', 'pilot-sea-vehicle', 'land-vehicle-tech', 'air-vehicle-tech', 'sea-vehicle-tech'].map(id => ator.system.pericia(id).role?.rotulo + ' ' + ator.system.pericia(id).role?.valor),
          partes: ator.partesDaPericia('drive-land-vehicle').partes.map(parte => parte.rotulo + ' ' + parte.valor), fora: ator.system.pericia('athletics').role
        };
        await ator.delete();
        return { veiculos, de2077, notas, moto };
      })()`);
      const doc = (await api(`/api/personagens/${nomad.id}`)).personagem;
      const entregues = doc.foundry?.entregues || [];
      const [carro, moto] = nomad.resultado.veiculos;
      const ok = info.veiculos.length === 2
        && JSON.stringify(info.veiculos[0]) === JSON.stringify({ nome: 'Compact Groundcar', sdp: [70, 70], assentos: 6, familia: true, upgrades: ['Heavy Chassis', 'Seating Upgrade'] })
        && JSON.stringify(info.veiculos[1]) === JSON.stringify({ nome: 'Roadbike', sdp: [35, 35], assentos: 2, familia: true, upgrades: [] })
        && JSON.stringify(info.de2077) === JSON.stringify([['Arasaka HJKE-11 Yukimura', 'smart', 30, 0]]) && info.notas.length === 0
        && [carro.uid, moto.uid, ...carro.upgrades.map(u => u.uid), 'loja:teste-2077'].every(uid => entregues.includes(uid))
        && info.moto.rank === 4 && info.moto.pericias.every(t => t === 'Moto 4') && info.moto.partes.includes('Moto 4') && info.moto.fora === null;
      return [ok, `${JSON.stringify(info)} · entregues: ${entregues.length}`];
    });

    await r.passo('wiki: um item que o sistema não conhece vira aviso e não conta como entregue para a wiki', async () => {
      // Personagem sintético na wiki de teste: o resultado já pronto, com um Agent e um item com id que não existe.
      const { personagem } = await api('/api/personagens', 'POST', {
        nome: 'Teste Entregues', apelido: 'Sintético', resultado: {
          stats: { BODY: 5, WILL: 5 }, derivados: { hp: 35 }, humanidade: { atual: 50 }, dinheiro: { saldo: 0 }, pericias: [], veiculos: [],
          itens: [{ uid: 'teste:agent', id: 'core_gear:agent', nome: 'Agent', qtd: 1, uso: 'carregando' }, { uid: 'teste:fantasma', id: 'core_gear:item-que-nao-existe', nome: 'Item Fantasma', qtd: 1 }]
        }
      });
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(personagem.id)}, '');
        const resultado = { itens: ator.items.map(i => i.name), notas };
        await ator.delete();
        return resultado;
      })()`);
      const entregues = (await api(`/api/personagens/${personagem.id}`)).personagem.foundry?.entregues || [];
      return [info.itens.join() === 'Agent' && info.notas.some(nota => nota.startsWith('Item Fantasma:')) && entregues.join() === 'teste:agent', JSON.stringify({ ...info, entregues })];
    });

    await r.passo('janela "Personagens da wiki" (botão na aba de Atores): lista o que dá para fazer com cada um; aprova um pedido (entrega na hora), recusa outro com o motivo e importa o Netrunner para o Jogador', async () => {
      // Dois pedidos do Solo esperando o mestre: um Agent cada (100eb).
      const pedir = async () => (await api(`/api/personagens/${solo.id}/pedidos`, 'POST', { itens: [{ id: 'core_gear:agent', qtd: 1 }] })).pedido;
      const [aprovar, recusar] = [await pedir(), await pedir()];
      const info = await edge.evaluate(`(async () => {
        const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        const solo = game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(solo.id)});
        const dinheiroAntes = solo.system.dinheiro;
        const agentsAntes = solo.items.filter(i => i.name === 'Agent').length;
        // O botão na aba de Atores abre a janela.
        await ui.sidebar.changeTab('actors', 'primary');
        await ui.actors.render({ force: true });
        await esperar(() => ui.actors.element?.querySelector('[data-cprf-wiki]'));
        const temBotao = Boolean(ui.actors.element.querySelector('[data-cprf-wiki]'));
        ui.actors.element.querySelector('[data-cprf-wiki]').click();
        const janela = () => foundry.applications.instances.get('${S}-wiki')?.element;
        // A linha do personagem (os pedidos também levam o id da wiki do personagem).
        const linha = (id, seletor = '') => janela()?.querySelector('ol.personagens li[data-wiki-id="' + id + '"]' + seletor);
        await esperar(() => linha(${JSON.stringify(netrunner.id)}));
        const botoes = id => [...(linha(id)?.querySelectorAll(':scope > button') ?? [])].map(b => b.dataset.action);
        const lista = { solo: botoes(${JSON.stringify(solo.id)}), netrunner: botoes(${JSON.stringify(netrunner.id)}) };
        const ultimo = () => janela()?.querySelector('.ultimo')?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
        // Aprovar: entrega na hora.
        janela().querySelector('li[data-pedido="${aprovar.id}"] [data-action="aprovar"]').click();
        await esperar(() => /pedido entregue/.test(ultimo()));
        const aprovado = { aviso: ultimo(), dinheiro: solo.system.dinheiro - dinheiroAntes, agents: solo.items.filter(i => i.name === 'Agent').length - agentsAntes };
        // Recusar: a janela pergunta o motivo.
        janela().querySelector('li[data-pedido="${recusar.id}"] [data-action="recusar"]').click();
        const pergunta = () => document.querySelector('.application.dialog.recusar-pedido');
        await esperar(() => pergunta()?.querySelector('input[name="motivo"]'));
        pergunta().querySelector('input[name="motivo"]').value = 'Já tem um Agent';
        pergunta().querySelector('button[data-action="ok"]').click();
        await esperar(() => /Pedido recusado/.test(ultimo()));
        const recusado = ultimo();
        // Importar o Netrunner com o Jogador de dono.
        const jogador = game.users.getName('Jogador');
        linha(${JSON.stringify(netrunner.id)}, ' select').value = jogador.id;
        linha(${JSON.stringify(netrunner.id)}, ' [data-action="importar"]').click();
        await esperar(() => /importado/.test(ultimo()));
        const importado = game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(netrunner.id)});
        await esperar(() => botoes(${JSON.stringify(netrunner.id)}).includes('abrir'));
        const depois = { aviso: ultimo(), dono: importado?.testUserPermission(jogador, 'OWNER'), botoes: botoes(${JSON.stringify(netrunner.id)}) };
        await foundry.applications.instances.get('${S}-wiki').close();
        await importado?.delete();
        return { temBotao, lista, aprovado, recusado, depois };
      })()`);
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const status = id => doc.pedidos.find(p => p.id === id);
      const ok = info.temBotao && info.lista.solo.join() === 'abrir' && info.lista.netrunner.includes('importar')
        && info.aprovado.dinheiro === -100 && info.aprovado.agents === 1 && status(aprovar.id).status === 'entregue'
        && /Pedido recusado/.test(info.recusado) && status(recusar.id).status === 'recusado' && status(recusar.id).motivo === 'Já tem um Agent'
        && info.depois.dono === true && info.depois.botoes.join() === 'abrir';
      return [ok, JSON.stringify({ ...info, wiki: [status(aprovar.id).status, status(recusar.id).status, status(recusar.id).motivo] })];
    });

    await r.passo('wiki no Foundry 12 e no 14: o Netrunner ligado a um ator do Foundry 12 (o vínculo que o módulo cpr-2077 grava) e com o ator do 14 apagado no passo anterior: a wiki guardou o apagado; a janela diz onde ele está e oferece "Importar de novo"; importado, cada Foundry fica com o seu vínculo, e a ficha da mesa vale dos dois atores, não de um terceiro', async () => {
      // O ator do 14 apagado no passo anterior: a wiki fica sabendo (o aviso vai sem esperar).
      let antes = null;
      for (let i = 0; i < 30 && !antes?.foundry14?.removido; i++) {
        antes = (await api(`/api/personagens/${netrunner.id}`)).personagem;
        if (!antes?.foundry14?.removido) await edge.sleep(200);
      }
      // O Foundry 12 liga o Netrunner a um ator dele (o módulo cpr-2077 manda sem geracao).
      await api(`/api/personagens/${netrunner.id}/foundry`, 'PUT', { ator: 'ator-do-12', nomeAtor: 'Netrunner no 12' });
      const info = await edge.evaluate(`(async () => {
        const esperar = async (condicao, vezes = 80) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        await game.system.api.abrirJanelaDaWiki();
        const janela = () => foundry.applications.instances.get('${S}-wiki')?.element;
        const linha = (seletor = '') => janela()?.querySelector('ol.personagens li[data-wiki-id="${netrunner.id}"]' + seletor);
        await esperar(() => linha(' [data-action="importar"]'));
        const situacao = linha(' small')?.textContent.trim();
        const botao = linha(' [data-action="importar"]')?.textContent.trim();
        linha(' [data-action="importar"]').click();
        // A janela é a mesma do passo anterior (o "importado" dele ainda está no alto): espera o ator novo.
        const doNetrunner = () => game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === ${JSON.stringify(netrunner.id)});
        await esperar(() => doNetrunner() && linha(' [data-action="abrir"]'));
        const ator = doNetrunner();
        const depois = linha(' small')?.textContent.trim();
        // A ficha da mesa do 14 vai para a wiki.
        await game.system.api.wiki.mandarFicha(ator);
        await foundry.applications.instances.get('${S}-wiki').close();
        return { situacao, botao, ator: ator?.id ?? null, depois };
      })()`);
      const doc = (await api(`/api/personagens/${netrunner.id}`)).personagem;
      // A ficha da mesa do ator do 12 ainda vale; a de um terceiro, não.
      const mesa = ator => fetch(`${wiki}/api/personagens/${netrunner.id}/mesa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ator, hp: { atual: 20, max: 40 } }) });
      const [do12, deOutro] = [(await mesa('ator-do-12')).status, (await mesa('ator-velho')).status];
      // O ator do 14 sai de novo (a wiki marca o apagado), como no passo anterior.
      await edge.evaluate(`(async () => { await game.actors.get(${JSON.stringify(info.ator)})?.delete(); return true; })()`);
      const ok = Boolean(antes?.foundry14?.removido)
        && /O ator do Foundry 14 \(.+\) foi apagado em /.test(info.situacao) && /No Foundry 12: Netrunner no 12\./.test(info.situacao) && info.botao === 'Importar de novo'
        && Boolean(info.ator) && /^Neste mundo: /.test(info.depois)
        && doc.foundry12?.ator === 'ator-do-12' && doc.foundry14?.ator === info.ator && !doc.foundry14?.removido && doc.foundry14?.geracao === 14 && doc.mesa?.geracao === 14
        && do12 === 200 && deOutro === 409;
      return [ok, JSON.stringify({ antes: { f12: antes?.foundry12?.ator ?? null, f14: antes?.foundry14?.ator ?? null, removido: antes?.foundry14?.removido ?? null }, info, depois: { f12: doc.foundry12?.ator, f14: doc.foundry14?.ator, removido: doc.foundry14?.removido ?? null, mesa: doc.mesa?.geracao }, do12, deOutro })];
    });

    await r.passo('wiki: erros da importação (personagem que não existe, wiki fora do ar, jogador tentando importar) viram mensagem, sem criar ator', async () => {
      const info = await edge.evaluate(`(async () => {
        // As voltas da ficha que estão esperando vão antes de a wiki "cair".
        await game.system.api.wiki.mandarPendentes();
        const atores = game.actors.size;
        const erro = promessa => promessa.then(() => null, e => e.message);
        const naoExiste = await erro(game.system.api.wiki.importarPersonagem('nao-existe-0000', ''));
        const url = game.settings.get('${S}', 'wikiUrl');
        await game.settings.set('${S}', 'wikiUrl', 'http://127.0.0.1:9');
        const foraDoAr = await erro(game.system.api.wiki.importarPersonagem('qualquer', ''));
        await game.settings.set('${S}', 'wikiUrl', url);
        return { naoExiste, foraDoAr, novos: game.actors.size - atores };
      })()`);
      const doJogador = await jogador.evaluate(`game.system.api.wiki.importarPersonagem('qualquer', '').then(() => null, e => e.message)`);
      return [Boolean(info.naoExiste) && /^Não consegui falar com a wiki em http:\/\/127\.0\.0\.1:9\./.test(info.foraDoAr) && info.novos === 0 && /^Só o mestre importa/.test(doJogador),
        JSON.stringify({ ...info, doJogador })];
    });

    await r.passo('nenhum aviso de compatibilidade nem erro vindo do sistema, no navegador do mestre e no do jogador', async () => {
      const doMestre = await foundry14.avisosDoSistema(edge);
      const doJogador = jogador ? await foundry14.avisosDoSistema(jogador) : ['sem o navegador do jogador'];
      return [!doMestre.length && !doJogador.length, [...doMestre.map(a => `mestre: ${a}`), ...doJogador.map(a => `jogador: ${a}`)].join(' | ')];
    });
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
