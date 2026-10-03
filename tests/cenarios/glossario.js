// Glossário: página com filtro, links automáticos nas outras páginas e o caminho de ida e volta.
const { abrir, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  const links = secao => edge.evaluate(`[...[...document.querySelectorAll('#content .section')].find(s => s.dataset.toc === ${JSON.stringify(secao)}).querySelectorAll('a.gloss')].map(a => a.textContent + '→' + a.getAttribute('href'))`);

  await r.passo('página Glossário no menu "Na mesa", com todos os termos', async () => {
    await edge.evaluate(`document.querySelector('#tab-system').click()`);
    const temNoMenu = await edge.evaluate(`!!document.querySelector('.nav-item[data-page="glossary"]')`);
    await abrir(edge, 'glossary');
    const n = await edge.evaluate(`document.querySelectorAll('#content .glossary-entry').length`);
    return [temNoMenu && n >= 70, `${n} termos`];
  });
  await r.passo('filtro do glossário acha pelo nome em inglês ("stopping" → SP)', async () => {
    const nomes = await edge.evaluate(`(() => { const f = document.getElementById('glossary-filter'); f.value = 'stopping'; f.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#content .glossary-entry')].filter(e => e.offsetParent).map(e => e.dataset.toc); })()`);
    return [nomes.length === 1 && nomes[0] === 'SP', nomes.join(', ')];
  });
  await edge.shot('pagina');

  await abrir(edge, 'combat');
  await r.passo('Combate › Autofogo liga "lesão crítica" ao glossário', async () => {
    const l = await links('Autofogo');
    return [l.some(x => x.toLowerCase().startsWith('lesão crítica→#glossary/lesao-critica')), l.join(' | ')];
  });
  await r.passo('um termo não vira link dentro da própria regra (Autofogo em Autofogo)', async () => {
    const l = await links('Autofogo');
    return [!l.some(x => x.toLowerCase().startsWith('autofogo→')), l.join(' | ')];
  });
  await r.passo('"DV13" vira link de DV', async () => {
    const l = await links('Espingarda com cartucho');
    return [l.some(x => x === 'DV→#glossary/dv'), l.join(' | ')];
  });
  await r.passo('o verbo "move" não vira link de MOVE', async () => {
    const minusculos = await edge.evaluate(`[...document.querySelectorAll('#content a.gloss')].filter(a => a.textContent === 'move').length`);
    return [minusculos === 0, `${minusculos} links`];
  });
  await r.passo('títulos e botões nunca recebem link', async () => {
    const n = await edge.evaluate(`document.querySelectorAll('#content h2 a.gloss, #content h3 a.gloss, #content h4 a.gloss, #content button a.gloss, #content .page-toc a.gloss').length`);
    return [n === 0, `${n}`];
  });
  await r.passo('o link mostra a definição ao passar o mouse', async () => {
    const titulo = await edge.evaluate(`document.querySelector('#content a.gloss').title`);
    return [/: /.test(titulo) && titulo.length > 20, titulo.slice(0, 90)];
  });
  await edge.shot('combate');
  await r.passo('clicar no termo abre o glossário nele; Voltar volta ao Combate', async () => {
    await edge.evaluate(`[...document.querySelectorAll('#content a.gloss')].find(a => a.getAttribute('href') === '#glossary/lesao-critica').click()`);
    await edge.sleep(800);
    const parou = await ondeParou(edge);
    await edge.evaluate('history.back()');
    await edge.sleep(800);
    const voltou = await edge.evaluate('wikiApp.currentPage()');
    return [parou.pagina === 'glossary' && parou.foco === 'Lesão crítica' && voltou === 'combat', `${parou.pagina} | foco "${parou.foco}" | voltou para ${voltou}`];
  });
  await r.passo('"Ver a regra" abre a seção da regra', async () => {
    await edge.ir(`${servidores.local}/#glossary/lesao-critica`, 1200);
    await edge.evaluate(`[...document.querySelectorAll('#content .glossary-entry')].find(e => e.dataset.toc === 'Lesão crítica').querySelector('button[data-section]').click()`);
    await edge.sleep(800);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'damage' && parou.foco === 'Lesões críticas', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('cartão de cyberware: "Ver a regra" de Neural Link acha "Neuralware / 12 entradas"', async () => {
    await edge.ir(`${servidores.local}/#glossary/neural-link`, 1200);
    await edge.evaluate(`[...document.querySelectorAll('#content .glossary-entry')].find(e => e.dataset.toc === 'Neural Link').querySelector('button[data-section]').click()`);
    await edge.sleep(800);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'cyberware' && parou.foco.startsWith('Neuralware'), `${parou.pagina} | foco "${parou.foco}"`];
  });

  if (!servidores.rede) return;
  await r.passo('visão dos jogadores: glossário e links funcionam', async () => {
    await edge.ir(`${servidores.rede}/#combat/autofogo`, 2500);
    const n = await edge.evaluate(`document.querySelectorAll('#content a.gloss').length`);
    const arquivo = (await fetch(`${servidores.rede}/system-glossario.js`)).status;
    return [n > 0 && arquivo === 200, `${n} links | arquivo HTTP ${arquivo}`];
  });
};
