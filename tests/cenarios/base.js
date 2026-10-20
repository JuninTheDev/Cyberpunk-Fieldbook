// A base da campanha (documentos/morana/base-da-campanha.md + campanha-base.js): um registro para cada pessoa, facção,
// lugar, peça, relógio e segredo. No Node: o arquivo é lido sem erro, bate com as fichas de NPC, o mapa e o elenco, as
// citações {{base:...}} e {{doc:...}} dos documentos existem e as cópias antigas saíram. Na wiki do mestre: Pessoas e
// facções, Lugares e peças e as notas da Sessão 01 saem da base e do diário; o endereço antigo de Quem é quem abre a
// tabela; os nomes viram links com cartão; o Estado da campanha grava no servidor e aparece nas páginas.
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
  const limpar = () => fetch(mesa, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: { dan: null, 'a-maleta': null }, segredos: {} }) });
  await limpar();
  try {
    await r.passo('Pessoas e facções sai da base: a tabela Quem é quem, os cartões do elenco e das forças, e o aviso de onde editar', async () => {
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length >= ${base.pessoas.length + base.faccoes.length}`);
      const info = await edge.evaluate(`({
        linhas: document.querySelectorAll('#md-doc table')[0]?.querySelectorAll('tbody tr').length || 0,
        cartoes: document.querySelectorAll('#md-doc h4').length,
        endo: [...document.querySelectorAll('#md-doc h4')].some(h => h.textContent.trim() === 'Endo'),
        ficha: !!document.querySelector('#md-doc a[href="#npcs/wakako-okada"]'),
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

    await r.passo('Lugares e peças: a maleta e os lugares; "ver no mapa" abre o mapa já no ponto', async () => {
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length >= ${base.lugares.length + base.pecas.length}`);
      const titulos = await edge.evaluate(`[...document.querySelectorAll('#md-doc h4')].map(h => h.textContent.trim())`);
      await edge.shot('lugares');
      await edge.evaluate(`document.querySelector('#md-doc a[href="#campaignMap/kabuki-depot"]').click()`);
      const ponto = await esperar(`wikiApp.currentPage() === 'campaignMap' && document.querySelector('.map-pin.selected')?.dataset.mapMarker`);
      const ok = ['A maleta', 'Pachinko de Wakako', 'Armazém de Kabuki', 'Consultório do Ricky', 'Arasaka Industrial Docks'].every(nome => titulos.includes(nome)) && ponto === 'kabuki-depot';
      return [ok, `${titulos.length} cartões · ponto ${ponto}`];
    });

    await r.passo('Sessão 01 → O que aconteceu: as notas da sessão, com o modelo tirado do registro da Sessão 1 no diário', async () => {
      await edge.ir(`${local}/?recarregar#sessao01Notas`, 1500);
      const modelo = await esperar(`(() => { const t = document.querySelector('[data-sn-text]'); return t && t.placeholder !== 'Carregando…' ? t.placeholder : null; })()`);
      const aba = await edge.evaluate(`document.querySelector('#content .page-tab[aria-current="page"]')?.textContent`);
      const ok = aba === 'O que aconteceu' && /Quem jogou: Ricky/.test(modelo || '') && /Destino da maleta/.test(modelo || '');
      return [ok, `aba ${aba} · modelo ${(modelo || '').slice(0, 80)}`];
    });

    await r.passo('os nomes viram link nos documentos (uma vez por seção), com o cartão da base ao passar o mouse', async () => {
      await edge.ir(`${local}/?recarregar#docDiario`, 1500);
      await esperar(`document.querySelectorAll('#md-doc a.ent').length > 3`);
      const links = await edge.evaluate(`[...document.querySelectorAll('#md-doc a.ent')].map(a => a.dataset.ent)`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      await edge.shot('cartao-wakako');
      const href = await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').getAttribute('href')`);
      const ok = links.includes('wakako-okada') && links.includes('endo') && links.includes('dan') && href === '#people/wakako-okada' && /Fixer/.test(cartao || '') && /Pachinko/.test(cartao || '');
      return [ok, `${links.length} links (${[...new Set(links)].length} nomes) · cartão: ${(cartao || '').slice(0, 80)}`];
    });

    await r.passo('Estado da campanha: Dan capturado e a maleta com Wakako ficam no servidor e aparecem nas páginas e no cartão', async () => {
      await edge.ir(`${local}/?recarregar#notes`, 1500);
      await esperar(`document.querySelector('[data-bs-id="dan"] [data-bs-campo="situacao"]')`);
      await edge.evaluate(`(() => {
        const campo = (id, nome, valor) => { const c = document.querySelector('[data-bs-id="' + id + '"] [data-bs-campo="' + nome + '"]'); c.value = valor; c.dispatchEvent(new Event('change', { bubbles: true })); };
        campo('dan', 'situacao', 'Capturado');
        campo('dan', 'onde', 'Arasaka Industrial Docks');
        campo('a-maleta', 'onde', 'Com Wakako');
      })()`);
      let salvo = null;
      for (let i = 0; i < 20 && !salvo; i++) { await edge.sleep(300); const dados = await (await fetch(mesa)).json(); if (dados.estado && dados.estado['a-maleta'] && dados.estado.dan && dados.estado.dan.onde) salvo = dados; }
      await edge.shot('estado');
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`/Capturado/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const pessoas = await edge.evaluate(`(() => { const t = document.querySelector('#md-doc table'); const linha = [...t.querySelectorAll('tbody tr')].find(tr => tr.cells[0].textContent.trim() === 'Dan'); return linha ? linha.textContent.replace(/\\s+/g, ' ') : ''; })()`);
      await edge.ir(`${local}/?recarregar#docDiario`, 1500);
      await esperar(`/Com Wakako/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const diario = await edge.evaluate(`/Com Wakako/.test(document.querySelector('#md-doc').textContent)`);
      await esperar(`document.querySelector('#md-doc a.ent[data-ent="dan"]')`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="dan"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      const ok = salvo && salvo.estado.dan.situacao === 'Capturado' && /Arasaka Industrial Docks/.test(pessoas) && /Capturado/.test(pessoas) && diario && /Capturado/.test(cartao || '');
      return [ok, `servidor ${JSON.stringify(salvo && salvo.estado)} · tabela "${pessoas.slice(0, 120)}" · diário ${diario} · cartão ${(cartao || '').slice(0, 60)}`];
    });

    await r.passo('Lugares e peças mostra a maleta com o estado de agora, e a busca acha "Hideo Mori" no cartão de Endo', async () => {
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc table').length > 0`);
      const tabela = await edge.evaluate(`[...document.querySelectorAll('#md-doc table')].map(t => t.textContent).find(t => /A maleta/.test(t) && /Onde está agora/.test(t)) || ''`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'Hideo Mori'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await edge.sleep(600);
      const resultados = await edge.evaluate(`[...document.querySelectorAll('#content .result')].slice(0, 4).map(r => r.dataset.page + ':' + r.querySelector('strong').textContent)`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      return [/Com Wakako/.test(tabela) && resultados.some(item => item === 'people:Endo'), `tabela ${/Com Wakako/.test(tabela)} · ${resultados.join(' | ')}`];
    });
  } finally {
    await limpar();
  }
};
