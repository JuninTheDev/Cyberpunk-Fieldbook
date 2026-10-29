// O retrato do Painel Tático (o C25): um PNG (de preferência com fundo transparente) para cada estado de ferimento,
// guardado no próprio ator (flags.cpr-fieldbook.retrato), com tamanho, deslocamento e espelho. Quem é dono do ator configura;
// todos que veem o painel daquele ator veem o mesmo retrato. A janela mostra uma prévia com a barra embaixo.
import { SISTEMA } from '../config.mjs';
import { estiloAtual } from './estilo.mjs';
import { ESTADO_DO_FERIMENTO, ESTADOS, NOMES_DOS_ESTADOS, normalizarRetrato, imagemDoEstado, efeitoDoRetrato, modoDoRetrato, estadoDoRetrato } from './logica.mjs';
import { iconeNeon } from '../regras-icones.mjs';

const { ApplicationV2 } = foundry.applications.api;
const lerFormulario = form => new foundry.applications.ux.FormDataExtended(form).object;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const retratoDo = actor => normalizarRetrato(actor?.getFlag(SISTEMA, 'retrato'));

export function estadoDo(actor) {
  const morto = Boolean(actor?.statuses?.has(CONFIG.specialStatusEffects.DEFEATED));
  return estadoDoRetrato({ estado: ESTADO_DO_FERIMENTO[actor?.system?.ferimento?.chave], morto });
}

const reservaDo = (actor, token) => actor?.img || token?.texture?.src || iconeNeon('personagem');

// Tudo o que o painel precisa para desenhar o retrato agora.
export function vistaDoRetrato(actor, token, efeitos = 'semImagem', retrato = retratoDo(actor), estado = estadoDo(actor)) {
  const imagem = imagemDoEstado(retrato.imagens, estado, reservaDo(actor, token));
  return {
    ...retrato,
    estado,
    nomeDoEstado: NOMES_DOS_ESTADOS[estado],
    src: imagem.src,
    propria: imagem.propria,
    modo: modoDoRetrato(retrato),
    efeito: efeitoDoRetrato({ estado, propria: imagem.propria, modo: efeitos })
  };
}

// O HTML do retrato (o mesmo no painel e na prévia da janela).
// Livre: o PNG em pé sobre a barra, com o tamanho e o deslocamento do dono. Moldura: a imagem preenche o quadro.
// `trocou`: a imagem ou o estado mudaram desde o último desenho (só então a troca anima).
export function htmlDoRetrato(vista, { trocou = false } = {}) {
  const livre = vista.modo === 'livre';
  const estilo = livre
    ? `height: ${vista.escala}%; transform: translate(calc(-50% + ${vista.x}px), ${-vista.y}px)${vista.espelhar ? ' scaleX(-1)' : ''};`
    : (vista.espelhar ? 'transform: scaleX(-1);' : '');
  return `<div class="pt-retrato pt-retrato-${vista.modo}${vista.efeito ? ` pt-efeito-${vista.efeito}` : ''}${trocou ? ' pt-trocou' : ''}" data-estado="${vista.estado}">
    <img class="pt-retrato-img" src="${esc(vista.src)}" alt="" draggable="false" style="${estilo}">
    ${vista.estado === 'dead' ? '<span class="pt-flatline">FLATLINE</span>' : ''}
  </div>`;
}

const podeNavegar = () => game.user.can('FILES_BROWSE');
const SeletorDeArquivo = () => foundry.applications.apps.FilePicker.implementation;

export class JanelaDoRetrato extends ApplicationV2 {
  static abertas = new Map();

  constructor(actor) {
    super({ id: `${SISTEMA}-painel-retrato-${actor.id}` });
    this.actor = actor;
    this.rascunho = retratoDo(actor);
    this.estado = estadoDo(actor);
  }

  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'painel-tatico', 'pt-janela', 'pt-janela-retrato'],
    tag: 'section',
    window: { title: 'Retrato no painel', icon: 'fa-solid fa-image-portrait', resizable: true },
    position: { width: 780, height: 'auto' },
    actions: {
      escolher: JanelaDoRetrato.#escolher,
      limpar: JanelaDoRetrato.#limpar,
      usarDoAtor: JanelaDoRetrato.#usarDoAtor,
      verEstado: JanelaDoRetrato.#verEstado,
      salvar: JanelaDoRetrato.#salvar,
      restaurar: JanelaDoRetrato.#restaurar
    }
  };

  static abrir(actor) {
    if (!actor?.isOwner) { ui.notifications.warn('Só o dono do personagem muda o retrato dele.'); return null; }
    let janela = JanelaDoRetrato.abertas.get(actor.id);
    if (!janela) { janela = new JanelaDoRetrato(actor); JanelaDoRetrato.abertas.set(actor.id, janela); }
    janela.render({ force: true });
    if (janela.rendered) janela.bringToFront?.();
    return janela;
  }

  get title() { return `Retrato no painel · ${this.actor.name}`; }

  _onClose(options) {
    JanelaDoRetrato.abertas.delete(this.actor.id);
    super._onClose?.(options);
  }

  async _renderHTML() {
    const r = this.rascunho;
    const estilo = estiloAtual();
    const linhas = ESTADOS.map(estado => {
      const valor = r.imagens[estado] || '';
      const efetiva = imagemDoEstado(r.imagens, estado, reservaDo(this.actor));
      return `<div class="pt-rc-linha${this.estado === estado ? ' pt-ativa' : ''}" data-estado="${estado}">
        <button type="button" class="pt-rc-miniatura" data-action="verEstado" data-estado="${estado}" data-tooltip="Ver na prévia"><img src="${esc(efetiva.src)}" alt=""></button>
        <label><b>${NOMES_DOS_ESTADOS[estado]}</b>${estado === 'notWounded' ? ' <small>(base)</small>' : valor ? '' : ` <small>usa ${efetiva.de ? NOMES_DOS_ESTADOS[efetiva.de] : 'a imagem do ator'}</small>`}
          <input type="text" name="imagem-${estado}" value="${esc(valor)}" placeholder="${estado === 'notWounded' ? 'caminho ou endereço do PNG' : 'vazio: a do estado anterior, com o efeito'}">
        </label>
        <span class="pt-rc-botoes">
          ${podeNavegar() ? `<button type="button" data-action="escolher" data-estado="${estado}" data-tooltip="Escolher o arquivo"><i class="fa-solid fa-folder-open"></i></button>` : ''}
          <button type="button" data-action="limpar" data-estado="${estado}" data-tooltip="Tirar a imagem deste estado"><i class="fa-solid fa-xmark"></i></button>
        </span>
      </div>`;
    }).join('');
    const vista = vistaDoRetrato(this.actor, null, estilo.efeitos || 'semImagem', r, this.estado);
    return `<div class="pt-rc">
      <div class="pt-rc-previa" style="--pt-retrato-altura: ${Math.min(280, estilo.retratoAltura || 330)}px;">
        <div class="pt-rc-palco">${htmlDoRetrato(vista)}<div class="pt-rc-barra"><b>${esc(this.actor.name)}</b><span>${NOMES_DOS_ESTADOS[this.estado]}</span></div></div>
        <div class="pt-rc-estados">${ESTADOS.map(estado => `<button type="button" class="${this.estado === estado ? 'pt-ativa' : ''}" data-action="verEstado" data-estado="${estado}">${NOMES_DOS_ESTADOS[estado]}</button>`).join('')}</div>
      </div>
      <form class="pt-rc-campos">
        <p class="pt-nota">PNG com fundo transparente, de corpo inteiro ou da cintura para cima (umas 600 px de altura bastam). Cada estado é opcional: sem imagem, vale a do estado mais leve, com o efeito automático (tinta, falha de sinal, cinza do morto), que cada jogador liga ou desliga no estilo do painel.</p>
        ${podeNavegar() ? '' : '<p class="pt-nota pt-aviso">Sem permissão para navegar nos arquivos do Foundry: cole o endereço da imagem (de um site, ou um caminho que o mestre já subiu). O mestre libera em Configurar permissões → "Usar o navegador de arquivos".</p>'}
        ${linhas}
        <div class="pt-rc-ajustes">
          <label>Modo <select name="modo">
            <option value="auto"${r.modo === 'auto' ? ' selected' : ''}>Automático</option>
            <option value="livre"${r.modo === 'livre' ? ' selected' : ''}>PNG livre (sai da barra)</option>
            <option value="moldura"${r.modo === 'moldura' ? ' selected' : ''}>Moldura (dentro da barra)</option>
          </select></label>
          <label>Tamanho <input type="range" name="escala" min="40" max="250" step="5" value="${r.escala}"><output>${r.escala}%</output></label>
          <label>Para os lados <input type="range" name="x" min="-300" max="300" step="2" value="${r.x}"><output>${r.x} px</output></label>
          <label>Para cima <input type="range" name="y" min="-300" max="300" step="2" value="${r.y}"><output>${r.y} px</output></label>
          <label class="pt-caixa"><input type="checkbox" name="espelhar"${r.espelhar ? ' checked' : ''}> Espelhar</label>
        </div>
        <footer class="pt-rodape">
          <button type="button" data-action="usarDoAtor" data-tooltip="A imagem da ficha como base"><i class="fa-solid fa-user"></i> Usar a imagem da ficha</button>
          <button type="button" data-action="restaurar"><i class="fa-solid fa-rotate-left"></i> Tirar tudo</button>
          <button type="button" class="pt-principal" data-action="salvar"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
        </footer>
      </form>
    </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    const form = content.querySelector('form');
    form.addEventListener('submit', evento => evento.preventDefault());
    form.addEventListener('input', () => this.#lerCampos(true));
    form.addEventListener('change', () => this.#lerCampos(false));
  }

  // Lê os campos para o rascunho. Arrastando um controle, só a prévia muda (e o número ao lado); ao soltar, redesenha.
  #lerCampos(soPrevia) {
    const form = this.element?.querySelector('form');
    if (!form) return;
    const dados = lerFormulario(form);
    const imagens = {};
    for (const estado of ESTADOS) imagens[estado] = String(dados[`imagem-${estado}`] || '').trim();
    this.rascunho = normalizarRetrato({ imagens, modo: dados.modo, escala: dados.escala, x: dados.x, y: dados.y, espelhar: dados.espelhar });
    for (const campo of form.querySelectorAll('input[type="range"]')) {
      const saida = campo.nextElementSibling;
      if (saida) saida.textContent = campo.name === 'escala' ? `${campo.value}%` : `${campo.value} px`;
    }
    if (soPrevia) this.#atualizarPrevia();
    else this.render();
  }

  #atualizarPrevia() {
    const palco = this.element?.querySelector('.pt-rc-palco');
    if (!palco) return;
    const estilo = estiloAtual();
    const vista = vistaDoRetrato(this.actor, null, estilo.efeitos || 'semImagem', this.rascunho, this.estado);
    palco.querySelector('.pt-retrato')?.remove();
    palco.insertAdjacentHTML('afterbegin', htmlDoRetrato(vista));
  }

  static #escolher(evento, alvo) {
    const estado = alvo.dataset.estado;
    const Seletor = SeletorDeArquivo();
    new Seletor({
      type: 'image',
      current: this.rascunho.imagens[estado] || '',
      callback: caminho => {
        this.rascunho = normalizarRetrato({ ...this.rascunho, imagens: { ...this.rascunho.imagens, [estado]: caminho } });
        this.estado = estado;
        this.render();
      }
    }).render(true);
  }

  static #limpar(evento, alvo) {
    const imagens = { ...this.rascunho.imagens };
    delete imagens[alvo.dataset.estado];
    this.rascunho = normalizarRetrato({ ...this.rascunho, imagens });
    this.render();
  }

  static #usarDoAtor() {
    this.rascunho = normalizarRetrato({ ...this.rascunho, imagens: { ...this.rascunho.imagens, notWounded: this.actor.img } });
    this.render();
  }

  static #verEstado(evento, alvo) {
    this.estado = alvo.dataset.estado;
    this.render();
  }

  static async #restaurar() {
    this.rascunho = normalizarRetrato({});
    this.render();
  }

  // Grava os cinco estados sempre (vazio apaga): a flag é mesclada pelo Foundry, e uma chave ausente ficaria.
  static async #salvar() {
    const r = this.rascunho;
    const imagens = Object.fromEntries(ESTADOS.map(estado => [estado, r.imagens[estado] || '']));
    await this.actor.setFlag(SISTEMA, 'retrato', { ...r, imagens });
    ui.notifications.info(`Retrato de ${this.actor.name} salvo.`);
    this.close({ animate: false });
  }
}
