// Endereço por página: #página/seção abre direto na seção, o Voltar do navegador funciona e recarregar mantém.
const { abrir, buscarEAbrir, clicarChip, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const estado = () => edge.evaluate(`({ pagina: wikiApp.currentPage(), hash: decodeURIComponent(location.hash) })`);

  await r.passo('link direto #combat/fogo-supressivo abre na seção', async () => {
    await edge.ir(`${servidores.local}/#combat/fogo-supressivo`, 1500);
    const parou = await ondeParou(edge);
    const topo = await edge.evaluate(`Math.round([...document.querySelectorAll('#content .section')].find(s => s.dataset.toc === 'Fogo supressivo').getBoundingClientRect().top)`);
    return [parou.pagina === 'combat' && parou.foco === 'Fogo supressivo' && topo > 0 && topo < 260, `${parou.pagina} | foco "${parou.foco}" | topo ${topo}`];
  });
  await r.passo('trocar de página põe a página no endereço', async () => {
    await edge.evaluate(`document.querySelector('.nav-item[data-page="damage"]').click()`);
    await edge.sleep(300);
    const e = await estado();
    return [e.pagina === 'damage' && e.hash === '#damage', JSON.stringify(e)];
  });
  await r.passo('Voltar do navegador volta para Combate, na seção', async () => {
    await edge.evaluate(`history.back()`);
    await edge.sleep(900);
    const e = await estado();
    const parou = await ondeParou(edge);
    return [e.pagina === 'combat' && e.hash === '#combat/fogo-supressivo' && parou.foco === 'Fogo supressivo', `${JSON.stringify(e)} | foco "${parou.foco}"`];
  });
  await r.passo('Avançar volta para Dano', async () => {
    await edge.evaluate(`history.forward()`);
    await edge.sleep(700);
    const e = await estado();
    return [e.pagina === 'damage', JSON.stringify(e)];
  });
  await r.passo('chip da barra "Nesta página" põe a seção no endereço sem empilhar', async () => {
    const antes = await edge.evaluate('history.length');
    const c = await clicarChip(edge, 'Death Save');
    const e = await estado();
    const depois = await edge.evaluate('history.length');
    return [c.ativo === 'Death Save' && e.hash === '#damage/death-save' && depois === antes, `${JSON.stringify(e)} | histórico ${antes}→${depois}`];
  });
  await r.passo('recarregar mantém a página e a seção', async () => {
    await edge.send('Page.reload');
    await edge.sleep(2500);
    const e = await estado();
    const parou = await ondeParou(edge);
    return [e.pagina === 'damage' && parou.foco === 'Death Save', `${JSON.stringify(e)} | foco "${parou.foco}"`];
  });
  await r.passo('link direto para um cartão (#weapons2077/arasaka-hjke-11-yukimura)', async () => {
    await edge.ir(`${servidores.local}/#weapons2077/arasaka-hjke-11-yukimura`, 1500);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'weapons2077' && parou.foco === 'Arasaka HJKE-11 Yukimura', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('resultado de busca põe a seção no endereço', async () => {
    await buscarEAbrir(edge, 'hellhound', 700);
    const e = await estado();
    return [e.hash === '#netArsenal/hellhound', JSON.stringify(e)];
  });
  await r.passo('documento .md: #docHandouts/h-04-comunicador-de-kobo abre no título', async () => {
    await edge.ir(`${servidores.local}/#docHandouts/h-04-comunicador-de-kobo`, 2000);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'docHandouts' && parou.foco === 'H-04 · Comunicador de Kobo', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('endereço inválido abre a página inicial', async () => {
    await edge.ir(`${servidores.local}/#pagina-que-nao-existe`, 800);
    const e = await estado();
    return [e.pagina === 'home' && e.hash === '#home', JSON.stringify(e)];
  });
  await r.passo('aba Campanhas a partir de uma regra vai para a página inicial', async () => {
    await abrir(edge, 'combat');
    await edge.evaluate(`document.querySelector('#tab-campaigns').click()`);
    await edge.sleep(300);
    const e = await estado();
    return [e.pagina === 'home' && e.hash === '#home', JSON.stringify(e)];
  });

  if (!servidores.rede) return;
  await r.passo('visão dos jogadores: link direto para regra (#combat/cobertura)', async () => {
    await edge.ir(`${servidores.rede}/#combat/cobertura`, 2500);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'combat' && parou.foco === 'Cobertura', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('visão dos jogadores: #pvPeople continua lá depois que os dados chegam', async () => {
    await edge.ir(`${servidores.rede}/#pvPeople`, 2500);
    const e = await estado();
    const lede = await edge.evaluate(`document.querySelector('#content .lede').textContent`);
    return [e.pagina === 'pvPeople' && !/Carregando/.test(lede), `${JSON.stringify(e)} | ${lede.slice(0, 60)}`];
  });
};
