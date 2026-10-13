// Black Chrome: as páginas do catálogo (menu, cartões, vista de tabela), a busca e a visão dos jogadores.
const { abrir, buscarEAbrir, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  const linhas = () => edge.evaluate(`[...document.querySelectorAll('.compare-table tbody tr')].map(tr => [...tr.cells].map(td => td.textContent))`);
  const verComo = vista => edge.evaluate(`document.querySelector('.view-switch [data-view="${vista}"]').click()`);
  const filtrar = (rotulo, valor) => edge.evaluate(`(() => { const s = document.querySelector('[data-filter="${rotulo}"]'); s.value = ${JSON.stringify(valor)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const cartoes = () => edge.evaluate(`document.querySelectorAll('#content .entry').length`);

  await r.passo('menu: o grupo Black Chrome tem as 8 páginas', async () => {
    const ids = await edge.evaluate(`[...document.querySelectorAll('#navigation .nav-item')].map(b => b.dataset.page).filter(id => id.startsWith('bc'))`);
    return [ids.length === 8, ids.join(', ')];
  });
  // Um cartão por item dos compêndios do Foundry: 8 explosivos, 12 armas brancas, 3 de arremesso, 29 armas de fogo, 5 munições
  // e 9 do Black Chrome Plus; 22 cyberware e 16 cyberdedos; 17 de moda e armadura (+1 do Plus); 5 apps, 20 equipamentos (+3 do Plus);
  // 4 quadros e 3 lubrificantes; 31 veículos.
  const contagens = { bcArmas: 8 + 12 + 3 + 29 + 5 + 9, bcCyberware: 22 + 16, bcModa: 17 + 1, bcEquipamento: 5 + 20 + 3, bcQuadros: 7, bcVeiculos: 31 };
  for (const [pagina, esperado] of Object.entries(contagens)) {
    await r.passo(`${pagina}: ${esperado} cartões`, async () => {
      await abrir(edge, pagina, 400);
      const n = await cartoes();
      return [n === esperado, `${n} cartões`];
    });
  }
  await r.passo('Armas: tabela com as armas (sem explosivos e munição) e filtro de qualidade', async () => {
    await abrir(edge, 'bcArmas', 400);
    await verComo('table');
    const todas = await linhas();
    await edge.shot('blackchrome-tabela');
    await filtrar('Qualidade', 'excelente');
    const excelentes = await linhas();
    await filtrar('Qualidade', '');
    await verComo('cards');
    return [todas.length === 12 + 3 + 29 + 6 && excelentes.every(l => l[2] === 'excelente') && excelentes.length >= 5, `${todas.length} armas, ${excelentes.length} excelentes`];
  });
  await r.passo('Veículos: tabela ordena pelo Acesso Nômade e o Street King e o MegaHauler têm 10', async () => {
    await abrir(edge, 'bcVeiculos', 400);
    await verComo('table');
    await filtrar('Acesso Nômade', '10');
    const dez = (await linhas()).map(l => l[0]);
    await filtrar('Acesso Nômade', '');
    await verComo('cards');
    return [dez.includes('Street King Combat Vehicle') && dez.includes('TetraCorp America MegaHauler'), dez.join(', ')];
  });
  await r.passo('Como usar: palavras-chave e Acesso Nômade', async () => {
    await abrir(edge, 'bcGuia', 400);
    await edge.shot('blackchrome-guia');
    const texto = await edge.evaluate(`document.querySelector('#content').textContent`);
    return [/Combinação/.test(texto) && /Acesso Nômade/.test(texto) && /Moto/.test(texto) && /CBK/.test(texto), texto.slice(0, 80)];
  });
  await r.passo('Mercados: sortear itens do Black Chrome de Cyberware dá de 1 a 6 itens, com link para o cartão (a MechaMan Smart Glove é cyberware no mercado, mas o cartão está em Moda)', async () => {
    await abrir(edge, 'bcMercados', 400);
    await edge.evaluate(`document.querySelector('[data-bc-mercado="4"]').click()`);
    await edge.sleep(200);
    const links = await edge.evaluate(`[...document.querySelectorAll('#content .roll-result a')].map(a => a.getAttribute('href'))`);
    await edge.evaluate(`document.querySelector('#content .roll-result').scrollIntoView({ block: 'center' })`);
    await edge.shot('blackchrome-mercado');
    return [links.length >= 1 && links.length <= 6 && links.every(href => /^#bc(Cyberware|Moda)\//.test(href)), links.join(' ')];
  });
  await r.passo('Mercados: o link do sorteio abre o cartão do item', async () => {
    const alvo = await edge.evaluate(`document.querySelector('#content .roll-result a').textContent`);
    await edge.evaluate(`document.querySelector('#content .roll-result a').click()`);
    await edge.sleep(900);
    const foco = await edge.evaluate(`(document.querySelector('#content .flash') || {}).dataset?.toc || ''`);
    return [foco === alvo, `${alvo} → ${foco}`];
  });
  await r.passo('Mercados: Rex Royale com a ficha e as outras lojas', async () => {
    await abrir(edge, 'bcMercados', 400);
    const texto = await edge.evaluate(`document.querySelector('#content').textContent`);
    return [/Rex Royale/.test(texto) && /Operator 8/.test(texto) && /Oasis/.test(texto) && /Great River/.test(texto), texto.slice(0, 80)];
  });
  for (const [consulta, pagina] of [['weeping reaver', 'bcArmas'], ['acesso nomade', 'bcGuia'], ['cyberdedo laser', 'bcCyberware'], ['doberman 500', 'bcEquipamento']]) {
    await r.passo(`busca "${consulta}" cai em ${pagina}`, async () => {
      const { parou, resultados } = await buscarEAbrir(edge, consulta, 600);
      return [parou.pagina === pagina, `${parou.pagina} · ${parou.foco} · ${resultados.slice(0, 3).map(x => x.titulo).join(' | ')}`];
    });
  }
  await r.passo('celular: Armas do Black Chrome sem rolagem lateral', async () => {
    await edge.celular(true);
    await abrir(edge, 'bcArmas', 500);
    const ok = await semRolagemLateral(edge);
    await edge.celular(false);
    return [ok, ''];
  });
  await r.passo('visão dos jogadores: as páginas do Black Chrome abrem', async () => {
    await edge.ir(`${servidores.local}/jogadores.html`, 1200);
    await abrir(edge, 'bcVeiculos', 400);
    const n = await cartoes();
    return [n === 31, `${n} cartões`];
  });
};
