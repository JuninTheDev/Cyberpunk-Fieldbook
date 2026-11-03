// Os nomes que viram link, com o cartão ao passar o mouse: o código que as duas wikis carregam, sem dados. A wiki do
// mestre liga os nomes da base da campanha (campanha-base.js); a dos jogadores, os das pessoas e dos lugares que o
// mestre revelou (jogadores.html, com o que o servidor já filtrou). Quem chama diz o que liga, nas entradas
// { id, tipo, nomes: [o nome e os outros], href }, e o HTML do cartão de cada uma.
//
// No navegador: window.wikiNomes. No Node (os testes e a base da campanha): require('./wiki-nomes.js').
(function (raiz) {
  'use strict';

  const slug = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Os nomes de mais de duas letras, o mais longo primeiro (o nome inteiro ganha da parte dele); um nome em duas
  // entradas fica com a primeira. null sem nenhum nome.
  function buscador(entradas) {
    const formas = new Map();
    for (const entrada of entradas) for (const forma of entrada.nomes) if (forma.length > 2 && !formas.has(forma)) formas.set(forma, entrada);
    if (!formas.size) return null;
    const escapar = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { formas, regex: new RegExp(`(?<![\\p{L}\\p{N}])(${[...formas.keys()].sort((a, b) => b.length - a.length).map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'gu') };
  }
  // Os ids das entradas cujos nomes aparecem no texto, na ordem do texto.
  function nomesEm(busca, texto) {
    const achados = new Set();
    if (!busca) return achados;
    busca.regex.lastIndex = 0;
    for (let m = busca.regex.exec(texto); m; m = busca.regex.exec(texto)) achados.add(busca.formas.get(m[1]).id);
    return achados;
  }

  const api = { slug, buscador, nomesEm };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------------- Os links ----------------
  const PULAR = 'h1, h2, h3, h4, h5, a, button, summary, code, pre, input, textarea, select, option, label, th, .page-toc, .page-tabs, .eyebrow, .ent-card, .npc-stats, .entry-tag';
  // Num documento (#md-doc), a seção de um texto é o título (### ou ####) mais perto acima dele.
  function secaoDe(no, raizDoc) {
    let filho = no.parentElement;
    while (filho && filho.parentElement !== raizDoc) filho = filho.parentElement;
    let titulo = filho;
    while (titulo && !/^H[3-5]$/.test(titulo.tagName)) titulo = titulo.previousElementSibling;
    return titulo || raizDoc;
  }
  // Liga os nomes de root: uma vez por nome em cada seção (num documento, cada título; nas páginas, cada .section,
  // .entry ou .person), nunca na seção do próprio nome. O nome que já tem link na seção (o [[Nome]] da wiki do mestre)
  // não ganha outro.
  function ligar(root, busca) {
    if (!busca || !root) return;
    const documento = root.matches && root.matches('#md-doc') ? root : root.querySelector && root.querySelector('#md-doc');
    const usados = new Map();
    const escopoDe = no => (documento && documento.contains(no) ? secaoDe(no, documento) : (no.parentElement.closest('.entry, .section, .person') || root));
    const usadosEm = escopo => { if (!usados.has(escopo)) usados.set(escopo, new Set()); return usados.get(escopo); };
    for (const link of root.querySelectorAll('a.ent[data-ent]')) usadosEm(escopoDe(link)).add(link.dataset.ent);
    const caminhante = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (caminhante.nextNode()) nos.push(caminhante.currentNode);
    for (const no of nos) {
      const pai = no.parentElement;
      if (!pai || pai.closest(PULAR) || !no.data.trim()) continue;
      const escopo = escopoDe(no);
      const tituloDoEscopo = slug(escopo.matches && escopo.matches('h3, h4, h5') ? escopo.textContent : (escopo.dataset && escopo.dataset.toc) || '');
      const usado = usadosEm(escopo);
      busca.regex.lastIndex = 0;
      const achados = [];
      for (let m = busca.regex.exec(no.data); m; m = busca.regex.exec(no.data)) {
        const entrada = busca.formas.get(m[1]);
        if (!entrada || usado.has(entrada.id) || tituloDoEscopo === slug(entrada.nomes[0])) continue;
        usado.add(entrada.id);
        achados.push({ inicio: m.index, fim: m.index + m[1].length, entrada });
      }
      if (!achados.length) continue;
      const pedaco = document.createDocumentFragment();
      let de = 0;
      for (const { inicio, fim, entrada } of achados) {
        pedaco.append(no.data.slice(de, inicio));
        const link = document.createElement('a');
        link.className = `ent ent-${entrada.tipo}`;
        link.href = entrada.href;
        link.dataset.ent = entrada.id;
        link.textContent = no.data.slice(inicio, fim);
        pedaco.append(link);
        de = fim;
      }
      pedaco.append(no.data.slice(de));
      no.replaceWith(pedaco);
    }
  }

  // ---------------- O cartão ----------------
  // Ao passar o mouse num link (ou com o foco nele), o cartão do nome: cartaoDe(id) devolve o HTML (vazio: nenhum).
  let cartaoDe = () => '';
  let cartao = null;
  function mostrar(link) {
    const html = cartaoDe(link.dataset.ent);
    if (!html) return;
    cartao = cartao || Object.assign(document.createElement('div'), { className: 'ent-card' });
    cartao.innerHTML = html;
    document.body.append(cartao);
    const caixa = link.getBoundingClientRect();
    const largura = Math.min(320, window.innerWidth - 16);
    cartao.style.width = `${largura}px`;
    cartao.style.left = `${Math.max(8, Math.min(window.innerWidth - largura - 8, caixa.left))}px`;
    const altura = cartao.offsetHeight;
    const abaixo = caixa.bottom + 6 + altura < window.innerHeight;
    cartao.style.top = `${(abaixo ? caixa.bottom + 6 : Math.max(8, caixa.top - altura - 6)) + window.scrollY}px`;
    cartao.hidden = false;
  }
  const esconder = () => { if (cartao) cartao.hidden = true; };
  // Uma wiki só chama uma vez; chamar de novo troca o cartaoDe.
  let ouvindo = false;
  function ouvir(funcao) {
    cartaoDe = funcao;
    if (ouvindo) return;
    ouvindo = true;
    document.addEventListener('mouseover', evento => { const link = evento.target.closest && evento.target.closest('a.ent'); if (link) mostrar(link); });
    document.addEventListener('mouseout', evento => { const link = evento.target.closest && evento.target.closest('a.ent'); if (link && !link.contains(evento.relatedTarget)) esconder(); });
    document.addEventListener('focusin', evento => { if (evento.target.matches && evento.target.matches('a.ent')) mostrar(evento.target); });
    document.addEventListener('focusout', esconder);
    document.addEventListener('wiki:pagina', esconder);
    window.addEventListener('scroll', esconder, { passive: true });
  }

  raiz.wikiNomes = { ...api, ligar, ouvir, esconder };
})(typeof window !== 'undefined' ? window : globalThis);
