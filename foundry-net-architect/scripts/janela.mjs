// A janela da NET (ApplicationV2): HUD do netrunner (Interface, Ações NET, Sorte, situação), o cyberdeck com os
// programas e o REZ deles, as habilidades de Interface com o alvo, o nó de controle com os comandos da cena,
// o mapa ramificado da arquitetura e o registro. Abre só no cliente do dono do token e no do mestre.
// O mestre vê a arquitetura inteira (com o que ainda está escondido dos jogadores) e o painel dos inimigos.
import { MODULE_ID, HABILIDADES, NOME_DO_TIPO, iceDaChave, demonioDaChave } from './constantes.mjs';
import { ENTRADA, coluna } from './arquitetura.mjs';
import { pontoDoTile, estadoDoTile, netrunnerDo, arquiteturaDoPonto, emCombate } from './estado.mjs';
import { emChamas } from './efeitos.mjs';
import { TIPOS as TIPOS_DE_LIGACAO, nomeDe as nomeDaLigacao, situacao as situacaoDaLigacao, ligacoesDo } from './ligacoes.mjs';
import { pedir } from './socket.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICONE = { senha: 'fa-key', arquivo: 'fa-file-lines', controle: 'fa-tower-broadcast', ice: 'fa-skull', demonio: 'fa-ghost', netrunner: 'fa-user-ninja', vazio: 'fa-circle' };
const CLASSE_PROGRAMA = { booster: 'Booster', defender: 'Defensor', antipersonnelattacker: 'Ataque anti-pessoal', antiprogramattacker: 'Ataque anti-programa', blackice: 'Black ICE' };
const INIMIGOS = ['ice', 'demonio', 'netrunner'];
const ehInimigo = item => INIMIGOS.includes(item.tipo);
const ativo = item => ehInimigo(item) && item.inimigo && (item.tipo === 'netrunner' ? item.inimigo.ativo : item.inimigo.rezAtual > 0);
const LARGURA = 152;
const ALTURA = 60;
const PASSO_X = 172;
const PASSO_Y = 84;

export class JanelaNet extends ApplicationV2 {
  static abertas = new Map();

  constructor({ tile, tokenId = null, gm = false }) {
    super({ id: `${MODULE_ID}-${tile.id}-${gm ? 'mestre' : tokenId}` });
    this.tile = tile;
    this.tokenId = tokenId;
    this.gm = gm;
    this.selecionado = null;
    this.alvo = '';
    this.sorte = 0;
    this.textos = { virus: '', comando: '' };
    this.ocupado = false;
  }

  static DEFAULT_OPTIONS = {
    classes: ['net-architect', 'net-janela'],
    tag: 'section',
    window: { title: 'NET', icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 1060, height: 740 },
    actions: {
      selecionar: JanelaNet.#selecionar,
      mover: JanelaNet.#mover,
      habilidade: JanelaNet.#habilidade,
      programa: JanelaNet.#programa,
      comandar: JanelaNet.#comandar,
      acionar: JanelaNet.#acionar,
      abrirArquivo: JanelaNet.#abrirArquivo,
      apagarFogo: JanelaNet.#apagarFogo,
      desconectar: JanelaNet.#desconectar,
      escolherCorredor: JanelaNet.#escolherCorredor,
      inimigoAtaca: JanelaNet.#inimigoAtaca,
      ajustarIce: JanelaNet.#ajustarIce,
      revelar: JanelaNet.#revelar,
      zerarAcoes: JanelaNet.#zerarAcoes,
      reiniciar: JanelaNet.#reiniciar,
      configurar: JanelaNet.#configurar
    }
  };

  // Abre (ou traz para frente) a janela de um netrunner, ou o painel do mestre do ponto de acesso.
  static abrir(tile, { tokenId = null, gm = false } = {}) {
    const id = `${MODULE_ID}-${tile.id}-${gm ? 'mestre' : tokenId}`;
    let janela = JanelaNet.abertas.get(id);
    if (!janela) {
      janela = new JanelaNet({ tile, tokenId, gm });
      JanelaNet.abertas.set(id, janela);
    }
    janela.render({ force: true });
    if (janela.rendered) janela.bringToFront?.();
    return janela;
  }

  static redesenhar(filtro = () => true) {
    for (const janela of JanelaNet.abertas.values()) if (janela.rendered && filtro(janela)) janela.render();
  }

  get title() {
    const ponto = pontoDoTile(this.tile) || {};
    const token = this.tokenId ? this.tile.parent.tokens.get(this.tokenId) : null;
    return `NET · ${ponto.nome || 'Ponto de acesso'}${token ? ` · ${token.name}` : ''}${this.gm ? ' (mestre)' : ''}`;
  }

  _onClose(options) {
    JanelaNet.abertas.delete(this.id);
    if (this.observador) this.observador.disconnect();
    super._onClose?.(options);
  }

  async _prepareContext() {
    const ponto = pontoDoTile(this.tile) || {};
    const est = estadoDoTile(this.tile) || { corredores: [], nos: [], log: [], vistos: [], feitos: [] };
    if (this.gm && !this.tokenId && est.corredores.length) this.tokenId = est.corredores[0].token;
    const corredor = est.corredores.find(item => item.token === this.tokenId) || null;
    const token = this.tokenId ? this.tile.parent.tokens.get(this.tokenId) : null;
    const actor = token ? token.actor : null;
    let arq = null;
    if (this.gm) { try { arq = await arquiteturaDoPonto(ponto); } catch { arq = null; } }
    return { ponto, est, corredor, token, actor, n: actor ? netrunnerDo(actor) : null, arq };
  }

  // ---------------- Desenho ----------------
  async _renderHTML(ctx) {
    const { est, corredor, actor } = ctx;
    if (!this.gm && !corredor) return `<div class="net-vazio"><p>Este netrunner não está conectado.</p></div>`;
    const nos = this.#nosDoMapa(ctx);
    const selecionado = this.selecionado || (corredor ? corredor.no : ENTRADA);
    return `<div class="net-grade${this.ocupado ? ' net-ocupado' : ''}">
      ${this.#topo(ctx, nos)}
      <div class="net-mapa-area">
        ${this.#mapa(nos, ctx, selecionado)}
        ${this.#detalhe(nos, ctx, selecionado)}
        <footer class="net-log">${(est.log || []).slice(-20).map(linha => `<p class="net-log-${esc(linha.tipo)}">${esc(linha.texto)}</p>`).join('') || '<p class="net-nota">Nada aconteceu ainda.</p>'}</footer>
      </div>
      <aside class="net-hud">
        ${corredor && actor ? this.#hud(ctx, nos) : '<p class="net-nota">Ninguém conectado. Os jogadores conectam clicando no marcador NET do ponto de acesso, perto dele.</p>'}
        ${this.gm ? this.#painelDoMestre(ctx, nos, selecionado) : ''}
      </aside>
      ${this.ocupado ? '<div class="net-espera"><i class="fa-solid fa-circle-notch fa-spin"></i> Resolvendo… se abrir a janela de rolagem, confirme lá.</div>' : ''}
    </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    const log = content.querySelector('.net-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  // O mapa cabe na área (largura e altura) com o texto legível: entre 0,8× e 1,3× do tamanho natural.
  // Se não couber, rola, com o andar do netrunner à vista. Reajusta quando a janela muda de tamanho.
  #ajustarMapa() {
    const area = this.element && this.element.querySelector('.net-mapa');
    const svg = area && area.querySelector('svg');
    if (!svg) return;
    const [, , largura, altura] = svg.getAttribute('viewBox').split(' ').map(Number);
    const escala = Math.max(0.8, Math.min(1.3, (area.clientWidth - 16) / largura, (area.clientHeight - 16) / altura));
    svg.style.width = `${Math.round(largura * escala)}px`;
    svg.style.height = `${Math.round(altura * escala)}px`;
    const atual = svg.querySelector('.net-no-atual');
    if (atual && area.scrollHeight > area.clientHeight) {
      const caixa = atual.getBoundingClientRect();
      const visivel = area.getBoundingClientRect();
      if (caixa.bottom > visivel.bottom || caixa.top < visivel.top) area.scrollTop += caixa.top - visivel.top - visivel.height / 3;
    }
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const area = this.element.querySelector('.net-mapa');
    if (this.observador) this.observador.disconnect();
    if (area && typeof ResizeObserver === 'function') {
      this.observador = new ResizeObserver(() => this.#ajustarMapa());
      this.observador.observe(area);
    }
    this.#ajustarMapa();
    const sorte = this.element.querySelector('[data-campo="sorte"]');
    if (sorte) sorte.addEventListener('input', event => { this.sorte = Number(event.target.value) || 0; });
    const alvo = this.element.querySelector('[data-campo="alvo"]');
    if (alvo) alvo.addEventListener('change', event => { this.alvo = event.target.value; });
    for (const campo of this.element.querySelectorAll('[data-texto]')) campo.addEventListener('input', event => { this.textos[event.target.dataset.texto] = event.target.value; });
  }

  // Os nós que esta janela mostra: para o jogador, a vista pública do estado; para o mestre, a arquitetura inteira
  // (com a marca do que os jogadores já viram).
  #nosDoMapa({ est, arq }) {
    if (this.gm && arq) {
      const publicos = Object.fromEntries((est.nos || []).map(no => [no.id, no]));
      const feitos = new Set(est.feitos || []);
      const fora = new Set(est.fora || []);
      const rez = Object.fromEntries((est.ices || []).map(item => [item.chave, item.rez]));
      return Object.values(arq.nos).map(no => ({
        id: no.id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: true, publico: Boolean(publicos[no.id] && publicos[no.id].visto),
        conteudos: no.conteudos.map(conteudo => {
          let inimigo = null;
          if (conteudo.tipo === 'ice') inimigo = { ...iceDaChave(conteudo.ice), modelo: conteudo.ice };
          if (conteudo.tipo === 'demonio') inimigo = { ...demonioDaChave(conteudo.demonio), nome: conteudo.nome || demonioDaChave(conteudo.demonio).nome, classe: 'Demônio', modelo: conteudo.demonio };
          if (inimigo) inimigo.rezAtual = rez[conteudo.chave] ?? inimigo.rez;
          if (conteudo.tipo === 'netrunner') {
            const actor = conteudo.ator ? fromUuidSync(conteudo.ator) : null;
            inimigo = { nome: conteudo.nome || (actor && actor.name) || 'Netrunner inimigo', classe: 'Netrunner inimigo', rez: null, rezAtual: null, ativo: !fora.has(conteudo.chave) };
          }
          const publico = publicos[no.id] && (publicos[no.id].conteudos || []).find(item => item.chave === conteudo.chave);
          return { ...conteudo, inimigo, diario: publico ? publico.diario : '', feito: inimigo ? !(conteudo.tipo === 'netrunner' ? inimigo.ativo : inimigo.rezAtual > 0) : feitos.has(conteudo.chave) };
        })
      }));
    }
    return (est.nos || []).map(no => ({ ...no, publico: no.visto }));
  }

  #topo({ est, arq, corredor, actor, n, token }, nos) {
    const nome = est.nome || (arq && arq.nome) || 'Arquitetura';
    const dv = est.dv || (arq && arq.dv) || '?';
    let netrunner = '';
    if (corredor && actor && n) {
      const hp = actor.system.derivedStats && actor.system.derivedStats.hp;
      const sorte = Number(actor.system.stats && actor.system.stats.luck && actor.system.stats.luck.value) || 0;
      const pips = Array.from({ length: corredor.max }, (_, i) => `<i class="net-pip${i < corredor.acoes ? ' net-pip-usado' : ''}"></i>`).join('');
      const aqui = nos.find(no => no.id === corredor.no);
      const onde = corredor.no === ENTRADA ? 'no ponto de acesso' : aqui ? `no andar ${aqui.andar}${aqui.ramo !== 'a' ? aqui.ramo.toUpperCase() : ''}` : 'na arquitetura';
      const engajados = ((aqui && aqui.conteudos) || []).filter(item => ativo(item) && (corredor.engajado || []).includes(item.chave)).map(item => item.inimigo.nome);
      netrunner = `<div class="net-corredor">
          <img src="${esc(corredor.img || actor.img)}" alt="">
          <div class="net-quem"><b>${esc(corredor.nome)}</b><small>Interface ${n.rank} · ${esc(onde)}${engajados.length ? ` · <span class="net-alerta">${esc(engajados.join(', '))} engajado</span>` : ''}</small></div>
          <div class="net-numeros">
            ${token && emCombate(token)
              ? `<span title="Ações NET que sobram neste turno (voltam no turno do netrunner)">Ações <span class="net-pips">${pips}</span> <b>${Math.max(0, corredor.max - corredor.acoes)}/${corredor.max}</b></span>`
              : `<span title="Fora de combate as Ações NET não contam; em combate são ${corredor.max} por turno">Ações <b>livres</b> <small>(${corredor.max} por turno em combate)</small></span>`}
            ${hp ? `<span>HP <b class="${hp.value < hp.max / 2 ? 'net-ruim' : ''}">${hp.value}/${hp.max}</b></span>` : ''}
            <label title="Sorte gasta na próxima rolagem">Sorte <input type="number" data-campo="sorte" min="0" max="${sorte}" value="${Math.min(this.sorte, sorte)}"> <small>/${sorte}</small></label>
          </div>
        </div>`;
    }
    return `<header class="net-topo">
      <div class="net-arq"><b>${esc(nome)}</b><span>DV ${esc(dv)}</span>${est.mapa ? '<span class="net-tag">mapa revelado</span>' : ''}</div>
      ${this.gm ? this.#seletorDeCorredor({ est }) : ''}
      ${netrunner}
      ${this.gm ? `<button type="button" class="net-mini" data-action="configurar" title="Configurar o ponto de acesso"><i class="fa-solid fa-gear"></i></button>` : ''}
    </header>`;
  }

  #mapa(nos, { est, corredor }, selecionado) {
    const porId = Object.fromEntries(nos.map(no => [no.id, no]));
    const entrada = { id: ENTRADA, andar: 0, ramo: 'a', visto: true };
    const todos = [entrada, ...nos];
    const pos = no => ({ x: 12 + coluna(no) * PASSO_X, y: 12 + no.andar * PASSO_Y });
    const largura = 24 + Math.max(...todos.map(coluna)) * PASSO_X + LARGURA;
    const altura = 24 + Math.max(...todos.map(no => no.andar)) * PASSO_Y + ALTURA;
    const vizinhos = new Set();
    if (corredor) {
      const atual = porId[corredor.no];
      if (atual && atual.pai) vizinhos.add(atual.pai);
      for (const no of nos) if (no.pai === corredor.no) vizinhos.add(no.id);
    }
    const linhas = nos.filter(no => no.pai && (porId[no.pai] || no.pai === ENTRADA)).map(no => {
      const a = pos(no.pai === ENTRADA ? entrada : porId[no.pai]);
      const b = pos(no);
      const x1 = a.x + LARGURA / 2;
      const y1 = a.y + ALTURA;
      const x2 = b.x + LARGURA / 2;
      const meio = y1 + (b.y - y1) / 2;
      return `<path class="net-ligacao${no.visto ? '' : ' net-ligacao-oculta'}" d="M${x1},${y1} L${x1},${meio} L${x2},${meio} L${x2},${b.y}"/>`;
    }).join('');
    const corredores = est.corredores || [];
    const caixas = todos.map(no => {
      const { x, y } = pos(no);
      const conteudos = no.conteudos || [];
      const principal = conteudos.find(ehInimigo) || conteudos[0];
      const tipo = no.id === ENTRADA ? 'entrada' : !no.visto ? 'oculto' : principal ? principal.tipo : 'vazio';
      const classes = ['net-no', `net-tipo-${tipo === 'demonio' || tipo === 'netrunner' ? 'ice' : tipo}`, this.gm && no.id !== ENTRADA && !no.publico ? 'net-no-secreto' : '', no.id === selecionado ? 'net-no-sel' : '', vizinhos.has(no.id) ? 'net-no-vizinho' : '', corredor && corredor.no === no.id ? 'net-no-atual' : '', no.visto && conteudos.length && conteudos.every(item => item.feito) ? 'net-no-feito' : ''].filter(Boolean).join(' ');
      const titulo = no.id === ENTRADA ? 'Ponto de acesso' : `Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}`;
      const texto = no.id === ENTRADA ? 'conexão' : !no.visto ? '? não revelado' : conteudos.map(item => this.#rotuloCurto(item)).join(' · ') || 'vazio';
      const situacao = no.id === ENTRADA || !no.visto ? '' : conteudos.map(item => this.#situacao(item)).filter(Boolean).join(' · ');
      const inimigo = conteudos.find(item => ehInimigo(item) && item.inimigo && item.inimigo.rez);
      const barra = inimigo ? `<rect class="net-no-rez-fundo" x="10" y="${ALTURA - 9}" width="${LARGURA - 20}" height="4"/><rect class="net-no-rez" x="10" y="${ALTURA - 9}" width="${Math.max(0, ((LARGURA - 20) * Math.max(0, inimigo.inimigo.rezAtual)) / inimigo.inimigo.rez)}" height="4"/>` : '';
      const aqui = corredores.filter(item => item.no === no.id);
      const marcas = aqui.map((item, i) => `<g class="net-marca${item.token === this.tokenId ? ' net-marca-eu' : ''}" transform="translate(${x + LARGURA - 13 - i * 20},${y + 13})"><circle r="9"/><text text-anchor="middle" y="4">${esc(item.nome.trim().charAt(0).toUpperCase())}</text><title>${esc(item.nome)}</title></g>`).join('');
      return `<g class="${classes}" data-action="selecionar" data-no="${no.id}" transform="translate(${x},${y})">
        <rect class="net-no-caixa" width="${LARGURA}" height="${ALTURA}" rx="3"/><rect class="net-faixa" width="4" height="${ALTURA}"/>
        <text class="net-no-titulo" x="12" y="16">${esc(titulo)}</text>
        <text class="net-no-texto" x="12" y="34">${esc(texto.length > 24 ? `${texto.slice(0, 23)}…` : texto)}</text>
        ${situacao ? `<text class="net-no-tipo" x="12" y="${inimigo ? 47 : 50}">${esc(situacao.length > 28 ? `${situacao.slice(0, 27)}…` : situacao)}</text>` : ''}
        ${barra}<title>${esc(`${titulo}: ${texto}`)}</title>
      </g>${marcas}`;
    }).join('');
    return `<div class="net-mapa"><svg viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Mapa da arquitetura">${linhas}${caixas}</svg></div>`;
  }

  #rotuloCurto(item) {
    if (ehInimigo(item)) return item.inimigo ? item.inimigo.nome : NOME_DO_TIPO[item.tipo];
    return `${{ senha: 'Senha', arquivo: 'Arquivo', controle: 'Controle', vazio: 'Vazio' }[item.tipo]}${item.dv ? ` DV${item.dv}` : ''}`;
  }

  #situacao(item) {
    if (item.tipo === 'netrunner') return item.inimigo ? (item.inimigo.ativo ? 'netrunner inimigo' : 'fora da NET') : '';
    if (ehInimigo(item)) return item.inimigo ? (item.inimigo.rezAtual > 0 ? `REZ ${item.inimigo.rezAtual}/${item.inimigo.rez}` : 'derrubado') : '';
    return { senha: item.feito ? 'quebrada' : 'trancada', arquivo: item.feito ? 'identificado' : 'por identificar', controle: item.feito ? 'tomado' : 'livre' }[item.tipo] || '';
  }

  // O andar escolhido no mapa, inteiro (sem rolagem): conteúdos, inimigos com os números e o botão de ir até ele.
  #detalhe(nos, { corredor }, selecionado) {
    const no = nos.find(item => item.id === selecionado);
    const atual = corredor ? nos.find(item => item.id === corredor.no) : null;
    const vizinho = corredor && corredor.no !== selecionado && ((no && no.pai === corredor.no) || (atual && atual.pai === selecionado));
    const ir = vizinho ? `<button type="button" data-action="mover" data-no="${selecionado}"><i class="fa-solid fa-route"></i> Ir para cá</button>` : '';
    const cabeca = (titulo, extra = '') => `<header><h3>${titulo}${extra}</h3>${ir}</header>`;
    if (selecionado === ENTRADA) return `<section class="net-detalhe">${cabeca('Ponto de acesso')}<p class="net-nota">Onde a conexão começa. Andar pela arquitetura não gasta Ação NET; conectar e desconectar gastam 1.</p></section>`;
    if (!no) return '<section class="net-detalhe"><p class="net-nota">Escolha um andar no mapa.</p></section>';
    const titulo = `Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}`;
    if (!no.visto) return `<section class="net-detalhe">${cabeca(titulo)}<p class="net-nota">Ainda não revelado: chegue até ele ou use Pathfinder.</p></section>`;
    const itens = (no.conteudos || []).map(item => {
      if (ehInimigo(item)) {
        const inimigo = item.inimigo || { nome: NOME_DO_TIPO[item.tipo], classe: '' };
        const numeros = item.tipo === 'ice' ? [['PER', inimigo.per], ['SPD', inimigo.spd], ['ATK', inimigo.atk], ['DEF', inimigo.def]]
          : item.tipo === 'demonio' ? [['Interface', inimigo.interface], ['Ações', inimigo.acoes], ['Combate', inimigo.combate]] : [];
        const barra = inimigo.rez ? `<div class="net-barra"><span style="width:${Math.max(0, Math.min(100, (Math.max(0, inimigo.rezAtual) / inimigo.rez) * 100))}%"></span><em>${inimigo.rezAtual > 0 ? `REZ ${inimigo.rezAtual}/${inimigo.rez}` : 'derrubado'}</em></div>` : '';
        const texto = item.tipo === 'ice' ? inimigo.efeito : item.tipo === 'demonio' ? 'Sempre vence a velocidade, passa por senhas e não se dribla com Slide. Defende com Interface + 1d10 e ataca com Zap (1d6 no cérebro).' : `Defende com Interface + 1d10 e ataca com Zap. ${inimigo.ativo ? '' : 'Já caiu da NET.'}`;
        return `<li class="net-item net-item-ice"><i class="fa-solid ${ICONE[item.tipo]}"></i><div>
          <div class="net-item-linha"><b>${esc(inimigo.nome)}</b><small>${esc(inimigo.classe || '')}</small>${numeros.length ? `<span class="net-stats">${numeros.map(([rotulo, valor]) => `<span>${rotulo} <b>${valor}</b></span>`).join('')}</span>` : ''}</div>
          ${barra}<p>${esc(texto)}</p></div></li>`;
      }
      const situacao = this.#situacao(item);
      const abrir = item.tipo === 'arquivo' && item.diario && fromUuidSync(item.diario) && fromUuidSync(item.diario).testUserPermission(game.user, 'OBSERVER') ? `<button type="button" data-action="abrirArquivo" data-uuid="${esc(item.diario)}"><i class="fa-solid fa-book-open"></i> Abrir o arquivo</button>` : '';
      return `<li class="net-item"><i class="fa-solid ${ICONE[item.tipo] || ICONE.vazio}"></i><div>
        <div class="net-item-linha"><b>${esc(NOME_DO_TIPO[item.tipo] || item.tipo)}</b>${item.dv ? `<small>DV ${item.dv}</small>` : ''}${situacao ? `<span class="${item.feito ? 'net-ok' : 'net-pendente'}">${esc(situacao)}</span>` : ''}${abrir}</div>
        ${item.descricao ? `<p>${esc(item.descricao)}</p>` : ''}</div></li>`;
    }).join('');
    return `<section class="net-detalhe">${cabeca(titulo, this.gm && !no.publico ? ' <span class="net-tag">escondido dos jogadores</span>' : '')}<ul>${itens || '<li class="net-nota">Andar vazio.</li>'}</ul></section>`;
  }

  #seletorDeCorredor({ est }) {
    const corredores = est.corredores || [];
    if (corredores.length < 2) return '';
    return `<div class="net-corredores">${corredores.map(item => `<button type="button" data-action="escolherCorredor" data-token="${item.token}" class="${item.token === this.tokenId ? 'ativo' : ''}">${esc(item.nome)}</button>`).join('')}</div>`;
  }

  // A situação do netrunner: fogo, Kraken, Skunk, Wisp.
  #situacaoDoCorredor(corredor, actor) {
    const avisos = [];
    if (emChamas(actor)) avisos.push(`<div class="net-aviso net-aviso-fogo"><span><i class="fa-solid fa-fire"></i> Em chamas: 2 no HP no fim de cada turno.</span><button type="button" data-action="apagarFogo" ${this.ocupado ? 'disabled' : ''}>Apagar o fogo (Ação Carnal)</button></div>`);
    if (corredor.preso > 0) avisos.push('<div class="net-aviso"><i class="fa-solid fa-link"></i> Preso pelo Kraken: não avança nem desconecta com segurança até o fim do próximo turno.</div>');
    if ((corredor.skunks || []).length) avisos.push(`<div class="net-aviso"><i class="fa-solid fa-wind"></i> Skunk: −${2 * corredor.skunks.length} em Slide enquanto ele estiver ativo.</div>`);
    if (corredor.menosAcoes) avisos.push('<div class="net-aviso"><i class="fa-solid fa-hourglass-half"></i> Wisp: 1 Ação NET a menos no próximo turno.</div>');
    return avisos.join('');
  }

  #hud({ corredor, n, est, actor, ponto }, nos) {
    const aqui = nos.find(no => no.id === corredor.no);
    const conteudos = (aqui && aqui.conteudos) || [];
    const inimigos = conteudos.filter(ativo);
    const iceAtivo = inimigos.filter(item => item.tipo === 'ice');
    const fundo = corredor.no !== ENTRADA && aqui && !(est.nos || []).some(no => no.pai === corredor.no);
    const pode = {
      pathfinder: [true, ''], cloak: [true, ''],
      backdoor: [conteudos.some(item => item.tipo === 'senha' && !item.feito), 'Sem senha trancada neste andar.'],
      eyedee: [conteudos.some(item => item.tipo === 'arquivo' && !item.feito), 'Sem arquivo por identificar neste andar.'],
      control: [conteudos.some(item => item.tipo === 'controle' && !item.feito), 'Sem nó de controle livre neste andar.'],
      zap: [inimigos.length > 0, 'Sem inimigo ativo neste andar.'],
      slide: [iceAtivo.length > 0, 'Slide só contra Black ICE ativo (não contra demônios nem netrunners).'],
      virus: [Boolean(fundo), 'Só no andar mais fundo da arquitetura.'],
      scanner: [false, 'Scanner é usado fora da NET (botão no HUD do token).']
    };
    if (!inimigos.some(item => item.chave === this.alvo)) this.alvo = inimigos.length ? inimigos[0].chave : '';
    const semDeck = !n.deck || !n.role;
    const habilidades = Object.entries(HABILIDADES).map(([chave, info]) => {
      const [ok, motivo] = pode[chave];
      const livre = ok && !semDeck && !this.ocupado;
      return `<button type="button" class="${ok && !semDeck ? 'net-pronta' : ''}" data-action="habilidade" data-habilidade="${chave}" ${livre ? '' : 'disabled'} title="${esc(livre ? info.texto : (semDeck ? 'Precisa de cyberdeck equipado e Role de netrunning.' : motivo || info.texto))}">${esc(info.nome)}</button>`;
    }).join('');
    const alvos = inimigos.length > 1 ? `<label class="net-alvo">Alvo <select data-campo="alvo">${inimigos.map(item => `<option value="${esc(item.chave)}"${item.chave === this.alvo ? ' selected' : ''}>${esc(item.inimigo.nome)}${item.inimigo.rez ? ` (REZ ${item.inimigo.rezAtual})` : ''}</option>`).join('')}</select></label>` : '';
    const programas = n.programas.map(programa => {
      const s = programa.system;
      const rez = s.rez || { value: 0, max: 0 };
      const pct = rez.max ? Math.max(0, Math.min(100, (rez.value / rez.max) * 100)) : 0;
      const antipessoal = /antipersonnel/.test(s.class || '');
      const ataque = s.isRezzed && /attacker/.test(s.class || '') && inimigos.some(item => antipessoal ? item.tipo === 'netrunner' : item.tipo !== 'netrunner');
      const numeros = [s.atk ? `ATK ${s.atk}` : '', s.def ? `DEF ${s.def}` : ''].filter(Boolean).join(' · ');
      return `<li class="${s.isRezzed ? 'net-ativo' : ''}">
        <div class="net-prog-nome"><b>${esc(programa.name)}</b><small>${esc(CLASSE_PROGRAMA[s.class] || s.class || '')}${numeros ? ` · ${numeros}` : ''}</small></div>
        ${rez.max ? `<div class="net-rez" title="REZ ${rez.value}/${rez.max}"><span style="width:${pct}%"></span><em>${rez.value}/${rez.max}</em></div>` : '<div class="net-rez net-rez-vazio"></div>'}
        <div class="net-botoes">${ataque ? `<button type="button" data-action="programa" data-programa="${programa.id}" data-acao="atacar" ${this.ocupado ? 'disabled' : ''}>Atacar</button>` : ''}<button type="button" class="${s.isRezzed ? 'net-ligado' : ''}" data-action="programa" data-programa="${programa.id}" data-acao="${s.isRezzed ? 'desativar' : 'ativar'}" ${this.ocupado ? 'disabled' : ''} title="${s.isRezzed ? 'Desativar' : 'Ativar'} (1 Ação NET)">${s.isRezzed ? 'Ativo' : 'Ativar'}</button></div></li>`;
    }).join('');
    const rezAtivo = n.programas.filter(programa => programa.system.isRezzed).reduce((soma, programa) => soma + (Number(programa.system.rez && programa.system.rez.value) || 0), 0);
    const ram = n.deck && n.deck.flags && n.deck.flags['cpr-2077'] && n.deck.flags['cpr-2077'].ram;
    const controles = conteudos.filter(item => item.tipo === 'controle' && item.feito);
    return `${this.#situacaoDoCorredor(corredor, actor)}
      <section><h4><i class="fa-solid fa-terminal"></i> Habilidades de Interface</h4>${alvos}<div class="net-habilidades">${habilidades}</div>
        ${fundo ? `<input type="text" data-texto="virus" maxlength="200" placeholder="O que o vírus faz (o mestre define DV e custo)" value="${esc(this.textos.virus)}">` : ''}</section>
      ${controles.map(item => this.#noDeControle(item, ponto, est)).join('')}
      <section class="net-deck"><h4><i class="fa-solid fa-microchip"></i> ${esc(n.deck ? n.deck.name : 'Sem cyberdeck equipado')}<small>${n.deck ? `${n.programas.length} programa${n.programas.length === 1 ? '' : 's'} · REZ ativo ${rezAtivo}${ram ? ` · RAM ${ram}` : ''}` : ''}</small></h4>
        ${n.deck ? `<ul class="net-programas">${programas || '<li class="net-nota">Nenhum programa instalado.</li>'}</ul>` : '<p class="net-nota">Equipe um cyberdeck na ficha para agir na NET.</p>'}</section>
      <div class="net-sair"><button type="button" data-action="desconectar" ${this.ocupado || corredor.preso > 0 ? 'disabled' : ''} title="Desconectar com segurança (1 Ação NET)"><i class="fa-solid fa-plug-circle-xmark"></i> Desconectar</button><button type="button" data-action="desconectar" data-inseguro="1" class="net-perigo" ${this.ocupado ? 'disabled' : ''} title="Arrancar o plugue: o Black ICE ativo deste andar ataca de graça">Desconexão insegura</button></div>`;
  }

  // O nó de controle tomado: as coisas da cena ligadas a ele, com os comandos (1 Ação NET cada).
  #noDeControle(item, ponto, est) {
    const ligacoes = ligacoesDo(ponto, item.chave);
    const cena = this.tile.parent;
    const linhas = ligacoes.map((ligacao, indice) => {
      const { texto, acoes } = situacaoDaLigacao(cena, ligacao, est);
      return `<li><span><i class="fa-solid ${(TIPOS_DE_LIGACAO[ligacao.tipo] || {}).icone || 'fa-circle'}"></i> ${esc(nomeDaLigacao(cena, ligacao))} <small>${esc(texto)}</small></span>
        <span class="net-botoes">${acoes.map(([acao, rotulo]) => `<button type="button" data-action="acionar" data-controle="${esc(item.chave)}" data-indice="${indice}" data-acao="${acao}" ${this.ocupado ? 'disabled' : ''}>${esc(rotulo)}</button>`).join('')}</span></li>`;
    }).join('');
    return `<section class="net-controle"><h4><i class="fa-solid fa-tower-broadcast"></i> Nó de controle tomado</h4>
      ${item.descricao ? `<p class="net-nota">${esc(item.descricao)}</p>` : ''}
      ${linhas ? `<ul class="net-ligacoes">${linhas}</ul>` : ''}
      <div class="net-linha"><input type="text" data-texto="comando" maxlength="200" placeholder="${linhas ? 'Outro comando (o mestre narra)' : 'Comando para o nó (abrir a porta, girar a torreta…)'}" value="${esc(this.textos.comando)}"><button type="button" data-action="comandar" ${this.ocupado ? 'disabled' : ''}>Comandar</button></div></section>`;
  }

  #painelDoMestre({ corredor, est, arq }, nos, selecionado) {
    const aquiDoCorredor = corredor ? nos.find(no => no.id === corredor.no) : null;
    const inimigosDoCorredor = ((aquiDoCorredor && aquiDoCorredor.conteudos) || []).filter(ativo);
    const sel = nos.find(no => no.id === selecionado);
    const comRez = ((sel && sel.conteudos) || []).filter(item => ehInimigo(item) && item.inimigo && item.inimigo.rez);
    return `<section class="net-mestre"><h4><i class="fa-solid fa-user-secret"></i> Mestre</h4>
      ${corredor ? `<div class="net-botoes">${inimigosDoCorredor.map(item => `<button type="button" data-action="inimigoAtaca" data-alvo="${item.chave}" class="net-pronta" ${this.ocupado ? 'disabled' : ''}><i class="fa-solid ${ICONE[item.tipo]}"></i> ${esc(item.inimigo.nome)} ataca</button>`).join('')}
        <button type="button" data-action="zerarAcoes">Zerar Ações NET</button><button type="button" data-action="desconectar" data-inseguro="1" data-motivo="o mestre derrubou" class="net-perigo">Derrubar da NET</button></div>` : ''}
      ${comRez.length ? `<div class="net-botoes">${comRez.map(item => `<span class="net-ajuste">${esc(item.inimigo.nome)} REZ <button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="-5">−5</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="-1">−1</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="1">+1</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="99">cheio</button></span>`).join('')}</div>` : ''}
      <div class="net-botoes">${sel && !sel.publico && selecionado !== ENTRADA ? `<button type="button" data-action="revelar" data-no="${selecionado}">Revelar este andar</button>` : ''}${est.mapa ? '' : '<button type="button" data-action="revelar" data-tudo="1">Revelar o mapa</button>'}<button type="button" data-action="reiniciar" class="net-perigo">Reiniciar a arquitetura</button></div>
      ${arq ? '' : '<p class="net-nota">Sem arquitetura: configure o ponto de acesso.</p>'}</section>`;
  }

  // ---------------- Ações ----------------
  async #pedir(op, dados) {
    if (this.ocupado) return null;
    this.ocupado = true;
    this.render();
    try {
      return await pedir(op, { tile: this.tile.uuid, token: this.tokenId, ...dados });
    } catch (error) {
      ui.notifications.warn(error.message);
      return null;
    } finally {
      this.ocupado = false;
      if (this.rendered) this.render();
    }
  }

  static #selecionar(event, alvo) {
    this.selecionado = alvo.dataset.no;
    this.render();
  }

  static async #mover(event, alvo) {
    const destino = alvo.dataset.no;
    const feito = await this.#pedir('mover', { destino });
    if (feito) this.selecionado = destino;
  }

  static async #habilidade(event, alvo) {
    const habilidade = alvo.dataset.habilidade;
    const feito = await this.#pedir('habilidade', { habilidade, sorte: this.sorte, texto: this.textos.virus, alvo: this.alvo });
    if (feito) { this.sorte = 0; if (habilidade === 'virus') this.textos.virus = ''; }
  }

  static async #programa(event, alvo) {
    const feito = await this.#pedir('programa', { programa: alvo.dataset.programa, acao: alvo.dataset.acao, sorte: this.sorte, alvo: this.alvo });
    if (feito && alvo.dataset.acao === 'atacar') this.sorte = 0;
  }

  static async #comandar() {
    const feito = await this.#pedir('comandar', { texto: this.textos.comando });
    if (feito) this.textos.comando = '';
  }

  static async #acionar(event, alvo) {
    await this.#pedir('acionar', { controle: alvo.dataset.controle, indice: Number(alvo.dataset.indice), acao: alvo.dataset.acao });
  }

  static async #abrirArquivo(event, alvo) {
    const diario = await fromUuid(alvo.dataset.uuid);
    if (diario) diario.sheet.render(true);
  }

  static async #apagarFogo() { await this.#pedir('apagarFogo', {}); }

  static async #desconectar(event, alvo) {
    const inseguro = Boolean(alvo.dataset.inseguro);
    if (inseguro && !this.gm) {
      const certo = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Desconexão insegura' }, content: '<p>Arrancar o plugue? Todo Black ICE ativo que te encontrou ataca de graça.</p>', rejectClose: false });
      if (!certo) return;
    }
    await this.#pedir('desconectar', { inseguro, motivo: alvo.dataset.motivo || '' });
  }

  static #escolherCorredor(event, alvo) {
    this.tokenId = alvo.dataset.token;
    this.render();
  }

  static async #inimigoAtaca(event, alvo) { await this.#pedir('inimigoAtaca', { alvo: alvo.dataset.alvo }); }
  static async #ajustarIce(event, alvo) { await this.#pedir('ajustarIce', { alvo: alvo.dataset.alvo, delta: Number(alvo.dataset.delta) }); }
  static async #revelar(event, alvo) { await this.#pedir('revelar', { no: alvo.dataset.no, tudo: Boolean(alvo.dataset.tudo) }); }
  static async #zerarAcoes() { await this.#pedir('zerarAcoes', {}); }
  static async #reiniciar() {
    const certo = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Reiniciar a arquitetura' }, content: '<p>Black ICE e demônios de volta ao REZ cheio, senhas e nós trancados, mapa escondido, inimigos fora do combate. Quem está conectado volta ao ponto de acesso.</p>', rejectClose: false });
    if (certo) await this.#pedir('reiniciar', {});
  }
  static #configurar() {
    game.modules.get(MODULE_ID).api.configurar(this.tile);
  }
}
