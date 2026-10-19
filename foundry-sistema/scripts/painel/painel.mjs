// O Painel Tático (o C25; o módulo painel-tatico da mesa do Foundry 12, dentro do sistema): a barra na base da tela com
// o retrato do personagem (um PNG por estado de ferimento), HP, armadura, Humanidade, Sorte, Death Save, atributos,
// armas (com os modos da ficha e os de 2077), iniciativa, Facedown e os painéis de perícias, Role, NET e equipamento.
// Mostra o token controlado (de quem é dono) ou, sem nenhum, o personagem do jogador. É um elemento solto no <body>
// (não uma janela): desenha de novo quando o ator, os itens, o combate, os alvos ou a conexão na NET mudam.
import { ATRIBUTOS, CLASSES_2077, SIGLA, SISTEMA } from '../config.mjs';
import { acoesDe2077 } from '../combate.mjs';
import { armaMontadaPronta } from '../armas-cyberware.mjs';
import { FAMILIAS, PERICIAS } from '../gerado.mjs';
import { FLAG_CONEXAO } from '../netrun/constantes.mjs';
import { HABILIDADES_DE_INTERFACE, ROLAGENS_DE_ROLE } from '../regras.mjs';
import { NOMES_DOS_ESTADOS, passosDeHp, variaveisDoEstilo, classesDoEstilo, dentroDaTela } from './logica.mjs';
import { estiloAtual, salvarEstilo, JanelaDeEstilo } from './estilo.mjs';
import { vistaDoRetrato, htmlDoRetrato, JanelaDoRetrato } from './retrato.mjs';
import * as A from './acoes.mjs';
import { escolherAlvo, escolhendo } from './alvo.mjs';

// Só o personagem e o capanga têm o painel (o contêiner e os atores da NET ficam de fora).
export const TIPOS_DE_ATOR = ['personagem', 'capanga'];
const MODOS = {
  mirado: { nome: 'Mirado', icone: 'fa-crosshairs', dica: 'Tiro mirado: −8 no ataque; acertou, o efeito do local (cabeça: o dano que passa dobra).' },
  autofogo: { nome: 'Autofogo', icone: 'fa-bars-staggered', dica: 'Autofogo: as balas da rajada, contra a DV da tabela de autofogo; o dano multiplica pela diferença (até o máximo da arma).' },
  supressivo: { nome: 'Supressivo', icone: 'fa-water', dica: 'Fogo supressivo: 10 balas; quem estiver a até 25 m e à vista testa Concentração ou se protege.' }
};
const ICONES_2077 = { ricochete: 'fa-arrows-turn-right', doisCanos: 'fa-grip-lines-vertical' };
const LOCAIS_MIRADOS = { cabeca: 'Cabeça', perna: 'Perna', item: 'Item na mão' };
const NOMES_DE_EQUIPAR = { guardado: 'Guardado', carregando: 'Carregando', equipado: 'Equipado' };
const FLAG_FAVORITAS = 'periciasFavoritas';

const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const config = chave => game.settings.get(SISTEMA, chave);
const CSS_DO_ESTADO = { notWounded: 'ok', lightlyWounded: 'leve', seriouslyWounded: 'grave', mortallyWounded: 'mortal', dead: 'morto' };
const ICONE_DO_ESTADO = { notWounded: 'fa-heart', lightlyWounded: 'fa-heart-crack', seriouslyWounded: 'fa-droplet', mortallyWounded: 'fa-skull', dead: 'fa-skull-crossbones' };
const sinal = n => (n > 0 ? `+${n}` : String(n));

// A conexão do token na NET (o motor da NET do sistema): o ponto de acesso e as Ações NET que sobram (só em combate).
export function naNet(token) {
  const conexao = token?.getFlag?.(SISTEMA, FLAG_CONEXAO);
  if (!conexao?.tile) return null;
  let tile = null;
  try { tile = fromUuidSync(conexao.tile); } catch { tile = null; }
  if (!tile) return null;
  const api = game.system.api.netrun;
  const corredor = api?.estado(tile)?.corredores?.find(item => item.token === token.id) ?? null;
  const emCombate = Boolean(game.combats?.some(combate => combate.started && combate.combatants.some(c => c.tokenId === token.id)));
  return { tile, nome: api?.ponto(tile)?.nome || 'Ponto de acesso', sobram: corredor ? Math.max(0, corredor.max - corredor.acoes) : 0, max: corredor?.max ?? 0, contaAcoes: emCombate && Boolean(corredor?.max) };
}

// O que o próximo ataque vai fazer: o mestre resolve com alvo marcado e mestre na mesa.
function situacaoDoAtaque(alvos) {
  if (!game.users.activeGM) return { pronto: false, texto: 'Sem mestre na mesa: o ataque não sai (o mestre resolve).' };
  if (alvos.length) return { pronto: true, texto: 'O mestre resolve o ataque e pede a defesa do alvo.' };
  return { pronto: false, texto: 'Sem alvo marcado: marque com T ou pelo botão de mira (o fogo supressivo não precisa).' };
}

export class PainelTatico {
  constructor() {
    this.elemento = null;
    this.actor = null;
    this.token = null;
    this.fixo = null;
    this.aberto = null;
    this.busca = '';
    this.segurando = false;
    this.pendente = false;
    this.rodaAcumulada = 0;
    // Largura de verdade de cada retrato livre (pela imagem, o tamanho e o deslocamento): a barra começa depois dele.
    this.larguras = new Map();
    this.agendar = foundry.utils.debounce(() => this.atualizar(), 60);
    this.aplicarRoda = foundry.utils.debounce(() => this.#aplicarRoda(), 300);
  }

  // ---------------- Montagem ----------------
  montar() {
    if (this.elemento) return;
    const el = document.createElement('div');
    el.id = 'painel-tatico';
    document.body.append(el);
    this.elemento = el;
    el.addEventListener('click', evento => this.#clique(evento));
    el.addEventListener('contextmenu', evento => this.#menu(evento));
    el.addEventListener('change', evento => this.#mudanca(evento));
    el.addEventListener('input', evento => this.#digitar(evento));
    el.addEventListener('wheel', evento => this.#roda(evento), { passive: false });
    el.addEventListener('pointerdown', evento => this.#arrastar(evento));
    el.addEventListener('dblclick', evento => { if (evento.target.closest('.pt-alca')) this.#paraBase(); });
    el.addEventListener('focusin', evento => { if (evento.target.matches('.pt-hp-campo')) this.segurando = true; });
    el.addEventListener('focusout', evento => {
      if (!evento.target.matches('.pt-hp-campo')) return;
      this.segurando = false;
      if (this.pendente) this.agendar();
    });
    window.addEventListener('resize', foundry.utils.debounce(() => this.aplicarEstilo(), 150));
    this.atualizar();
  }

  get recolhido() { return Boolean(config('painelRecolhido')); }
  async alternarRecolhido() { await game.settings.set(SISTEMA, 'painelRecolhido', !this.recolhido); }

  // ---------------- Quem aparece ----------------
  #escolherAtor() {
    let actor = null;
    let token = null;
    if (this.fixo) {
      const doc = fromUuidSync(this.fixo);
      if (doc instanceof TokenDocument) { token = doc; actor = doc.actor; } else if (doc instanceof Actor) { actor = doc; }
      if (!actor || !actor.isOwner) { this.fixo = null; actor = null; token = null; }
      else if (!token) token = actor.getActiveTokens(false, true)[0] || null;
    }
    if (!actor) {
      const meus = (canvas?.tokens?.controlled || []).filter(t => t.actor && TIPOS_DE_ATOR.includes(t.actor.type) && t.actor.isOwner);
      if (meus.length) { token = meus.at(-1).document; actor = token.actor; }
    }
    if (!actor && config('painelPersonagem')) {
      const personagem = game.user.character;
      if (personagem && TIPOS_DE_ATOR.includes(personagem.type)) { actor = personagem; token = personagem.getActiveTokens(false, true)[0] || null; }
    }
    if (actor !== this.actor) { this.aberto = null; this.busca = ''; }
    if (!actor) { this.vista = null; this.meuTurno = false; }
    this.actor = actor;
    this.token = token;
  }

  // O ator, um item dele, um efeito, o token ou o Tile da NET mudou: é deste painel?
  eDeste(doc) {
    if (!this.actor || !doc) return false;
    const actor = doc instanceof Actor ? doc : doc.parent instanceof Actor ? doc.parent : doc instanceof TokenDocument ? doc.actor : null;
    if (actor && (actor === this.actor || actor.uuid === this.actor.uuid || actor.id === this.actor.id)) return true;
    return doc instanceof TokenDocument && doc.id === this.token?.id;
  }

  atualizar() {
    this.#escolherAtor();
    this.desenhar();
  }

  // ---------------- Desenho ----------------
  desenhar() {
    const el = this.elemento;
    if (!el) return;
    if (this.segurando) { this.pendente = true; return; }
    this.pendente = false;
    const estilo = estiloAtual();
    if (!config('painelLigado') || !this.actor) {
      el.innerHTML = '';
      this.aplicarEstilo(estilo);
      return;
    }
    const foco = this.#guardarFoco();
    try {
      el.innerHTML = this.recolhido ? this.#htmlRecolhido(estilo) : this.#html(estilo);
    } catch (error) {
      console.error(`${SISTEMA} | Painel Tático, desenho`, error);
      el.innerHTML = `<div class="pt-casca"><div class="pt-barra pt-erro">Painel Tático: ${esc(error.message)}</div></div>`;
    }
    this.aplicarEstilo(estilo);
    this.#medirRetrato(estilo);
    this.#restaurarFoco(foco);
    if (this.busca) this.#filtrarPericias();
    Hooks.callAll('painelTaticoDesenhado', this, el);
  }

  // Cores, fonte, tamanho e posição (também na prévia da janela de estilo, antes de salvar).
  aplicarEstilo(estilo = estiloAtual()) {
    const el = this.elemento;
    if (!el) return;
    for (const [chave, valor] of Object.entries(variaveisDoEstilo(estilo))) el.style.setProperty(chave, valor);
    const estado = [];
    if (!config('painelLigado') || !this.actor) estado.push('pt-vazio');
    if (this.recolhido) estado.push('pt-recolhido');
    if (this.vista) estado.push(`pt-ferimento-${CSS_DO_ESTADO[this.vista.estado]}`);
    if (this.meuTurno) estado.push('pt-meu-turno');
    el.className = [...classesDoEstilo(estilo), ...estado].join(' ');
    // A barra cabe entre a barra de ferramentas da esquerda e a lateral da direita; sem espaço, as seções quebram linha.
    const area = this.#areaLivre();
    const livre = this.vista?.modo === 'livre' ? (this.larguras.get(this.#chaveDoRetrato(estilo)) || estilo.retratoAltura * 0.56) : 0;
    el.style.setProperty('--pt-largura-max', `${Math.max(360 + livre, Math.floor((area.direita - area.esquerda - 24) / (estilo.escala / 100)))}px`);
    if (estilo.posicao === 'livre' && estilo.x !== null && estilo.y !== null) {
      const caixa = el.getBoundingClientRect();
      const pos = dentroDaTela({ x: estilo.x, y: estilo.y, largura: caixa.width || 400, altura: caixa.height || 120, telaL: window.innerWidth, telaA: window.innerHeight });
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
    } else {
      el.style.left = `${Math.round((area.esquerda + area.direita) / 2)}px`;
      el.style.top = '';
    }
    // Perto do topo da tela, os painéis de perícias e equipamento abrem para baixo.
    el.classList.toggle('pt-abrir-abaixo', el.getBoundingClientRect().top < 380);
  }

  #chaveDoRetrato(estilo) {
    const v = this.vista;
    return v ? `${v.src}|${v.escala}|${v.x}|${estilo.retratoAltura}|${estilo.retratoLado}` : '';
  }

  // Mede o PNG depois de carregar (a proporção de cada imagem é uma) e guarda: no próximo desenho a barra já nasce
  // no lugar. Com o deslocamento para o lado da barra, ela anda junto.
  #medirRetrato(estilo) {
    const casca = this.elemento.querySelector('.pt-casca-livre');
    const img = casca && casca.querySelector('.pt-retrato-img');
    if (!img || !this.vista) return;
    const chave = this.#chaveDoRetrato(estilo);
    const aplicar = largura => {
      casca.style.setProperty('--pt-retrato-largura', `${largura}px`);
      if (this.larguras.get(chave) !== largura) { this.larguras.set(chave, largura); this.aplicarEstilo(estilo); }
    };
    const guardada = this.larguras.get(chave);
    if (guardada) casca.style.setProperty('--pt-retrato-largura', `${guardada}px`);
    const medir = () => {
      if (!img.isConnected || !img.naturalWidth) return;
      const paraOLado = estilo.retratoLado === 'direita' ? -this.vista.x : this.vista.x;
      aplicar(Math.round(Math.min(estilo.retratoAltura * 2, Math.max(60, img.offsetWidth + Math.max(0, paraOLado)))));
    };
    if (img.complete) medir(); else img.addEventListener('load', medir, { once: true });
  }

  #areaLivre() {
    const largura = window.innerWidth;
    const lateral = document.getElementById('sidebar');
    const direita = lateral && lateral.offsetParent !== null ? Math.min(largura, lateral.getBoundingClientRect().left) : largura;
    // A caixa #controls é mais larga que os botões: vale o último botão à vista.
    let esquerda = 0;
    for (const botao of document.querySelectorAll('#scene-controls button, #controls li')) if (botao.offsetParent !== null) esquerda = Math.max(esquerda, botao.getBoundingClientRect().right);
    return direita - esquerda > 400 ? { esquerda, direita } : { esquerda: 0, direita: largura };
  }

  #guardarFoco() {
    const ativo = document.activeElement;
    if (!ativo || !this.elemento.contains(ativo) || !ativo.dataset.foco) return null;
    return { chave: ativo.dataset.foco, inicio: ativo.selectionStart, fim: ativo.selectionEnd };
  }
  #restaurarFoco(foco) {
    if (!foco) return;
    const campo = this.elemento.querySelector(`[data-foco="${foco.chave}"]`);
    if (!campo) return;
    campo.focus();
    try { campo.setSelectionRange(foco.inicio, foco.fim); } catch { /* campo sem seleção */ }
  }

  #html(estilo) {
    const a = this.actor;
    const vista = vistaDoRetrato(a, this.token, estilo.efeitos);
    this.vista = vista;
    const combatente = A.combatenteDe(a, this.token);
    this.meuTurno = Boolean(game.combat?.started && combatente && game.combat.combatant?.id === combatente.id);
    const mostra = chave => !estilo.ocultos.includes(chave);
    const desenhos = { vitais: () => this.#vitais(estilo, mostra), atributos: () => this.#atributos(), armas: () => this.#armas(mostra), acoes: () => this.#acoes(combatente) };
    const secoes = estilo.secoes.filter(mostra).map(chave => desenhos[chave]()).join('');
    const livre = vista.modo === 'livre';
    const marca = `${a.uuid}|${vista.src}|${vista.estado}`;
    const trocou = Boolean(this.ultimoRetrato) && this.ultimoRetrato !== marca;
    this.ultimoRetrato = marca;
    return `<div class="pt-casca${livre ? ' pt-casca-livre' : ''}">
      ${livre ? htmlDoRetrato(vista, { trocou }) : ''}
      ${livre ? `<button type="button" class="pt-retrato-alvo" data-acao="ficha" data-tooltip="${esc(vista.nomeDoEstado)} · clique: ficha · botão direito: retrato"></button>` : ''}
      <div class="pt-barra">
        ${this.#topo(vista, mostra)}
        <div class="pt-corpo">
          ${livre ? '' : `<div class="pt-moldura-caixa" data-acao="ficha" data-tooltip="Clique: ficha · botão direito: retrato">${htmlDoRetrato(vista, { trocou })}</div>`}
          ${secoes}
        </div>
        ${mostra('favoritos') ? this.#favoritos() : ''}
      </div>
      ${this.aberto ? this.#painel(this.aberto) : ''}
    </div>`;
  }

  #htmlRecolhido(estilo) {
    const a = this.actor;
    const vista = vistaDoRetrato(a, this.token, estilo.efeitos);
    this.vista = vista;
    const hp = a.system.hp;
    return `<div class="pt-casca pt-mini">
      <button type="button" class="pt-mini-botao" data-acao="recolher" data-tooltip="Abrir o painel (H)">
        <span class="pt-mini-retrato"><img src="${esc(vista.src)}" alt=""></span>
        <span class="pt-mini-nome">${esc(this.token?.name || a.name)}</span>
        <span class="pt-mini-hp pt-estado-${CSS_DO_ESTADO[vista.estado]}"><i class="fa-solid fa-heart-pulse"></i> ${hp.value}/${hp.max}</span>
        <i class="fa-solid fa-chevron-up"></i>
      </button>
    </div>`;
  }

  // ---------------- Topo: nome, estado, selos, ferramentas ----------------
  #topo(vista, mostra) {
    const a = this.actor;
    const roles = (a.system.roles ?? []).map(role => `${role.nome} ${role.rank ?? ''}`.trim()).join(' / ');
    const apelido = a.system.apelido || '';
    const selos = [];
    if (this.meuTurno) selos.push('<span class="pt-selo pt-selo-turno"><i class="fa-solid fa-play"></i> Seu turno</span>');
    if (A.suprimido(a)) selos.push('<span class="pt-selo pt-selo-alerta" data-tooltip="Suprimido pelo fogo supressivo: sai no fim do seu próximo turno."><i class="fa-solid fa-water"></i> Suprimido</span>');
    const agarrao = A.agarrao(a);
    if (agarrao) selos.push(`<span class="pt-selo pt-selo-alerta" data-tooltip="${agarrao}: −2 em todas as ações"><i class="fa-solid fa-hand-fist"></i> ${agarrao}</span>`);
    const net = naNet(this.token);
    if (net) selos.push(`<button type="button" class="pt-selo pt-selo-net" data-acao="abrirNet" data-tooltip="Conectado em ${esc(net.nome)}: abrir a janela da NET"><i class="fa-solid fa-network-wired"></i> NET${net.contaAcoes ? ` · ${net.sobram}/${net.max}` : ''}</button>`);
    const fixado = Boolean(this.fixo);
    return `<header class="pt-topo">
      <span class="pt-alca" data-tooltip="Arraste para mover · dois cliques: de volta à base"><i class="fa-solid fa-grip-vertical"></i></span>
      ${mostra('identidade') ? `<button type="button" class="pt-nome" data-acao="ficha" data-tooltip="Abrir a ficha">${esc(this.token?.name || a.name)}</button>
        ${apelido || roles ? `<span class="pt-sub">${esc([apelido && apelido !== a.name ? `“${apelido}”` : '', roles].filter(Boolean).join(' · '))}</span>` : ''}` : ''}
      <span class="pt-estado pt-estado-${CSS_DO_ESTADO[vista.estado]}"><i class="fa-solid ${ICONE_DO_ESTADO[vista.estado]}"></i> ${esc(vista.nomeDoEstado)}</span>
      ${selos.join('')}
      <span class="pt-ferramentas">
        <button type="button" class="${fixado ? 'pt-ativa' : ''}" data-acao="fixar" data-tooltip="${fixado ? 'Soltar: o painel volta a seguir o token selecionado' : 'Fixar este personagem no painel'}"><i class="fa-solid fa-thumbtack"></i></button>
        ${a.isOwner ? '<button type="button" data-acao="retrato" data-tooltip="Retrato de cada estado"><i class="fa-solid fa-image-portrait"></i></button>' : ''}
        <button type="button" data-acao="estilo" data-tooltip="Estilo do painel"><i class="fa-solid fa-palette"></i></button>
        <button type="button" data-acao="recolher" data-tooltip="Recolher (H)"><i class="fa-solid fa-chevron-down"></i></button>
      </span>
    </header>`;
  }

  // ---------------- Vitais ----------------
  #vitais(estilo, mostra) {
    const a = this.actor;
    const s = a.system;
    const hp = s.hp;
    const pct = Math.round((Math.max(0, hp.value) / Math.max(1, hp.max)) * 100);
    // Gravemente ferido abaixo da metade do HP, arredondada para cima (regras.estadoDeFerimento).
    const grave = Math.round((Math.ceil(hp.max / 2) / Math.max(1, hp.max)) * 100);
    const passos = passosDeHp(estilo.passosHp);
    const botao = n => `<button type="button" class="pt-passo ${n < 0 ? 'pt-menos' : 'pt-mais'}" data-acao="hp" data-valor="${n}">${sinal(n)}</button>`;
    const armadura = local => {
      const item = A.armaduraDo(a, local);
      if (!item) return null;
      const valor = local === 'escudo' ? item.system.pvEscudo : item.system.sp[local];
      return { valor: Number(valor.value) || 0, max: Number(valor.max) || 0 };
    };
    const fichas = [];
    const ficha = ({ icone, dica, valor, max, acao = '', local = '', classe = '', ajustavel = false, chave = '' }) => `<div class="pt-ficha ${classe}"${acao && !ajustavel ? ` data-acao="${acao}"` : ''} data-tooltip="${esc(dica)}">
        <i class="fa-solid ${icone}"></i>
        ${ajustavel ? `<button type="button" class="pt-mini-passo" data-acao="${chave}" data-local="${local}" data-valor="-1">−</button>` : ''}
        <span class="pt-ficha-valor">${valor}${max !== undefined ? `<em>/${max}</em>` : ''}</span>
        ${ajustavel ? `<button type="button" class="pt-mini-passo" data-acao="${chave}" data-local="${local}" data-valor="1">+</button>` : ''}
      </div>`;
    if (mostra('armadura')) {
      for (const [local, icone, nome] of [['cabeca', 'fa-helmet-safety', 'na cabeça'], ['corpo', 'fa-shirt', 'no corpo']]) {
        const sp = armadura(local);
        fichas.push(sp
          ? ficha({ icone, dica: `SP da armadura ${nome} (− ablação, + conserto)`, valor: sp.valor, max: sp.max, ajustavel: true, chave: 'armadura', local, classe: sp.valor < sp.max ? 'pt-gasta' : '' })
          : ficha({ icone, dica: `Sem armadura ${nome}`, valor: '–', classe: 'pt-sem' }));
      }
    }
    const escudo = mostra('escudo') ? armadura('escudo') : null;
    if (escudo) fichas.push(ficha({ icone: 'fa-shield-halved', dica: 'Pontos de vida do escudo', valor: escudo.valor, max: escudo.max, ajustavel: true, chave: 'armadura', local: 'escudo', classe: escudo.valor < escudo.max ? 'pt-gasta' : '' }));
    if (mostra('humanidade')) {
      const baixa = s.humanidade.value <= Math.max(1, Math.floor(s.humanidade.max / 4));
      fichas.push(ficha({ icone: 'fa-brain', dica: baixa ? 'Humanidade baixa: risco de ciberpsicose' : 'Humanidade', valor: s.humanidade.value, max: s.humanidade.max, classe: baixa ? 'pt-alerta' : '' }));
    }
    if (mostra('sorte')) fichas.push(ficha({ icone: 'fa-clover', dica: 'Sorte (gasta pela janela de rolagem; − e + à mão)', valor: s.sorte.value, max: s.sorte.max, ajustavel: true, chave: 'sorte' }));
    if (mostra('deathSave')) {
      const total = (Number(s.deathSave.penalidade) || 0) + (Number(s.deathSave.base) || 0);
      fichas.push(ficha({ icone: 'fa-skull', dica: `Death Save: role menos que BODY ${s.atributos.body.valor} com a penalidade ${total}. Clique: rolar · botão direito: zerar a penalidade`, valor: total, acao: 'deathSave', classe: `pt-death${vistaMortal(this.vista) ? ' pt-pulsa' : ''}` }));
    }
    return `<section class="pt-secao pt-vitais">
      <div class="pt-hp">
        ${passos.filter(n => n < 0).map(botao).join('')}
        <div class="pt-hp-barra" data-tooltip="HP · roda do mouse: ±1 (Shift: ±5)">
          <div class="pt-hp-cheio" style="width: ${pct}%"></div>
          <div class="pt-hp-marca" style="left: ${grave}%"></div>
          <span class="pt-hp-texto"><i class="fa-solid fa-heart-pulse"></i><input class="pt-hp-campo" type="number" value="${hp.value}" min="0" max="${hp.max}"><em>/ ${hp.max}</em></span>
        </div>
        ${passos.filter(n => n > 0).map(botao).join('')}
      </div>
      <div class="pt-fichas">${fichas.join('')}</div>
    </section>`;
  }

  // ---------------- Atributos ----------------
  #atributos() {
    const a = this.actor;
    return `<section class="pt-secao pt-atributos"><div class="pt-grade-stats">
      ${ATRIBUTOS.map(chave => `<button type="button" class="pt-stat" data-acao="atributo" data-stat="${chave}" data-tooltip="Rolar ${SIGLA[chave]} + 1d10 (Ctrl: ${game.settings.get(SISTEMA, 'rolarDireto') ? 'com' : 'sem'} a janela)"><small>${SIGLA[chave]}</small><b>${a.system.atributos[chave]?.valor ?? 0}</b></button>`).join('')}
    </div></section>`;
  }

  // ---------------- Armas ----------------
  // As de mão equipadas, as do cyberware instalado e as dos acessórios da arma equipada (o C11; a montada num veículo fica
  // com ele, na ficha).
  #armasEquipadas() {
    return this.actor.items.filter(item => item.type === 'arma' && ((item.system.equipada && !item.system.instaladoEm) || armaMontadaPronta(item)));
  }

  #armas(mostra) {
    const linhas = this.#armasEquipadas().map(arma => this.#arma(arma, mostra)).join('');
    return `<section class="pt-secao pt-armas">
      <header class="pt-armas-topo">
        <span class="pt-titulo">Armas</span>
        ${mostra('alvo') ? this.#alvo() : ''}
        <button type="button" class="pt-icone" data-acao="painel" data-painel="equipamento" data-tooltip="Equipar e guardar"><i class="fa-solid fa-screwdriver-wrench"></i></button>
      </header>
      <div class="pt-lista-armas">${linhas || '<p class="pt-vazio-texto">Nenhuma arma equipada: equipe pelo <i class="fa-solid fa-screwdriver-wrench"></i>.</p>'}</div>
    </section>`;
  }

  #alvo() {
    const alvos = [...game.user.targets];
    const situacao = situacaoDoAtaque(alvos);
    const nomes = alvos.slice(0, 2).map(t => esc(t.name)).join(', ') + (alvos.length > 2 ? ` +${alvos.length - 2}` : '');
    return `<span class="pt-alvo ${situacao.pronto ? 'pt-fluxo-pronto' : 'pt-fluxo-espera'}" data-tooltip="${esc(situacao.texto)}">
      <button type="button" class="pt-icone" data-acao="mira" data-tooltip="Escolher o alvo no mapa"><i class="fa-solid fa-crosshairs"></i></button>
      ${alvos.length ? `<span class="pt-alvo-nomes">${nomes}</span><button type="button" class="pt-icone" data-acao="limparAlvos" data-tooltip="Tirar os alvos"><i class="fa-solid fa-xmark"></i></button>` : '<span class="pt-alvo-nomes pt-apagado">sem alvo</span>'}
      <i class="fa-solid ${situacao.pronto ? 'fa-link' : 'fa-link-slash'} pt-fluxo"></i>
    </span>`;
  }

  #arma(arma, mostra) {
    const a = this.actor;
    const s = arma.system;
    const modo = A.modoDaArma(a, arma.id);
    const pente = Number(s.pente.max) > 0 ? s.pente : null;
    const municao = pente ? (arma.municaoCarregada?.name || '') : '';
    const de2077 = acoesDe2077(arma);
    const modoBotao = (chave, nome, icone, dica, ativo, classe = '') => `<button type="button" class="pt-modo${classe}${ativo ? ' pt-ativa' : ''}" data-acao="modo" data-item="${arma.id}" data-modo="${chave}" data-tooltip="${esc(`${nome}${ativo ? ' (ligado)' : ''}: ${dica}`)}"><i class="fa-solid ${icone}"></i></button>`;
    const botoesDeModo = [modoBotao('mirado', MODOS.mirado.nome, MODOS.mirado.icone, MODOS.mirado.dica, modo === 'mirado')];
    if (Number(s.autofogo) > 0) botoesDeModo.push(modoBotao('autofogo', MODOS.autofogo.nome, MODOS.autofogo.icone, `${MODOS.autofogo.dica} (×${s.autofogo}, ${de2077.balasAutofogo} balas)`, modo === 'autofogo'));
    if (s.supressivo) botoesDeModo.push(modoBotao('supressivo', MODOS.supressivo.nome, MODOS.supressivo.icone, MODOS.supressivo.dica, modo === 'supressivo'));
    for (const m of de2077.modos) botoesDeModo.push(modoBotao(m.modo, m.rotulo, ICONES_2077[m.modo] ?? 'fa-bolt', m.dica, modo === m.modo, ' pt-modo-2077'));
    const pilulas = [];
    const classe = CLASSES_2077[arma.perfil2077?.classe];
    if (classe) pilulas.push(`<span class="pt-pilula pt-classe-${arma.perfil2077.classe}" data-tooltip="${esc(de2077.dicaAtaque || `Arma ${classe} de 2077`)}">${esc(classe)}</span>`);
    for (const aviso of de2077.avisos) pilulas.push(`<span class="pt-pilula pt-alerta" data-tooltip="${esc(aviso.dica)}">${esc(aviso.texto)}</span>`);
    for (const acao of de2077.alternar) pilulas.push(`<button type="button" class="pt-pilula" data-acao="acao2077" data-chave="${esc(acao.acao)}" data-item="${arma.id}" data-tooltip="${esc(acao.dica)}">${esc(acao.rotulo)}</button>`);
    const nomeDoModo = MODOS[modo]?.nome || de2077.modos.find(m => m.modo === modo)?.rotulo || '';
    const local = A.localMirado(a);
    return `<div class="pt-arma${modo !== 'tiro' ? ' pt-arma-com-modo' : ''}" data-item="${arma.id}">
      ${mostra('imagensDasArmas') ? `<img class="pt-arma-img" src="${esc(arma.img)}" alt="" data-acao="item" data-item="${arma.id}">` : ''}
      <div class="pt-arma-info">
        <button type="button" class="pt-arma-nome" data-acao="item" data-item="${arma.id}" data-tooltip="Abrir o item">${esc(arma.name)}</button>
        <span class="pt-arma-sub">${esc(arma.danoDaArma)}${s.cdt ? ` · CDT ${s.cdt}` : ''}${pente ? ` · <span class="${Number(pente.value) === 0 ? 'pt-sem-bala' : ''}" data-tooltip="${esc(municao || 'Sem munição carregada')}"><i class="fa-solid fa-box-archive"></i> ${pente.value}/${pente.max}</span>` : ''}${nomeDoModo ? ` · <b class="pt-modo-nome">${esc(nomeDoModo)}</b>` : ''}</span>
        ${pilulas.length ? `<span class="pt-pilulas">${pilulas.join('')}</span>` : ''}
      </div>
      <div class="pt-arma-botoes">
        <span class="pt-modos">${botoesDeModo.join('')}</span>
        ${modo === 'mirado' ? `<select class="pt-local" data-item="${arma.id}" data-tooltip="Local do tiro mirado">${Object.entries(LOCAIS_MIRADOS).map(([chave, nome]) => `<option value="${chave}"${chave === local ? ' selected' : ''}>${nome}</option>`).join('')}</select>` : ''}
        ${pente ? `<button type="button" class="pt-icone" data-acao="recarregar" data-item="${arma.id}" data-tooltip="Recarregar"><i class="fa-solid fa-rotate"></i></button>
          <button type="button" class="pt-icone" data-acao="municao" data-item="${arma.id}" data-tooltip="Trocar a munição"><i class="fa-solid fa-boxes-stacked"></i></button>` : ''}
        <button type="button" class="pt-atk" data-acao="atacar" data-item="${arma.id}" data-tooltip="Atacar${nomeDoModo ? ` (${esc(nomeDoModo)})` : ''} os alvos marcados">ATK</button>
        <button type="button" class="pt-dmg" data-acao="dano" data-item="${arma.id}" data-tooltip="Só rolar o dano">DMG</button>
      </div>
    </div>`;
  }

  // ---------------- Ações ----------------
  #temNet() {
    const s = this.actor.system;
    return Boolean(naNet(this.token)) || Boolean(s.rankDeInterface && this.#deckEquipado());
  }
  #deckEquipado() { return this.actor.items.find(item => item.type === 'cyberdeck' && item.system.uso === 'equipado') ?? null; }

  #acoes(combatente) {
    const ini = combatente?.initiative;
    const botao = (acao, icone, rotulo, dica, extra = '', classe = '') => `<button type="button" class="pt-acao ${classe}${extra && extra === this.aberto ? ' pt-ativa' : ''}" data-acao="${acao}"${extra ? ` data-painel="${extra}"` : ''} data-tooltip="${esc(dica)}"><i class="fa-solid ${icone}"></i><span>${rotulo}</span></button>`;
    return `<section class="pt-secao pt-acoes">
      ${botao('iniciativa', 'fa-bolt', ini !== null && ini !== undefined ? `Inic. ${ini}` : 'Iniciativa', game.combat ? 'Rolar a iniciativa (REF + 1d10)' : 'Rolar a iniciativa (entra no combate da cena)')}
      ${this.meuTurno ? botao('encerrarTurno', 'fa-flag-checkered', 'Fim do turno', 'Passar a vez', '', 'pt-turno') : ''}
      ${botao('facedown', 'fa-user-ninja', 'Facedown', 'Disputa de encarada: COOL + Reputação + 1d10')}
      ${botao('painel', 'fa-list-check', 'Perícias', 'Todas as perícias (★ favorita fica na barra)', 'pericias')}
      ${this.#habilidades().length ? botao('painel', 'fa-star', 'Role', 'As rolagens de Role', 'roles') : ''}
      ${this.#temNet() ? botao('painel', 'fa-network-wired', 'NET', 'Interface, Scanner e a conexão na NET', 'net') : ''}
    </section>`;
  }

  // ---------------- Perícias e favoritas ----------------
  #periciasDoAtor() {
    const a = this.actor;
    const s = a.system;
    const favoritas = new Set(a.getFlag(SISTEMA, FLAG_FAVORITAS) ?? []);
    const ids = [...PERICIAS.map(p => p.id), ...Object.entries(s.pericias).filter(([, p]) => p.familia || p.atributo).map(([id]) => id)];
    return ids.map(id => {
      const p = s.pericia(id);
      const valorStat = s.atributos[p.atributo]?.valor ?? 0;
      const mods = (p.bonus || 0) + (p.role?.valor ?? 0) + (s.penalidade || 0);
      const grupo = PERICIAS.find(base => base.id === id)?.grupo ?? FAMILIAS[s.pericias[id]?.familia]?.grupo ?? (p.propria ? 'Próprias' : 'Educação');
      return { id, nome: p.nome, grupo, stat: SIGLA[p.atributo], valorStat, nivel: p.nivel, mods, total: valorStat + p.nivel + mods, favorita: favoritas.has(id) };
    });
  }
  #favoritos() {
    const favoritas = this.#periciasDoAtor().filter(p => p.favorita).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    if (!favoritas.length) return '';
    return `<div class="pt-favoritas">${favoritas.map(p => `<button type="button" class="pt-favorita" data-acao="pericia" data-item="${p.id}" data-tooltip="${esc(`${p.stat} ${p.valorStat} + ${p.nivel}${p.mods ? ` ${sinal(p.mods)}` : ''}`)}"><i class="fa-solid fa-star"></i>${esc(p.nome)}<b>${p.total}</b></button>`).join('')}</div>`;
  }

  // As rolagens de Role das Roles do personagem (a principal e a segunda).
  #habilidades() {
    return (this.actor.system.roles ?? []).flatMap(role => (ROLAGENS_DE_ROLE[role.id] ?? []).map(rolagem => ({ id: rolagem.id, nome: rolagem.rotulo, roleNome: role.nome, rank: role.rank, formula: rolagem.formula })));
  }

  // ---------------- Painéis ----------------
  #painel(qual) {
    const corpo = { pericias: () => this.#painelPericias(), roles: () => this.#painelRoles(), net: () => this.#painelNet(), equipamento: () => this.#painelEquipamento() }[qual];
    if (!corpo) return '';
    const titulos = { pericias: 'Perícias', roles: 'Rolagens de Role', net: 'NET', equipamento: 'Equipamento' };
    return `<div class="pt-painel pt-painel-${qual}">
      <header><span>${titulos[qual]}</span>${qual === 'pericias' ? `<input type="search" class="pt-busca" data-foco="busca" placeholder="Buscar…" value="${esc(this.busca)}">` : ''}<button type="button" class="pt-icone" data-acao="fecharPainel" data-tooltip="Fechar"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="pt-painel-corpo">${corpo()}</div>
    </div>`;
  }

  #painelPericias() {
    const grupos = new Map();
    for (const p of this.#periciasDoAtor()) {
      if (!grupos.has(p.grupo)) grupos.set(p.grupo, []);
      grupos.get(p.grupo).push(p);
    }
    return [...grupos.entries()].sort(([x], [y]) => x.localeCompare(y, 'pt-BR'))
      .map(([grupo, lista]) => `<div class="pt-grupo"><h4>${esc(grupo)}</h4>${lista.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')).map(p => `<div class="pt-linha" data-acao="pericia" data-item="${p.id}" data-nome="${esc(p.nome.toLowerCase())}">
          <button type="button" class="pt-estrela${p.favorita ? ' pt-ativa' : ''}" data-acao="favorita" data-item="${p.id}" data-tooltip="Favorita (fica na barra)"><i class="fa-solid fa-star"></i></button>
          <span class="pt-linha-nome">${esc(p.nome)}</span><small>${esc(p.stat)} ${p.valorStat} + ${p.nivel}${p.mods ? ` ${sinal(p.mods)}` : ''}</small><b>${p.total}</b>
        </div>`).join('')}</div>`).join('') || '<p class="pt-vazio-texto">Sem perícias.</p>';
  }

  #painelRoles() {
    return this.#habilidades().map(h => `<div class="pt-linha" data-acao="habilidade" data-rolagem="${h.id}">
        <span class="pt-linha-nome">${esc(h.nome)}</span><small>${esc(h.roleNome)} · rank ${h.rank ?? '–'} · ${esc(h.formula ?? '')}</small><b><i class="fa-solid fa-dice-d20"></i></b>
      </div>`).join('') || '<p class="pt-vazio-texto">Nenhuma rolagem de Role.</p>';
  }

  #painelNet() {
    const a = this.actor;
    const net = naNet(this.token);
    const deck = this.#deckEquipado();
    const rank = a.system.rankDeInterface;
    const partes = [];
    if (net) {
      partes.push(`<div class="pt-net-conectado"><p><i class="fa-solid fa-network-wired"></i> Conectado em <b>${esc(net.nome)}</b>${net.contaAcoes ? ` · sobram ${net.sobram} de ${net.max} Ações NET` : ''}</p>
        <p class="pt-nota">As habilidades de Interface na arquitetura saem pela janela da NET (o mestre resolve o Black ICE).</p>
        <div class="pt-botoes"><button type="button" class="pt-botao" data-acao="abrirNet"><i class="fa-solid fa-up-right-from-square"></i> Janela da NET</button>
        <button type="button" class="pt-botao pt-perigo" data-acao="desconectar"><i class="fa-solid fa-plug-circle-xmark"></i> Desconectar</button></div></div>`);
    } else if (deck && rank && this.token) {
      partes.push(`<div class="pt-botoes"><button type="button" class="pt-botao" data-acao="conectar"><i class="fa-solid fa-plug"></i> Conectar (o ponto de acesso mais perto)</button>
        <button type="button" class="pt-botao" data-acao="scanner"><i class="fa-solid fa-satellite-dish"></i> Scanner (procurar pontos de acesso)</button></div>`);
    }
    if (deck && rank && !net) {
      partes.push(`<h4>Rolagem de Interface (fora de um ponto de acesso)</h4><div class="pt-grade-interface">${HABILIDADES_DE_INTERFACE.map(h => `<button type="button" class="pt-botao" data-acao="interface" data-habilidade="${h.id}" data-tooltip="${esc(`${h.custo}: ${h.dica}`)}">${esc(h.rotulo)}</button>`).join('')}</div>
        <p class="pt-nota">${esc(deck.name)} · Interface ${rank}</p>`);
    } else if (!deck || !rank) {
      partes.push('<p class="pt-nota">Para a Interface: um cyberdeck equipado e o Rank de Interface (o Netrunner).</p>');
    }
    return partes.join('');
  }

  #painelEquipamento() {
    const itens = this.actor.items.filter(item => ['arma', 'armadura', 'cyberdeck'].includes(item.type) && !item.system.instaladoEm);
    return itens.map(item => {
      const estado = A.estadoDoItem(item);
      return `<div class="pt-linha pt-linha-equip">
        <img src="${esc(item.img)}" alt="" data-acao="item" data-item="${item.id}">
        <span class="pt-linha-nome" data-acao="item" data-item="${item.id}">${esc(item.name)}</span>
        <button type="button" class="pt-equip pt-equip-${estado}" data-acao="equipar" data-item="${item.id}" data-tooltip="${item.type === 'cyberdeck' ? 'Guardado → Carregando → Equipado' : 'Guardado ↔ Equipado'}">${NOMES_DE_EQUIPAR[estado] || estado}</button>
      </div>`;
    }).join('') || '<p class="pt-vazio-texto">Sem armas, armaduras ou cyberdecks.</p>';
  }

  #filtrarPericias() {
    const filtro = this.busca.trim().toLowerCase();
    const raiz = this.elemento.querySelector('.pt-painel-pericias');
    if (!raiz) return;
    for (const linha of raiz.querySelectorAll('.pt-linha')) linha.hidden = Boolean(filtro) && !linha.dataset.nome.includes(filtro);
    for (const grupo of raiz.querySelectorAll('.pt-grupo')) grupo.hidden = ![...grupo.querySelectorAll('.pt-linha')].some(linha => !linha.hidden);
  }

  // ---------------- Eventos ----------------
  async #clique(evento) {
    if (escolhendo()) return;
    const el = evento.target.closest('[data-acao]');
    if (!el || !this.elemento.contains(el) || el.matches('input, select')) return;
    evento.preventDefault();
    const a = this.actor;
    const t = this.token;
    const acao = el.dataset.acao;
    const id = el.dataset.item;
    if (!a) return;
    try {
      switch (acao) {
        case 'ficha': return a.sheet.render({ force: true });
        case 'item': return a.items.get(id)?.sheet.render({ force: true });
        case 'retrato': return JanelaDoRetrato.abrir(a);
        case 'estilo': return JanelaDeEstilo.abrir(this);
        case 'recolher': return this.alternarRecolhido();
        case 'fixar':
          this.fixo = this.fixo ? null : (t?.uuid || a.uuid);
          return this.atualizar();
        case 'painel':
          this.aberto = this.aberto === el.dataset.painel ? null : el.dataset.painel;
          return this.desenhar();
        case 'fecharPainel':
          this.aberto = null;
          return this.desenhar();
        case 'hp': return A.mudarHp(a, Number(el.dataset.valor));
        case 'sorte': return A.mudarSorte(a, Number(el.dataset.valor));
        case 'armadura': return A.mudarArmadura(a, el.dataset.local, Number(el.dataset.valor));
        case 'deathSave': return A.rolarDeathSave(evento, a);
        case 'atributo': return A.rolarAtributo(evento, a, el.dataset.stat);
        case 'pericia': return A.rolarPericia(evento, a, id);
        case 'favorita': {
          const favoritas = new Set(a.getFlag(SISTEMA, FLAG_FAVORITAS) ?? []);
          if (favoritas.has(id)) favoritas.delete(id); else favoritas.add(id);
          return a.setFlag(SISTEMA, FLAG_FAVORITAS, [...favoritas]);
        }
        case 'modo':
          A.alternarModo(a, id, el.dataset.modo);
          return this.desenhar();
        case 'recarregar': return A.recarregar(a, id);
        case 'municao': return A.trocarMunicao(a, id);
        case 'acao2077': return A.acao2077(a, id, el.dataset.chave);
        case 'atacar': return this.#atacar(evento, id);
        case 'dano': return A.rolarDano(evento, a, id);
        case 'iniciativa': return A.iniciativa(a, t);
        case 'encerrarTurno': return A.encerrarTurno(a, t);
        case 'facedown': return A.rolarFacedown(evento, a);
        case 'habilidade': return A.rolarRole(evento, a, el.dataset.rolagem);
        case 'interface': return A.rolarInterface(evento, a, el.dataset.habilidade);
        case 'equipar': return A.proximoEstado(a, id);
        case 'mira': return escolherAlvo({ atacante: t?.id });
        case 'limparAlvos': for (const alvo of [...game.user.targets]) alvo.setTarget(false, { user: game.user, releaseOthers: false, groupSelection: true }); return this.desenhar();
        case 'abrirNet': { const net = naNet(t); return net?.tile && game.system.api.netrun.janela(net.tile, { tokenId: t.id }); }
        case 'conectar': return game.system.api.netrun.conectarPelaFicha(a);
        case 'desconectar': return this.#desconectar();
        case 'scanner': return t && game.system.api.netrun.scanner(t);
        default: return null;
      }
    } catch (error) {
      console.error(`${SISTEMA} | Painel Tático, ${acao}`, error);
      ui.notifications.error(`Painel Tático: ${error.message}`);
      return null;
    }
  }

  // Sem alvo marcado, o cursor vira mira (configurável); o supressivo não precisa de alvo (pega a área).
  async #atacar(evento, id) {
    const a = this.actor;
    const quando = config('painelAlvoAntes');
    const modo = A.modoDaArma(a, id);
    const precisa = modo !== 'supressivo' && canvas?.ready && (quando === 'sempre' || (quando === 'semAlvo' && game.user.targets.size === 0));
    if (precisa) {
      const escolha = await escolherAlvo({ atacante: this.token?.id });
      if (!escolha) return null;
    }
    return A.atacar(evento, a, id);
  }

  async #desconectar() {
    const t = this.token;
    if (!t) return null;
    const { DialogV2 } = foundry.applications.api;
    const sim = await DialogV2.confirm({ window: { title: 'Desconectar da NET' }, content: `<p>Desconectar <b>${esc(t.name)}</b> da NET?</p>`, rejectClose: false }).catch(() => false);
    return sim ? game.system.api.netrun.desconectar(t) : null;
  }

  async #menu(evento) {
    const a = this.actor;
    if (!a) return;
    const alvo = evento.target;
    if (alvo.closest('.pt-retrato-alvo, .pt-moldura-caixa, .pt-mini-retrato')) { evento.preventDefault(); JanelaDoRetrato.abrir(a); return; }
    if (alvo.closest('[data-acao="deathSave"]')) { evento.preventDefault(); await A.zerarDeathSave(a); return; }
    const comItem = alvo.closest('[data-item]');
    if (comItem) { evento.preventDefault(); a.items.get(comItem.dataset.item)?.sheet.render({ force: true }); }
  }

  async #mudanca(evento) {
    const a = this.actor;
    const el = evento.target;
    if (!a) return;
    if (el.matches('.pt-hp-campo')) { this.segurando = false; await A.definirHp(a, el.value); return; }
    if (el.matches('.pt-local')) A.definirLocalMirado(a, el.value);
  }

  #digitar(evento) {
    if (!evento.target.matches('.pt-busca')) return;
    this.busca = evento.target.value;
    this.#filtrarPericias();
  }

  // Roda do mouse na barra de HP: soma os passos e grava uma vez só.
  #roda(evento) {
    if (!evento.target.closest('.pt-hp-barra') || !this.actor) return;
    evento.preventDefault();
    this.rodaAcumulada += (evento.deltaY < 0 ? 1 : -1) * (evento.shiftKey ? 5 : 1);
    const hp = this.actor.system.hp;
    const campo = this.elemento.querySelector('.pt-hp-campo');
    if (campo) campo.value = Math.min(hp.max, Math.max(0, hp.value + this.rodaAcumulada));
    this.aplicarRoda();
  }
  async #aplicarRoda() {
    const delta = this.rodaAcumulada;
    this.rodaAcumulada = 0;
    if (delta && this.actor) await A.mudarHp(this.actor, delta);
  }

  // Arrastar pela alça: o painel passa para a posição livre e grava onde ficou.
  #arrastar(evento) {
    const alca = evento.target.closest('.pt-alca');
    if (!alca || evento.button !== 0) return;
    evento.preventDefault();
    const el = this.elemento;
    const caixa = el.getBoundingClientRect();
    const inicio = { x: evento.clientX, y: evento.clientY, esquerda: caixa.left, topo: caixa.top };
    el.classList.add('pt-arrastando');
    const mover = ev => {
      el.classList.remove('pt-posicao-base');
      el.classList.add('pt-posicao-livre');
      el.style.left = `${inicio.esquerda + ev.clientX - inicio.x}px`;
      el.style.top = `${inicio.topo + ev.clientY - inicio.y}px`;
    };
    const soltar = async () => {
      window.removeEventListener('pointermove', mover);
      el.classList.remove('pt-arrastando');
      const agora = el.getBoundingClientRect();
      if (Math.abs(agora.left - caixa.left) < 3 && Math.abs(agora.top - caixa.top) < 3) { this.aplicarEstilo(); return; }
      const pos = dentroDaTela({ x: agora.left, y: agora.top, largura: agora.width, altura: agora.height, telaL: window.innerWidth, telaA: window.innerHeight });
      await salvarEstilo({ ...estiloAtual(), posicao: 'livre', x: pos.x, y: pos.y });
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar, { once: true });
  }

  #paraBase() { return salvarEstilo({ ...estiloAtual(), posicao: 'base', x: null, y: null }); }
}

const vistaMortal = vista => vista && ['mortallyWounded', 'dead'].includes(vista.estado);
export { NOMES_DOS_ESTADOS };
