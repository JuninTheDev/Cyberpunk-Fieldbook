// A NET na mesa (o NET Architect da mesa dentro do sistema; o C8 do ROADMAP): os ganchos do ponto de acesso, do token
// conectado e da janela, o socket e a API (game.system.api.netrun, para macros e testes). O sistema.mjs chama
// registrarNet() no init.
import { souOMestreAtivo } from '../combate.mjs';
import { SISTEMA } from '../config.mjs';
import { conexaoDoToken, estadoDoTile, operacoes, pontoDoTile, removerCorredorApagado, soltarTokens } from './estado.mjs';
import { JanelaDaNet } from './janela.mjs';
import { alcanceDo, distancia, netrunnerDo } from './regras-da-net.mjs';
import { abrirPonto, apagarPontos, arquiteturasDisponiveis, botaoNoHud, configurar, conectar, desenharPontos, escutarCliques, pontosDesenhados } from './ponto-de-acesso.mjs';
import { iniciarSocketDaNet, pedir } from './socket.mjs';
import { desenharAnel, pararPulso, registrarStatusDaNet } from './token.mjs';

const doc = objeto => objeto?.document ?? objeto;
const daCenaAtual = documento => canvas.ready && documento.parent?.id === canvas.scene?.id;
const mudouAFlag = mudancas => foundry.utils.hasProperty(mudancas, `flags.${SISTEMA}`) || foundry.utils.hasProperty(mudancas, `flags.-=${SISTEMA}`);

// Quem recarregou a página no meio de um netrun volta para a janela dele (o jogador; o mestre abre pelo marcador).
const reabertas = new Set();
function aoAbrirCena() {
  desenharPontos();
  for (const token of canvas.tokens.placeables) desenharAnel(token);
  if (game.user.isGM) return;
  for (const token of canvas.scene.tokens) {
    const conexao = conexaoDoToken(token);
    if (!conexao || !token.isOwner || reabertas.has(token.id)) continue;
    const tile = canvas.scene.tiles.find(item => item.uuid === conexao.tile);
    if (!tile) continue;
    reabertas.add(token.id);
    JanelaDaNet.abrir(tile, { tokenId: token.id });
  }
}

export function registrarNet() {
  registrarStatusDaNet();

  Hooks.once('ready', () => {
    iniciarSocketDaNet(operacoes);
    escutarCliques();
    game.system.api.netrun = {
      configurar: tile => configurar(doc(tile)),
      abrir: (tile, opcoes = {}) => abrirPonto(doc(tile), opcoes),
      conectar: (tile, token) => conectar(doc(tile), doc(token)),
      desconectar: (token, { inseguro = false } = {}) => {
        const conexao = conexaoDoToken(doc(token));
        return conexao ? pedir('desconectar', { tile: conexao.tile, token: doc(token).id, inseguro }) : Promise.resolve(null);
      },
      janela: (tile, opcoes = {}) => JanelaDaNet.abrir(doc(tile), opcoes),
      estado: tile => estadoDoTile(doc(tile)),
      ponto: tile => pontoDoTile(doc(tile)),
      arquiteturasDisponiveis, pedir, pontosDesenhados
    };
    if (canvas.ready) aoAbrirCena();
  });

  Hooks.on('canvasReady', aoAbrirCena);
  Hooks.on('canvasTearDown', () => {
    apagarPontos();
    pararPulso();
  });

  Hooks.on('createTile', tile => {
    if (daCenaAtual(tile)) desenharPontos();
  });
  Hooks.on('deleteTile', tile => {
    if (daCenaAtual(tile)) desenharPontos();
    for (const janela of [...JanelaDaNet.abertas.values()]) if (janela.tile.id === tile.id) janela.close();
    // Os tokens que estavam na NET por este Tile saem dela (a flag e o status), no mestre ativo.
    if (souOMestreAtivo()) soltarTokens(tile).catch(falha => console.warn(`${SISTEMA} | NET: Tile apagado`, falha));
  });
  Hooks.on('updateTile', (tile, mudancas) => {
    if (daCenaAtual(tile)) desenharPontos();
    if (!mudouAFlag(mudancas)) return;
    const estado = estadoDoTile(tile);
    for (const janela of [...JanelaDaNet.abertas.values()]) {
      if (janela.tile.id !== tile.id) continue;
      // O jogador que saiu (ou caiu) da NET: a janela fecha.
      if (!janela.gm && !estado?.corredores.some(item => item.token === janela.tokenId)) {
        janela.close();
        ui.notifications.info('Desconectado da NET.');
        continue;
      }
      janela.render();
    }
  });

  Hooks.on('renderTileHUD', botaoNoHud);
  Hooks.on('drawToken', desenharAnel);
  Hooks.on('refreshToken', desenharAnel);

  Hooks.on('updateToken', (token, mudancas) => {
    if (mudancas.flags && token.object) desenharAnel(token.object);
    // O mestre ativo: o netrunner que sai do alcance cai da NET (a desconexão insegura, RED p. 198).
    if (!souOMestreAtivo() || !('x' in mudancas || 'y' in mudancas)) return;
    const conexao = conexaoDoToken(token);
    const tile = conexao && token.parent.tiles.find(item => item.uuid === conexao.tile);
    const ponto = tile && pontoDoTile(tile);
    if (!ponto || distancia(tile, token) <= alcanceDo(ponto, token.parent, netrunnerDo(token.actor)) + 0.01) return;
    pedir('desconectar', { tile: tile.uuid, token: token.id, inseguro: true, motivo: 'saiu do alcance do ponto de acesso' })
      .then(() => ui.notifications.warn(`${token.name} saiu do alcance e caiu da NET.`))
      .catch(falha => console.warn(`${SISTEMA} | NET: saiu do alcance`, falha));
  });

  Hooks.on('deleteToken', token => {
    const conexao = souOMestreAtivo() && conexaoDoToken(token);
    if (conexao) removerCorredorApagado(conexao.tile, token.id).catch(falha => console.warn(`${SISTEMA} | NET: token apagado`, falha));
  });
}
