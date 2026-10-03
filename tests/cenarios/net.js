// Netrunning: arsenal do RED, 2077, quickhacks, Berserk e Sandevistan.
const { abrir, buscarEAbrir, semRolagemLateral, clicarChip } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);

  const minimos = { netArsenal: 56, net2077: 12, quickhacks: 21, os2077: 8 };
  for (const [pagina, minimo] of Object.entries(minimos)) {
    await r.passo(`${pagina}: pelo menos ${minimo} cartões`, async () => {
      await abrir(edge, pagina, 200);
      const n = await edge.evaluate(`document.querySelectorAll('#content .entry').length`);
      return [n >= minimo, `${n} cartões`];
    });
  }

  const buscaCai = (consulta, pagina, foco) => r.passo(`busca "${consulta}" abre o cartão certo`, async () => {
    const { parou } = await buscarEAbrir(edge, consulta, 700);
    return [parou.pagina === pagina && parou.foco.includes(foco) && parou.marcaVisivel, `${parou.pagina} | foco "${parou.foco}"`];
  });
  await buscaCai('hellhound', 'netArsenal', 'Hellhound');
  await buscaCai('icepick', 'quickhacks', 'ICEpick');
  await buscaCai('kami chip', 'net2077', 'Kami Chip');
  await buscaCai('falcon', 'os2077', 'Militech Falcon Sandevistan');
  await buscaCai('gosma', 'netArsenal', 'Gosma');

  await r.passo('quickhacks: chip "Quickhacks definitivos" leva à seção e fica ativo', async () => {
    await abrir(edge, 'quickhacks');
    const c = await clicarChip(edge, 'Quickhacks definitivos');
    return [c.ativo === 'Quickhacks definitivos' && c.topo >= c.barra - 2 && c.topo <= c.barra + 40, JSON.stringify(c)];
  });
  await edge.shot('quickhacks');

  await edge.celular(true);
  for (const pagina of Object.keys(minimos)) {
    await r.passo(`celular: ${pagina} sem rolagem lateral`, async () => { await abrir(edge, pagina, 250); return [await semRolagemLateral(edge), '']; });
  }
  await edge.celular(false);
};
