// Busca: palavras em qualquer ordem, sinônimos, plural, filtro, "mostrar mais" e setas.
const { buscar, tecla, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  const titulos = resultados => resultados.map(res => res.titulo);

  await r.passo('"pistola smart" acha a Yukimura entre os primeiros', async () => {
    const res = titulos(await buscar(edge, 'pistola smart'));
    return [res.slice(0, 5).includes('Arasaka HJKE-11 Yukimura'), res.slice(0, 5).join(' | ')];
  });
  await r.passo('a ordem das palavras não importa ("smart pistola")', async () => {
    const res = titulos(await buscar(edge, 'smart pistola'));
    return [res.slice(0, 5).includes('Arasaka HJKE-11 Yukimura'), res.slice(0, 5).join(' | ')];
  });
  await r.passo('nome exato vem primeiro ("Kerenzikov")', async () => {
    const res = await buscar(edge, 'Kerenzikov');
    return [/Kerenzikov/.test(res[0]?.titulo || ''), res.slice(0, 3).map(x => x.titulo).join(' | ')];
  });
  await r.passo('sinônimo: "rof" acha textos com CDT', async () => {
    await buscar(edge, 'rof');
    const marcas = await edge.evaluate(`[...document.querySelectorAll('#content .result mark')].map(m => m.textContent.toUpperCase())`);
    return [marcas.includes('CDT'), `${marcas.length} marcas, ex.: ${[...new Set(marcas)].slice(0, 5).join(', ')}`];
  });
  await r.passo('sinônimo: "hp" acha PV', async () => {
    await buscar(edge, 'hp');
    const marcas = await edge.evaluate(`[...document.querySelectorAll('#content .result mark')].map(m => m.textContent.toUpperCase())`);
    return [marcas.includes('PV'), [...new Set(marcas)].slice(0, 5).join(', ')];
  });
  await r.passo('palavra curta não casa no meio de outra ("sp" não acha "espingarda")', async () => {
    await buscar(edge, 'sp');
    const marcas = await edge.evaluate(`[...document.querySelectorAll('#content .result mark')].map(m => m.parentElement.textContent.slice(Math.max(0, m.parentElement.textContent.indexOf(m.textContent) - 3), m.parentElement.textContent.indexOf(m.textContent) + 5))`);
    const ruins = marcas.filter(trecho => /[a-zà-ú]sp/i.test(trecho));
    return [marcas.length > 0 && !ruins.length, ruins.slice(0, 3).join(' | ') || `${marcas.length} marcas, todas no começo de palavra`];
  });
  await r.passo('plural: "lesoes criticas" acha "lesão crítica"', async () => {
    const res = await buscar(edge, 'lesoes criticas');
    return [res.length > 0, `${res.length} resultados`];
  });
  await r.passo('filtro Regras / Campanha', async () => {
    await buscar(edge, 'Sandevistan');
    const contagens = await edge.evaluate(`Object.fromEntries([...document.querySelectorAll('[data-search-filter]')].map(b => [b.dataset.searchFilter, Number(b.querySelector('span').textContent)]))`);
    await edge.evaluate(`document.querySelector('[data-search-filter="system"]').click()`);
    await edge.sleep(200);
    const paginas = await edge.evaluate(`[...document.querySelectorAll('#content .result')].map(b => b.dataset.page)`);
    const soRegras = paginas.every(id => !/^(home|campaign|people|session|doc|notes|campaignMap|playerView)/.test(id));
    await edge.evaluate(`document.querySelector('[data-search-filter="all"]').click()`);
    return [contagens.all === contagens.system + contagens.campaigns && contagens.system > 0 && contagens.campaigns > 0 && soRegras, `${JSON.stringify(contagens)} | só regras: ${soRegras}`];
  });
  await r.passo('"mostrar mais" passa de 60 resultados', async () => {
    await buscar(edge, 'arma');
    const antes = await edge.evaluate(`document.querySelectorAll('#content .result').length`);
    await edge.evaluate(`document.querySelector('[data-search-more]').click()`);
    await edge.sleep(200);
    const depois = await edge.evaluate(`document.querySelectorAll('#content .result').length`);
    return [antes === 60 && depois > 60, `${antes} → ${depois}`];
  });
  await r.passo('setas escolhem o resultado e Enter abre o escolhido', async () => {
    const res = await buscar(edge, 'hellhound');
    await tecla(edge, 'ArrowDown');
    await tecla(edge, 'ArrowDown');
    await tecla(edge, 'ArrowUp');
    const escolhido = await edge.evaluate(`[...document.querySelectorAll('#content .result')].findIndex(b => b.classList.contains('selected'))`);
    await tecla(edge, 'Enter');
    await edge.sleep(900);
    const parou = await ondeParou(edge);
    return [escolhido === 1 && parou.pagina === res[1].pagina, `escolhido ${escolhido} (${res[1].origem} › ${res[1].titulo}) → ${parou.pagina}`];
  });
  await r.passo('a página aberta destaca todas as palavras da busca', async () => {
    await buscar(edge, 'pistola smart');
    await tecla(edge, 'Enter');
    await edge.sleep(900);
    const marcas = await edge.evaluate(`[...document.querySelectorAll('#content .flash mark, #content .flash ~ * mark')].map(m => m.textContent.toLowerCase())`);
    return [marcas.some(m => m.startsWith('pistola')) && marcas.some(m => m === 'smart'), [...new Set(marcas)].join(', ')];
  });
  await edge.shot('resultados');
};
