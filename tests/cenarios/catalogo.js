// Tabela comparável (Armas e Cyberware de 2077) e Índice A–Z.
const { abrir, buscar, tecla, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);
  const linhas = () => edge.evaluate(`[...document.querySelectorAll('.compare-table tbody tr')].map(tr => [...tr.cells].map(td => td.textContent))`);
  const verComo = vista => edge.evaluate(`document.querySelector('.view-switch [data-view="${vista}"]').click()`);
  const filtrar = (rotulo, valor) => edge.evaluate(`(() => { const s = document.querySelector('[data-filter="${rotulo}"]'); s.value = ${JSON.stringify(valor)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const ordenar = coluna => edge.evaluate(`[...document.querySelectorAll('.compare-table [data-sort]')].find(b => b.textContent === ${JSON.stringify(coluna)}).click()`);

  await abrir(edge, 'weapons2077');
  await r.passo('Armas de 2077: vista de tabela com as 46 armas', async () => {
    await verComo('table');
    const l = await linhas();
    const cartoesVisiveis = await edge.evaluate(`[...document.querySelectorAll('#content .entry')].filter(e => e.offsetParent).length`);
    return [l.length === 46 && cartoesVisiveis === 0, `${l.length} linhas, ${cartoesVisiveis} cartões visíveis`];
  });
  await r.passo('ordenar por dano põe a de 6d6 no topo, depois as de 5d6', async () => {
    await ordenar('Dano');
    const l = await linhas();
    return [l[0][6].startsWith('6d6') && l[1][6].startsWith('5d6'), l.slice(0, 3).map(x => `${x[0]} ${x[6]}`).join(' | ')];
  });
  await r.passo('ordenar por preço (maior primeiro)', async () => {
    await ordenar('Preço');
    const l = await linhas();
    return [/5\.000eb/.test(l[0][11]), l.slice(0, 2).map(x => `${x[0]} ${x[11]}`).join(' | ')];
  });
  await r.passo('filtro Classe = Smart dá 9 armas', async () => {
    await filtrar('Classe', 'Smart');
    const l = await linhas();
    const contagem = await edge.evaluate(`document.querySelector('.compare-count').textContent`);
    return [l.length === 9 && l.every(x => x[3] === 'Smart'), `${l.length} | ${contagem}`];
  });
  await r.passo('filtro Origem = Mission Kit dá as 13 armas do Kit', async () => {
    await filtrar('Classe', '');
    await filtrar('Origem', 'Mission Kit');
    const l = await linhas();
    await filtrar('Origem', '');
    return [l.length === 13 && l.every(x => x[1] === 'Mission Kit'), `${l.length} | ${l.map(x => x[0].split(' ').pop()).join(', ')}`];
  });
  await edge.shot('tabela-armas');
  await r.passo('a vista fica salva ao voltar à página', async () => {
    await abrir(edge, 'combat');
    await abrir(edge, 'weapons2077', 400);
    const tabela = await edge.evaluate(`!document.querySelector('.compare-panel').hidden`);
    return [tabela, ''];
  });
  await r.passo('clicar numa linha abre o cartão', async () => {
    await edge.evaluate(`[...document.querySelectorAll('.compare-table tbody tr')].find(tr => tr.cells[0].textContent === 'Arasaka HJKE-11 Yukimura').click()`);
    await edge.sleep(900);
    const parou = await ondeParou(edge);
    const hash = await edge.evaluate('decodeURIComponent(location.hash)');
    return [parou.foco === 'Arasaka HJKE-11 Yukimura' && hash === '#weapons2077/arasaka-hjke-11-yukimura', `foco "${parou.foco}" | ${hash}`];
  });
  await r.passo('com a tabela salva, a busca abre o cartão visível', async () => {
    await verComo('table');
    await buscar(edge, 'Tsunami Kappa');
    await tecla(edge, 'Enter');
    await edge.sleep(900);
    const visivel = await edge.evaluate(`!![...document.querySelectorAll('#content .entry')].find(e => e.dataset.toc === 'Tsunami Kappa')?.offsetParent`);
    return [visivel, ''];
  });
  await r.passo('a tabela não vira seção da barra "Nesta página"', async () => {
    const chips = await edge.evaluate(`[...document.querySelectorAll('.page-toc [data-toc-index]')].map(b => b.textContent)`);
    return [!chips.includes('Comparar') && !chips.includes('Tabela') && chips.includes('Pistolas'), chips.slice(0, 6).join(', ')];
  });
  await verComo('cards');

  await abrir(edge, 'cyberware2077');
  await r.passo('Cyberware de 2077: tabela com 48 implantes, Humanidade do maior para o menor', async () => {
    await verComo('table');
    await ordenar('Humanidade');
    const l = await linhas();
    return [l.length === 48 && l[0][4].startsWith('14'), `${l.length} | ${l[0][0]} ${l[0][4]}`];
  });
  await r.passo('filtro de instalação no hospital', async () => {
    await filtrar('Instalação', 'Hospital');
    const l = await linhas();
    return [l.length > 0 && l.every(x => x[3] === 'Hospital'), `${l.length} implantes`];
  });
  await verComo('cards');

  await r.passo('Índice A–Z lista cartões e fichas', async () => {
    await abrir(edge, 'indice', 400);
    const itens = await edge.evaluate(`[...document.querySelectorAll('.index-item strong')].map(s => s.textContent)`);
    return [itens.length > 200 && itens.includes('Arasaka HJKE-11 Yukimura') && itens.includes('Guarda-costas'), `${itens.length} itens`];
  });
  await r.passo('filtro do índice ("yukimura")', async () => {
    const visiveis = await edge.evaluate(`(() => { const f = document.getElementById('index-filter'); f.value = 'yukimura'; f.dispatchEvent(new Event('input')); return [...document.querySelectorAll('.index-item')].filter(i => i.offsetParent).map(i => i.querySelector('strong').textContent); })()`);
    return [visiveis.length === 1, visiveis.join(', ')];
  });
  await edge.shot('indice');
  await r.passo('clicar no item abre o cartão', async () => {
    await edge.evaluate(`[...document.querySelectorAll('.index-item')].find(i => i.offsetParent).click()`);
    await edge.sleep(900);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'weapons2077' && parou.foco === 'Arasaka HJKE-11 Yukimura', `${parou.pagina} | foco "${parou.foco}"`];
  });

  if (!servidores.rede) return;
  await r.passo('visão dos jogadores: índice sem as fichas de NPC do mestre', async () => {
    await edge.ir(`${servidores.rede}/#indice`, 2500);
    const itens = await edge.evaluate(`[...document.querySelectorAll('.index-item strong')].map(s => s.textContent)`);
    return [itens.includes('Arasaka HJKE-11 Yukimura') && !itens.includes('Guarda-costas'), `${itens.length} itens`];
  });
};
