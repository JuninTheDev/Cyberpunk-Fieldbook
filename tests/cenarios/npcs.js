// Fichas de NPC (só do mestre).
const { abrir, buscar, tecla, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);
  await abrir(edge, 'npcs', 400);

  await r.passo('10 fichas do livro e 12 facções', async () => {
    const n = await edge.evaluate(`({ npc: document.querySelectorAll('#content .entry.npc').length, faccoes: document.querySelectorAll('#content .entry:not(.npc)').length })`);
    return [n.npc === 10 && n.faccoes === 12, JSON.stringify(n)];
  });
  await r.passo('Oficial de segurança mostra REF com e sem armadura', async () => {
    const stats = await edge.evaluate(`[...[...document.querySelectorAll('#content .entry.npc')].find(c => c.dataset.toc === 'Oficial de segurança').querySelectorAll('.npc-stats span')].map(s => s.textContent).join(' ')`);
    return [stats.includes('REF8 (6)'), stats];
  });
  await edge.shot('fichas');
  await r.passo('busca "Pain Editor" abre as perícias do Cyberpsycho', async () => {
    await buscar(edge, 'Pain Editor');
    await edge.evaluate(`[...document.querySelectorAll('#content .result')].find(res => res.dataset.page === 'npcs').click()`);
    await edge.sleep(1000);
    const estado = await edge.evaluate(`(() => { const m = document.querySelector('#content mark'); return { cartao: m?.closest('.entry')?.dataset.toc, aberto: document.querySelectorAll('#content details.npc-more[open]').length }; })()`);
    return [estado.cartao === 'Cyberpsycho' && estado.aberto === 1, JSON.stringify(estado)];
  });
  await tecla(edge, 'Escape');

  await edge.celular(true);
  await r.passo('celular: fichas sem rolagem lateral', async () => { await abrir(edge, 'npcs', 400); return [await semRolagemLateral(edge), '']; });
  await edge.celular(false);

  if (!servidores.rede) return;
  await r.passo('jogador pela rede: Fichas de NPC não aparece e o arquivo é bloqueado', async () => {
    await edge.ir(`${servidores.rede}/`);
    await edge.evaluate(`document.querySelector('#tab-system').click()`);
    const temPagina = await edge.evaluate(`[...document.querySelectorAll('.nav-item')].some(b => b.dataset.page === 'npcs')`);
    const status = (await fetch(`${servidores.rede}/mestre-npcs.js`)).status;
    return [!temPagina && status === 403, `página no menu: ${temPagina} | arquivo: HTTP ${status}`];
  });
};
