// A base da campanha (documentos/morana/base-da-campanha.md + campanha-base.js): um registro para cada pessoa, facção,
// lugar, peça, relógio e segredo. No Node: o arquivo é lido sem erro, bate com as fichas de NPC, o mapa e o elenco, as
// citações {{base:...}} e {{doc:...}} dos documentos existem e as cópias antigas saíram. Na wiki do mestre: Pessoas e
// facções, Lugares e peças, o Dossiê e o Resumo da Sessão 01 saem da base e dos documentos; o endereço antigo de Quem é
// quem abre a tabela; os nomes viram links com cartão; o Estado da campanha grava no servidor e aparece nas páginas.
// Usa o servidor local de teste (o mestre) e devolve a mesa como estava.
const fs = require('fs');
const path = require('path');

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  const pasta = path.join(raiz, 'documentos', 'morana');
  const B = require(path.join(raiz, 'campanha-base.js'));
  const texto = fs.readFileSync(path.join(pasta, 'base-da-campanha.md'), 'utf8');
  const base = B.ler(texto);
  global.window = global.window || {};
  delete require.cache[require.resolve(path.join(raiz, 'mestre-npcs.js'))];
  require(path.join(raiz, 'mestre-npcs.js'));
  require(path.join(raiz, 'campaign-map.js'));
  const npcs = window.npcStatBlocks.data;

  // ---------- Sem navegador ----------
  await r.passo('a base lê sem erro e bate com as fichas de NPC, os pontos do mapa e o elenco do Foundry', async () => {
    const problemas = B.conferir(base, {
      fichas: [...npcs.mooks, ...npcs.lieutenants, ...npcs.bosses, ...npcs.boss, ...npcs.campaignCast].map(card => card.name),
      marcadores: window.campaignMapData.markers.map(marker => marker.id),
      elenco: npcs.campaignCast.map(card => card.name)
    });
    const contagem = `${base.pessoas.length} pessoas, ${base.faccoes.length} facções, ${base.lugares.length} lugares, ${base.pecas.length} peças, ${base.relogios.map(item => `${item.chave} ${item.segmentos.length}`).join('/')}, ${base.segredos.length} segredos`;
    const ok = !problemas.length && base.pecas.length === 3 && base.relogios.map(item => item.segmentos.length).join() === '6,8,6' && base.pessoas.length >= 20;
    return [ok, problemas.slice(0, 5).join(' · ') || contagem];
  });

  await r.passo('as citações dos documentos ({{base:...}} e {{doc:arquivo.md#secao}}) apontam para o que existe', async () => {
    const quebradas = [];
    for (const nome of fs.readdirSync(pasta).filter(arquivo => arquivo.endsWith('.md'))) {
      const doc = fs.readFileSync(path.join(pasta, nome), 'utf8');
      const expandido = B.expandir(doc, base, B.vazio(), {});
      for (const m of expandido.matchAll(/\*\((citação desconhecida|relógio "[^"]+" não existe)[^)]*\)\*/g)) quebradas.push(`${nome}: ${m[0]}`);
      for (const [, arquivo, secao] of doc.matchAll(/^\{\{doc:([\w.-]+\.md)#([\w-]+)\}\}\s*$/gm)) {
        const alvo = path.join(pasta, arquivo);
        if (!fs.existsSync(alvo) || !B.trechos(fs.readFileSync(alvo, 'utf8'), [secao])) quebradas.push(`${nome}: ${arquivo}#${secao}`);
      }
    }
    const citacoes = fs.readdirSync(pasta).filter(arquivo => arquivo.endsWith('.md')).reduce((total, nome) => total + (fs.readFileSync(path.join(pasta, nome), 'utf8').match(/^\{\{(base|doc):/gm) || []).length, 0);
    return [!quebradas.length && citacoes >= 15, quebradas.slice(0, 5).join(' · ') || `${citacoes} citações conferidas`];
  });

  await r.passo('as cópias saíram: Quem é quem, as tabelas da fundação, do diário e de Personagens, e as páginas escritas no index.html', async () => {
    const ler = nome => fs.readFileSync(path.join(pasta, nome), 'utf8');
    const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    const casos = {
      'quem-e-quem.md não existe': !fs.existsSync(path.join(pasta, 'quem-e-quem.md')),
      'fundação sem a tabela das partes': !/\| A Chave \| Fragmento/.test(ler('fundacao-da-campanha.md')),
      'fundação sem a lista do relógio de Sato': !/^1\. \*\*Recuperar a Chave\*\*/m.test(ler('fundacao-da-campanha.md')),
      'diário sem a tabela dos NPCs': !/\| Wakako Okada \| Ativa \|/.test(ler('diario-da-campanha.md')),
      'Personagens sem o guia rápido': !/\| Wakako Okada \| Contratante e aliada ambígua \|/.test(ler('personagens-da-campanha.md')),
      'index.html sem o elenco escrito à mão': !/Contratante \/ aliada ambígua/.test(index) && !/const campaignClocks/.test(index),
      'Kobo: o guia diz o mesmo que a Sessão 2 (os Scavs só se o corpo ficou)': /Se o grupo deixou o corpo de Kobo/.test(ler('guia-night-city-2077.md')) && /Se o grupo deixou o corpo de Kobo para trás/.test(ler('sessao-02-o-hospital-queimado.md'))
    };
    const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
    return [!errados.length, errados.join(' · ') || `${Object.keys(casos).length} conferências`];
  });

  await r.passo('o Foundry recebe o texto da base: cada ator do elenco tem "Na campanha" com quem é e o lado', async () => {
    const sem = npcs.campaignCast.filter(card => {
      const pessoa = base.pessoas.find(item => item.campos.ficha === card.name);
      const html = pessoa ? B.paraFoundry(pessoa) : '';
      return !/<h3>Na campanha<\/h3>/.test(html) || !/<b>Quem é:<\/b>/.test(html) || !/<b>Lado:<\/b>/.test(html);
    }).map(card => card.name);
    return [!sem.length, sem.join(', ') || `${npcs.campaignCast.length} atores`];
  });

  // ---------- Na wiki do mestre ----------
  const local = servidores.local;
  const mesa = `${local}/api/campanhas/morana/mesa`;
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { const v = await edge.evaluate(expressao).catch(() => null); if (v) return v; await edge.sleep(250); } return null; };
  const limpar = () => fetch(mesa, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: { 'dr-kenzo-endo': null, 'o-gatilho': null }, segredos: { 'kobo-foi-morto-por-morana': false } }) });
  await limpar();
  try {
    await r.passo('Pessoas e facções sai da base: a tabela Quem é quem, os cartões do elenco e das forças, e o aviso de onde editar', async () => {
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length > 20`);
      const info = await edge.evaluate(`({
        linhas: document.querySelectorAll('#md-doc table')[0]?.querySelectorAll('tbody tr').length || 0,
        cartoes: document.querySelectorAll('#md-doc h4').length,
        endo: [...document.querySelectorAll('#md-doc h4')].some(h => h.textContent.trim() === 'Dr. Kenzo Endo'),
        ficha: !!document.querySelector('#md-doc a[href="#npcs/iskra-voss"]'),
        fonte: /Gerado da base da campanha/.test(document.querySelector('#md-doc p')?.textContent || ''),
        literal: /\\{\\{/.test(document.querySelector('#md-doc').textContent)
      })`);
      await edge.shot('pessoas');
      return [info.linhas === base.pessoas.length && info.cartoes === base.pessoas.length + base.faccoes.length && info.endo && info.ficha && info.fonte && !info.literal, JSON.stringify(info)];
    });

    await r.passo('o endereço antigo #docQuemEQuem abre Pessoas e facções, na tabela Quem é quem', async () => {
      await edge.ir(`${local}/?recarregar#docQuemEQuem`, 1800);
      const estado = await edge.evaluate(`({ pagina: wikiApp.currentPage(), hash: location.hash, foco: document.querySelector('#content .flash')?.textContent.trim().slice(0, 20) || '' })`);
      return [estado.pagina === 'people' && /Quem é quem/.test(estado.foco), JSON.stringify(estado)];
    });

    await r.passo('Lugares e peças: as três peças e os lugares; "ver no mapa" abre o mapa já no ponto', async () => {
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length > 10`);
      const titulos = await edge.evaluate(`[...document.querySelectorAll('#md-doc h4')].map(h => h.textContent.trim())`);
      await edge.shot('lugares');
      await edge.evaluate(`document.querySelector('#md-doc a[href="#campaignMap/northside-hospital"]').click()`);
      const ponto = await esperar(`wikiApp.currentPage() === 'campaignMap' && document.querySelector('.map-pin.selected')?.dataset.mapMarker`);
      const ok = ['A Chave', 'O Gatilho', 'A Coleira', 'Hospital queimado', 'O Núcleo'].every(nome => titulos.includes(nome)) && ponto === 'northside-hospital';
      return [ok, `${titulos.length} cartões · ponto ${ponto}`];
    });

    await r.passo('o Dossiê é montado dos documentos e da base (premissa, peças, roteiro, forças, relógios, finais), sem citação quebrada', async () => {
      await edge.ir(`${local}/?recarregar#campaign`, 1500);
      await esperar(`/Possíveis conclusões/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const info = await edge.evaluate(`(() => { const doc = document.querySelector('#md-doc'); const h = [...doc.querySelectorAll('h3')].map(x => x.textContent.trim()); return { h, tabelas: doc.querySelectorAll('table').length, quebrada: /citação desconhecida|não achada|\\{\\{(base|doc):/.test(doc.textContent), wakako: /Wakako Okada chama os personagens/.test(doc.textContent) }; })()`);
      const ok = ['Premissa', 'As três partes de Morana', 'A campanha em uma tabela', 'Forças em jogo', 'Relógios', 'Segredos', 'Possíveis conclusões'].every(t => info.h.includes(t)) && info.tabelas >= 3 && !info.quebrada && info.wakako;
      await edge.shot('dossie');
      return [ok, JSON.stringify(info)];
    });

    await r.passo('Sessão 01 → Resumo: o resumo, os objetivos, o roteiro de bolso e o encerramento, tirados do próprio documento', async () => {
      await edge.ir(`${local}/?recarregar#session1`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h3').length > 1`);
      const info = await edge.evaluate(`({ h: [...document.querySelectorAll('#md-doc h3, #md-doc h4')].map(x => x.textContent.trim()), aba: document.querySelector('#content .page-tab[aria-current="page"]')?.textContent })`);
      const ok = info.aba === 'Resumo' && ['Resumo para o mestre', 'Roteiro de bolso', 'Objetivos da sessão', 'Encerramento da sessão'].every(t => info.h.includes(t)) && !info.h.includes('Cena 3: O mensageiro');
      return [ok, info.h.join(' | ')];
    });

    await r.passo('os nomes viram link nos documentos (uma vez por seção), com o cartão da base ao passar o mouse', async () => {
      await edge.ir(`${local}/?recarregar#docSessao01`, 1500);
      await esperar(`document.querySelectorAll('#md-doc a.ent').length > 5`);
      const links = await edge.evaluate(`[...document.querySelectorAll('#md-doc a.ent')].map(a => a.dataset.ent)`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      await edge.shot('cartao-wakako');
      const href = await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').getAttribute('href')`);
      const ok = links.includes('wakako-okada') && links.includes('dr-kenzo-endo') && links.includes('a-chave') && href === '#people/wakako-okada' && /Contratante/.test(cartao || '') && /Pachinko/.test(cartao || '');
      return [ok, `${links.length} links (${[...new Set(links)].length} nomes) · cartão: ${(cartao || '').slice(0, 80)}`];
    });

    await r.passo('Estado da campanha: Endo capturado, o Gatilho com Iskra e um segredo revelado ficam no servidor e aparecem nas páginas e no cartão', async () => {
      await edge.ir(`${local}/?recarregar#notes`, 1500);
      await esperar(`document.querySelector('[data-bs-id="dr-kenzo-endo"] [data-bs-campo="situacao"]')`);
      await edge.evaluate(`(() => {
        const campo = (id, nome, valor) => { const c = document.querySelector('[data-bs-id="' + id + '"] [data-bs-campo="' + nome + '"]'); c.value = valor; c.dispatchEvent(new Event('change', { bubbles: true })); };
        campo('dr-kenzo-endo', 'situacao', 'Capturado');
        campo('dr-kenzo-endo', 'onde', 'Arasaka Industrial Docks');
        campo('o-gatilho', 'onde', 'Com Iskra');
        const s = document.querySelector('[data-bs-segredo="kobo-foi-morto-por-morana"]'); s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      let salvo = null;
      for (let i = 0; i < 20 && !salvo; i++) { await edge.sleep(300); const dados = await (await fetch(mesa)).json(); if (dados.estado && dados.estado['o-gatilho'] && dados.segredos['kobo-foi-morto-por-morana']) salvo = dados; }
      await edge.shot('estado');
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`/Capturado/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const pessoas = await edge.evaluate(`(() => { const t = document.querySelector('#md-doc table'); const linha = [...t.querySelectorAll('tbody tr')].find(tr => /Dr\\. Kenzo Endo/.test(tr.textContent)); return linha ? linha.textContent.replace(/\\s+/g, ' ') : ''; })()`);
      await edge.ir(`${local}/?recarregar#campaign`, 1500);
      await esperar(`/Com Iskra/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const dossie = await edge.evaluate(`({ gatilho: /Com Iskra/.test(document.querySelector('#md-doc').textContent), segredo: [...document.querySelectorAll('#md-doc li')].some(li => /☑/.test(li.textContent) && /Kobo foi morto por Morana/.test(li.textContent)) })`);
      await edge.ir(`${local}/?recarregar#docSessao01`, 1500);
      await esperar(`document.querySelector('#md-doc a.ent[data-ent="dr-kenzo-endo"]')`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="dr-kenzo-endo"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      const ok = salvo && salvo.estado['dr-kenzo-endo'].situacao === 'Capturado' && /Arasaka Industrial Docks/.test(pessoas) && /Capturado/.test(pessoas) && dossie.gatilho && dossie.segredo && /Capturado/.test(cartao || '');
      return [ok, `servidor ${JSON.stringify(salvo && salvo.estado)} · tabela "${pessoas.slice(0, 120)}" · dossiê ${JSON.stringify(dossie)} · cartão ${(cartao || '').slice(0, 60)}`];
    });

    await r.passo('a fundação mostra a tabela das peças citada da base (com o estado de agora), e a busca acha "Hideo Mori" no cartão de Endo', async () => {
      await edge.ir(`${local}/?recarregar#docFundacao`, 1500);
      await esperar(`document.querySelectorAll('#md-doc table').length > 0`);
      const tabela = await edge.evaluate(`[...document.querySelectorAll('#md-doc table')].map(t => t.textContent).find(t => /O Gatilho/.test(t) && /Onde está agora/.test(t)) || ''`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'Hideo Mori'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await edge.sleep(600);
      const resultados = await edge.evaluate(`[...document.querySelectorAll('#content .result')].slice(0, 4).map(r => r.dataset.page + ':' + r.querySelector('strong').textContent)`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      return [/Com Iskra/.test(tabela) && resultados.some(item => item === 'people:Dr. Kenzo Endo'), `tabela ${/Com Iskra/.test(tabela)} · ${resultados.join(' | ')}`];
    });
  } finally {
    await limpar();
  }
};
