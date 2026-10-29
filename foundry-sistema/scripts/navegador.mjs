// O navegador de itens e atores (o C43, parte 3; o document browser do CORE 0.93, em fvtt-cyberpunk-red-core-dev:
// apps/browser/cpr-document-browser.js, o índice cpr-browser-index.js, os botões hooks/foundry/ui/
// directory-browser-buttons.js e o menu apps/settings/cpr-browser-compendia-settings.js). Uma janela com a busca, os
// filtros de cada tipo e a lista em lotes, do mundo e dos compêndios ligados; clicar abre a ficha (também a do
// compêndio), e o mestre arrasta para a ficha com os dados de arrasto do Foundry ({ type, uuid }): a ficha recebe como
// recebe do diretório ou do compêndio. A conta pura (os filtros, a ordem, os lotes, os números) fica em
// regras-navegador.mjs. O carrinho do jogador fica de fora: a loja da wiki já é o carrinho.
import { caminho, SISTEMA } from './config.mjs';
import { registrarCompendiosDoNavegador } from './configuracoes.mjs';
import { categoriaDoPreco } from './regras.mjs';
import {
  aplicarTristate, CAMPOS_DO_ATOR, CAMPOS_DO_ITEM, compendioAtivo, compendioElegivel, entradaDoNavegador, estadoDoTristate, estadoVazio, filtrarEntradas,
  FILTROS_POR_TIPO, linhaDoNavegador, modoDoNavegador, mudarFaixa, opcoesDoConjunto, ORIGENS, podeArrastar, PROXIMO_ESTADO, proximoLote, ROTULOS_DO_ESTADO,
  TIPOS_FORA_DO_NAVEGADOR
} from './regras-navegador.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const modelo = arquivo => caminho(`templates/navegador/${arquivo}.hbs`);
// O registro dos compêndios ligados (o browserActiveCompendia do CORE): { id do compêndio: false } para os desligados.
export const CONFIG_COMPENDIOS = 'navegadorCompendios';
const TITULOS = { item: 'Navegador de itens', ator: 'Navegador de atores' };

// ---------------- O índice (o CPRBrowserIndex) ----------------
// Por sessão: o mundo e as linhas do índice de cada compêndio (pack.getIndex com os campos de CAMPOS_DO_ITEM, sem
// carregar os documentos); o documento inteiro só ao abrir ou arrastar (fromUuid). Os ganchos de criar, mudar e apagar
// o mantêm; o botão de atualizar e a configuração dos compêndios o refazem.
const indice = { Item: null, Actor: null };
const construindo = { Item: null, Actor: null };
// Sobe a cada renovação: a construção que começou antes não fica guardada.
let geracao = 0;

const ativos = () => game.settings.get(SISTEMA, CONFIG_COMPENDIOS) ?? {};
const compendioUsado = pacote => compendioElegivel(pacote.metadata, SISTEMA) && compendioAtivo(ativos(), pacote.metadata.id) && (game.user.isGM || pacote.visible);
const tipoFora = (classe, tipo) => classe === 'Item' && TIPOS_FORA_DO_NAVEGADOR.includes(tipo);

// O documento entra (o #shouldIndexDoc, cpr-browser-index.js:198-209): o do mundo que o usuário vê, ou o de um
// compêndio usado; nunca o item de uma ficha (ele dispara os mesmos ganchos).
function entraNoIndice(doc) {
  if (doc.isEmbedded || doc.parent || tipoFora(doc.documentName, doc.type)) return false;
  if (!doc.pack) return game.user.isGM || doc.visible;
  const pacote = game.packs.get(doc.pack);
  return Boolean(pacote) && compendioUsado(pacote);
}

function entradaDoDocumento(doc) {
  const pacote = doc.pack ? game.packs.get(doc.pack) : null;
  return entradaDoNavegador(doc, {
    uuid: doc.uuid, nome: doc.name, img: doc.img, classe: doc.documentName, tipo: doc.type,
    origem: pacote ? pacote.metadata.id : 'mundo', rotuloDaOrigem: pacote ? pacote.metadata.label : 'Mundo'
  });
}

async function construir(classe) {
  const feita = geracao;
  const entradas = [];
  for (const doc of classe === 'Actor' ? game.actors : game.items) if (entraNoIndice(doc)) entradas.push(entradaDoDocumento(doc));
  const pacotes = game.packs.filter(pacote => pacote.documentName === classe && compendioUsado(pacote));
  const indices = await Promise.all(pacotes.map(pacote => pacote.getIndex({ fields: classe === 'Actor' ? CAMPOS_DO_ATOR : CAMPOS_DO_ITEM })
    .then(lista => ({ pacote, lista }), erro => { console.error(`${SISTEMA} | navegador: o índice de ${pacote.metadata.id} não veio`, erro); return null; })));
  for (const { pacote, lista } of indices.filter(Boolean)) {
    for (const linha of lista) {
      if (tipoFora(classe, linha.type)) continue;
      entradas.push(entradaDoNavegador(linha, { uuid: linha.uuid, nome: linha.name, img: linha.img, classe, tipo: linha.type, origem: pacote.metadata.id, rotuloDaOrigem: pacote.metadata.label }));
    }
  }
  if (feita === geracao) indice[classe] = entradas;
  return entradas;
}

// As entradas de "Item" ou "Actor": as guardadas, ou uma construção só para quem pedir ao mesmo tempo.
export function entradasDoNavegador(classe) {
  if (indice[classe]) return Promise.resolve(indice[classe]);
  if (!construindo[classe]) {
    const promessa = construir(classe).finally(() => { if (construindo[classe] === promessa) construindo[classe] = null; });
    construindo[classe] = promessa;
  }
  return construindo[classe];
}

export function renovarIndice() {
  geracao += 1;
  indice.Item = indice.Actor = null;
  construindo.Item = construindo.Actor = null;
}

// Os ganchos (o #onCreate, o #onUpdate e o #onDelete, cpr-browser-index.js:477-504): só no índice já construído.
function aoCriar(doc) {
  if (indice[doc.documentName] && entraNoIndice(doc)) indice[doc.documentName].push(entradaDoDocumento(doc));
}
function aoMudar(doc) {
  const lista = indice[doc.documentName];
  if (!lista) return;
  const i = lista.findIndex(entrada => entrada.uuid === doc.uuid);
  const entra = entraNoIndice(doc);
  if (i === -1) { if (entra) lista.push(entradaDoDocumento(doc)); } else if (entra) lista[i] = entradaDoDocumento(doc);
  else lista.splice(i, 1);
}
function aoApagar(doc) {
  const lista = indice[doc.documentName];
  const i = lista?.findIndex(entrada => entrada.uuid === doc.uuid) ?? -1;
  if (i !== -1) lista.splice(i, 1);
}

// ---------------- A janela ----------------
export class Navegador extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    const modo = modoDoNavegador(options.modo, game.user.isGM);
    super({ ...options, id: `${SISTEMA}-navegador-${modo}`, modo });
    this.#modo = modo;
  }

  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'navegador', 'themed', 'theme-dark'],
    position: { width: 1020, height: 760 },
    window: { icon: 'fa-solid fa-magnifying-glass', resizable: true },
    actions: {
      abrir: Navegador.#abrir, tristate: Navegador.#tristate, caixa: Navegador.#caixa, grupo: Navegador.#grupo,
      limpar: Navegador.#limpar, atualizar: Navegador.#atualizar, compendios: Navegador.#compendios
    }
  };

  // Cada parte desenha um só elemento raiz (handlebars-application.mjs: "must render a single HTML element").
  static PARTS = {
    busca: { template: modelo('busca') },
    filtros: { template: modelo('filtros'), templates: [modelo('tristate')], scrollable: ['.navegador-caixas'] },
    resultados: { template: modelo('resultados'), scrollable: ['.navegador-lista'] }
  };

  #modo = 'item';
  #estado = estadoVazio();
  // As caixas dos tipos abertas, e os grupos da lista recolhidos (pelo tipo).
  #abertas = new Set();
  #recolhidos = new Set();
  // A lista em lotes: os resultados filtrados, quantos já estão na lista, o tipo do último cabeçalho e o quadro pedido.
  #resultados = [];
  #feitos = 0;
  #ultimoTipo = null;
  #quadro = null;

  get modo() { return this.#modo; }
  get title() { return TITULOS[this.#modo]; }
  get #classe() { return this.#modo === 'ator' ? 'Actor' : 'Item'; }
  #rotuloDoTipo(tipo) { return game.i18n.localize(CONFIG[this.#classe].typeLabels?.[tipo] ?? tipo); }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const partes = options.parts ?? Object.keys(this.constructor.PARTS);
    const { nome, origem, preco } = this.#estado;
    Object.assign(contexto, { itens: this.#modo === 'item', mestre: game.user.isGM, nome, origem, origens: ORIGENS, precoMin: preco.min ?? '', precoMax: preco.max ?? '' });
    // Os filtros e a lista vêm do índice: a parte da busca sozinha não espera por ele.
    if (!partes.includes('filtros') && !partes.includes('resultados')) return contexto;
    const entradas = await entradasDoNavegador(this.#classe);
    if (partes.includes('filtros')) contexto.caixas = this.#caixas(entradas);
    if (partes.includes('resultados')) {
      this.#resultados = filtrarEntradas(entradas, this.#estado, Object.keys(CONFIG[this.#classe].dataModels));
      this.#feitos = 0;
      this.#ultimoTipo = null;
      Object.assign(contexto, { total: this.#resultados.length, carregando: this.#resultados.length > 0 });
    }
    return contexto;
  }

  // Uma caixa por tipo (o #getTypeBoxes e o #typeBox, cpr-document-browser.js:408-454), com o tristate do tipo e os
  // filtros dele: as faixas primeiro, depois os booleanos, as alternâncias e as listas. Os atores não têm filtros.
  #caixas(entradas) {
    const ordem = { faixa: 0, dano: 0, booleano: 1, alternancia: 2, conjunto: 3 };
    return Object.keys(CONFIG[this.#classe].dataModels).filter(tipo => !tipoFora(this.#classe, tipo)).map(tipo => {
      const defs = this.#classe === 'Item' ? FILTROS_POR_TIPO[tipo] ?? [] : [];
      const filtros = [...defs].sort((a, b) => ordem[a.tipo] - ordem[b.tipo]).map(def => this.#filtro(tipo, def, entradas));
      const rotulo = this.#rotuloDoTipo(tipo);
      return { tipo, rotulo, tristate: this.#tristateDe({ grupo: 'tipo', tipo }, rotulo), temFiltros: filtros.length > 0, aberta: this.#abertas.has(tipo), filtros };
    });
  }

  #tristateDe(alvo, rotulo) {
    const estado = estadoDoTristate(this.#estado, alvo);
    return { ...alvo, rotulo, estado, rotuloDoEstado: ROTULOS_DO_ESTADO[estado] };
  }

  #filtro(tipo, def, entradas) {
    const base = { id: def.id, tipo, rotulo: def.rotulo };
    if (def.tipo === 'conjunto') {
      return { ...base, conjunto: true, opcoes: opcoesDoConjunto(def, entradas, tipo).map(([valor, rotulo]) => this.#tristateDe({ grupo: 'conjunto', tipo, filtro: def.id, valor }, rotulo)) };
    }
    if (def.tipo === 'faixa' || def.tipo === 'dano') {
      const faixa = this.#estado.faixas[tipo]?.[def.id] ?? {};
      return { ...base, faixa: true, min: faixa.min ?? '', max: faixa.max ?? '' };
    }
    if (def.tipo === 'booleano') return { ...base, booleano: true, tristate: this.#tristateDe({ grupo: 'booleano', tipo, filtro: def.id }, def.rotulo) };
    // A alternância mostra os filtros de dentro só em "só estes" (o revealNested, cpr-document-browser.js:505-507).
    const tristate = this.#tristateDe({ grupo: 'alternancia', tipo, filtro: def.id }, def.rotulo);
    return { ...base, alternancia: true, tristate, mostrar: tristate.estado === 'so', filtros: (def.filtros ?? []).map(filho => this.#filtro(tipo, filho, entradas)) };
  }

  // Enter e Espaço no que tem data-action e não é botão (a linha), como o _onFirstRender do CORE (:1020-1034).
  async _onFirstRender(contexto, options) {
    await super._onFirstRender(contexto, options);
    this.element.addEventListener('keydown', evento => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      const alvo = evento.target.closest?.('[data-action]');
      if (!alvo || ['BUTTON', 'INPUT', 'SELECT'].includes(alvo.tagName)) return;
      evento.preventDefault();
      alvo.click();
    });
  }

  async _onRender(contexto, options) {
    await super._onRender(contexto, options);
    const partes = options.parts ?? Object.keys(this.constructor.PARTS);
    if (partes.includes('busca')) this.#ligarBusca();
    if (partes.includes('filtros')) this.#ligarFiltros();
    if (partes.includes('resultados')) this.#comecarLista();
  }

  // O nome (com a espera de 200 ms do CORE, :1079-1088) e a origem redesenham só a lista.
  #ligarBusca() {
    const buscar = foundry.utils.debounce(valor => { this.#estado.nome = valor; this.render({ parts: ['resultados'] }); }, 200);
    this.element.querySelector('.navegador-nome')?.addEventListener('input', evento => buscar(evento.target.value));
    this.element.querySelector('.navegador-origem')?.addEventListener('change', evento => { this.#estado.origem = evento.target.value; this.render({ parts: ['resultados'] }); });
  }

  #ligarFiltros() {
    for (const campo of this.element.querySelectorAll('.navegador-preco input')) {
      campo.addEventListener('change', evento => {
        const texto = evento.target.value;
        this.#estado.preco[evento.target.dataset.limite] = texto === '' || !Number.isFinite(Number(texto)) ? null : Number(texto);
        this.render({ parts: ['resultados'] });
      });
    }
    for (const campo of this.element.querySelectorAll('.navegador-faixa input')) {
      campo.addEventListener('change', evento => {
        const { tipo, filtro, limite } = evento.target.dataset;
        mudarFaixa(this.#estado, tipo, filtro, limite, evento.target.value);
        this.render({ parts: ['resultados'] });
      });
    }
  }

  // A lista recomeça e entra de lote em lote, um por quadro (o #activateResultsListeners e o #appendBatch, :1403-1507).
  #comecarLista() {
    if (this.#quadro) window.cancelAnimationFrame(this.#quadro);
    this.#quadro = null;
    const lista = this.element.querySelector('.navegador-lista');
    if (!lista) return;
    lista.addEventListener('dragstart', evento => this.#arrastar(evento));
    if (this.#resultados.length) this.#quadro = window.requestAnimationFrame(() => this.#proximoLote());
  }

  async #proximoLote() {
    const lista = this.element?.querySelector('.navegador-lista');
    if (!lista) return;
    const resultados = this.#resultados;
    const lote = proximoLote(resultados, this.#feitos, this.#ultimoTipo);
    const itens = lote.itens.map(item => (item.cabecalho
      ? { cabecalho: true, tipo: item.tipo, rotulo: this.#rotuloDoTipo(item.tipo), recolhido: this.#recolhidos.has(item.tipo) }
      : { par: item.par, recolhido: this.#recolhidos.has(item.entrada.tipo), linha: linhaDoNavegador(item.entrada, { rotuloDoTipo: this.#rotuloDoTipo(item.entrada.tipo), categoria: categoriaDoPreco, ehMestre: game.user.isGM }) }));
    const html = await foundry.applications.handlebars.renderTemplate(modelo('lote'), { itens });
    // Um filtro novo durante a espera recomeçou a lista: este lote era da anterior.
    if (resultados !== this.#resultados || lista !== this.element?.querySelector('.navegador-lista')) return;
    lista.insertAdjacentHTML('beforeend', html);
    this.#feitos = lote.feitos;
    this.#ultimoTipo = lote.ultimoTipo;
    const rodape = this.element.querySelector('.navegador-rodape');
    rodape?.classList.toggle('carregando', !lote.acabou);
    const contagem = rodape?.querySelector('.navegador-contagem');
    if (contagem) contagem.textContent = `Mostrando ${this.#feitos} de ${resultados.length}`;
    this.#quadro = lote.acabou ? null : window.requestAnimationFrame(() => this.#proximoLote());
  }

  // Os dados de arrasto do Foundry, só para o mestre (o #onDragStart, :1537-1549).
  #arrastar(evento) {
    const linha = evento.target.closest?.('[data-uuid]');
    if (!linha) return;
    if (!podeArrastar(game.user.isGM)) { evento.preventDefault(); return; }
    evento.dataTransfer.setData('text/plain', JSON.stringify({ type: linha.dataset.classe, uuid: linha.dataset.uuid }));
  }

  _onClose(options) {
    if (this.#quadro) window.cancelAnimationFrame(this.#quadro);
    this.#quadro = null;
    super._onClose(options);
  }

  // O tristate muda no lugar (sem redesenhar os filtros, para o foco ficar), e a lista recomeça. "Só estes" abre a caixa
  // do tipo, e "excluídos" a fecha (:1264-1268); a promoção do tipo pelo filtro de dentro também a abre.
  static #tristate(evento, alvo) {
    const { grupo, tipo, filtro, valor } = alvo.dataset;
    const chave = { grupo, tipo, filtro, valor };
    const novo = PROXIMO_ESTADO[estadoDoTristate(this.#estado, chave)];
    aplicarTristate(this.#estado, chave, novo);
    if (grupo === 'tipo' && novo !== 'incluir') this.#abrirCaixa(tipo, novo === 'so');
    else if (grupo !== 'tipo' && novo === 'so') this.#abrirCaixa(tipo, true);
    this.#sincronizar();
    return this.render({ parts: ['resultados'] });
  }

  #sincronizar() {
    for (const botao of this.element.querySelectorAll('.navegador-tristate')) {
      const { grupo, tipo, filtro, valor } = botao.dataset;
      const estado = estadoDoTristate(this.#estado, { grupo, tipo, filtro, valor });
      botao.dataset.estado = estado;
      botao.dataset.tooltip = ROTULOS_DO_ESTADO[estado];
      botao.setAttribute('aria-label', `${botao.textContent.trim()}: ${ROTULOS_DO_ESTADO[estado]}`);
    }
    for (const dentro of this.element.querySelectorAll('.navegador-aninhados')) {
      dentro.hidden = estadoDoTristate(this.#estado, { grupo: 'alternancia', tipo: dentro.dataset.tipo, filtro: dentro.dataset.filtro }) !== 'so';
    }
  }

  // Abre ou fecha a caixa de um tipo; a sem filtros fica fechada (o #setBoxExpanded, :1385-1396).
  #abrirCaixa(tipo, aberta) {
    const caixa = this.element.querySelector(`.navegador-caixa[data-tipo="${tipo}"]`);
    if (!caixa?.querySelector('.navegador-filtros-do-tipo')) return;
    caixa.classList.toggle('recolhida', !aberta);
    caixa.querySelector('[data-action="caixa"]')?.setAttribute('aria-expanded', String(aberta));
    if (aberta) this.#abertas.add(tipo); else this.#abertas.delete(tipo);
  }

  static #caixa(evento, alvo) { this.#abrirCaixa(alvo.dataset.tipo, !this.#abertas.has(alvo.dataset.tipo)); }

  // O cabeçalho de um grupo recolhe as linhas dele até o próximo cabeçalho; as que ainda vão entrar já vêm recolhidas
  // (o #onGroupHeaderClick, :1428-1443).
  static #grupo(evento, alvo) {
    const tipo = alvo.dataset.grupo;
    const recolhido = !this.#recolhidos.has(tipo);
    if (recolhido) this.#recolhidos.add(tipo); else this.#recolhidos.delete(tipo);
    const cabecalho = alvo.closest('.navegador-grupo');
    cabecalho.classList.toggle('recolhido', recolhido);
    alvo.setAttribute('aria-expanded', String(!recolhido));
    for (let linha = cabecalho.nextElementSibling; linha && !linha.classList.contains('navegador-grupo'); linha = linha.nextElementSibling) linha.classList.toggle('oculta', recolhido);
  }

  // Abre a ficha (do compêndio também), com o documento inteiro só agora (o openDocument, :1599-1604).
  static async #abrir(evento, alvo) {
    const uuid = alvo.closest('[data-uuid]')?.dataset.uuid;
    const documento = uuid ? await fromUuid(uuid) : null;
    return documento?.sheet?.render({ force: true });
  }

  static #limpar() {
    this.#estado = estadoVazio();
    return this.render({ parts: ['busca', 'filtros', 'resultados'] });
  }

  // Refaz o índice e redesenha os filtros (as listas sem rótulos vêm do índice) e a lista (o refreshIndex, :1577-1580).
  static #atualizar() {
    renovarIndice();
    return this.render({ parts: ['filtros', 'resultados'] });
  }

  static #compendios() { return new JanelaDosCompendios().render({ force: true }); }
}

// Abre o navegador no modo pedido; o jogador abre sempre o de itens.
export function abrirNavegador(modo = 'item') {
  const certo = modoDoNavegador(modo, game.user.isGM);
  const aberto = foundry.applications.instances.get(`${SISTEMA}-navegador-${certo}`);
  return (aberto ?? new Navegador({ modo: certo })).render({ force: true });
}

// ---------------- O menu dos compêndios (o CPRBrowserCompendiaSettings) ----------------
// Cada compêndio de itens e de atores que pode entrar, nos grupos da pasta (ou do pacote de onde vem), com a caixa;
// por padrão, todos ligados. Salvar refaz o índice e redesenha os navegadores abertos (o onChange da configuração).
export class JanelaDosCompendios extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SISTEMA}-navegador-compendios`,
    tag: 'form',
    classes: [SISTEMA, 'navegador-compendios', 'themed', 'theme-dark'],
    position: { width: 520, height: 'auto' },
    window: { title: 'Compêndios do navegador', icon: 'fa-solid fa-book-open' },
    form: { handler: JanelaDosCompendios.#salvar, closeOnSubmit: true }
  };

  static PARTS = { form: { template: modelo('compendios'), scrollable: ['.navegador-compendios-grupos'] } };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ligados = ativos();
    // O sistema primeiro, depois os módulos e o mundo (o sourceRank, cpr-browser-compendia-settings.js:57).
    const posicao = { system: 0, module: 1, world: 2 };
    const grupos = new Map();
    for (const pacote of game.packs) {
      if (!['Item', 'Actor'].includes(pacote.documentName) || !compendioElegivel(pacote.metadata, SISTEMA)) continue;
      const { packageType, packageName, id, label } = pacote.metadata;
      const nome = pacote.folder?.name ?? (packageType === 'world' ? game.world.title : packageType === 'system' ? game.system.title : game.modules.get(packageName)?.title ?? packageName);
      if (!grupos.has(nome)) grupos.set(nome, { nome, posicao: posicao[packageType] ?? 1, compendios: [] });
      grupos.get(nome).compendios.push({ id, rotulo: label, ligado: compendioAtivo(ligados, id) });
    }
    const lista = [...grupos.values()].sort((a, b) => a.posicao - b.posicao || a.nome.localeCompare(b.nome, 'pt-BR'));
    for (const grupo of lista) {
      grupo.compendios.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
      grupo.todos = grupo.compendios.every(compendio => compendio.ligado);
    }
    return Object.assign(contexto, { grupos: lista });
  }

  // A caixa do grupo liga e desliga todos os dele e mostra o estado misto (o _onRender, :108-137).
  async _onRender(contexto, options) {
    await super._onRender(contexto, options);
    for (const bloco of this.element.querySelectorAll('.navegador-compendios-grupo')) {
      const todos = bloco.querySelector('.navegador-compendios-todos');
      const caixas = [...bloco.querySelectorAll('input[data-compendio]')];
      const conferir = () => {
        const ligadas = caixas.filter(caixa => caixa.checked).length;
        todos.checked = ligadas === caixas.length;
        todos.indeterminate = ligadas > 0 && ligadas < caixas.length;
      };
      conferir();
      todos.addEventListener('change', () => { for (const caixa of caixas) caixa.checked = todos.checked; conferir(); });
      for (const caixa of caixas) caixa.addEventListener('change', conferir);
    }
  }

  static async #salvar(evento, form) {
    const ligados = {};
    for (const caixa of form.querySelectorAll('input[data-compendio]')) ligados[caixa.dataset.compendio] = caixa.checked;
    await game.settings.set(SISTEMA, CONFIG_COMPENDIOS, ligados);
  }
}

// ---------------- O registro ----------------
// O botão no pé dos diretórios (o injectBrowserButton, directory-browser-buttons.js:19-43): o de Itens para todos, o de
// Atores só para o mestre. O diretório redesenha muito: um botão por modo.
function botaoNoDiretorio(html, modo) {
  if (html.querySelector(`[data-cpr-navegador="${modo}"]`)) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.dataset.cprNavegador = modo;
  botao.innerHTML = `<i class="fa-solid fa-magnifying-glass" inert></i><span>${TITULOS[modo]}</span>`;
  botao.addEventListener('click', () => abrirNavegador(modo));
  (html.querySelector('.directory-footer') ?? html).append(botao);
}

export function registrarNavegador() {
  registrarCompendiosDoNavegador(JanelaDosCompendios, () => {
    renovarIndice();
    for (const janela of foundry.applications.instances.values()) if (janela instanceof Navegador && janela.rendered) janela.render();
  });
  for (const classe of ['Item', 'Actor']) {
    Hooks.on(`create${classe}`, aoCriar);
    Hooks.on(`update${classe}`, aoMudar);
    Hooks.on(`delete${classe}`, aoApagar);
  }
  Hooks.on('renderItemDirectory', (app, html) => botaoNoDiretorio(html, 'item'));
  Hooks.on('renderActorDirectory', (app, html) => { if (game.user.isGM) botaoNoDiretorio(html, 'ator'); });
}
