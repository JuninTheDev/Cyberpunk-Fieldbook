// Página inicial do mestre: "Na mesa agora" com atalhos, recentes e relógios.
const { abrir, clicarChip, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  const bloco = () => edge.evaluate(`document.querySelector('#content .home-desk')?.textContent.replace(/\\s+/g, ' ') || ''`);

  await r.passo('início mostra "Na mesa agora" com os atalhos', async () => {
    const texto = await bloco();
    return [/Na mesa agora/i.test(texto) && /Escudo do mestre/.test(texto) && /As páginas que você abrir aparecem aqui/.test(texto), texto.slice(0, 120)];
  });
  await r.passo('o bloco não vira seção da barra "Nesta página" nem entra na busca', async () => {
    const chips = await edge.evaluate(`[...document.querySelectorAll('.page-toc [data-toc-index]')].map(b => b.textContent)`);
    return [!chips.includes('Na mesa agora'), chips.join(', ')];
  });
  await r.passo('recentes: as últimas páginas, com a seção', async () => {
    await abrir(edge, 'combat');
    await clicarChip(edge, 'Cobertura');
    await abrir(edge, 'damage');
    await abrir(edge, 'home');
    const itens = await edge.evaluate(`[...document.querySelectorAll('.desk-recent li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim())`);
    return [itens[0] === 'Dano, ferimentos e cura' && itens[1] === 'Combate › Cobertura', itens.slice(0, 3).join(' | ')];
  });
  await r.passo('clicar num recente volta à seção', async () => {
    await edge.evaluate(`[...document.querySelectorAll('.desk-recent a')].find(a => a.textContent === 'Combate').click()`);
    await edge.sleep(900);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'combat' && parou.foco === 'Cobertura', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('relógios mostram o segmento marcado e o próximo', async () => {
    await edge.evaluate(`localStorage.setItem('night-city-clock-sato-morana', '2')`);
    await abrir(edge, 'home');
    const texto = await bloco();
    return [/Relógio de Sato: 2\/6/.test(texto) && /Último marcado: Garantir o Gatilho/.test(texto) && /próximo: Garantir a Coleira/.test(texto) && /Relógio da cidade: 0\/8/.test(texto), texto.slice(texto.indexOf('Relógios'), texto.indexOf('Relógios') + 200)];
  });
  await edge.shot('inicio');
  await r.passo('atalho abre a página', async () => {
    await edge.evaluate(`[...document.querySelectorAll('.desk-buttons .action')].find(b => b.textContent === 'Glossário').click()`);
    await edge.sleep(300);
    return [(await edge.evaluate('wikiApp.currentPage()')) === 'glossary', ''];
  });
};
