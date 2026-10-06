// Ponto de acesso à NET: qualquer Tile da cena vira um, pelo botão no HUD do Tile (só o mestre).
// No mapa, um marcador "NET" fica sobre o Tile para todos (menos os ocultos, que só o mestre vê).
// Clicar no marcador conecta o token do jogador (dentro do alcance e com os requisitos) e abre a janela da NET.
import { MODULE_ID, FLAG_PONTO, PACK_NAME } from './constantes.mjs';
import { pontoDoTile, estadoDoTile, conexaoDoToken, faltasPara, distancia, alcanceDo } from './estado.mjs';
import { JanelaNet } from './janela.mjs';
import { pedir } from './socket.mjs';
import { arquiteturasDisponiveis, novaArquitetura } from './compendio.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const PONTO_PADRAO = { ativo: true, nome: 'Ponto de acesso', arquitetura: '', dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, reiniciar: true };

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
    if (!ponto || !ponto.ativo) continue;
    const escondido = tile.hidden || ponto.oculto;
    if (escondido && !game.user.isGM) continue;
    const estado = estadoDoTile(tile);
    const ocupado = Boolean(estado && estado.corredores && estado.corredores.length);
    const x = tile.x + tile.width / 2;
    const y = tile.y + tile.height / 2;
    const raio = Math.max(18, tamanho * 0.34);
    const marca = new PIXI.Container();
    marca.position.set(x, y);
    marca.alpha = escondido ? 0.55 : 1;
    const hex = new PIXI.Graphics();
    const pontos = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; pontos.push(Math.cos(a) * raio, Math.sin(a) * raio); }
    if (ocupado) hex.lineStyle(raio * 0.18, 0xff2e88, 0.55).drawPolygon(pontos.map(v => v * 1.28));
    hex.lineStyle(Math.max(2, raio * 0.1), ponto.arquitetura ? 0x00ffd2 : 0x8a9696, 1).beginFill(0x071012, 0.88).drawPolygon(pontos).endFill();
    marca.addChild(hex);
    const texto = new PIXI.Text('NET', { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.62), fontWeight: '700', fill: 0xe8fffb, letterSpacing: 1 });
    texto.anchor.set(0.5);
    marca.addChild(texto);
    if (game.user.isGM || !escondido) {
      const nome = new PIXI.Text(ponto.nome || 'Ponto de acesso', { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.42), fill: 0x00ffd2, stroke: 0x000000, strokeThickness: 3 });
      nome.anchor.set(0.5, 0);
      nome.position.set(0, raio * 1.15);
      marca.addChild(nome);
    }
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
  const view = canvas.app.view;
  const caixa = view.getBoundingClientRect();
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
    if (selecionado && !conexaoDoToken(selecionado.document) && (estadoDoTile(tile)?.corredores || []).length === 0 && selecionado.actor) {
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

// ---------------- Botão no HUD do Tile ----------------
export function botaoNoHud(hud, html) {
  if (!game.user.isGM) return;
  const raiz = html instanceof HTMLElement ? html : html[0];
  const coluna = raiz && (raiz.querySelector('.col.right') || raiz.querySelector('.right'));
  if (!coluna) return;
  const tile = hud.object && hud.object.document;
  const ponto = pontoDoTile(tile);
  const botao = document.createElement('div');
  botao.className = `control-icon net-architect-hud${ponto && ponto.ativo ? ' active' : ''}`;
  botao.title = 'Ponto de acesso à NET';
  botao.innerHTML = '<i class="fa-solid fa-network-wired"></i>';
  botao.addEventListener('click', event => { event.preventDefault(); configurar(tile); });
  coluna.append(botao);
}

export function configurar(tile) {
  new ConfigDoPonto(tile).render({ force: true });
}

// ---------------- Configuração (mestre) ----------------
export class ConfigDoPonto extends ApplicationV2 {
  constructor(tile) {
    super({ id: `${MODULE_ID}-config-${tile.id}` });
    this.tile = tile;
  }

  static DEFAULT_OPTIONS = {
    tag: 'form',
    classes: ['net-architect', 'net-config'],
    window: { title: 'Ponto de acesso à NET', icon: 'fa-solid fa-network-wired' },
    position: { width: 520 },
    form: { handler: ConfigDoPonto.#salvar, closeOnSubmit: true },
    actions: { nova: ConfigDoPonto.#nova, abrirArquitetura: ConfigDoPonto.#abrirArquitetura, reiniciar: ConfigDoPonto.#reiniciar, remover: ConfigDoPonto.#remover }
  };

  async _prepareContext() {
    return { ponto: { ...PONTO_PADRAO, ...(pontoDoTile(this.tile) || {}) }, arquiteturas: await arquiteturasDisponiveis(), cena: this.tile.parent };
  }

  async _renderHTML({ ponto, arquiteturas, cena }) {
    const grupos = {};
    for (const arq of arquiteturas) (grupos[arq.fonte] = grupos[arq.fonte] || []).push(arq);
    const opcoes = Object.entries(grupos).map(([fonte, lista]) => `<optgroup label="${esc(fonte)}">${lista.map(arq => `<option value="${esc(arq.uuid)}"${arq.uuid === ponto.arquitetura ? ' selected' : ''}>${esc(arq.nome)}</option>`).join('')}</optgroup>`).join('');
    const marcado = valor => (valor ? ' checked' : '');
    return `<div class="net-form">
      <label class="net-check"><input type="checkbox" name="ativo"${marcado(ponto.ativo)}> Ponto de acesso ativo</label>
      <div class="form-group"><label>Nome</label><input type="text" name="nome" value="${esc(ponto.nome)}" maxlength="60"></div>
      <div class="form-group"><label>Arquitetura</label><select name="arquitetura"><option value="">(escolha)</option>${opcoes}</select></div>
      <div class="net-botoes"><button type="button" data-action="nova"><i class="fa-solid fa-plus"></i> Nova arquitetura no compêndio</button>${ponto.arquitetura ? '<button type="button" data-action="abrirArquitetura"><i class="fa-solid fa-pen"></i> Editar a arquitetura</button>' : ''}</div>
      <p class="hint">As arquiteturas ficam no compêndio do mundo “Arquiteturas da NET” e são o item NET Architecture do sistema: os andares, ramos, DVs e Black ICE se editam na ficha dele. A mesma arquitetura serve para vários pontos.</p>
      <div class="net-colunas">
        <div class="form-group"><label>Alcance (${esc(cena.grid.units || 'm')})</label><input type="number" name="alcance" value="${esc(ponto.alcance)}" min="0" step="0.5"><p class="hint">Distância máxima do token até o Tile. No RED, 6 m.</p></div>
        <div class="form-group"><label>DV da arquitetura</label><input type="number" name="dv" value="${esc(ponto.dv ?? '')}" min="2" max="30" placeholder="automático"><p class="hint">Para Cloak e Virus. Vazio: o maior DV dos andares.</p></div>
      </div>
      <fieldset><legend>Requisitos para conectar</legend>
        <label class="net-check"><input type="checkbox" name="exigeDeck"${marcado(ponto.exigeDeck)}> Cyberdeck equipado</label>
        <div class="form-group"><label>Interface mínima (rank da Role de netrunning)</label><input type="number" name="rankMinimo" value="${esc(ponto.rankMinimo)}" min="0" max="10"></div>
      </fieldset>
      <label class="net-check"><input type="checkbox" name="oculto"${marcado(ponto.oculto)}> Oculto: só o mestre vê o marcador</label>
      <label class="net-check"><input type="checkbox" name="reiniciar"${marcado(ponto.reiniciar)}> Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198)</label>
      <footer class="net-botoes net-rodape"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar</button><button type="button" data-action="reiniciar">Reiniciar o estado</button><button type="button" data-action="remover" class="net-perigo">Deixar de ser ponto de acesso</button></footer>
    </div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; }

  static async #salvar(event, form, formData) {
    const dados = formData.object;
    const ponto = {
      ...PONTO_PADRAO, ...(pontoDoTile(this.tile) || {}),
      ativo: Boolean(dados.ativo), nome: String(dados.nome || '').trim() || 'Ponto de acesso', arquitetura: dados.arquitetura || '',
      alcance: Math.max(0, Number(dados.alcance) || 0), dv: Number(dados.dv) || null, exigeDeck: Boolean(dados.exigeDeck),
      rankMinimo: Math.max(0, Math.min(10, Number(dados.rankMinimo) || 0)), oculto: Boolean(dados.oculto), reiniciar: Boolean(dados.reiniciar)
    };
    await this.tile.setFlag(MODULE_ID, FLAG_PONTO, ponto);
    ui.notifications.info(`${ponto.nome}: ponto de acesso salvo.`);
  }

  static async #nova() {
    const item = await novaArquitetura();
    if (!item) return;
    await this.tile.setFlag(MODULE_ID, FLAG_PONTO, { ...PONTO_PADRAO, ...(pontoDoTile(this.tile) || {}), arquitetura: item.uuid });
    item.sheet.render(true);
    this.render();
  }

  static async #abrirArquitetura() {
    const ponto = pontoDoTile(this.tile);
    const item = ponto && ponto.arquitetura ? await fromUuid(ponto.arquitetura) : null;
    if (item) item.sheet.render(true);
  }

  static async #reiniciar() {
    if (!pontoDoTile(this.tile)?.arquitetura) return;
    try { await pedir('reiniciar', { tile: this.tile.uuid }); ui.notifications.info('Arquitetura reiniciada.'); } catch (error) { ui.notifications.warn(error.message); }
  }

  static async #remover() {
    const estado = estadoDoTile(this.tile);
    if (estado && estado.corredores && estado.corredores.length) { ui.notifications.warn('Tem netrunner conectado aqui: desconecte antes.'); return; }
    await this.tile.update({ [`flags.${MODULE_ID}.-=${FLAG_PONTO}`]: null, [`flags.${MODULE_ID}.-=estado`]: null });
    this.close();
  }
}

export { PACK_NAME };
