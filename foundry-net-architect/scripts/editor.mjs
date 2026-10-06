// Editor visual de arquitetura (ApplicationV2): os andares numa grade (linhas = andares, colunas = ramos), arrastar
// para mover (soltar em outro andar troca os dois), clicar num espaço vazio para criar, e o painel ao lado para os
// conteúdos (senha, arquivo, nó de controle, Black ICE, demônio, netrunner inimigo). Salvar grava no item
// NET Architecture do sistema (andares) e nas flags dele (demônios e netrunners).
import { MODULE_ID, BLACK_ICE, DEMONIOS, NOME_DO_TIPO } from './constantes.mjs';
import { RAMOS, ANDAR_MAX, andaresDoItem, itemDosAndares, lerArquitetura } from './arquitetura.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TIPOS = ['senha', 'arquivo', 'controle', 'ice', 'demonio', 'netrunner'];
const DVS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const posDe = no => `${no.andar}${no.ramo}`;
const lerPos = pos => ({ andar: parseInt(pos, 10), ramo: String(pos).slice(-1) });
const novoConteudo = tipo => ({ tipo, dv: ['senha', 'arquivo', 'controle'].includes(tipo) ? 6 : null, ice: tipo === 'ice' ? 'hellhound' : '', demonio: tipo === 'demonio' ? 'imp' : '', ator: '', nome: '', descricao: '' });

export class EditorDeArquitetura extends ApplicationV2 {
  constructor(item) {
    super({ id: `${MODULE_ID}-editor-${item.id}` });
    this.item = item;
    this.recarregar();
  }

  static DEFAULT_OPTIONS = {
    classes: ['net-architect', 'net-editor'],
    tag: 'section',
    window: { title: 'Editor de arquitetura', icon: 'fa-solid fa-diagram-project', resizable: true },
    position: { width: 1060, height: 720 },
    actions: {
      escolher: EditorDeArquitetura.#escolher,
      novo: EditorDeArquitetura.#novo,
      apagarAndar: EditorDeArquitetura.#apagarAndar,
      adicionar: EditorDeArquitetura.#adicionar,
      remover: EditorDeArquitetura.#remover,
      salvar: EditorDeArquitetura.#salvar,
      desfazer: EditorDeArquitetura.#desfazer
    }
  };

  static abrir(item) {
    const id = `${MODULE_ID}-editor-${item.id}`;
    const aberta = foundry.applications.instances.get(id);
    if (aberta) { aberta.render({ force: true }); aberta.bringToFront?.(); return aberta; }
    const editor = new EditorDeArquitetura(item);
    editor.render({ force: true });
    return editor;
  }

  recarregar() {
    this.andares = andaresDoItem(this.item);
    this.nome = this.item.name;
    this.selecionado = this.andares.length ? posDe(this.andares[0]) : null;
    this.sujo = false;
  }

  get title() { return `Editor de arquitetura · ${this.nome}${this.sujo ? ' (não salvo)' : ''}`; }

  noEm(pos) { return this.andares.find(no => posDe(no) === pos) || null; }

  async _renderHTML() {
    const usados = this.andares.map(no => RAMOS.indexOf(no.ramo));
    const colunas = Math.min(RAMOS.length, Math.max(1, ...usados.map(i => i + 1)) + 1);
    const linhas = Math.min(ANDAR_MAX, Math.max(0, ...this.andares.map(no => no.andar)) + 1);
    const pais = lerArquitetura({ name: this.nome, system: itemDosAndares(this.andares), flags: { [MODULE_ID]: { defensores: itemDosAndares(this.andares).defensores } } });
    const celulas = [];
    for (let andar = 1; andar <= linhas; andar++) {
      for (let c = 0; c < colunas; c++) {
        const pos = `${andar}${RAMOS[c]}`;
        const no = this.noEm(pos);
        if (!no) { celulas.push(`<div class="net-ed-vazio" data-action="novo" data-pos="${pos}" data-alvo="${pos}" title="Criar o andar ${andar} no ramo ${RAMOS[c].toUpperCase()}"><i class="fa-solid fa-plus"></i></div>`); continue; }
        const principal = no.conteudos[0] || { tipo: 'vazio' };
        const pai = pais.nos[pos] ? pais.nos[pos].pai : '';
        celulas.push(`<div class="net-ed-no net-tipo-${principal.tipo}${pos === this.selecionado ? ' net-ed-sel' : ''}" draggable="true" data-action="escolher" data-pos="${pos}" data-alvo="${pos}">
          <b>Andar ${andar}${RAMOS[c] !== 'a' ? ` · ${RAMOS[c].toUpperCase()}` : ''}</b>
          ${no.conteudos.map(item => `<span>${esc(this.#rotulo(item))}</span>`).join('') || '<span class="net-nota">vazio</span>'}
          ${pai && pai !== 'entrada' && parseInt(pai, 10) !== andar - 1 ? `<small>liga ao ${esc(pai)}</small>` : ''}
        </div>`);
      }
    }
    const cabecalho = Array.from({ length: colunas }, (_, c) => `<div class="net-ed-ramo">Ramo ${RAMOS[c].toUpperCase()}</div>`).join('');
    return `<div class="net-ed">
      <header class="net-ed-topo">
        <label>Nome <input type="text" data-campo-geral="nome" value="${esc(this.nome)}" maxlength="80"></label>
        <span class="net-nota">Arraste um andar para mover (em cima de outro, troca os dois). Clique num + para criar. Um ramo novo liga ao andar de cima do ramo à esquerda.</span>
        <div class="net-botoes"><button type="button" data-action="desfazer" ${this.sujo ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> Desfazer</button><button type="button" class="net-pronta" data-action="salvar" ${this.sujo ? '' : 'disabled'}><i class="fa-solid fa-floppy-disk"></i> Salvar</button></div>
      </header>
      <div class="net-ed-corpo">
        <div class="net-ed-grade-area">
          <div class="net-ed-entrada">Ponto de acesso</div>
          <div class="net-ed-grade" style="grid-template-columns: repeat(${colunas}, minmax(120px, 160px))">${cabecalho}${celulas.join('')}</div>
        </div>
        <aside class="net-ed-painel">${this.#painel()}</aside>
      </div>
    </div>`;
  }

  #rotulo(item) {
    if (item.tipo === 'ice') return item.ice && BLACK_ICE[item.ice] ? BLACK_ICE[item.ice].nome : 'Black ICE';
    if (item.tipo === 'demonio') return `Demônio ${(DEMONIOS[item.demonio] || DEMONIOS.imp).nome}`;
    if (item.tipo === 'netrunner') { const actor = item.ator ? fromUuidSync(item.ator) : null; return `Netrunner: ${item.nome || (actor && actor.name) || '?'}`; }
    return `${NOME_DO_TIPO[item.tipo] || item.tipo}${item.dv ? ` DV${item.dv}` : ''}`;
  }

  #painel() {
    const no = this.selecionado && this.noEm(this.selecionado);
    if (!no) return '<p class="net-nota">Escolha um andar na grade, ou crie um clicando num +.</p>';
    const netrunners = game.actors.filter(actor => (actor.itemTypes.role || []).some(role => /interface/i.test(role.system.mainRoleAbility || '')));
    const linha = (item, i) => {
      const opcoes = (lista, atual) => lista.map(([valor, rotulo]) => `<option value="${esc(valor)}"${String(valor) === String(atual) ? ' selected' : ''}>${esc(rotulo)}</option>`).join('');
      const campos = [];
      if (['senha', 'arquivo', 'controle'].includes(item.tipo)) campos.push(`<label>DV <select data-conteudo="${i}" data-campo="dv">${opcoes(DVS.map(dv => [dv, `DV ${dv}`]), item.dv || 6)}</select></label>`);
      if (item.tipo === 'ice') campos.push(`<label>Black ICE <select data-conteudo="${i}" data-campo="ice">${opcoes([['', 'Genérico (sem tipo)'], ...Object.entries(BLACK_ICE).map(([chave, ice]) => [chave, `${ice.nome} · ${ice.classe} · REZ ${ice.rez}`])], item.ice)}</select></label>`);
      if (item.tipo === 'demonio') campos.push(`<label>Demônio <select data-conteudo="${i}" data-campo="demonio">${opcoes(Object.entries(DEMONIOS).map(([chave, d]) => [chave, `${d.nome} · REZ ${d.rez} · Interface ${d.interface}`]), item.demonio || 'imp')}</select></label>`);
      if (item.tipo === 'netrunner') {
        campos.push(`<label>Ficha <select data-conteudo="${i}" data-campo="ator"><option value="">(escolha um netrunner)</option>${opcoes(netrunners.map(actor => [actor.uuid, actor.name]), item.ator)}</select></label>`);
        campos.push(`<label>Nome na NET <input type="text" data-conteudo="${i}" data-campo="nome" value="${esc(item.nome)}" placeholder="o nome da ficha"></label>`);
      }
      const rotuloDescricao = { arquivo: 'O que o arquivo é (vai para o diário do Eye-Dee)', controle: 'O que o nó controla (aparece ao tomar)' }[item.tipo] || 'Nota (só o mestre vê)';
      return `<li class="net-ed-conteudo">
        <div class="net-linha"><select data-conteudo="${i}" data-campo="tipo">${opcoes(TIPOS.map(tipo => [tipo, NOME_DO_TIPO[tipo]]), item.tipo)}</select><button type="button" class="net-perigo" data-action="remover" data-conteudo="${i}" title="Tirar este conteúdo"><i class="fa-solid fa-xmark"></i></button></div>
        ${campos.join('')}
        <label>${esc(rotuloDescricao)}<textarea data-conteudo="${i}" data-campo="descricao" rows="2">${esc(item.descricao)}</textarea></label>
      </li>`;
    };
    return `<h3>Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}</h3>
      <ul class="net-ed-lista">${no.conteudos.map(linha).join('') || '<li class="net-nota">Sem conteúdo: o andar some ao salvar.</li>'}</ul>
      <div class="net-botoes"><button type="button" data-action="adicionar"><i class="fa-solid fa-plus"></i> Conteúdo</button><button type="button" class="net-perigo" data-action="apagarAndar"><i class="fa-solid fa-trash"></i> Apagar o andar</button></div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const raiz = this.element;
    const nome = raiz.querySelector('[data-campo-geral="nome"]');
    if (nome) nome.addEventListener('input', event => { this.nome = event.target.value; this.#mudou(false); });
    for (const campo of raiz.querySelectorAll('[data-conteudo][data-campo]')) {
      campo.addEventListener('change', event => this.#editar(event.target));
      if (campo.tagName !== 'SELECT') campo.addEventListener('input', event => this.#editar(event.target, false));
    }
    // Arrastar e soltar os andares.
    for (const no of raiz.querySelectorAll('.net-ed-no[draggable]')) {
      no.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', no.dataset.pos); event.dataTransfer.effectAllowed = 'move'; no.classList.add('net-ed-arrastando'); });
      no.addEventListener('dragend', () => no.classList.remove('net-ed-arrastando'));
    }
    for (const alvo of raiz.querySelectorAll('[data-alvo]')) {
      alvo.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; alvo.classList.add('net-ed-sobre'); });
      alvo.addEventListener('dragleave', () => alvo.classList.remove('net-ed-sobre'));
      alvo.addEventListener('drop', event => {
        event.preventDefault();
        alvo.classList.remove('net-ed-sobre');
        this.mover(event.dataTransfer.getData('text/plain'), alvo.dataset.alvo);
      });
    }
  }

  // Move um andar para outra posição (ou troca com o que estiver lá).
  mover(origem, destino) {
    if (!origem || !destino || origem === destino) return;
    const de = this.noEm(origem);
    if (!de) return;
    const para = this.noEm(destino);
    const alvo = lerPos(destino);
    if (para) Object.assign(para, lerPos(origem));
    Object.assign(de, alvo);
    this.selecionado = destino;
    this.#mudou();
  }

  #editar(campo, redesenhar = true) {
    const no = this.noEm(this.selecionado);
    const item = no && no.conteudos[Number(campo.dataset.conteudo)];
    if (!item) return;
    const nome = campo.dataset.campo;
    if (nome === 'tipo') Object.assign(item, novoConteudo(campo.value), { descricao: item.descricao });
    else item[nome] = nome === 'dv' ? Number(campo.value) : campo.value;
    this.#mudou(redesenhar && (nome === 'tipo' || nome !== 'descricao'));
  }

  #mudou(redesenhar = true) {
    this.sujo = true;
    if (redesenhar) this.render();
    else {
      for (const botao of this.element.querySelectorAll('[data-action="salvar"], [data-action="desfazer"]')) botao.disabled = false;
      const titulo = this.element.querySelector('.window-title');
      if (titulo) titulo.textContent = this.title;
    }
  }

  static #escolher(event, alvo) { this.selecionado = alvo.dataset.pos; this.render(); }

  static #novo(event, alvo) {
    const { andar, ramo } = lerPos(alvo.dataset.pos);
    this.andares.push({ andar, ramo, conteudos: [novoConteudo('senha')] });
    this.selecionado = alvo.dataset.pos;
    this.#mudou();
  }

  static #apagarAndar() {
    this.andares = this.andares.filter(no => posDe(no) !== this.selecionado);
    this.selecionado = this.andares.length ? posDe(this.andares[0]) : null;
    this.#mudou();
  }

  static #adicionar() {
    const no = this.noEm(this.selecionado);
    if (no) { no.conteudos.push(novoConteudo('ice')); this.#mudou(); }
  }

  static #remover(event, alvo) {
    const no = this.noEm(this.selecionado);
    if (no) { no.conteudos.splice(Number(alvo.dataset.conteudo), 1); this.#mudou(); }
  }

  static async #salvar() {
    const { floors, defensores } = itemDosAndares(this.andares.filter(no => no.conteudos.length));
    try {
      await this.item.update({ name: this.nome.trim() || this.item.name, 'system.floors': floors, [`flags.${MODULE_ID}.defensores`]: defensores });
    } catch (error) {
      ui.notifications.error(`Não consegui salvar a arquitetura: ${error.message} (o compêndio está trancado?)`);
      return;
    }
    this.recarregar();
    this.selecionado = this.selecionado || (this.andares[0] ? posDe(this.andares[0]) : null);
    ui.notifications.info(`${this.item.name}: arquitetura salva (${floors.length} conteúdos nos andares${defensores.length ? `, ${defensores.length} defensores` : ''}).`);
    this.render();
  }

  static #desfazer() { this.recarregar(); this.render(); }
}
