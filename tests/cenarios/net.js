// Netrunning: a página de regras (o RED com os quickhacks do Mission Kit), o arsenal com os cyberdecks com marca e os
// quickhacks (os do Kit e os do suplemento de fã aprovados pela mesa).
const { abrir, buscarEAbrir, semRolagemLateral, clicarChip, ondeParou } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  await edge.evaluate(`document.querySelector('#tab-system').click()`);

  const minimos = { netArsenal: 56, quickhacks: 16 };
  for (const [pagina, minimo] of Object.entries(minimos)) {
    await r.passo(`${pagina}: pelo menos ${minimo} cartões`, async () => {
      await abrir(edge, pagina, 200);
      const n = await edge.evaluate(`document.querySelectorAll('#content .entry').length`);
      return [n >= minimo, `${n} cartões`];
    });
  }

  await r.passo('quickhacks: os 11 do Mission Kit e os 5 do suplemento de fã, sem preço', async () => {
    await abrir(edge, 'quickhacks', 200);
    const tags = await edge.evaluate(`[...document.querySelectorAll('#content .entry .entry-tag')].map(t => t.textContent)`);
    const comPreco = await edge.evaluate(`[...document.querySelectorAll('#content .entry-stats b')].filter(b => /Preço|Custo/.test(b.textContent)).length`);
    const kit = tags.filter(tag => /Mission Kit/.test(tag)).length;
    const fa = tags.filter(tag => /suplemento de fã/.test(tag)).length;
    return [kit === 11 && fa === 5 && comPreco === 0, `${kit} do Kit, ${fa} do suplemento, ${comPreco} com preço`];
  });
  await r.passo('Netrunning: uma página só, com o Breach, o Scanner como Ação NET e os quickhacks no Neuroport', async () => {
    await abrir(edge, 'netrunning', 200);
    const secoes = await edge.evaluate(`[...document.querySelectorAll('#content .section')].map(s => s.dataset.toc)`);
    const linhas = await edge.evaluate(`[...document.querySelectorAll('#content .section[data-toc="Habilidades de Interface"] tbody tr')].map(tr => tr.cells[0].textContent + '=' + tr.cells[1].textContent)`);
    const ok = ['Do que o netrunner precisa', 'Quickhacks no Neuroport', 'Firewall de fábrica', 'O Neuroport como arquitetura NET', 'Conexão direta', 'Black ICE'].every(s => secoes.includes(s))
      && linhas.includes('Scanner=1 Ação NET') && linhas.includes('Breach=1 Ação NET') && !linhas.some(l => l.startsWith('Backdoor'));
    return [ok, `${secoes.length} seções · ${linhas.slice(0, 3).join(', ')}`];
  });
  await r.passo('Arsenal: os 21 cyberdecks com marca, com os slots e o preço do RED pela qualidade', async () => {
    await abrir(edge, 'netArsenal', 200);
    const linhas = await edge.evaluate(`[...document.querySelectorAll('#content .section[data-toc="Cyberdecks com marca"] tbody tr')].map(tr => [...tr.cells].map(td => td.textContent))`);
    const precos = { Ruim: '5|100eb', Padrão: '7|500eb', Excelente: '9|1.000eb' };
    const errados = linhas.filter(l => precos[l[2]] !== `${l[3]}|${l[4]}`);
    return [linhas.length === 21 && !errados.length, `${linhas.length} decks · ${errados.map(l => l[1]).join(', ') || 'todos certos'}`];
  });

  const buscaCai = (consulta, pagina, foco) => r.passo(`busca "${consulta}" abre o cartão certo`, async () => {
    const { parou } = await buscarEAbrir(edge, consulta, 700);
    return [parou.pagina === pagina && parou.foco.includes(foco) && parou.marcaVisivel, `${parou.pagina} | foco "${parou.foco}"`];
  });
  await buscaCai('hellhound', 'netArsenal', 'Hellhound');
  await buscaCai('contagion', 'quickhacks', 'Contagion');
  await buscaCai('falcon', 'cyberware2077', 'Militech Falcon Sandevistan');
  await buscaCai('gosma', 'netArsenal', 'Gosma');
  // Um item que saiu na revisão: a busca leva à lista do que saiu, com o motivo.
  await buscaCai('kami chip', 'supplement2077', 'Itens que saíram');

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
  for (const [antigo, pagina, foco] of [['net2077', 'netrunning', 'Quickhacks no Neuroport'], ['os2077', 'cyberware2077', 'Berserk e Sandevistan']]) {
    await r.passo(`endereço antigo #${antigo} abre ${pagina} em "${foco}"`, async () => {
      await edge.ir(`${servidores.local}/#${antigo}`, 1500);
      const parou = await ondeParou(edge);
      return [parou.pagina === pagina && parou.foco === foco, `${parou.pagina} | foco "${parou.foco}"`];
    });
  }

  await edge.celular(true);
  for (const pagina of ['netrunning', 'supplement2077', ...Object.keys(minimos)]) {
    await r.passo(`celular: ${pagina} sem rolagem lateral`, async () => { await abrir(edge, pagina, 250); return [await semRolagemLateral(edge), '']; });
  }
  await edge.celular(false);
};
