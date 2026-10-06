// NET Architect: pontos de acesso à NET nos Tiles da cena, para o sistema Cyberpunk RED - CORE.
// O netrunner conecta pelo token, vê o mapa da arquitetura e age com as habilidades de Interface;
// o mestre ativo resolve tudo (rolagens do sistema, Black ICE, estado) e o token fica marcado para todos.
import { MODULE_ID, FLAG_CONEXAO } from './constantes.mjs';
import { iniciarSocket, souMestreAtivo, pedir } from './socket.mjs';
import { operacoes, pontoDoTile, estadoDoTile, conexaoDoToken, distancia, alcanceDo, removerCorredorApagado } from './estado.mjs';
import { lerArquitetura } from './arquitetura.mjs';
import { JanelaNet } from './janela.mjs';
import { desenharPontos, apagarPontos, escutarCliques, botaoNoHud, configurar, abrirPonto, conectar } from './ponto-de-acesso.mjs';
import { registrarStatus, desenharAnel, pararPulso } from './token.mjs';
import { garantirCompendio, arquiteturasDisponiveis, packDoMundo } from './compendio.mjs';

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'rolagens', {
    name: 'Rolagens da NET no chat',
    hint: 'Quem vê os cartões das rolagens feitas na NET (as do netrunner e as do Black ICE).',
    scope: 'world', config: true, type: String, default: 'publicas',
    choices: { publicas: 'Todos', privadas: 'Só o mestre e o dono do netrunner' }
  });
  game.settings.register(MODULE_ID, 'danoAutomatico', {
    name: 'Dano do Black ICE direto no HP',
    hint: 'O dano no cérebro sai do HP do netrunner na hora (o programa Armor ativo tira 4). Desligado, o registro da NET só diz quanto aplicar.',
    scope: 'world', config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, 'painelDoMestre', {
    name: 'Abrir o painel do mestre quando alguém conectar',
    hint: 'A janela da NET abre também para o mestre, com a arquitetura inteira e o turno do Black ICE.',
    scope: 'client', config: true, type: Boolean, default: true
  });
});

Hooks.once('setup', registrarStatus);

// O mestre que resolve a conexão também abre o painel dele.
const tratadores = {
  ...operacoes,
  async conectar(dados, usuario) {
    const resposta = await operacoes.conectar(dados, usuario);
    if (resposta.conectado && game.settings.get(MODULE_ID, 'painelDoMestre')) {
      const tile = await fromUuid(dados.tile);
      if (tile) JanelaNet.abrir(tile, { gm: true, tokenId: dados.token });
    }
    return resposta;
  }
};

Hooks.once('ready', async () => {
  iniciarSocket(tratadores);
  escutarCliques();
  game.modules.get(MODULE_ID).api = {
    configurar: tile => configurar(tile.document || tile),
    abrir: (tile, opcoes = {}) => abrirPonto(tile.document || tile, opcoes),
    conectar: (tile, token) => conectar(tile.document || tile, token.document || token),
    desconectar: (token, { inseguro = false } = {}) => {
      const documento = token.document || token;
      const conexao = conexaoDoToken(documento);
      if (!conexao) return Promise.resolve(null);
      return pedir('desconectar', { tile: conexao.tile, token: documento.id, inseguro });
    },
    janela: (tile, opcoes = {}) => JanelaNet.abrir(tile.document || tile, opcoes),
    estado: tile => estadoDoTile(tile.document || tile),
    ponto: tile => pontoDoTile(tile.document || tile),
    arquiteturas: arquiteturasDisponiveis,
    lerArquitetura,
    compendio: packDoMundo,
    pedir
  };
  if (souMestreAtivo()) {
    try { await garantirCompendio(); } catch (error) { console.error(`${MODULE_ID} | compêndio`, error); }
  }
  if (canvas.ready) aoAbrirCena();
});

// ---------------- Mapa ----------------
const reabertas = new Set();
function aoAbrirCena() {
  desenharPontos();
  for (const token of canvas.tokens.placeables) desenharAnel(token);
  // Quem recarregou a página no meio de um netrun volta para a janela dele.
  if (game.user.isGM) return;
  for (const token of canvas.scene.tokens) {
    const conexao = conexaoDoToken(token);
    if (!conexao || !token.isOwner || reabertas.has(token.id)) continue;
    const tile = canvas.scene.tiles.find(item => item.uuid === conexao.tile);
    if (!tile) continue;
    reabertas.add(token.id);
    JanelaNet.abrir(tile, { tokenId: token.id });
  }
}
Hooks.on('canvasReady', aoAbrirCena);
Hooks.on('canvasTearDown', () => { apagarPontos(); pararPulso(); });

const daCenaAtual = documento => canvas.ready && documento.parent && documento.parent.id === canvas.scene?.id;
Hooks.on('createTile', tile => { if (daCenaAtual(tile)) desenharPontos(); });
Hooks.on('deleteTile', tile => {
  if (daCenaAtual(tile)) desenharPontos();
  for (const janela of [...JanelaNet.abertas.values()]) if (janela.tile.id === tile.id) janela.close();
});
Hooks.on('updateTile', (tile, mudancas) => {
  if (daCenaAtual(tile)) desenharPontos();
  if (!foundry.utils.hasProperty(mudancas, `flags.${MODULE_ID}`) && !foundry.utils.hasProperty(mudancas, `flags.-=${MODULE_ID}`)) return;
  const estado = estadoDoTile(tile);
  for (const janela of [...JanelaNet.abertas.values()]) {
    if (janela.tile.id !== tile.id) continue;
    // O jogador que saiu (ou foi derrubado) da NET: a janela fecha.
    if (!janela.gm && !(estado && estado.corredores.some(item => item.token === janela.tokenId))) {
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

// ---------------- Token e ficha ----------------
const janelasDoAtor = actor => JanelaNet.redesenhar(janela => {
  const token = janela.tokenId ? janela.tile.parent.tokens.get(janela.tokenId) : null;
  return Boolean(token && token.actor && actor && token.actor.id === actor.id);
});
Hooks.on('updateActor', janelasDoAtor);
for (const gancho of ['createItem', 'updateItem', 'deleteItem']) Hooks.on(gancho, item => { if (item.parent && item.parent.documentName === 'Actor') janelasDoAtor(item.parent); });

Hooks.on('updateToken', (token, mudancas) => {
  if (foundry.utils.hasProperty(mudancas, `flags.${MODULE_ID}`) || foundry.utils.hasProperty(mudancas, `flags.-=${MODULE_ID}`) || mudancas.flags) {
    if (token.object) desenharAnel(token.object);
  }
  // Mestre: o netrunner que sai do alcance cai da NET (desconexão insegura, RED p. 198).
  if (!souMestreAtivo() || !('x' in mudancas || 'y' in mudancas)) return;
  const conexao = conexaoDoToken(token);
  if (!conexao) return;
  const tile = token.parent.tiles.find(item => item.uuid === conexao.tile);
  const ponto = tile && pontoDoTile(tile);
  if (!ponto) return;
  if (distancia(tile, token) <= alcanceDo(ponto, token.parent) + 0.01) return;
  pedir('desconectar', { tile: tile.uuid, token: token.id, inseguro: true, motivo: 'saiu do alcance do ponto de acesso' })
    .then(() => ui.notifications.warn(`${token.name} saiu do alcance e caiu da NET.`))
    .catch(error => console.warn(`${MODULE_ID} | saiu do alcance`, error));
});

Hooks.on('deleteToken', token => {
  if (!souMestreAtivo()) return;
  const conexao = conexaoDoToken(token);
  if (conexao) removerCorredorApagado(conexao.tile, token.id).catch(error => console.warn(`${MODULE_ID} | token apagado`, error));
});

// No turno do netrunner no combate, as Ações NET dele voltam.
Hooks.on('updateCombat', (combate, mudancas) => {
  if (!souMestreAtivo() || !('turn' in mudancas || 'round' in mudancas)) return;
  const token = combate.combatant && combate.combatant.token;
  const conexao = token && conexaoDoToken(token);
  if (!conexao) return;
  pedir('zerarAcoes', { tile: conexao.tile, token: token.id }).catch(() => {});
});

export { FLAG_CONEXAO };
