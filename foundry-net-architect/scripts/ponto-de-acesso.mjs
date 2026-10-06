// Ponto de acesso à NET: qualquer Tile da cena vira um, pelo botão no HUD do Tile (só o mestre).
// No mapa, um marcador "NET" fica sobre o Tile para todos (os ocultos, só para o mestre e para quem os achou com
// Scanner). Clicar no marcador conecta o token do jogador (dentro do alcance e com os requisitos) e abre a janela.
import { MODULE_ID, FLAG_PONTO } from './constantes.mjs';
import { pontoDoTile, estadoDoTile, conexaoDoToken, faltasPara, distancia, alcanceDo, arquiteturaDoPonto, netrunnerDo } from './estado.mjs';
import { JanelaNet } from './janela.mjs';
import { EditorDeArquitetura } from './editor.mjs';
import { pedir } from './socket.mjs';
import { arquiteturasDisponiveis, novaArquitetura } from './compendio.mjs';
import { TIPOS as TIPOS_DE_LIGACAO, objetosDaCena, nomeDe as nomeDaLigacao, documentoDe } from './ligacoes.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const PONTO_PADRAO = { ativo: true, nome: 'Ponto de acesso', arquitetura: '', dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, dvScanner: 10, reiniciar: true, ligacoes: [], revelados: [] };
const visivelPara = (tile, ponto, user) => user.isGM || !(tile.hidden || ponto.oculto) || (ponto.revelados || []).includes(user.id);

// ---------------- Marcadores no mapa ----------------
let camada = null;
let alvos = [];

export function desenharPontos() {
  if (!canvas.ready || !canvas.scene) return;
  const pai = canvas.interface || canvas.controls || canvas.stage;
  if (!camada || camada.destroyed || camada.parent !== pai) {
    camada = new PIXI.Container();
    camada.name = `${MODULE_ID}-pontos`;
    camada.eventMode = 'none';
    pai.addChild(camada);
  }
  for (const filho of camada.removeChildren()) filho.destroy({ children: true });
  alvos = [];
  const tamanho = canvas.grid.size;
  for (const tile of canvas.scene.tiles) {
    const ponto = pontoDoTile(tile);
    if (!ponto || !ponto.ativo || !visivelPara(tile, ponto, game.user)) continue;
    const escondido = tile.hidden || ponto.oculto;
    const estado = estadoDoTile(tile);
    const ocupado = Boolean(estado && estado.corredores && estado.corredores.length);
    const x = tile.x + tile.width / 2;
    const y = tile.y + tile.height / 2;
    const raio = Math.max(18, tamanho * 0.34);
    const marca = new PIXI.Container();
    marca.position.set(x, y);
    marca.alpha = escondido && game.user.isGM ? 0.55 : 1;
    const hex = new PIXI.Graphics();
    const pontos = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; pontos.push(Math.cos(a) * raio, Math.sin(a) * raio); }
    if (ocupado) hex.lineStyle(raio * 0.18, 0xff2e88, 0.55).drawPolygon(pontos.map(v => v * 1.28));
    hex.lineStyle(Math.max(2, raio * 0.1), ponto.arquitetura ? 0x00ffd2 : 0x8a9696, 1).beginFill(0x071012, 0.88).drawPolygon(pontos).endFill();
    marca.addChild(hex);
    const texto = new PIXI.Text('NET', { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.62), fontWeight: '700', fill: 0xe8fffb, letterSpacing: 1 });
    texto.anchor.set(0.5);
    marca.addChild(texto);
    const nome = new PIXI.Text(ponto.nome || 'Ponto de acesso', { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.42), fill: 0x00ffd2, stroke: 0x000000, strokeThickness: 3 });
    nome.anchor.set(0.5, 0);
    nome.position.set(0, raio * 1.15);
    marca.addChild(nome);
    camada.addChild(marca);
    alvos.push({ tile, x, y, raio: raio * 1.2 });
  }
}

export function apagarPontos() {
  if (camada && !camada.destroyed) camada.destroy({ children: true });
  camada = null;
  alvos = [];
}

// Coordenadas do mundo a partir do ponteiro.
function noMundo(event) {
  const caixa = canvas.app.view.getBoundingClientRect();
  return canvas.stage.worldTransform.applyInverse(new PIXI.Point(event.clientX - caixa.left, event.clientY - caixa.top));
}
function pontoSob(event) {
  if (!canvas.ready || !alvos.length || event.target !== canvas.app.view) return null;
  const p = noMundo(event);
  return alvos.find(alvo => Math.hypot(p.x - alvo.x, p.y - alvo.y) <= alvo.raio) || null;
}

// Antes do Foundry (fase de captura na janela): um clique no marcador não seleciona nem arrasta nada no mapa.
export function escutarCliques() {
  window.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const alvo = pontoSob(event);
    if (!alvo) return;
    event.stopPropagation();
    event.preventDefault();
    abrirPonto(alvo.tile, { shift: event.shiftKey }).catch(error => ui.notifications.warn(error.message));
  }, true);
  window.addEventListener('pointermove', event => {
    if (!canvas.ready || event.target !== canvas.app.view) return;
    const sobre = Boolean(pontoSob(event));
    if (sobre) canvas.app.view.style.cursor = 'pointer';
    else if (canvas.app.view.style.cursor === 'pointer') canvas.app.view.style.cursor = '';
  }, { passive: true });
}

// O token do jogador para conectar: o selecionado (dele), senão o do personagem dele na cena; o mais perto.
function tokenDoJogador(tile) {
  const meus = canvas.tokens.controlled.map(token => token.document).filter(token => token.isOwner);
  const candidatos = meus.length ? meus : canvas.scene.tokens.filter(token => token.isOwner && token.actor && (!game.user.character || token.actor.id === game.user.character.id));
  return candidatos.sort((a, b) => distancia(tile, a) - distancia(tile, b))[0] || null;
}

// Clique no marcador: o mestre abre o painel (shift: a configuração); o jogador conecta o token e abre a janela.
export async function abrirPonto(tile, { shift = false } = {}) {
  const ponto = pontoDoTile(tile);
  if (!ponto || !ponto.ativo) return;
  if (game.user.isGM) {
    if (shift) return configurar(tile);
    const selecionado = canvas.tokens.controlled[0];
    if (selecionado && !conexaoDoToken(selecionado.document) && ((estadoDoTile(tile) || {}).corredores || []).length === 0 && selecionado.actor) {
      const certo = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Conectar à NET' }, content: `<p>Conectar <b>${esc(selecionado.name)}</b> a ${esc(ponto.nome)}? Sem o token, o clique só abre o painel do mestre.</p>`, rejectClose: false });
      if (certo) await conectar(tile, selecionado.document);
    }
    JanelaNet.abrir(tile, { gm: true });
    return;
  }
  const token = tokenDoJogador(tile);
  if (!token) { ui.notifications.warn('Selecione o seu token perto do ponto de acesso.'); return; }
  const conexao = conexaoDoToken(token);
  if (conexao && conexao.tile === tile.uuid) { JanelaNet.abrir(tile, { tokenId: token.id }); return; }
  if (conexao) { ui.notifications.warn(`${token.name} já está conectado em outro ponto de acesso.`); return; }
  if (!ponto.arquitetura) { ui.notifications.warn('Este ponto de acesso ainda não tem arquitetura.'); return; }
  const faltas = faltasPara(ponto, token.actor);
  if (faltas.length) { ui.notifications.warn(`${token.name} não conecta aqui: falta ${faltas.join(' e ')}.`); return; }
  const longe = distancia(tile, token);
  const alcance = alcanceDo(ponto, tile.parent);
  if (longe > alcance + 0.01) { ui.notifications.warn(`${token.name} está longe demais: ${longe.toFixed(1)} ${tile.parent.grid.units || 'm'} (alcance ${alcance}). Chegue mais perto.`); return; }
  await conectar(tile, token);
}

export async function conectar(tile, token) {
  await pedir('conectar', { tile: tile.uuid, token: token.id });
  if (!game.user.isGM) JanelaNet.abrir(tile, { tokenId: token.id });
  ui.notifications.info(`${token.name} conectou à NET.`);
}

// ---------------- Botões nos HUDs ----------------
const raizDo = html => (html instanceof HTMLElement ? html : html && html[0]);
function botao(titulo, icone, ativo, aoClicar) {
  const el = document.createElement('div');
  el.className = `control-icon net-architect-hud${ativo ? ' active' : ''}`;
  el.title = titulo;
  el.innerHTML = `<i class="fa-solid ${icone}"></i>`;
  el.addEventListener('click', event => { event.preventDefault(); aoClicar(); });
  return el;
}

export function botaoNoHud(hud, html) {
  if (!game.user.isGM) return;
  const raiz = raizDo(html);
  const coluna = raiz && (raiz.querySelector('.col.right') || raiz.querySelector('.right'));
  if (!coluna) return;
  const tile = hud.object && hud.object.document;
  const ponto = pontoDoTile(tile);
  coluna.append(botao('Ponto de acesso à NET', 'fa-network-wired', ponto && ponto.ativo, () => configurar(tile)));
}

// Scanner (Ação Carnal) no HUD do token de quem tem Interface e não está conectado.
export function botaoScannerNoHud(hud, html) {
  const token = hud.object && hud.object.document;
  if (!token || !token.isOwner || !token.actor || conexaoDoToken(token) || !netrunnerDo(token.actor).role) return;
  const raiz = raizDo(html);
  const coluna = raiz && (raiz.querySelector('.col.left') || raiz.querySelector('.left'));
  if (!coluna) return;
  coluna.append(botao('Scanner: procurar pontos de acesso (Ação Carnal)', 'fa-satellite-dish', false, async () => {
    try {
      const { total, achados } = await pedir('scanner', { cena: token.parent.id, token: token.id });
      ui.notifications.info(`Scanner (${total}): ${achados.length ? achados.join('; ') : 'nenhum ponto de acesso por perto'}.`);
    } catch (error) { ui.notifications.warn(error.message); }
  }));
}

export function configurar(tile) {
  new ConfigDoPonto(tile).render({ force: true });
}
export const abrirEditor = item => EditorDeArquitetura.abrir(item);

// ---------------- Configuração (mestre) ----------------
export class ConfigDoPonto extends ApplicationV2 {
  constructor(tile) {
    super({ id: `${MODULE_ID}-config-${tile.id}` });
    this.tile = tile;
    const salvo = pontoDoTile(tile) || {};
    this.ligacoes = Array.isArray(salvo.ligacoes) ? foundry.utils.deepClone(salvo.ligacoes) : [];
    this.rascunho = null;
  }

  static DEFAULT_OPTIONS = {
    tag: 'form',
    classes: ['net-architect', 'net-config'],
    window: { title: 'Ponto de acesso à NET', icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 600 },
    form: { handler: ConfigDoPonto.#salvar, closeOnSubmit: true },
    actions: {
      nova: ConfigDoPonto.#nova, abrirArquitetura: ConfigDoPonto.#abrirArquitetura, editor: ConfigDoPonto.#editor,
      ligar: ConfigDoPonto.#ligar, desligar: ConfigDoPonto.#desligar, mostrar: ConfigDoPonto.#mostrar,
      reiniciar: ConfigDoPonto.#reiniciar, remover: ConfigDoPonto.#remover
    }
  };

  async _prepareContext() {
    const salvo = { ...PONTO_PADRAO, ...(pontoDoTile(this.tile) || {}) };
    const ponto = { ...salvo, ...(this.rascunho || {}) };
    let controles = [];
    if (salvo.arquitetura) {
      try {
        const arq = await arquiteturaDoPonto(salvo);
        controles = Object.values(arq.nos).flatMap(no => no.conteudos.filter(c => c.tipo === 'controle').map(c => ({ chave: c.chave, rotulo: `Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''} · nó de controle DV ${c.dv || '—'}`, descricao: c.descricao })));
      } catch { controles = []; }
    }
    return { ponto, salvo, controles, arquiteturas: await arquiteturasDisponiveis(), cena: this.tile.parent };
  }

  async _renderHTML({ ponto, salvo, controles, arquiteturas, cena }) {
    const grupos = {};
    for (const arq of arquiteturas) (grupos[arq.fonte] = grupos[arq.fonte] || []).push(arq);
    const opcoes = Object.entries(grupos).map(([fonte, lista]) => `<optgroup label="${esc(fonte)}">${lista.map(arq => `<option value="${esc(arq.uuid)}"${arq.uuid === ponto.arquitetura ? ' selected' : ''}>${esc(arq.nome)}</option>`).join('')}</optgroup>`).join('');
    const marcado = valor => (valor ? ' checked' : '');
    const objetos = objetosDaCena(cena);
    const escolhas = Object.entries(TIPOS_DE_LIGACAO).map(([tipo, info]) => (objetos[tipo].length ? `<optgroup label="${esc(info.nome)}s">${objetos[tipo].map(obj => `<option value="${tipo}:${esc(obj.id)}">${esc(obj.nome)}</option>`).join('')}</optgroup>` : '')).join('');
    const ligacoes = controles.length ? controles.map(c => `<div class="net-ligar">
        <div><b>${esc(c.rotulo)}</b>${c.descricao ? `<p class="hint">${esc(c.descricao)}</p>` : ''}</div>
        <ul class="net-chips">${this.ligacoes.map((lig, i) => ({ lig, i })).filter(({ lig }) => lig.controle === c.chave).map(({ lig, i }) => `<li><i class="fa-solid ${(TIPOS_DE_LIGACAO[lig.tipo] || {}).icone || 'fa-circle'}"></i> ${esc(nomeDaLigacao(cena, lig))}<button type="button" data-action="mostrar" data-controle="${esc(c.chave)}" data-indice="${i}" title="Mostrar no mapa"><i class="fa-solid fa-location-crosshairs"></i></button><button type="button" data-action="desligar" data-controle="${esc(c.chave)}" data-indice="${i}" title="Desligar"><i class="fa-solid fa-xmark"></i></button></li>`).join('') || '<li class="net-nota">Nada ligado: o nó só aceita comandos narrados.</li>'}</ul>
        ${escolhas ? `<div class="net-linha"><select data-escolha="${esc(c.chave)}">${escolhas}</select><button type="button" data-action="ligar" data-controle="${esc(c.chave)}"><i class="fa-solid fa-link"></i> Ligar</button></div>` : '<p class="hint">A cena não tem portas, luzes, sons nem tokens para ligar.</p>'}
      </div>`).join('') : `<p class="hint">${salvo.arquitetura ? 'A arquitetura não tem nós de controle.' : 'Escolha e salve uma arquitetura para ligar os nós de controle.'}</p>`;
    return `<div class="net-form">
      <label class="net-check"><input type="checkbox" name="ativo"${marcado(ponto.ativo)}> Ponto de acesso ativo</label>
      <div class="form-group"><label>Nome</label><input type="text" name="nome" value="${esc(ponto.nome)}" maxlength="60"></div>
      <div class="form-group"><label>Arquitetura</label><select name="arquitetura"><option value="">(escolha)</option>${opcoes}</select></div>
      <div class="net-botoes"><button type="button" data-action="nova"><i class="fa-solid fa-plus"></i> Nova arquitetura no compêndio</button>${salvo.arquitetura ? '<button type="button" data-action="editor"><i class="fa-solid fa-diagram-project"></i> Editor visual</button><button type="button" data-action="abrirArquitetura"><i class="fa-solid fa-pen"></i> Ficha do sistema</button>' : ''}</div>
      ${ponto.arquitetura !== salvo.arquitetura ? '<p class="hint">Salve para editar e ligar os nós da arquitetura nova.</p>' : ''}
      <p class="hint">As arquiteturas ficam no compêndio do mundo “Arquiteturas da NET” (item NET Architecture do sistema). No editor visual dá para arrastar andares, criar ramos e pôr demônios e netrunners inimigos. A mesma arquitetura serve para vários pontos.</p>
      <div class="net-colunas">
        <div class="form-group"><label>Alcance (${esc(cena.grid.units || 'm')})</label><input type="number" name="alcance" value="${esc(ponto.alcance)}" min="0" step="0.5"><p class="hint">Distância máxima do token até o Tile. No RED, 6 m.</p></div>
        <div class="form-group"><label>DV da arquitetura</label><input type="number" name="dv" value="${esc(ponto.dv ?? '')}" min="2" max="30" placeholder="automático"><p class="hint">Para Cloak e Virus. Vazio: o maior DV dos andares.</p></div>
      </div>
      <fieldset><legend>Requisitos para conectar</legend>
        <label class="net-check"><input type="checkbox" name="exigeDeck"${marcado(ponto.exigeDeck)}> Cyberdeck equipado</label>
        <div class="form-group"><label>Interface mínima (rank da Role de netrunning)</label><input type="number" name="rankMinimo" value="${esc(ponto.rankMinimo)}" min="0" max="10"></div>
      </fieldset>
      <div class="net-colunas">
        <label class="net-check"><input type="checkbox" name="oculto"${marcado(ponto.oculto)}> Oculto: o marcador só aparece para o mestre e para quem achar com Scanner</label>
        <div class="form-group"><label>DV do Scanner (se oculto)</label><input type="number" name="dvScanner" value="${esc(ponto.dvScanner ?? 10)}" min="2" max="30"><p class="hint">O Scanner acha até resultado × 10 m.${(ponto.revelados || []).length ? ` Achado por ${(ponto.revelados || []).map(id => esc((game.users.get(id) || {}).name || '?')).join(', ')}.` : ''}</p></div>
      </div>
      <label class="net-check"><input type="checkbox" name="reiniciar"${marcado(ponto.reiniciar)}> Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198)</label>
      <fieldset class="net-ligacoes-config"><legend>Nós de controle ligados à cena</legend>
        <p class="hint">Quem toma o nó (Control) comanda daqui: portas (abrir, fechar, trancar), luzes e sons (ligar, desligar) e tokens (assumir o controle até desconectar). Cada comando gasta 1 Ação NET.</p>
        ${ligacoes}
      </fieldset>
      <footer class="net-botoes net-rodape"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar</button><button type="button" data-action="reiniciar">Reiniciar o estado</button><button type="button" data-action="remover" class="net-perigo">Deixar de ser ponto de acesso</button></footer>
    </div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; }

  // Guarda o que já foi digitado antes de redesenhar (ligar e desligar redesenham a janela).
  #guardarRascunho() {
    const Formulario = (foundry.applications.ux && foundry.applications.ux.FormDataExtended) || FormDataExtended;
    try { this.rascunho = new Formulario(this.element).object; } catch { this.rascunho = null; }
  }

  static async #salvar(event, form, formData) {
    const dados = formData.object;
    const salvo = pontoDoTile(this.tile) || {};
    const ponto = {
      ...PONTO_PADRAO, ...salvo,
      ativo: Boolean(dados.ativo), nome: String(dados.nome || '').trim() || 'Ponto de acesso', arquitetura: dados.arquitetura || '',
      alcance: Math.max(0, Number(dados.alcance) || 0), dv: Number(dados.dv) || null, exigeDeck: Boolean(dados.exigeDeck),
      rankMinimo: Math.max(0, Math.min(10, Number(dados.rankMinimo) || 0)), oculto: Boolean(dados.oculto),
      dvScanner: Math.max(2, Math.min(30, Number(dados.dvScanner) || 10)), reiniciar: Boolean(dados.reiniciar),
      ligacoes: dados.arquitetura === salvo.arquitetura ? this.ligacoes : [], revelados: salvo.revelados || []
    };
    await this.tile.setFlag(MODULE_ID, FLAG_PONTO, ponto);
    ui.notifications.info(`${ponto.nome}: ponto de acesso salvo.`);
  }

  static #ligar(event, alvo) {
    const controle = alvo.dataset.controle;
    const escolha = this.element.querySelector(`[data-escolha="${CSS.escape(controle)}"]`);
    if (!escolha || !escolha.value) return;
    const [tipo, id] = escolha.value.split(':');
    if (!this.ligacoes.some(item => item.controle === controle && item.tipo === tipo && item.id === id)) this.ligacoes.push({ controle, tipo, id });
    this.#guardarRascunho();
    this.render();
  }

  static #desligar(event, alvo) {
    this.ligacoes.splice(Number(alvo.dataset.indice), 1);
    this.#guardarRascunho();
    this.render();
  }

  static #mostrar(event, alvo) {
    const ligacao = this.ligacoes[Number(alvo.dataset.indice)];
    const doc = ligacao && documentoDe(this.tile.parent, ligacao);
    if (!doc || canvas.scene?.id !== this.tile.parent.id) return;
    const x = doc.x ?? (doc.c ? (doc.c[0] + doc.c[2]) / 2 : 0);
    const y = doc.y ?? (doc.c ? (doc.c[1] + doc.c[3]) / 2 : 0);
    canvas.ping({ x: ligacao.tipo === 'token' ? x + doc.width * canvas.grid.size / 2 : x, y: ligacao.tipo === 'token' ? y + doc.height * canvas.grid.size / 2 : y });
  }

  static async #nova() {
    const item = await novaArquitetura();
    if (!item) return;
    await this.tile.setFlag(MODULE_ID, FLAG_PONTO, { ...PONTO_PADRAO, ...(pontoDoTile(this.tile) || {}), arquitetura: item.uuid, ligacoes: [] });
    this.ligacoes = [];
    this.rascunho = null;
    EditorDeArquitetura.abrir(item);
    this.render();
  }

  static async #editor() {
    const ponto = pontoDoTile(this.tile);
    const item = ponto && ponto.arquitetura ? await fromUuid(ponto.arquitetura) : null;
    if (item) EditorDeArquitetura.abrir(item);
  }

  static async #abrirArquitetura() {
    const ponto = pontoDoTile(this.tile);
    const item = ponto && ponto.arquitetura ? await fromUuid(ponto.arquitetura) : null;
    if (item) item.sheet.render(true);
  }

  static async #reiniciar() {
    if (!(pontoDoTile(this.tile) || {}).arquitetura) return;
    try { await pedir('reiniciar', { tile: this.tile.uuid }); ui.notifications.info('Arquitetura reiniciada.'); } catch (error) { ui.notifications.warn(error.message); }
  }

  static async #remover() {
    const estado = estadoDoTile(this.tile);
    if (estado && estado.corredores && estado.corredores.length) { ui.notifications.warn('Tem netrunner conectado aqui: desconecte antes.'); return; }
    await this.tile.update({ [`flags.${MODULE_ID}.-=${FLAG_PONTO}`]: null, [`flags.${MODULE_ID}.-=estado`]: null });
    this.close();
  }
}
