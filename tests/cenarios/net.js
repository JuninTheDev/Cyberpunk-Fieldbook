// Netrunning: a página de regras (o RED com os quickhacks do Mission Kit), o arsenal, os quickhacks e os itens de
// netrunning do suplemento de fã, que ficam na página de revisão.
const { abrir, buscarEAbrir, semRolagemLateral, clicarChip, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);

  const minimos = { netArsenal: 56, quickhacks: 11, supplement2077: 100 };
  for (const [pagina, minimo] of Object.entries(minimos)) {
    await r.passo(`${pagina}: pelo menos ${minimo} cartões`, async () => {
      await abrir(edge, pagina, 200);
      const n = await edge.evaluate(`document.querySelectorAll('#content .entry').length`);
      return [n >= minimo, `${n} cartões`];
    });
  }

  await r.passo('quickhacks: só os 11 do Mission Kit', async () => {
    await abrir(edge, 'quickhacks', 200);
    const tags = await edge.evaluate(`[...document.querySelectorAll('#content .entry .entry-tag')].map(t => t.textContent)`);
    return [tags.length === 11 && tags.every(tag => /Mission Kit/.test(tag)), `${tags.length} cartões`];
  });
  await r.passo('Netrunning: uma página só, com o Breach, o Scanner como Ação NET e os quickhacks no Neuroport', async () => {
    await abrir(edge, 'netrunning', 200);
    const secoes = await edge.evaluate(`[...document.querySelectorAll('#content .section')].map(s => s.dataset.toc)`);
    const linhas = await edge.evaluate(`[...document.querySelectorAll('#content .section[data-toc="Habilidades de Interface"] tbody tr')].map(tr => tr.cells[0].textContent + '=' + tr.cells[1].textContent)`);
    const ok = ['Do que o netrunner precisa', 'Quickhacks no Neuroport', 'Firewall de fábrica', 'O Neuroport como arquitetura NET', 'Conexão direta', 'Black ICE'].every(s => secoes.includes(s))
      && linhas.includes('Scanner=1 Ação NET') && linhas.includes('Breach=1 Ação NET') && !linhas.some(l => l.startsWith('Backdoor'));
    return [ok, `${secoes.length} seções · ${linhas.slice(0, 3).join(', ')}`];
  });

  const buscaCai = (consulta, pagina, foco) => r.passo(`busca "${consulta}" abre o cartão certo`, async () => {
    const { parou } = await buscarEAbrir(edge, consulta, 700);
    return [parou.pagina === pagina && parou.foco.includes(foco) && parou.marcaVisivel, `${parou.pagina} | foco "${parou.foco}"`];
  });
  await buscaCai('hellhound', 'netArsenal', 'Hellhound');
  await buscaCai('icepick', 'supplement2077', 'ICEpick');
  await buscaCai('kami chip', 'supplement2077', 'Kami Chip');
  await buscaCai('falcon', 'supplement2077', 'Militech Falcon Sandevistan');
  await buscaCai('gosma', 'netArsenal', 'Gosma');

  await r.passo('quickhacks: chip "Padrão (DV8)" leva à seção e fica ativo', async () => {
    await abrir(edge, 'quickhacks');
    const c = await clicarChip(edge, 'Padrão (DV8)');
    return [c.ativo === 'Padrão (DV8)' && c.topo >= c.barra - 2 && c.topo <= c.barra + 40, JSON.stringify(c)];
  });
  // A última seção de uma página curta não chega ao topo: o chip dela fica aceso mesmo assim, com a seção na tela.
  await r.passo('quickhacks: o último chip, "Avançados (DV12)", fica ativo e mostra a seção', async () => {
    const c = await clicarChip(edge, 'Avançados (DV12)');
    const altura = await edge.evaluate('innerHeight');
    return [c.ativo === 'Avançados (DV12)' && c.topo >= c.barra - 2 && c.topo < altura - 100, JSON.stringify({ ...c, altura })];
  });
  await edge.shot('quickhacks');

  // As páginas que viraram parte de outra continuam abrindo pelo endereço antigo.
  for (const [antigo, pagina, foco] of [['net2077', 'netrunning', 'Quickhacks no Neuroport'], ['os2077', 'supplement2077', 'Berserk e Sandevistan']]) {
    await r.passo(`endereço antigo #${antigo} abre ${pagina} em "${foco}"`, async () => {
      await edge.ir(`${servidores.local}/#${antigo}`, 1500);
      const parou = await ondeParou(edge);
      return [parou.pagina === pagina && parou.foco === foco, `${parou.pagina} | foco "${parou.foco}"`];
    });
  }

  await edge.celular(true);
  for (const pagina of ['netrunning', ...Object.keys(minimos)]) {
    await r.passo(`celular: ${pagina} sem rolagem lateral`, async () => { await abrir(edge, pagina, 250); return [await semRolagemLateral(edge), '']; });
  }
  await edge.celular(false);
};
