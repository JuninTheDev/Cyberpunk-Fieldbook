// O estilo do Painel Tático (o C25): cada jogador tem o seu (configuração do cliente, neste navegador), começando do padrão da mesa
// (o mestre define). Tema, cores, fonte, cantos, brilho, tamanho do painel e do retrato, posição, ordem das seções,
// peças escondidas e os botões de HP. Um código de texto (PT1:…) leva o visual de um jogador para outro.
import { SISTEMA } from '../config.mjs';
import { TEMAS, FONTES, SECOES, PECAS, CANTOS, LADOS, EFEITOS, ESTILO_PADRAO, normalizarEstilo, aplicarTema, codigoDoEstilo, lerCodigo, semPosicao } from './logica.mjs';

const { ApplicationV2 } = foundry.applications.api;
const lerFormulario = form => new foundry.applications.ux.FormDataExtended(form).object;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function registrarEstilo(aoMudar) {
  game.settings.register(SISTEMA, 'painelEstilo', { scope: 'client', config: false, type: Object, default: null, onChange: () => aoMudar() });
  game.settings.register(SISTEMA, 'painelEstiloDaMesa', { scope: 'world', config: false, type: Object, default: null, onChange: () => aoMudar() });
}

export const estiloDaMesa = () => normalizarEstilo(game.settings.get(SISTEMA, 'painelEstiloDaMesa'));
export const estiloAtual = () => normalizarEstilo(game.settings.get(SISTEMA, 'painelEstilo'), estiloDaMesa());
export const temEstiloProprio = () => Boolean(game.settings.get(SISTEMA, 'painelEstilo'));
export const salvarEstilo = estilo => game.settings.set(SISTEMA, 'painelEstilo', normalizarEstilo(estilo, estiloDaMesa()));

const opcoes = (lista, atual) => Object.entries(lista).map(([valor, rotulo]) => `<option value="${valor}"${valor === atual ? ' selected' : ''}>${esc(typeof rotulo === 'string' ? rotulo : rotulo.nome)}</option>`).join('');

export class JanelaDeEstilo extends ApplicationV2 {
  static instancia = null;

  constructor(painel) {
    super({ id: `${SISTEMA}-painel-estilo` });
    this.painel = painel;
    this.rascunho = estiloAtual();
    this.mensagem = '';
  }

  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'painel-tatico', 'pt-janela', 'pt-janela-estilo'],
    tag: 'section',
    window: { title: 'Estilo do Painel Tático', icon: 'fa-solid fa-palette', resizable: true },
    position: { width: 560, height: 720 },
    actions: {
      tema: JanelaDeEstilo.#tema,
      subir: JanelaDeEstilo.#subir,
      descer: JanelaDeEstilo.#descer,
      voltarParaBase: JanelaDeEstilo.#voltarParaBase,
      copiar: JanelaDeEstilo.#copiar,
      colar: JanelaDeEstilo.#colar,
      padraoDaMesa: JanelaDeEstilo.#padraoDaMesa,
      definirDaMesa: JanelaDeEstilo.#definirDaMesa
    }
  };

  static abrir(painel) {
    if (!JanelaDeEstilo.instancia) JanelaDeEstilo.instancia = new JanelaDeEstilo(painel);
    const janela = JanelaDeEstilo.instancia;
    janela.rascunho = estiloAtual();
    janela.render({ force: true });
    if (janela.rendered) janela.bringToFront?.();
    return janela;
  }

  _onClose(options) {
    JanelaDeEstilo.instancia = null;
    super._onClose?.(options);
  }

  async _renderHTML() {
    const e = this.rascunho;
    const visivel = chave => !e.ocultos.includes(chave);
    const temas = Object.entries(TEMAS).map(([chave, t]) => `<button type="button" class="pt-tema${e.tema === chave ? ' pt-ativa' : ''}" data-action="tema" data-tema="${chave}" style="--a: ${t.acento}; --b: ${t.acento2}; --c: ${t.destaque}; --f: ${t.fundo};">
        <span class="pt-tema-cores"><i></i><i></i><i></i></span>${esc(t.nome)}</button>`).join('');
    const cor = (nome, rotulo) => `<label class="pt-cor">${rotulo}<input type="color" name="${nome}" value="${e[nome]}"></label>`;
    const faixa = (nome, rotulo, min, max, passo, unidade) => `<label class="pt-faixa">${rotulo}<input type="range" name="${nome}" min="${min}" max="${max}" step="${passo}" value="${e[nome]}"><output>${e[nome]}${unidade}</output></label>`;
    const caixa = (nome, rotulo, marcado) => `<label class="pt-caixa"><input type="checkbox" name="${nome}"${marcado ? ' checked' : ''}> ${rotulo}</label>`;
    const secoes = e.secoes.map((chave, i) => `<li><label class="pt-caixa"><input type="checkbox" name="mostrar-${chave}"${visivel(chave) ? ' checked' : ''}> ${SECOES[chave]}</label>
        <span><button type="button" data-action="subir" data-secao="${chave}"${i === 0 ? ' disabled' : ''} data-tooltip="Mais para o começo"><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-action="descer" data-secao="${chave}"${i === e.secoes.length - 1 ? ' disabled' : ''} data-tooltip="Mais para o fim"><i class="fa-solid fa-arrow-down"></i></button></span></li>`).join('');
    const pecas = Object.entries(PECAS).map(([chave, rotulo]) => caixa(`mostrar-${chave}`, rotulo, visivel(chave))).join('');
    const proprio = temEstiloProprio();
    return `<form class="pt-estilo">
      <section><h3><i class="fa-solid fa-swatchbook"></i> Tema</h3><div class="pt-temas">${temas}</div>
        <div class="pt-cores">${cor('acento', 'Destaque')}${cor('acento2', 'Alerta')}${cor('destaque', 'Realce')}${cor('fundo', 'Fundo')}${cor('texto', 'Texto')}</div>
        ${e.tema === 'personalizado' ? '<p class="pt-nota">Cores personalizadas (escolher um tema troca as cinco).</p>' : ''}
      </section>
      <section><h3><i class="fa-solid fa-wand-magic-sparkles"></i> Aparência</h3>
        <div class="pt-grade">
          <label>Fonte <select name="fonte">${opcoes(FONTES, e.fonte)}</select></label>
          <label>Cantos <select name="cantos">${opcoes(CANTOS, e.cantos)}</select></label>
          ${faixa('opacidade', 'Opacidade do fundo', 30, 100, 1, '%')}
          ${faixa('desfoque', 'Desfoque atrás', 0, 20, 1, ' px')}
        </div>
        <div class="pt-linha">${caixa('brilho', 'Brilho neon', e.brilho)}${caixa('scanlines', 'Linhas de varredura', e.scanlines)}${caixa('animacoes', 'Animações', e.animacoes)}${caixa('compacto', 'Compacto', e.compacto)}</div>
      </section>
      <section><h3><i class="fa-solid fa-image-portrait"></i> Retrato</h3>
        <div class="pt-grade">
          ${faixa('retratoAltura', 'Altura do retrato', 120, 560, 10, ' px')}
          <label>Lado <select name="retratoLado">${opcoes(LADOS, e.retratoLado)}</select></label>
          <label class="pt-largo">Efeitos de ferimento <select name="efeitos">${opcoes(EFEITOS, e.efeitos)}</select></label>
        </div>
        <p class="pt-nota">A imagem de cada estado é do personagem: o dono troca pelo botão <i class="fa-solid fa-image-portrait"></i> do painel (ou clique direito no retrato).</p>
      </section>
      <section><h3><i class="fa-solid fa-up-down-left-right"></i> Tamanho e posição</h3>
        <div class="pt-grade">
          ${faixa('escala', 'Tamanho do painel', 50, 160, 5, '%')}
          <label>Posição <select name="posicao"><option value="base"${e.posicao === 'base' ? ' selected' : ''}>Na base da tela</option><option value="livre"${e.posicao === 'livre' ? ' selected' : ''}>Onde eu arrastar</option></select></label>
          ${e.posicao === 'base' ? faixa('base', 'Distância da base', 0, 400, 2, ' px') : '<button type="button" data-action="voltarParaBase"><i class="fa-solid fa-arrows-down-to-line"></i> Voltar para a base</button>'}
        </div>
        <p class="pt-nota">Arraste o painel pela alça <i class="fa-solid fa-grip-vertical"></i>; dois cliques nela voltam para a base.</p>
      </section>
      <section><h3><i class="fa-solid fa-table-columns"></i> Seções e peças</h3>
        <ol class="pt-secoes">${secoes}</ol>
        <div class="pt-pecas">${pecas}</div>
        <label class="pt-largo">Botões de HP <input type="text" name="passosHp" value="${esc(e.passosHp)}" placeholder="-5 -1 +1 +5"></label>
      </section>
      <section><h3><i class="fa-solid fa-share-nodes"></i> Compartilhar</h3>
        <p class="pt-nota">Copie o código e mande para outro jogador; ele cola aqui. Leva o visual, não a posição.</p>
        <textarea class="pt-codigo" readonly rows="2">${esc(codigoDoEstilo(e))}</textarea>
        <div class="pt-linha"><button type="button" data-action="copiar"><i class="fa-solid fa-copy"></i> Copiar código</button></div>
        <textarea name="colado" rows="2" placeholder="Cole aqui um código PT1:…"></textarea>
        <div class="pt-linha"><button type="button" data-action="colar"><i class="fa-solid fa-paste"></i> Aplicar o código colado</button>${this.mensagem ? `<span class="pt-nota pt-aviso">${esc(this.mensagem)}</span>` : ''}</div>
      </section>
      <footer class="pt-rodape">
        <button type="button" data-action="padraoDaMesa"${proprio ? '' : ' disabled'} data-tooltip="Esquece o seu estilo e usa o do mestre"><i class="fa-solid fa-rotate-left"></i> Voltar ao padrão da mesa</button>
        ${game.user.isGM ? '<button type="button" data-action="definirDaMesa" data-tooltip="Quem não mudou o próprio estilo passa a ver este"><i class="fa-solid fa-users"></i> Usar como padrão da mesa</button>' : ''}
      </footer>
    </form>`;
  }

  _replaceHTML(html, content) {
    const rolagem = content.scrollTop;
    content.innerHTML = html;
    content.scrollTop = rolagem;
    const form = content.querySelector('form');
    form.addEventListener('submit', evento => evento.preventDefault());
    // Arrastando: só a prévia (o painel muda na hora). Soltando: salva.
    form.addEventListener('input', evento => { if (evento.target.name !== 'colado') this.#ler(false); });
    form.addEventListener('change', evento => { if (evento.target.name !== 'colado') this.#ler(true); });
  }

  #ler(salvar) {
    const form = this.element?.querySelector('form');
    if (!form) return;
    const d = lerFormulario(form);
    const ocultos = [...Object.keys(SECOES), ...Object.keys(PECAS)].filter(chave => form.querySelector(`[name="mostrar-${chave}"]`) && !d[`mostrar-${chave}`]);
    const cores = ['acento', 'acento2', 'destaque', 'fundo', 'texto'];
    const mudouCor = cores.some(chave => d[chave] && d[chave] !== this.rascunho[chave]);
    const novo = normalizarEstilo({ ...this.rascunho, ...d, ocultos, tema: mudouCor ? 'personalizado' : this.rascunho.tema });
    for (const campo of form.querySelectorAll('input[type="range"]')) {
      const saida = campo.nextElementSibling;
      if (saida) saida.textContent = `${campo.value}${saida.textContent.replace(/^-?[\d.]+/, '')}`;
    }
    const mudouPosicao = novo.posicao !== this.rascunho.posicao || novo.tema !== this.rascunho.tema;
    this.rascunho = novo;
    this.painel?.aplicarEstilo(novo);
    if (!salvar) return;
    salvarEstilo(novo);
    if (mudouPosicao) this.render();
  }

  #trocar(mudanca) {
    this.rascunho = normalizarEstilo({ ...this.rascunho, ...mudanca });
    salvarEstilo(this.rascunho);
    this.render();
  }

  static #tema(evento, alvo) {
    this.rascunho = aplicarTema(this.rascunho, alvo.dataset.tema);
    salvarEstilo(this.rascunho);
    this.render();
  }

  static #subir(evento, alvo) { this.#mover(alvo.dataset.secao, -1); }
  static #descer(evento, alvo) { this.#mover(alvo.dataset.secao, 1); }
  #mover(secao, passo) {
    const lista = [...this.rascunho.secoes];
    const i = lista.indexOf(secao);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.#trocar({ secoes: lista });
  }

  static #voltarParaBase() { this.#trocar({ posicao: 'base', x: null, y: null }); }

  static async #copiar() {
    const codigo = codigoDoEstilo(this.rascunho);
    try {
      await globalThis.navigator.clipboard.writeText(codigo);
      ui.notifications.info('Código do estilo copiado.');
    } catch {
      const campo = this.element.querySelector('.pt-codigo');
      campo.select();
      ui.notifications.info('Selecionei o código: copie com Ctrl+C.');
    }
  }

  static #colar() {
    const texto = this.element.querySelector('[name="colado"]')?.value || '';
    try {
      this.rascunho = lerCodigo(texto, this.rascunho);
      this.mensagem = '';
      salvarEstilo(this.rascunho);
      ui.notifications.info('Estilo aplicado.');
    } catch (error) {
      this.mensagem = error.message;
    }
    this.render();
  }

  static async #padraoDaMesa() {
    await game.settings.set(SISTEMA, 'painelEstilo', null);
    this.rascunho = estiloAtual();
    this.render();
  }

  static async #definirDaMesa() {
    if (!game.user.isGM) return;
    await game.settings.set(SISTEMA, 'painelEstiloDaMesa', normalizarEstilo({ ...semPosicao(this.rascunho), base: this.rascunho.base, posicao: 'base' }));
    ui.notifications.info('Este é o estilo padrão da mesa agora (para quem não mudou o próprio).');
    this.render();
  }
}

export { ESTILO_PADRAO };
