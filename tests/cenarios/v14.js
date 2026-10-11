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

    await r.passo('compêndios: armas, armaduras, munição, cyberware, equipamento, roupas, drogas, netrunning, upgrades, veículos, lesões e os personagens de exemplo; o Solo de exemplo entra pronto para o combate', async () => {
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
      return [t.armas === 100 && t.armaduras === 18 && t.municao === 55 && t.cyberware === 107 && t.equipamento === 51 && t.roupas === 90 && t.drogas === 10 && t.netrunning === 18 && t.upgrades === 51 && t.veiculos === 14 && t.lesoes === 22 && t.exemplos === 2 && s.hp === 45 && s.ini === 12 && s.sp.join() === '11,11' && s.pente === 25 && s.municao === 'Rifle (Basic)' && s.hum === 36 && s.humMax === 48,
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

    await r.passo('inventário: o Agent vale carregando (+2 em Pesquisa em Biblioteca) e não guardado; o Medscanner, só equipado; o Boost liga pela ficha do item (+2 INT); a ficha lista e troca o uso', async () => {
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
          .map(li => [li.querySelector('.nome').textContent, li.querySelector('.detalhe').textContent, li.querySelector('[data-action="mudarUso"]').textContent].join(' | '));
        a.sheet.element.querySelector('li[data-item-id="' + agent.id + '"] [data-action="mudarUso"]').click();
        await esperar(() => agent.system.uso === 'equipado');
        passos.push({ uso: agent.system.uso, biblioteca: bonus('library-search') });
        await a.sheet.close();
        await a.delete();
        return { passos, linhas };
      })()`);
      const [p0, p1, p2, p3] = info.passos;
      const linhas = info.linhas.join(' ; ');
      return [p0.biblioteca === 2 && p0.primeirosSocorros === 0 && p0.int === 5 && p1.biblioteca === 0 && p1.primeirosSocorros === 2 && p2.int === 7 && p2.ligados.join() === 'Boost Primary'
        && p3.uso === 'equipado' && p3.biblioteca === 2 && /Agent \|[^;]*\| Guardado/.test(linhas) && /Medscanner \|[^;]*Medscanner[^;]*\| Equipado/.test(linhas) && /Boost \| 1 dose \| Carregando/.test(linhas)
        && /High Fashion Footwear \| Calçado · Alta moda \| Equipado/.test(linhas), JSON.stringify(info)];
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
    // No navegador de quem defende: espera a janela da defesa, clica na escolha e devolve o texto da janela.
    const responder = async (navegador, escolha) => {
      for (let i = 0; i < 60; i++) {
        await navegador.sleep(250);
        const texto = await navegador.evaluate(`(() => {
          const janela = document.querySelector('.application.dialog.cpr-fieldbook.defesa');
          const botao = janela?.querySelector('.form-footer button[data-action="${escolha}"]');
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
        const [arma, municao] = await a.createEmbeddedDocuments('Item', [pistola, balas]);
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
        const [arma, municao] = await a.createEmbeddedDocuments('Item', [lanca, granada]);
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

    await r.passo('escudo e a janela do mestre: o Capanga (NPC) pode aguentar ou usar o escudo; o mestre vê o total, escolhe o escudo, que leva os 10 PV dele; o Desfazer devolve', async () => {
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
      return [/Total do ataque: 20 · DV 16/.test(janela) && info.escolha === 'escudo' && info.resultado === 'acertou' && info.escudoAblado === 10 && info.recebido === 0
        && info.depois.hp === info.hpAntes && info.depois.pv === 0 && info.desfeito && info.pvDesfeito === 10, `janela: ${janela} · ${JSON.stringify(info)}`];
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

    await r.passo('corpo a corpo: DEX + Arma Branca; o Capanga (REF 6) esquiva assim mesmo, sem janela; empate é dele; acertando, a arma branca leva 2d6', async () => {
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
        const janelas = () => [...document.querySelectorAll('.application.dialog.cpr-fieldbook.defesa:not(.minimizing)')].map(d => d.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80));
        const golpe = async fila => {
          window.__fila = fila;
          const r = await arma.atacar({ alvo: __token('Capanga') });
          const [l] = r.linhas;
          return { ataque: r.ataque, escolha: l.escolha, defesa: l.defesa, resultado: l.resultado, recebido: l.dano?.recebido ?? null };
        };
        const resultado = { partes: arma.partesDoAtaque().partes.map(p => p.rotulo + ' ' + p.valor), primeiro: await golpe([[3, 10], [8, 10]]), segundo: await golpe([[8, 10], [2, 10], [4, 6], [3, 6]]), perdeu: hp - capanga.system.hp.value };
        resultado.janelas = janelas();
        await a.deleteEmbeddedDocuments('Item', [arma.id]);
        await capanga.update({ 'system.hp.value': hp });
        return resultado;
      })()`);
      const { primeiro: p, segundo: s } = info;
      return [info.partes[0] === 'DEX 7' && p.ataque === 13 && p.escolha === 'esquivar' && p.defesa === 13 && p.resultado === 'esquivou'
        && s.ataque === 18 && s.defesa === 7 && s.resultado === 'acertou' && s.recebido === 7 && info.perdeu === 7 && !info.janelas.length, JSON.stringify(info)];
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

    await r.passo('jogador demora: depois de 8 s o mestre ganha o cartão para responder por ele, escolhe Aguentar; a janela do jogador fecha e o cartão de espera some', async () => {
      // Ataque: d10 8 → 8 + 4 + 8 = 20 contra DV 16. Dano 5d6: 2 × 5 = 10 contra o SP do Alvo.
      await fixar(edge, [[8, 10], [2, 6], [2, 6], [2, 6], [2, 6], [2, 6]]);
      await edge.evaluate(`(() => {
        window.__pente = __ator('Atiradora').items.getName('Assault Rifle').system.pente.value;
        window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') });
        return true;
      })()`);
      const janelaDoJogador = `Boolean(document.querySelector('.application.dialog.cpr-fieldbook.defesa'))`;
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
        && inventarioOk && doc.foundry?.ator,
        `inventário da wiki: ${doInventario.map(i => `${i.nome} (${i.uso})`).join(', ')} · ${JSON.stringify({ ...info, porUid: undefined })} · wiki: ${doc.estadoFoundry} ${doc.foundry?.ator || ''}`];
    });
    await edge.evaluate(`game.actors.find(a => a.getFlag('${S}', 'wiki'))?.sheet.render({ force: true })`);
    await edge.sleep(1200);
    await edge.shot('importado');

    await r.passo('wiki: importa o Netrunner com o cyberdeck e os programas instalados nele, como a montagem da wiki', async () => {
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(netrunner.id)}, '');
        const deck = ator.items.find(i => i.type === 'cyberdeck');
        const resultado = {
          deck: deck && { nome: deck.name, slots: deck.system.slots, usados: deck.slotsUsados, uso: deck.system.uso },
          programas: ator.items.filter(i => i.type === 'programa').map(p => ({ uid: p.getFlag('${S}', 'wikiUid'), nome: p.name, noDeck: p.system.instaladoEm === deck?.id })),
          notas
        };
        // As fichas: a linha do deck e a lista de programas na ficha do personagem; o "Instalado em" na ficha do programa.
        const esperar = async condicao => { for (let i = 0; i < 50 && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
        await ator.sheet.render({ force: true });
        await esperar(() => ator.sheet.element?.querySelector('li[data-item-id="' + deck.id + '"] .detalhe'));
        resultado.ficha = {
          deck: ator.sheet.element.querySelector('li[data-item-id="' + deck.id + '"] .detalhe').textContent,
          programas: [...ator.sheet.element.querySelectorAll('.tab.equipamento li[data-item-id]')].filter(li => li.textContent.includes('ATK')).length
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

    await r.passo('wiki: importa o Nomad com os veículos da família e os upgrades instalados (SDP 50 + 20, 4 + 2 assentos); a arma de 2077 vira aviso e não conta como entregue', async () => {
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(nomad.id)}, '');
        const veiculos = ator.items.filter(i => i.type === 'veiculo').map(v => ({
          nome: v.name, sdp: [v.system.sdp.value, v.system.sdp.max], assentos: v.system.assentos, familia: v.system.familia, upgrades: v.instalados.map(i => i.name)
        }));
        await ator.delete();
        return { veiculos, notas };
      })()`);
      const doc = (await api(`/api/personagens/${nomad.id}`)).personagem;
      const entregues = doc.foundry?.entregues || [];
      const [carro, moto] = nomad.resultado.veiculos;
      const ok = info.veiculos.length === 2
        && JSON.stringify(info.veiculos[0]) === JSON.stringify({ nome: 'Compact Groundcar', sdp: [70, 70], assentos: 6, familia: true, upgrades: ['Heavy Chassis', 'Seating Upgrade'] })
        && JSON.stringify(info.veiculos[1]) === JSON.stringify({ nome: 'Roadbike', sdp: [35, 35], assentos: 2, familia: true, upgrades: [] })
        && info.notas.some(nota => /Yukimura/.test(nota)) && !entregues.includes('loja:teste-2077')
        && [carro.uid, moto.uid, ...carro.upgrades.map(u => u.uid)].every(uid => entregues.includes(uid));
      return [ok, `${JSON.stringify(info)} · entregues: ${entregues.length} (2077 de fora: ${!entregues.includes('loja:teste-2077')})`];
    });

    await r.passo('wiki: erros da importação (personagem que não existe, wiki fora do ar, jogador tentando importar) viram mensagem, sem criar ator', async () => {
      const info = await edge.evaluate(`(async () => {
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
