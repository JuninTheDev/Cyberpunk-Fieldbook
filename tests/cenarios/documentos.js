// Os documentos da campanha (documentos/): termos no padrão da wiki, acentuação, nomes de perícia, arquivos e links
// citados, e todos aparecendo na wiki do mestre. No navegador: o título não se repete e um link leva à ficha certa.
const { validarDocumentos } = require('../lib/documentos-estaticos');

module.exports = async ({ edge, servidores, r }) => {
  const { citacoes } = await validarDocumentos({ raiz: servidores.raiz, r });

  // ---------- Na wiki ----------
  await r.passo('na wiki: o título do documento não se repete, e o link da tabela abre a ficha de Wakako', async () => {
    await edge.ir(`${servidores.local}/#docQuemEQuem`, 1500);
    const repetidos = await edge.evaluate(`(() => { const t = document.querySelector('#content h2')?.textContent.trim(); return [...document.querySelectorAll('#md-doc h3')].filter(h => h.textContent.trim() === t).length; })()`);
    await edge.evaluate(`document.querySelector('#md-doc a[href="#npcs/wakako-okada"]').click()`);
    await edge.sleep(1200);
    const parou = await edge.evaluate(`({ pagina: wikiApp.currentPage(), foco: (document.querySelector('#content .flash')?.dataset.toc || '') })`);
    return [repetidos === 0 && parou.pagina === 'npcs' && parou.foco === 'Wakako Okada', `títulos repetidos ${repetidos} · ${JSON.stringify(parou)}`];
  });
  await r.passo('na wiki: a busca acha um ### dos documentos como resultado próprio', async () => {
    await edge.ir(`${servidores.local}/#home`, 800);
    await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'comunicador de kobo'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await edge.sleep(400);
    const resultados = await edge.evaluate(`[...document.querySelectorAll('#content .result')].slice(0, 5).map(r => r.querySelector('strong').textContent)`);
    await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    return [resultados.some(titulo => /H-04 · Comunicador de Kobo/.test(titulo)), resultados.join(' | ')];
  });

  // ---------- Entrega dos handouts pela wiki ----------
  await r.passo('na wiki: cada citação de handout tem os botões; Só preparar e Entregar gravam no Publicar, e os jogadores não veem a nota', async () => {
    const url = `${servidores.local}/api/campanhas/morana/publicar`;
    const antes = await (await fetch(url)).json();
    const { atualizado: _data, ...original } = antes;
    try {
      await edge.ir(`${servidores.local}/?recarregar#docHandouts`, 1800);
      const botoes = await edge.evaluate(`document.querySelectorAll('[data-handout] [data-handout-deliver]').length`);
      await edge.evaluate(`document.querySelector('[data-handout="H-04"] [data-handout-prepare]').click()`);
      await edge.sleep(900);
      await edge.evaluate(`document.querySelector('[data-handout="H-05"] [data-handout-deliver]').click()`);
      await edge.sleep(500);
      const pergunta = await edge.evaluate(`(document.querySelector('dialog.popup[open]') || {}).textContent || ''`);
      await edge.evaluate(`document.querySelector('dialog.popup[open]:not(.popup-closing) [data-popup-ok]').click()`);
      await edge.sleep(1200);
      const status = await edge.evaluate(`({ h04: document.querySelector('[data-handout="H-04"] [data-handout-status]').textContent, h05: document.querySelector('[data-handout="H-05"] [data-handout-status]').textContent })`);
      const depois = (await (await fetch(url)).json()).noticias || [];
      const h04 = depois.find(item => /^Handout H-04#1 /.test(item.nota || ''));
      const h05 = depois.find(item => /^Handout H-05#1 /.test(item.nota || ''));
      const visao = await (await fetch(`${servidores.local}/api/visao?campanha=morana`)).json();
      const publicado = (visao.noticias || []).find(item => item.titulo === 'Ordem de recuperação');
      const ok = botoes === citacoes && /ORDEM DE RECUPERAÇÃO/.test(pergunta) && h04 && !h04.publicada && /Forçando a trava/.test(h04.texto) && h05 && h05.publicada
        && publicado && !('nota' in publicado) && !(visao.noticias || []).some(item => item.titulo === 'O comunicador de Kobo') && /Preparado/.test(status.h04) && /Entregue/.test(status.h05);
      return [ok, `${botoes}/${citacoes} botões · H-04 ${h04 ? (h04.publicada ? 'publicado' : 'preparado') : 'ausente'} · H-05 ${h05 ? (h05.publicada ? 'publicado' : 'preparado') : 'ausente'} · para os jogadores: ${publicado ? 'sim, sem nota' : 'não'} · ${JSON.stringify(status)}`];
    } finally {
      // Devolve o Publicar como estava (os outros cenários usam o mesmo servidor).
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mestre: original }) });
    }
  });
};
