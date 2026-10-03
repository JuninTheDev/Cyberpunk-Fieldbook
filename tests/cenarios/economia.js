// Economia de 2077, preços do RED convertidos e o resumo do suplemento.
const { abrir, buscarEAbrir, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);
  await abrir(edge, 'economy');

  await r.passo('categorias de preço de 2077 (Barato 20eb ... Super luxo)', async () => {
    const linhas = await edge.evaluate(`[...document.querySelectorAll('#content table')[0].querySelectorAll('tbody tr')].map(row => row.cells[0].textContent.split(' ')[0] + '=' + row.cells[1].textContent)`);
    return [linhas[0] === 'Barato=20eb' && linhas.length === 8, linhas.join(', ')];
  });
  await edge.shot('economia');

  for (const termo of ['kibble', 'megapredio', 'neokitsch', 'hustle']) {
    await r.passo(`busca "${termo}" cai na Economia`, async () => {
      const { parou } = await buscarEAbrir(edge, termo, 500);
      return [parou.pagina === 'economy' && parou.marcas > 0, `${parou.pagina} | ${parou.marcas} marcas`];
    });
  }
  await r.passo('suplemento 2077 tem botão para a Economia', async () => {
    await abrir(edge, 'supplement2077');
    await edge.evaluate(`document.querySelector('#content [data-page=economy]').click()`);
    await edge.sleep(200);
    return [(await edge.evaluate('wikiApp.currentPage()')) === 'economy', ''];
  });
  await r.passo('armas do RED têm a coluna "Preço 2077"', async () => {
    await abrir(edge, 'gear');
    const tem = await edge.evaluate(`[...document.querySelectorAll('#content th')].some(th => th.textContent === 'Preço 2077')`);
    return [tem, ''];
  });
  await edge.celular(true);
  await r.passo('celular: Economia sem rolagem lateral', async () => { await abrir(edge, 'economy', 300); return [await semRolagemLateral(edge), '']; });
  await edge.celular(false);
};
