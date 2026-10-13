// Regras: navegação, Escudo do mestre, perícias, barra "Nesta página", busca e teclado.
const { abrir, buscarEAbrir, buscar, tecla, paginaAtual, semRolagemLateral, clicarChip } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);

  await r.passo('aba Sistema lista as páginas de regras', async () => {
    const ids = await edge.evaluate(`document.querySelector('#tab-system').click(), [...document.querySelectorAll('.nav-item')].map(b => b.dataset.page)`);
    const esperadas = ['screen', 'skills', 'npcs', 'checks', 'combat', 'damage', 'humanity', 'economy', 'creation', 'netrunning', 'weapons2077', 'cyberware2077', 'gear'];
    const faltam = esperadas.filter(id => !ids.includes(id));
    return [!faltam.length, faltam.length ? `faltam ${faltam.join(', ')}` : `${ids.length} páginas`];
  });
  await r.passo('aba Sistema abre no Escudo do mestre', async () => { const atual = await paginaAtual(edge); return [atual === 'screen', atual]; });

  for (const pagina of ['screen', 'skills', 'checks', 'combat', 'damage', 'humanity', 'netrunning', 'economy', 'creation', 'roles', 'cyberware', 'gear', 'supplement2077', 'sources']) {
    await r.passo(`página ${pagina} abre`, async () => {
      await abrir(edge, pagina, 150);
      const titulo = await edge.evaluate(`document.querySelector('#content h2')?.textContent || ''`);
      return [titulo.length > 0 && (await paginaAtual(edge)) === pagina, titulo];
    });
  }

  await abrir(edge, 'screen');
  const dv = (arma, distancia) => edge.evaluate(`(() => { const w = document.getElementById('dv-weapon'); w.value = '${arma}'; w.onchange(); const d = document.getElementById('dv-distance'); d.value = ${distancia}; d.oninput(); return document.getElementById('dv-result').textContent; })()`);
  await r.passo('DV: rifle de assalto a 30 m é 13', async () => { const t = await dv('assault', 30); return [t.startsWith('DV 13'), t.slice(0, 40)]; });
  await r.passo('DV: pistola a 900 m está fora de alcance', async () => { const t = await dv('pistol', 900); return [/Fora de alcance/.test(t), t.slice(0, 40)]; });
  await r.passo('DV: sniper a 150 m é 16', async () => { const t = await dv('sniper', 150); return [t.startsWith('DV 16'), t.slice(0, 40)]; });
  await r.passo('rolador de lesão crítica (corpo e cabeça)', async () => {
    await edge.evaluate(`document.querySelector('[data-crit=body]').click()`);
    const corpo = await edge.evaluate(`document.getElementById('crit-result').textContent`);
    await edge.evaluate(`document.querySelector('[data-crit=head]').click()`);
    const cabeca = await edge.evaluate(`document.getElementById('crit-result').textContent`);
    return [corpo.startsWith('Corpo') && cabeca.startsWith('Cabeça'), `${corpo.slice(0, 40)} / ${cabeca.slice(0, 40)}`];
  });
  await edge.shot('escudo');

  await abrir(edge, 'skills');
  await r.passo('perícias: 66 na tabela', async () => { const n = await edge.evaluate(`document.querySelectorAll('#skill-table tbody tr').length`); return [n === 66, n]; });
  await r.passo('perícias: filtro DEX mostra 8', async () => { const n = await edge.evaluate(`document.querySelector('[data-skill-stat=DEX]').click(), [...document.querySelectorAll('#skill-table tbody tr')].filter(row => !row.hidden).length`); return [n === 8, n]; });
  await r.passo('perícias: "evasion" acha Evasão; "eletronica" acha sem acento', async () => {
    await edge.evaluate(`document.querySelector('[data-skill-stat=all]').click()`);
    const filtro = termo => edge.evaluate(`(() => { const f = document.getElementById('skill-filter'); f.value = '${termo}'; f.oninput(); return [...document.querySelectorAll('#skill-table tbody tr')].filter(row => !row.hidden).map(row => row.cells[0].textContent); })()`);
    const evasao = await filtro('evasion');
    const eletronica = await filtro('eletronica');
    // A busca também olha a descrição: "eletronica" acha a perícia e a Tecnologia Básica (aparelhos eletrônicos simples).
    return [evasao.some(nome => nome.startsWith('Evasão')) && eletronica.some(nome => nome.startsWith('Tecnologia Eletrônica')) && eletronica.length <= 3, `${evasao.map(nome => nome.slice(0, 12)).join(',')} / ${eletronica.map(nome => nome.slice(0, 30)).join(',')}`];
  });

  await abrir(edge, 'combat');
  for (const secao of ['Cobertura', 'Corpo a corpo', 'Fogo supressivo']) {
    await r.passo(`"Nesta página": chip "${secao}" leva à seção e fica ativo`, async () => {
      const c = await clicarChip(edge, secao);
      return [c.ativo === secao && c.topo >= c.barra - 2 && c.topo <= c.barra + 40, JSON.stringify(c)];
    });
  }
  await edge.shot('combate');

  const buscaCai = (consulta, paginas, foco) => r.passo(`busca "${consulta}" + Enter`, async () => {
    const { resultados, parou } = await buscarEAbrir(edge, consulta);
    const ok = resultados.length > 0 && paginas.includes(parou.pagina) && parou.marcaVisivel && (!foco || parou.foco.includes(foco));
    return [ok, `${resultados.length} resultados → ${parou.pagina} | foco "${parou.foco}" | marca visível ${parou.marcaVisivel}`];
  });
  await buscaCai('death save', ['screen', 'damage']);
  await buscaCai('supressivo', ['combat', 'screen']);
  await buscaCai('hellhound', ['netArsenal'], 'Hellhound');
  await buscaCai('Tamsin', ['docPersonagens', 'people']);
  // O Kerenzikov que vale é o do RED (o do suplemento de fã está em revisão): a busca abre o glossário ou o catálogo do RED.
  await buscaCai('Kerenzikov', ['glossary', 'cyberware']);
  await r.passo('busca aceita nome de perícia em inglês ("Wardrobe")', async () => { const resultados = await buscar(edge, 'Wardrobe'); return [resultados.length > 0, `${resultados.length} resultados`]; });

  await r.passo('tecla / põe o cursor na busca', async () => {
    await abrir(edge, 'checks');
    await edge.evaluate(`document.activeElement.blur()`);
    await tecla(edge, '/', 'document.body');
    return [await edge.evaluate(`document.activeElement === document.getElementById('search')`), ''];
  });
  await r.passo('Esc limpa a busca e volta à página', async () => {
    await buscar(edge, 'luck');
    await tecla(edge, 'Escape');
    await edge.sleep(200);
    const estado = await edge.evaluate(`({ pagina: wikiApp.currentPage(), busca: document.getElementById('search').value, resultados: document.querySelectorAll('#content .result').length })`);
    return [estado.pagina === 'checks' && estado.busca === '' && estado.resultados === 0, JSON.stringify(estado)];
  });

  await r.passo('Pessoas e facções (da base da campanha) tem o cartão de Iskra Voss e as seções no índice', async () => {
    await abrir(edge, 'people', 1200);
    const chips = await edge.evaluate(`[...document.querySelectorAll('.page-toc [data-toc-index]')].map(b => b.textContent)`);
    const cartao = await edge.evaluate(`[...document.querySelectorAll('#md-doc h4')].some(h => h.textContent.trim() === 'Iskra Voss')`);
    return [cartao && chips.join() === 'Quem é quem,Elenco principal,Outros nomes,Forças', chips.join(', ')];
  });
  await r.passo('mapa de Night City com os pinos', async () => {
    await abrir(edge, 'campaignMap', 900);
    const pinos = await edge.evaluate(`document.querySelectorAll('.map-pin').length`);
    return [pinos >= 13, `${pinos} pinos`];
  });

  await edge.celular(true);
  await r.passo('celular: Escudo sem rolagem lateral', async () => { await abrir(edge, 'screen', 400); return [await semRolagemLateral(edge), '']; });
  await edge.shot('celular');
  await edge.celular(false);
};
