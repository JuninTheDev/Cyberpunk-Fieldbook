// A base da campanha (documentos/morana/base-da-campanha.md + campanha-base.js): um registro para cada pessoa, facção,
// lugar, peça, relógio e segredo. No Node: o arquivo é lido sem erro, bate com as fichas de NPC, o mapa e o elenco, as
// citações {{base:...}} e {{doc:...}} dos documentos existem e as cópias antigas saíram. Na wiki do mestre: Pessoas e
// facções, Lugares e peças, o Dossiê e o Resumo da Sessão 01 saem da base e dos documentos; o endereço antigo de Quem é
// quem abre a tabela; os nomes viram links com cartão; o Estado da campanha grava no servidor e aparece nas páginas.
// Usa o servidor local de teste (o mestre) e devolve a mesa como estava.
const { validarBase } = require('../lib/base-estatica');

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  // ---------- Sem navegador ----------
  const base = await validarBase({ raiz, r });

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
