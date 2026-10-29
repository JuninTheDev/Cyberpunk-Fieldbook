// Atalhos para mexer na wiki aberta no Edge.
const js = value => JSON.stringify(value);

async function abrir(edge, pagina, espera = 300) {
  await edge.evaluate(`wikiApp.openPage(${js(pagina)})`);
  await edge.sleep(espera);
}

const paginaAtual = edge => edge.evaluate('wikiApp.currentPage()');

// Digita na busca e devolve os resultados: [{ pagina, origem, titulo }].
async function buscar(edge, consulta) {
  await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ${js(consulta)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await edge.sleep(250);
  return edge.evaluate(`[...document.querySelectorAll('#content .result')].map(r => ({ pagina: r.dataset.page, origem: r.querySelector('small').textContent, titulo: r.querySelector('strong').textContent }))`);
}

async function tecla(edge, key, alvo = "document.getElementById('search')") {
  await edge.evaluate(`${alvo}.dispatchEvent(new KeyboardEvent('keydown', { key: ${js(key)}, bubbles: true }))`);
}

// Onde a wiki parou depois de abrir um resultado: página, unidade em foco e se o destaque está na tela.
const ondeParou = edge => edge.evaluate(`(() => {
  const content = document.getElementById('content');
  const flash = content.querySelector('.flash');
  const titulo = flash ? (flash.dataset.toc || (flash.querySelector('h3, h4, summary') || flash).textContent).trim() : '';
  const mark = content.querySelector('mark');
  const r = mark && mark.getBoundingClientRect();
  return { pagina: wikiApp.currentPage(), foco: titulo, marcas: content.querySelectorAll('mark').length, marcaVisivel: r ? r.top > 0 && r.top < innerHeight : false };
})()`);

// Busca, aperta Enter e devolve { resultados, parou }.
async function buscarEAbrir(edge, consulta, espera = 1100) {
  const resultados = await buscar(edge, consulta);
  await tecla(edge, 'Enter');
  await edge.sleep(espera);
  return { resultados, parou: await ondeParou(edge) };
}

const semRolagemLateral = edge => edge.evaluate('document.documentElement.scrollWidth <= innerWidth');

// Clica num item do "Nesta página" (a lista da barra de cima, ou a da coluna da direita nas telas largas) e espera a
// rolagem terminar. Devolve o item ativo, a distância da seção até o topo da janela e o fim das barras fixas de cima.
async function clicarChip(edge, texto) {
  return edge.evaluate(`(async () => {
    const chip = [...document.querySelectorAll('.page-toc [data-toc-index]')].find(b => b.textContent === ${js(texto)});
    if (!chip) return { ativo: '', topo: null };
    chip.click();
    const secao = () => [...document.querySelectorAll('#content .section, #content .person, #md-doc > h3')].find(s => (s.dataset.toc || s.textContent).trim() === ${js(texto)});
    let anterior = -1;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (Math.round(scrollY) === anterior && i > 4) break;
      anterior = Math.round(scrollY);
    }
    await new Promise(r => setTimeout(r, 300));
    return { ativo: document.querySelector('.page-toc .active')?.textContent || '', topo: Math.round(secao().getBoundingClientRect().top), barra: Math.round(Math.max(document.querySelector('.page-toc').getBoundingClientRect().bottom, document.querySelector('.topbar').getBoundingClientRect().bottom)) };
  })()`);
}

module.exports = { abrir, paginaAtual, buscar, tecla, ondeParou, buscarEAbrir, semRolagemLateral, clicarChip, js };
