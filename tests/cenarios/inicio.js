// Página inicial do mestre: o painel da mesa, com os quadros, os relógios, os recentes e os atalhos.
const { abrir, clicarChip, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  const bloco = () => edge.evaluate(`document.querySelector('#content .home-desk')?.textContent.replace(/\\s+/g, ' ') || ''`);

  await r.passo('início mostra os quadros (próxima sessão, mesa, Caixa) e os atalhos', async () => {
    const texto = await bloco();
    return [/Próxima sessão/.test(texto) && /Caixa do NetWire/.test(texto) && /Atalhos/.test(texto) && /Escudo do mestre/.test(texto) && /As páginas que você abrir aparecem aqui/.test(texto), texto.slice(0, 120)];
  });
  await r.passo('o bloco não vira seção da barra "Nesta página" nem entra na busca', async () => {
    const chips = await edge.evaluate(`[...document.querySelectorAll('.page-toc [data-toc-index]')].map(b => b.textContent)`);
    return [!['Atalhos', 'Relógios', 'Próxima sessão'].some(nome => chips.includes(nome)), chips.join(', ')];
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
  await r.passo('relógios mostram o segmento marcado e o próximo (sem relógio na base, o aviso)', async () => {
    // Os relógios saem da base da campanha; depois do recomeço da história (2026-10-20), ela pode não ter nenhum.
    const relogios = await edge.evaluate(`((window.campaignBase.base || {}).relogios || []).map(item => ({ chave: item.chave, nome: item.nome, segmentos: item.segmentos }))`);
    if (!relogios.length) {
      await edge.ir(`${servidores.local}/?recarregar#home`, 800);
      const texto = await bloco();
      return [/Nenhum relógio na base da campanha/.test(texto), texto.slice(texto.indexOf('Relógios'), texto.indexOf('Relógios') + 120)];
    }
    const [primeiro] = relogios;
    const mesa = valor => fetch(`${servidores.local}/api/campanhas/morana/mesa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relogios: { [primeiro.chave]: valor } }) });
    // Os relógios ficam no servidor (a mesa do mestre): marca lá e abre de novo.
    await mesa(1);
    try {
      // ?recarregar: só trocar o # não recarrega a página (a mesa lida antes continuaria).
      await edge.ir(`${servidores.local}/?recarregar#home`, 800);
      const texto = await bloco();
      const proximo = primeiro.segmentos.length > 1 ? texto.includes(`próximo: ${primeiro.segmentos[1]}`) : true;
      return [texto.includes(`${primeiro.nome}: 1/${primeiro.segmentos.length}`) && texto.includes(`Último marcado: ${primeiro.segmentos[0]}`) && proximo, texto.slice(texto.indexOf('Relógios'), texto.indexOf('Relógios') + 200)];
    } finally {
      await mesa(0);
    }
  });
  await edge.shot('inicio');
  await r.passo('atalho abre a página', async () => {
    await edge.evaluate(`[...document.querySelectorAll('.desk-buttons .action')].find(b => b.textContent === 'Glossário').click()`);
    await edge.sleep(300);
    return [(await edge.evaluate('wikiApp.currentPage()')) === 'glossary', ''];
  });
};
