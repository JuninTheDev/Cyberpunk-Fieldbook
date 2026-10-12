// Economia dos anos 2070 (os preços do RED, que valem no Mission Kit) e o resumo do suplemento de fã.
const { abrir, buscarEAbrir, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);
  await abrir(edge, 'economy');

  await r.passo('categorias de preço do RED (Barato 10eb ... Super Luxuoso)', async () => {
    const linhas = await edge.evaluate(`[...document.querySelectorAll('#content table')[0].querySelectorAll('tbody tr')].map(row => row.cells[0].textContent.split(' ')[0] + '=' + row.cells[1].textContent)`);
    return [linhas[0] === 'Barato=10eb' && linhas[4] === 'Caro=500eb' && linhas.length === 8, linhas.join(', ')];
  });
  await edge.shot('economia');

  // O Kibble também está na Humanidade: no Mission Kit, viver de Kibble custa Humanidade todo mês.
  for (const termo of ['kibble', 'megapredio', 'neokitsch', 'hustle']) {
    await r.passo(`busca "${termo}" cai na Economia${termo === 'kibble' ? ' (ou na Humanidade)' : ''}`, async () => {
      const { parou } = await buscarEAbrir(edge, termo, 500);
      return [(parou.pagina === 'economy' || (termo === 'kibble' && parou.pagina === 'humanity')) && parou.marcas > 0, `${parou.pagina} | ${parou.marcas} marcas`];
    });
  }
  await r.passo('suplemento 2077 tem botão para a Economia', async () => {
    await abrir(edge, 'supplement2077');
    await edge.evaluate(`document.querySelector('#content [data-page=economy]').click()`);
    await edge.sleep(200);
    return [(await edge.evaluate('wikiApp.currentPage()')) === 'economy', ''];
  });
  await r.passo('armas do RED: o preço do RED e a nota do Rebuild (sem a coluna "Preço 2077" do suplemento de fã)', async () => {
    await abrir(edge, 'gear');
    const ths = await edge.evaluate(`[...document.querySelectorAll('#content th')].map(th => th.textContent)`);
    const nota = await edge.evaluate(`[...document.querySelectorAll('#content .note-status')].some(p => /Rebuild/.test(p.textContent))`);
    return [ths.includes('Preço') && !ths.includes('Preço 2077') && nota, `nota do Rebuild: ${nota}`];
  });
  await edge.celular(true);
  await r.passo('celular: Economia sem rolagem lateral', async () => { await abrir(edge, 'economy', 300); return [await semRolagemLateral(edge), '']; });
  await edge.celular(false);
};
