// O ponto de acesso à NET (o ponto-de-acesso.mjs do NET Architect): qualquer Tile da cena vira um, pelo botão no HUD do
// Tile (só o mestre). No mapa, o marcador "NET" fica sobre o Tile para todos (o oculto, só para o mestre e para quem o
// achou). Clicar no marcador conecta o token do jogador (dentro do alcance e com os requisitos) e abre a janela da NET; o
// mestre abre a janela dele (com Shift, a configuração).
import { caminho, SISTEMA } from '../config.mjs';
import { FLAG_ESTADO, FLAG_PONTO, IMAGEM_DO_TERMINAL, PONTO_PADRAO } from './constantes.mjs';
import { conexaoDoToken, estadoDoTile, pontoDoTile } from './estado.mjs';
import { JanelaDaNet } from './janela.mjs';
import { alcanceDo, distancia, faltasPara, netrunnerDo } from './regras-da-net.mjs';
import { pedir } from './socket.mjs';

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const semImagem = tile => !tile.texture?.src;
const visivelPara = (tile, ponto, usuario) => usuario.isGM || !(tile.hidden || ponto.oculto) || (ponto.revelados ?? []).includes(usuario.id);

// ---------------- Os marcadores no mapa ----------------
let camada = null;
let alvos = [];

export function desenharPontos() {
  if (!canvas.ready || !canvas.scene) return;
  const pai = canvas.interface ?? canvas.controls ?? canvas.stage;
  if (!camada || camada.destroyed || camada.parent !== pai) {
    camada = new PIXI.Container();
    camada.name = `${SISTEMA}-pontos-de-acesso`;
    camada.eventMode = 'none';
    pai.addChild(camada);
  }
  for (const filho of camada.removeChildren()) filho.destroy({ children: true });
  alvos = [];
  const tamanho = canvas.grid.size;
  for (const tile of canvas.scene.tiles) {
    const ponto = pontoDoTile(tile);
    if (!ponto?.ativo || !visivelPara(tile, ponto, game.user)) continue;
    const escondido = tile.hidden || ponto.oculto;
    const ocupado = Boolean(estadoDoTile(tile)?.corredores?.length);
    const [x, y] = [tile.x + tile.width / 2, tile.y + tile.height / 2];
    const raio = Math.max(18, tamanho * 0.34);
    const marca = new PIXI.Container();
    marca.position.set(x, y);
    marca.alpha = escondido && game.user.isGM ? 0.55 : 1;
    const hexagono = new PIXI.Graphics();
    const pontos = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pontos.push(Math.cos(a) * raio, Math.sin(a) * raio);
    }
    if (ocupado) hexagono.lineStyle(raio * 0.18, 0xff2e88, 0.55).drawPolygon(pontos.map(valor => valor * 1.28));
    hexagono.lineStyle(Math.max(2, raio * 0.1), ponto.arquitetura ? 0x00ffd2 : 0x8a9696, 1).beginFill(0x071012, 0.88).drawPolygon(pontos).endFill();
    marca.addChild(hexagono);
    const texto = new PIXI.Text('NET', { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.62), fontWeight: '700', fill: 0xe8fffb, letterSpacing: 1 });
    texto.anchor.set(0.5);
    marca.addChild(texto);
    const rotulo = game.user.isGM && escondido ? `${ponto.nome || 'Ponto de acesso'} · oculto${tile.hidden ? ' (Tile escondido)' : ''}` : ponto.nome || 'Ponto de acesso';
    const nome = new PIXI.Text(rotulo, { fontFamily: 'Signika, sans-serif', fontSize: Math.round(raio * 0.42), fill: game.user.isGM && escondido ? 0xff9fbf : 0x00ffd2, stroke: 0x000000, strokeThickness: 3 });
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

// Os marcadores desenhados neste cliente (os testes conferem).
export const pontosDesenhados = () => alvos.map(alvo => ({ tile: alvo.tile.id, nome: pontoDoTile(alvo.tile)?.nome ?? '' }));

function pontoSob(evento) {
  if (!canvas.ready || !alvos.length || evento.target !== canvas.app.view) return null;
  const caixa = canvas.app.view.getBoundingClientRect();
  const p = canvas.stage.worldTransform.applyInverse(new PIXI.Point(evento.clientX - caixa.left, evento.clientY - caixa.top));
  return alvos.find(alvo => Math.hypot(p.x - alvo.x, p.y - alvo.y) <= alvo.raio) ?? null;
}

// Antes do Foundry (na fase de captura): o clique no marcador não seleciona nem arrasta nada no mapa.
export function escutarCliques() {
  window.addEventListener('pointerdown', evento => {
    if (evento.button !== 0) return;
    const alvo = pontoSob(evento);
    if (!alvo) return;
    evento.stopPropagation();
    evento.preventDefault();
    abrirPonto(alvo.tile, { shift: evento.shiftKey }).catch(falha => ui.notifications.warn(falha.message));
  }, true);
  window.addEventListener('pointermove', evento => {
    if (!canvas.ready || evento.target !== canvas.app.view) return;
    if (pontoSob(evento)) canvas.app.view.style.cursor = 'pointer';
    else if (canvas.app.view.style.cursor === 'pointer') canvas.app.view.style.cursor = '';
  }, { passive: true });
}

// O token do jogador para conectar: o selecionado (dele), senão o do personagem dele na cena; o mais perto.
function tokenDoJogador(tile) {
  const meus = canvas.tokens.controlled.map(token => token.document).filter(token => token.isOwner);
  const candidatos = meus.length ? meus : canvas.scene.tokens.filter(token => token.isOwner && token.actor && (!game.user.character || token.actor.id === game.user.character.id));
  return candidatos.sort((a, b) => distancia(tile, a) - distancia(tile, b))[0] ?? null;
}

// O clique no marcador: o mestre abre a janela dele (com Shift, a configuração; com um token selecionado e o ponto vazio,
// oferece conectá-lo); o jogador conecta o token e abre a janela.
export async function abrirPonto(tile, { shift = false } = {}) {
  const ponto = pontoDoTile(tile);
  if (!ponto?.ativo) return null;
  if (game.user.isGM) {
    if (shift) return configurar(tile);
    const selecionado = canvas.tokens.controlled[0];
    if (selecionado?.actor && !conexaoDoToken(selecionado.document) && !estadoDoTile(tile)?.corredores?.length) {
      const sim = await DialogV2.confirm({ window: { title: 'Conectar à NET' }, content: `<p>Conectar <b>${esc(selecionado.name)}</b> a ${esc(ponto.nome)}? Sem o token, o clique só abre a janela do mestre.</p>`, rejectClose: false });
      if (sim) await conectar(tile, selecionado.document);
    }
    return JanelaDaNet.abrir(tile, { gm: true });
  }
  const token = tokenDoJogador(tile);
  if (!token) return ui.notifications.warn('Selecione o seu token perto do ponto de acesso.');
  const conexao = conexaoDoToken(token);
  if (conexao?.tile === tile.uuid) return JanelaDaNet.abrir(tile, { tokenId: token.id });
  if (conexao) return ui.notifications.warn(`${token.name} já está conectado em outro ponto de acesso.`);
  if (!ponto.arquitetura) return ui.notifications.warn('Este ponto de acesso ainda não tem arquitetura.');
  const faltas = faltasPara(ponto, token.actor);
  if (faltas.length) return ui.notifications.warn(`${token.name} não conecta aqui: falta ${faltas.join(' e ')}.`);
  const longe = distancia(tile, token);
  const alcance = alcanceDo(ponto, tile.parent, netrunnerDo(token.actor));
  if (longe > alcance + 0.01) return ui.notifications.warn(`${token.name} está longe demais: ${longe.toFixed(1)} ${tile.parent.grid.units || 'm'} (alcance ${alcance}). Chegue mais perto.`);
  return conectar(tile, token);
}

export async function conectar(tile, token) {
  const resposta = await pedir('conectar', { tile: tile.uuid, token: token.id });
  JanelaDaNet.abrir(tile, game.user.isGM ? { gm: true } : { tokenId: token.id });
  ui.notifications.info(`${token.name} conectou à NET.`);
  return resposta;
}

// ---------------- O botão no HUD do Tile (o mestre) ----------------
export function botaoNoHud(hud, html) {
  if (!game.user.isGM) return;
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const coluna = raiz?.querySelector('.col.right') ?? raiz?.querySelector('.right');
  const tile = hud.object?.document;
  if (!coluna || !tile) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `control-icon ${SISTEMA}-ponto${pontoDoTile(tile)?.ativo ? ' active' : ''}`;
  botao.dataset.tooltip = 'Ponto de acesso à NET';
  botao.innerHTML = '<i class="fa-solid fa-network-wired"></i>';
  botao.addEventListener('click', evento => {
    evento.preventDefault();
    configurar(tile);
  });
  coluna.append(botao);
}

// ---------------- A configuração (o mestre) ----------------
// As arquiteturas que o mestre pode escolher: os itens do mundo e as dos compêndios de itens (o "Arquiteturas da NET" do
// sistema e os do mundo), por compêndio e nome.
export async function arquiteturasDisponiveis() {
  const lista = [];
  const vistos = new Set();
  const juntar = (fonte, uuid, nome) => {
    if (vistos.has(uuid)) return;
    vistos.add(uuid);
    lista.push({ fonte, uuid, nome });
  };
  for (const item of game.items.filter(item => item.type === 'arquitetura')) juntar('Itens do mundo', item.uuid, item.name);
  for (const pack of game.packs.filter(pack => pack.documentName === 'Item')) {
    let indice;
    try {
      indice = await pack.getIndex({ fields: ['type'] });
    } catch {
      continue;
    }
    for (const entrada of indice) if (entrada.type === 'arquitetura') juntar(pack.metadata.label, entrada.uuid, entrada.name);
  }
  return lista.sort((a, b) => a.fonte.localeCompare(b.fonte, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function configurar(tile) {
  return new ConfigDoPonto(tile).render({ force: true });
}

export class ConfigDoPonto extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(tile) {
    super({ id: `${SISTEMA}-ponto-${tile.id}` });
    this.tile = tile;
  }

  static DEFAULT_OPTIONS = {
    tag: 'form',
    classes: [SISTEMA, 'net-config', 'themed', 'theme-dark'],
    window: { title: 'Ponto de acesso à NET', icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 560, height: 'auto' },
    form: { handler: ConfigDoPonto.#salvar, closeOnSubmit: true },
    actions: { abrirArquitetura: ConfigDoPonto.#abrirArquitetura, reiniciar: ConfigDoPonto.#reiniciar, remover: ConfigDoPonto.#remover }
  };

  static PARTS = { form: { template: caminho('templates/netrun/ponto.hbs') } };

  async _prepareContext() {
    const salvo = { ...PONTO_PADRAO, ...(pontoDoTile(this.tile) ?? {}) };
    const grupos = [];
    for (const arquitetura of await arquiteturasDisponiveis()) {
      let grupo = grupos.find(g => g.fonte === arquitetura.fonte);
      if (!grupo) grupos.push(grupo = { fonte: arquitetura.fonte, lista: [] });
      grupo.lista.push({ ...arquitetura, escolhida: arquitetura.uuid === salvo.arquitetura });
    }
    return { ponto: salvo, grupos, unidade: this.tile.parent.grid.units || 'm', semImagem: semImagem(this.tile) };
  }

  static async #salvar(evento, form, formData) {
    const dados = formData.object;
    const salvo = pontoDoTile(this.tile) ?? {};
    const ponto = {
      ...PONTO_PADRAO, ...salvo,
      ativo: Boolean(dados.ativo), nome: String(dados.nome || '').trim() || 'Ponto de acesso', arquitetura: dados.arquitetura || '',
      alcance: Math.max(0, Number(dados.alcance) || 0), dv: Number(dados.dv) || null, exigeDeck: Boolean(dados.exigeDeck),
      rankMinimo: Math.max(0, Math.min(10, Number(dados.rankMinimo) || 0)), oculto: Boolean(dados.oculto),
      dvScanner: Math.max(2, Math.min(30, Number(dados.dvScanner) || 10)), reiniciar: Boolean(dados.reiniciar),
      ligacoes: dados.arquitetura === salvo.arquitetura ? salvo.ligacoes ?? [] : [], revelados: salvo.revelados ?? []
    };
    await this.tile.setFlag(SISTEMA, FLAG_PONTO, ponto);
    if (dados.imagemPadrao && semImagem(this.tile)) await this.tile.update({ 'texture.src': IMAGEM_DO_TERMINAL });
    ui.notifications.info(`${ponto.nome}: ponto de acesso salvo.${ponto.oculto || this.tile.hidden ? ' Os jogadores não veem o marcador (oculto).' : ''}`);
  }

  static async #abrirArquitetura() {
    const item = await fromUuid(pontoDoTile(this.tile)?.arquitetura ?? '');
    item?.sheet.render({ force: true });
  }

  static async #reiniciar() {
    try {
      await pedir('reiniciar', { tile: this.tile.uuid });
      ui.notifications.info('Arquitetura reiniciada.');
    } catch (falha) {
      ui.notifications.warn(falha.message);
    }
  }

  static async #remover() {
    if (estadoDoTile(this.tile)?.corredores?.length) return ui.notifications.warn('Tem netrunner conectado aqui: desconecte antes.');
    await this.tile.update({ [`flags.${SISTEMA}.-=${FLAG_PONTO}`]: null, [`flags.${SISTEMA}.-=${FLAG_ESTADO}`]: null });
    return this.close();
  }
}
