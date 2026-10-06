// A janela da NET (ApplicationV2): HUD do netrunner (Interface, Ações NET, Sorte), o cyberdeck com os programas
// e o REZ deles, as habilidades de Interface, o mapa ramificado da arquitetura e o registro.
// Abre só no cliente do dono do token e no do mestre; a cena continua à vista atrás dela.
// O mestre vê a arquitetura inteira (com o que ainda está escondido dos jogadores) e o painel do Black ICE.
import { MODULE_ID, HABILIDADES, NOME_DO_TIPO, acoesPorRank, iceDaChave } from './constantes.mjs';
import { ENTRADA, coluna } from './arquitetura.mjs';
import { pontoDoTile, estadoDoTile, netrunnerDo, arquiteturaDoPonto } from './estado.mjs';
import { pedir } from './socket.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICONE = { senha: 'fa-key', arquivo: 'fa-file-lines', controle: 'fa-tower-broadcast', ice: 'fa-skull', vazio: 'fa-circle' };
const CLASSE_PROGRAMA = { booster: 'Booster', defender: 'Defensor', antipersonnelattacker: 'Ataque anti-pessoal', antiprogramattacker: 'Ataque anti-programa', blackice: 'Black ICE' };
const LARGURA = 132;
const ALTURA = 56;
const PASSO_X = 156;
const PASSO_Y = 82;

export class JanelaNet extends ApplicationV2 {
  static abertas = new Map();

  constructor({ tile, tokenId = null, gm = false }) {
    super({ id: `${MODULE_ID}-${tile.id}-${gm ? 'mestre' : tokenId}` });
    this.tile = tile;
    this.tokenId = tokenId;
    this.gm = gm;
    this.selecionado = null;
    this.sorte = 0;
    this.textos = { virus: '', comando: '' };
    this.ocupado = false;
  }

  static DEFAULT_OPTIONS = {
    classes: ['net-architect', 'net-janela'],
    tag: 'section',
    window: { title: 'NET', icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 900, height: 680 },
    actions: {
      selecionar: JanelaNet.#selecionar,
      mover: JanelaNet.#mover,
      habilidade: JanelaNet.#habilidade,
      programa: JanelaNet.#programa,
      comandar: JanelaNet.#comandar,
      desconectar: JanelaNet.#desconectar,
      escolherCorredor: JanelaNet.#escolherCorredor,
      iceAtaca: JanelaNet.#iceAtaca,
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
    const { ponto, est, corredor, actor } = ctx;
    if (!this.gm && !corredor) return `<div class="net-vazio"><p>Este netrunner não está conectado.</p></div>`;
    const nos = this.#nosDoMapa(ctx);
    const selecionado = this.selecionado || (corredor ? corredor.no : ENTRADA);
    return `<div class="net-grade${this.ocupado ? ' net-ocupado' : ''}">
      <div class="net-mapa-area">
        <header class="net-arq"><b>${esc(est.nome || (ctx.arq && ctx.arq.nome) || 'Arquitetura')}</b><span>DV ${esc(est.dv || (ctx.arq && ctx.arq.dv) || '?')}</span>${est.mapa ? '<span class="net-tag">mapa revelado</span>' : ''}${this.gm ? `<button type="button" class="net-mini" data-action="configurar" title="Configurar o ponto de acesso"><i class="fa-solid fa-gear"></i></button>` : ''}</header>
        ${this.#mapa(nos, ctx, selecionado)}
        ${this.#detalhe(nos, ctx, selecionado)}
      </div>
      <aside class="net-hud">
        ${this.gm ? this.#seletorDeCorredor(ctx) : ''}
        ${corredor && actor ? this.#hud(ctx) : '<p class="net-nota">Ninguém conectado. Os jogadores conectam clicando no ponto de acesso no mapa, perto dele.</p>'}
        ${this.gm ? this.#painelDoMestre(ctx, nos, selecionado) : ''}
      </aside>
      <footer class="net-log">${(est.log || []).slice(-14).map(linha => `<p class="net-log-${esc(linha.tipo)}">${esc(linha.texto)}</p>`).join('') || '<p class="net-nota">Nada aconteceu ainda.</p>'}</footer>
      ${this.ocupado ? '<div class="net-espera"><i class="fa-solid fa-circle-notch fa-spin"></i> Esperando o mestre resolver…</div>' : ''}
    </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    const log = content.querySelector('.net-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const sorte = this.element.querySelector('[data-campo="sorte"]');
    if (sorte) sorte.addEventListener('input', event => { this.sorte = Number(event.target.value) || 0; });
    for (const campo of this.element.querySelectorAll('[data-texto]')) campo.addEventListener('input', event => { this.textos[event.target.dataset.texto] = event.target.value; });
  }

  // Os nós que esta janela mostra: para o jogador, a vista pública do estado; para o mestre, a arquitetura inteira
  // (com a marca do que os jogadores já viram).
  #nosDoMapa({ est, arq }) {
    if (this.gm && arq) {
      const publicos = Object.fromEntries((est.nos || []).map(no => [no.id, no]));
      const feitos = new Set(est.feitos || []);
      const rez = Object.fromEntries((est.ices || []).map(ice => [ice.chave, ice.rez]));
      return Object.values(arq.nos).map(no => ({
        id: no.id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: true, publico: Boolean(publicos[no.id] && publicos[no.id].visto),
        conteudos: no.conteudos.map(conteudo => {
          const ice = conteudo.tipo === 'ice' ? { ...iceDaChave(conteudo.ice), chave: conteudo.ice } : null;
          if (ice) ice.rezAtual = rez[conteudo.chave] ?? ice.rez;
          return { ...conteudo, ice, feito: ice ? ice.rezAtual <= 0 : feitos.has(conteudo.chave) };
        })
      }));
    }
    return (est.nos || []).map(no => ({ ...no, publico: no.visto }));
  }

  #mapa(nos, { est, corredor }, selecionado) {
    const porId = Object.fromEntries(nos.map(no => [no.id, no]));
    const entrada = { id: ENTRADA, andar: 0, ramo: 'a', visto: true };
    const todos = [entrada, ...nos];
    const pos = no => ({ x: 16 + coluna(no) * PASSO_X, y: 14 + no.andar * PASSO_Y });
    const largura = 32 + Math.max(...todos.map(coluna)) * PASSO_X + LARGURA;
    const altura = 28 + Math.max(...todos.map(no => no.andar)) * PASSO_Y + ALTURA;
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
      const y2 = b.y;
      const meio = y1 + (y2 - y1) / 2;
      return `<path class="net-ligacao${no.visto ? '' : ' net-ligacao-oculta'}" d="M${x1},${y1} L${x1},${meio} L${x2},${meio} L${x2},${y2}"/>`;
    }).join('');
    const corredores = est.corredores || [];
    const caixas = todos.map(no => {
      const { x, y } = pos(no);
      const aqui = corredores.filter(item => item.no === no.id);
      const classes = ['net-no', no.id === ENTRADA ? 'net-no-entrada' : '', no.visto ? '' : 'net-no-oculto', this.gm && no.id !== ENTRADA && !no.publico ? 'net-no-secreto' : '', no.id === selecionado ? 'net-no-sel' : '', vizinhos.has(no.id) ? 'net-no-vizinho' : '', corredor && corredor.no === no.id ? 'net-no-atual' : ''].filter(Boolean).join(' ');
      const titulo = no.id === ENTRADA ? 'Ponto de acesso' : no.visto ? `Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}` : '?';
      const conteudo = no.id === ENTRADA ? 'conexão' : no.visto ? (no.conteudos || []).map(item => this.#rotuloCurto(item)).join(' · ') || 'vazio' : 'não revelado';
      const marcadores = aqui.map((item, i) => `<circle class="net-marca${item.token === this.tokenId ? ' net-marca-eu' : ''}" cx="${x + LARGURA - 12 - i * 16}" cy="${y + 12}" r="7"><title>${esc(item.nome)}</title></circle>`).join('');
      const icones = no.visto && no.id !== ENTRADA ? (no.conteudos || []).map(item => item.tipo).filter((tipo, i, lista) => lista.indexOf(tipo) === i) : [];
      return `<g class="${classes}" data-action="selecionar" data-no="${no.id}" transform="translate(${x},${y})">
        <rect width="${LARGURA}" height="${ALTURA}" rx="3"/>
        <text class="net-no-titulo" x="8" y="17">${esc(titulo)}</text>
        <text class="net-no-texto" x="8" y="36">${esc(conteudo.length > 38 ? `${conteudo.slice(0, 37)}…` : conteudo)}</text>
        ${icones.length ? `<text class="net-no-tipo" x="8" y="50">${esc(icones.map(tipo => NOME_DO_TIPO[tipo]).join(' + '))}</text>` : ''}
      </g>${marcadores}`;
    }).join('');
    return `<div class="net-mapa"><svg viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" role="img" aria-label="Mapa da arquitetura">${linhas}${caixas}</svg></div>`;
  }

  #rotuloCurto(item) {
    if (item.tipo === 'ice') return `${item.ice ? item.ice.nome : 'Black ICE'} ${item.ice ? `${Math.max(0, item.ice.rezAtual)}/${item.ice.rez}` : ''}`.trim();
    const estado = item.feito ? ({ senha: ' ✓', arquivo: ' ✓', controle: ' ✓' }[item.tipo] || '') : '';
    return `${{ senha: 'Senha', arquivo: 'Arquivo', controle: 'Controle', vazio: 'Vazio' }[item.tipo]}${item.dv ? ` DV${item.dv}` : ''}${estado}`;
  }

  // Detalhe do andar escolhido no mapa (e o botão de ir até ele, se for vizinho).
  #detalhe(nos, { corredor }, selecionado) {
    const no = nos.find(item => item.id === selecionado);
    const vizinho = corredor && (corredor.no !== selecionado) && ((no && no.pai === corredor.no) || (nos.find(item => item.id === corredor.no) || {}).pai === selecionado || (corredor.no !== ENTRADA && selecionado === ENTRADA && (nos.find(item => item.id === corredor.no) || {}).pai === ENTRADA));
    const ir = vizinho ? `<button type="button" data-action="mover" data-no="${selecionado}"><i class="fa-solid fa-route"></i> Ir para cá</button>` : '';
    if (selecionado === ENTRADA) return `<div class="net-detalhe"><h3>Ponto de acesso</h3><p class="net-nota">Onde a conexão começa. Andar pela arquitetura não gasta Ação NET.</p>${ir}</div>`;
    if (!no) return '<div class="net-detalhe"><p class="net-nota">Escolha um andar no mapa.</p></div>';
    if (!no.visto) return `<div class="net-detalhe"><h3>Andar ${no.andar}</h3><p class="net-nota">Ainda não revelado: chegue até ele ou use Pathfinder.</p>${ir}</div>`;
    const itens = (no.conteudos || []).map(item => {
      if (item.tipo === 'ice') {
        const ice = item.ice || iceDaChave('');
        const pct = Math.max(0, Math.min(100, (ice.rezAtual / ice.rez) * 100));
        return `<li class="net-ice"><i class="fa-solid ${ICONE.ice}"></i> <b>${esc(ice.nome)}</b> <small>${esc(ice.classe)} · PER ${ice.per} · SPD ${ice.spd} · ATK ${ice.atk} · DEF ${ice.def}</small>
          <div class="net-barra"><span style="width:${pct}%"></span><em>REZ ${Math.max(0, ice.rezAtual)}/${ice.rez}</em></div><small>${esc(ice.efeito)}</small></li>`;
      }
      return `<li><i class="fa-solid ${ICONE[item.tipo] || ICONE.vazio}"></i> <b>${esc(NOME_DO_TIPO[item.tipo] || item.tipo)}</b>${item.dv ? ` · DV ${item.dv}` : ''}${item.feito ? ` · <span class="net-ok">${{ senha: 'quebrada', arquivo: 'identificado', controle: 'tomado' }[item.tipo] || 'feito'}</span>` : ''}${item.descricao ? `<p>${esc(item.descricao)}</p>` : ''}</li>`;
    }).join('');
    return `<div class="net-detalhe"><h3>Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}${this.gm && !no.publico ? ' <span class="net-tag">escondido dos jogadores</span>' : ''}</h3><ul>${itens || '<li>Andar vazio.</li>'}</ul>${ir}</div>`;
  }

  #seletorDeCorredor({ est }) {
    const corredores = est.corredores || [];
    if (corredores.length < 2) return '';
    return `<div class="net-corredores">${corredores.map(item => `<button type="button" data-action="escolherCorredor" data-token="${item.token}" class="${item.token === this.tokenId ? 'ativo' : ''}">${esc(item.nome)}</button>`).join('')}</div>`;
  }

  #hud({ corredor, actor, n, est }) {
    const hp = actor.system.derivedStats && actor.system.derivedStats.hp;
    const sorte = Number(actor.system.stats && actor.system.stats.luck && actor.system.stats.luck.value) || 0;
    const aqui = (est.nos || []).find(no => no.id === corredor.no);
    const conteudos = (aqui && aqui.conteudos) || [];
    const iceAtivo = conteudos.filter(item => item.tipo === 'ice' && item.ice && item.ice.rezAtual > 0);
    const fundo = corredor.no !== ENTRADA && aqui && !(est.nos || []).some(no => no.pai === corredor.no);
    const pode = {
      pathfinder: [true, ''], cloak: [true, ''],
      backdoor: [conteudos.some(item => item.tipo === 'senha' && !item.feito), 'Sem senha trancada neste andar.'],
      eyedee: [conteudos.some(item => item.tipo === 'arquivo' && !item.feito), 'Sem arquivo por identificar neste andar.'],
      control: [conteudos.some(item => item.tipo === 'controle' && !item.feito), 'Sem nó de controle livre neste andar.'],
      zap: [iceAtivo.length > 0, 'Sem Black ICE ativo neste andar.'],
      slide: [iceAtivo.length > 0, 'Sem Black ICE ativo neste andar.'],
      virus: [Boolean(fundo), 'Só no andar mais fundo da arquitetura.'],
      scanner: [false, 'Scanner é usado fora da NET.']
    };
    const semDeck = !n.deck || !n.role;
    const habilidades = Object.entries(HABILIDADES).map(([chave, info]) => {
      const [ok, motivo] = pode[chave];
      const livre = ok && !semDeck && !this.ocupado;
      return `<button type="button" data-action="habilidade" data-habilidade="${chave}" ${livre ? '' : 'disabled'} title="${esc(livre ? info.texto : (semDeck ? 'Precisa de cyberdeck equipado e Role de netrunning.' : motivo || info.texto))}">${esc(info.nome)}</button>`;
    }).join('');
    const programas = n.programas.map(programa => {
      const s = programa.system;
      const rez = s.rez || { value: 0, max: 0 };
      const pct = rez.max ? Math.max(0, Math.min(100, (rez.value / rez.max) * 100)) : 0;
      const ataque = s.isRezzed && /attacker/.test(s.class || '') && !/antipersonnel/.test(s.class || '') && iceAtivo.length;
      return `<li class="${s.isRezzed ? 'net-ativo' : ''}"><div><b>${esc(programa.name)}</b> <small>${esc(CLASSE_PROGRAMA[s.class] || s.class || '')}${s.atk || s.def ? ` · ATK ${s.atk} · DEF ${s.def}` : ''}</small>
        ${rez.max ? `<div class="net-barra net-barra-programa"><span style="width:${pct}%"></span><em>REZ ${rez.value}/${rez.max}</em></div>` : ''}</div>
        <div class="net-botoes">${ataque ? `<button type="button" data-action="programa" data-programa="${programa.id}" data-acao="atacar" ${this.ocupado ? 'disabled' : ''}>Atacar</button>` : ''}<button type="button" data-action="programa" data-programa="${programa.id}" data-acao="${s.isRezzed ? 'desativar' : 'ativar'}" ${this.ocupado ? 'disabled' : ''}>${s.isRezzed ? 'Desativar' : 'Ativar'}</button></div></li>`;
    }).join('');
    const rezAtivo = n.programas.filter(programa => programa.system.isRezzed).reduce((soma, programa) => soma + (Number(programa.system.rez && programa.system.rez.value) || 0), 0);
    const ram = n.deck && n.deck.flags && n.deck.flags['cpr-2077'] && n.deck.flags['cpr-2077'].ram;
    const controleTomado = conteudos.some(item => item.tipo === 'controle' && item.feito);
    return `<div class="net-corredor">
        <img src="${esc(corredor.img || actor.img)}" alt="">
        <div><b>${esc(corredor.nome)}</b><small>Interface ${n.rank} · ${acoesPorRank(n.rank)} Ações NET por turno</small>
          <div class="net-numeros"><span title="Ações NET usadas neste turno (contam em combate)">Ações <b>${corredor.acoes}/${corredor.max}</b></span>${hp ? `<span>HP <b>${hp.value}/${hp.max}</b></span>` : ''}<label title="Sorte gasta na próxima rolagem">Sorte <input type="number" data-campo="sorte" min="0" max="${sorte}" value="${Math.min(this.sorte, sorte)}"> /${sorte}</label></div></div>
      </div>
      <section class="net-deck"><h4><i class="fa-solid fa-microchip"></i> ${esc(n.deck ? n.deck.name : 'Sem cyberdeck equipado')}</h4>
        <p class="net-nota">${n.deck ? `${n.programas.length} programa${n.programas.length === 1 ? '' : 's'} · REZ ativo ${rezAtivo}${ram ? ` · RAM ${ram}` : ''}` : 'Equipe um cyberdeck na ficha para agir na NET.'}</p>
        <ul class="net-programas">${programas || '<li class="net-nota">Nenhum programa instalado.</li>'}</ul></section>
      <section><h4><i class="fa-solid fa-terminal"></i> Habilidades de Interface</h4><div class="net-habilidades">${habilidades}</div>
        ${fundo ? `<input type="text" data-texto="virus" maxlength="200" placeholder="O que o vírus faz (o mestre define DV e custo)" value="${esc(this.textos.virus)}">` : ''}
        ${controleTomado ? `<div class="net-linha"><input type="text" data-texto="comando" maxlength="200" placeholder="Comando para o nó (abrir a porta, girar a torreta…)" value="${esc(this.textos.comando)}"><button type="button" data-action="comandar" ${this.ocupado ? 'disabled' : ''}>Comandar</button></div>` : ''}</section>
      <div class="net-sair"><button type="button" data-action="desconectar" ${this.ocupado ? 'disabled' : ''} title="Desconectar com segurança (1 Ação NET)"><i class="fa-solid fa-plug-circle-xmark"></i> Desconectar</button><button type="button" data-action="desconectar" data-inseguro="1" class="net-perigo" ${this.ocupado ? 'disabled' : ''} title="Arrancar o plugue: o Black ICE ativo deste andar ataca de graça">Desconexão insegura</button></div>`;
  }

  #painelDoMestre({ corredor, est, arq }, nos, selecionado) {
    const aquiDoCorredor = corredor ? nos.find(no => no.id === corredor.no) : null;
    const icesDoCorredor = ((aquiDoCorredor && aquiDoCorredor.conteudos) || []).filter(item => item.tipo === 'ice' && item.ice && item.ice.rezAtual > 0);
    const sel = nos.find(no => no.id === selecionado);
    const icesSel = ((sel && sel.conteudos) || []).filter(item => item.tipo === 'ice');
    return `<section class="net-mestre"><h4><i class="fa-solid fa-user-secret"></i> Mestre</h4>
      ${corredor ? `<div class="net-botoes">${icesDoCorredor.map(item => `<button type="button" data-action="iceAtaca" data-alvo="${item.chave}" ${this.ocupado ? 'disabled' : ''}><i class="fa-solid fa-skull"></i> ${esc(item.ice.nome)} ataca</button>`).join('')}
        <button type="button" data-action="zerarAcoes">Zerar Ações NET</button><button type="button" data-action="desconectar" data-inseguro="1" data-motivo="o mestre derrubou" class="net-perigo">Derrubar da NET</button></div>` : ''}
      ${icesSel.length ? `<div class="net-botoes">${icesSel.map(item => `<span class="net-ajuste">${esc(item.ice.nome)} <button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="-5">−5</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="-1">−1</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="1">+1</button><button type="button" data-action="ajustarIce" data-alvo="${item.chave}" data-delta="99">cheio</button></span>`).join('')}</div>` : ''}
      <div class="net-botoes">${sel && !sel.publico && selecionado !== ENTRADA ? `<button type="button" data-action="revelar" data-no="${selecionado}">Revelar este andar</button>` : ''}${est.mapa ? '' : '<button type="button" data-action="revelar" data-tudo="1">Revelar o mapa</button>'}<button type="button" data-action="reiniciar" class="net-perigo">Reiniciar a arquitetura</button></div>
      ${arq ? '' : '<p class="net-nota">Sem arquitetura: configure o ponto de acesso.</p>'}</section>`;
  }

  // ---------------- Ações ----------------
  async #pedir(op, dados) {
    if (this.ocupado) return;
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
    const sorte = this.sorte;
    const feito = await this.#pedir('habilidade', { habilidade, sorte, texto: this.textos.virus, alvo: this.#alvoNoAndar(habilidade) });
    if (feito) { this.sorte = 0; if (habilidade === 'virus') this.textos.virus = ''; }
  }

  // O Black ICE do andar escolhido no mapa, quando é o andar do netrunner (senão, o motor escolhe o primeiro).
  #alvoNoAndar(habilidade) {
    if (HABILIDADES[habilidade].alvo !== 'ice') return '';
    const est = estadoDoTile(this.tile) || {};
    const corredor = (est.corredores || []).find(item => item.token === this.tokenId);
    const no = corredor && (est.nos || []).find(item => item.id === corredor.no);
    const ativos = ((no && no.conteudos) || []).filter(item => item.tipo === 'ice' && item.ice && item.ice.rezAtual > 0);
    return ativos.length ? ativos[0].chave : '';
  }

  static async #programa(event, alvo) {
    const feito = await this.#pedir('programa', { programa: alvo.dataset.programa, acao: alvo.dataset.acao, sorte: this.sorte, alvo: this.#alvoNoAndar('zap') });
    if (feito && alvo.dataset.acao === 'atacar') this.sorte = 0;
  }

  static async #comandar() {
    const feito = await this.#pedir('comandar', { texto: this.textos.comando });
    if (feito) this.textos.comando = '';
  }

  static async #desconectar(event, alvo) {
    const inseguro = Boolean(alvo.dataset.inseguro);
    if (inseguro && !this.gm) {
      const DialogV2 = foundry.applications.api.DialogV2;
      const certo = await DialogV2.confirm({ window: { title: 'Desconexão insegura' }, content: '<p>Arrancar o plugue? Todo Black ICE ativo que te encontrou ataca de graça.</p>', rejectClose: false });
      if (!certo) return;
    }
    await this.#pedir('desconectar', { inseguro, motivo: alvo.dataset.motivo || '' });
  }

  static #escolherCorredor(event, alvo) {
    this.tokenId = alvo.dataset.token;
    this.render();
  }

  static async #iceAtaca(event, alvo) { await this.#pedir('iceAtaca', { alvo: alvo.dataset.alvo }); }
  static async #ajustarIce(event, alvo) { await this.#pedir('ajustarIce', { alvo: alvo.dataset.alvo, delta: Number(alvo.dataset.delta) }); }
  static async #revelar(event, alvo) { await this.#pedir('revelar', { no: alvo.dataset.no, tudo: Boolean(alvo.dataset.tudo) }); }
  static async #zerarAcoes() { await this.#pedir('zerarAcoes', {}); }
  static async #reiniciar() {
    const certo = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Reiniciar a arquitetura' }, content: '<p>Black ICE de volta ao REZ cheio, senhas e nós trancados, mapa escondido. Quem está conectado volta ao ponto de acesso.</p>', rejectClose: false });
    if (certo) await this.#pedir('reiniciar', {});
  }
  static #configurar() {
    game.modules.get(MODULE_ID).api.configurar(this.tile);
  }
}
