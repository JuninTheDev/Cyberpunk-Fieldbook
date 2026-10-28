// A árvore dos instalados do CORE 0.92.4, adaptada ao ItemDirectory ApplicationV2 do Foundry 14.
// No 14.369: renderItemDirectory fornece HTMLElement; as linhas nativas usam data-entry-id.
import { SISTEMA } from './config.mjs';
import { arvoreDeInstalados } from './regras-arvore-itens.mjs';

const FLAG_ABERTOS = 'itensInstaladosAbertos';
const limpezas = new WeakMap();
let sequencia = 0;

export function desenharArvoreItens(app, html) {
  limpezas.get(html)?.();
  const linhas = new Map([...html.querySelectorAll('li.directory-item.item[data-entry-id]')]
    .map(linha => [linha.dataset.entryId, linha]));
  const itens = [...linhas.keys()].map(id => game.items.get(id)).filter(item => item && !item.parent);
  const arvore = arvoreDeInstalados(itens.map(item => ({ id: item.id, nome: item.name, tipo: item.type,
    instaladoEm: item.system.instaladoEm, visivel: item.visible })));
  const inseridos = [], aninhados = [], alternadores = [];
  const busca = html.querySelector('search input');
  html.classList.add('cpr-diretorio-com-arvore');

  for (const raiz of arvore) {
    if (!raiz.filhos.length) continue;
    const linha = linhas.get(raiz.id);
    const bloco = document.createElement('li');
    bloco.className = 'cpr-arvore-itens';
    bloco.dataset.cprArvorePai = raiz.id;
    bloco.id = 'cpr-instalados-' + ++sequencia;
    const titulo = document.createElement('div');
    titulo.className = 'cpr-arvore-titulo';
    titulo.textContent = 'ITENS INSTALADOS';
    const lista = document.createElement('ol');
    bloco.append(titulo, lista);
    // Lista achatada e indentada como no CORE; iteração evita estourar a pilha em uma árvore importada profunda.
    const pendentes = raiz.filhos.map(no => ({ no, nivel: 0 })).reverse();
    while (pendentes.length) {
      const { no, nivel } = pendentes.pop();
      const filho = document.createElement('li');
      filho.dataset.cprItemInstalado = no.id;
      filho.style.paddingInlineStart = nivel + 'rem';
      const abrir = document.createElement('button');
      abrir.type = 'button';
      abrir.className = 'cpr-arvore-abrir';
      abrir.textContent = no.nome;
      abrir.setAttribute('aria-label', 'Abrir item instalado: ' + no.nome);
      abrir.addEventListener('click', evento => {
        evento.stopPropagation();
        // O mestre pode ter revogado a permissão desde o desenho da árvore.
        const atual = game.items.get(no.id);
        if (atual?.visible && !atual.parent) atual.sheet.render({ force: true });
      });
      filho.append(abrir);
      lista.append(filho);
      const original = linhas.get(no.id);
      original.dataset.cprArvoreAninhado = '';
      aninhados.push(original);
      for (let i = no.filhos.length - 1; i >= 0; i--) pendentes.push({ no: no.filhos[i], nivel: nivel + 1 });
    }
    const alternar = document.createElement('button');
    alternar.type = 'button';
    alternar.className = 'cpr-arvore-alternar';
    alternar.dataset.cprArvoreAlternar = raiz.id;
    alternar.setAttribute('aria-controls', bloco.id);
    const mostrar = aberto => {
      alternar.setAttribute('aria-expanded', String(aberto));
      alternar.setAttribute('aria-label', (aberto ? 'Recolher' : 'Expandir') + ' itens instalados de ' + raiz.nome);
      alternar.textContent = aberto ? '▾' : '▸';
      bloco.hidden = !aberto || Boolean(busca?.value.trim());
    };
    mostrar(Boolean(game.user.getFlag(SISTEMA, FLAG_ABERTOS)?.[raiz.id]));
    // Button nativo: Enter e Espaço disparam o mesmo clique, sem alterar documentos ou o vínculo instaladoEm.
    alternar.addEventListener('click', async evento => {
      evento.stopPropagation();
      const aberto = alternar.getAttribute('aria-expanded') !== 'true';
      mostrar(aberto);
      try { await game.user.setFlag(SISTEMA, FLAG_ABERTOS, { [raiz.id]: aberto }); }
      catch { ui.notifications.warn('Não foi possível guardar a exibição dos itens instalados.'); }
    });
    linha.append(alternar);
    linha.after(bloco);
    inseridos.push(bloco);
    alternadores.push(alternar);
  }
  // A busca do Foundry continua usando as linhas e pastas nativas. Assim um filho é encontrado mesmo com o pai
  // recolhido, em outra pasta ou sem o nome procurado; a árvore volta ao limpar a busca.
  const filtrar = () => {
    const buscando = Boolean(busca?.value.trim());
    html.classList.toggle('cpr-arvore-buscando', buscando);
    for (const alternar of alternadores) alternar.hidden = buscando;
    for (let i = 0; i < inseridos.length; i++) inseridos[i].hidden = buscando || alternadores[i].getAttribute('aria-expanded') !== 'true';
  };
  busca?.addEventListener('input', filtrar);
  filtrar();
  limpezas.set(html, () => {
    busca?.removeEventListener('input', filtrar);
    html.classList.remove('cpr-diretorio-com-arvore', 'cpr-arvore-buscando');
    for (const linha of aninhados) delete linha.dataset.cprArvoreAninhado;
    for (const elemento of [...inseridos, ...alternadores]) elemento.remove();
  });
}

export function registrarArvoreItens() {
  const diretorios = new Set();
  Hooks.on('renderItemDirectory', (app, html) => { diretorios.add(app); desenharArvoreItens(app, html); });
  Hooks.on('closeItemDirectory', app => { limpezas.get(app.element)?.(); diretorios.delete(app); });
  // O Foundry redesenha o diretório para nome, imagem, pasta e ownership; instaladoEm é um campo do sistema.
  Hooks.on('updateItem', (item, mudancas) => {
    if (item.parent || !foundry.utils.hasProperty(mudancas, 'system.instaladoEm')) return;
    for (const app of diretorios) if (app.rendered) app.render({ force: true });
  });
}
