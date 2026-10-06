// NET Architect: pontos de acesso à NET nos Tiles da cena, para o sistema Cyberpunk RED - CORE.
// O netrunner conecta pelo token, vê o mapa da arquitetura e age com as habilidades de Interface;
// o mestre ativo resolve tudo (rolagens do sistema, Black ICE, demônios, combate, estado) e o token fica marcado.
import { MODULE_ID, FLAG_CONEXAO } from './constantes.mjs';
import { iniciarSocket, souMestreAtivo, pedir } from './socket.mjs';
import { operacoes, pontoDoTile, estadoDoTile, conexaoDoToken, distancia, alcanceDo, removerCorredorApagado, quemEstaNoAndar } from './estado.mjs';
import { lerArquitetura } from './arquitetura.mjs';
import { JanelaNet } from './janela.mjs';
import { EditorDeArquitetura } from './editor.mjs';
import { desenharPontos, apagarPontos, escutarCliques, botaoNoHud, botaoScannerNoHud, configurar, abrirPonto, conectar } from './ponto-de-acesso.mjs';
import { registrarStatus, desenharAnel, pararPulso } from './token.mjs';
import { garantirCompendio, arquiteturasDisponiveis, packDoMundo } from './compendio.mjs';
import { vezDoInimigo } from './combate.mjs';
import { queimar } from './efeitos.mjs';
import { efeitoSimples, tocarLocal } from './fx.mjs';

Hooks.once('init', () => {
  const registrar = (chave, dados) => game.settings.register(MODULE_ID, chave, { config: true, ...dados });
  registrar('rolagens', {
    name: 'Rolagens da NET no chat', hint: 'Quem vê os cartões das rolagens feitas na NET (as do netrunner e as dos inimigos).',
    scope: 'world', type: String, default: 'publicas', choices: { publicas: 'Todos', privadas: 'Só o mestre e o dono do netrunner' }
  });
  registrar('danoAutomatico', {
    name: 'Efeitos do Black ICE na ficha',
    hint: 'O dano no cérebro sai do HP (o programa Armor ativo tira 4), o Liche e o Scorpion viram efeitos de 1 hora, o Hellhound põe fogo, o Asp e os anti-programa destroem programas. Desligado, o registro da NET só diz o que aplicar.',
    scope: 'world', type: Boolean, default: true
  });
  registrar('combate', {
    name: 'Inimigos da NET no combate',
    hint: 'Black ICE, demônios e netrunners inimigos encontrados entram na iniciativa (com um token escondido no ponto de acesso). Na vez deles, o mestre escolhe quem atacar.',
    scope: 'world', type: Boolean, default: true
  });
  registrar('animacoes', {
    name: 'Animações da NET', hint: 'Com o Sequencer e o JB2A ativos, usa as animações deles; senão, um efeito simples.',
    scope: 'world', type: String, default: 'auto', choices: { auto: 'Sequencer e JB2A se tiver, senão simples', simples: 'Só o efeito simples', nao: 'Desligadas' }
  });
  registrar('sons', { name: 'Sons da NET', hint: 'Bipes sintetizados ao conectar, nos acertos, nas falhas, no alarme do Black ICE e no dano.', scope: 'client', type: Boolean, default: true });
  registrar('volume', { name: 'Volume dos sons da NET', scope: 'client', type: Number, default: 0.7, range: { min: 0, max: 1, step: 0.05 } });
  registrar('painelDoMestre', {
    name: 'Abrir o painel do mestre quando alguém conectar', hint: 'A janela da NET abre também para o mestre, com a arquitetura inteira e o turno dos inimigos.',
    scope: 'client', type: Boolean, default: true
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
  iniciarSocket(tratadores, { fx: efeitoSimples, som: dados => tocarLocal(dados.nome) });
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
    scanner: token => { const documento = token.document || token; return pedir('scanner', { cena: documento.parent.id, token: documento.id }); },
    janela: (tile, opcoes = {}) => JanelaNet.abrir(tile.document || tile, opcoes),
    editor: item => EditorDeArquitetura.abrir(item),
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

const daCenaAtual = documento => canvas.ready && documento.parent && documento.parent.id === (canvas.scene && canvas.scene.id);
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
// Portas, luzes, sons e tokens ligados aos nós de controle: a janela mostra a situação nova.
for (const gancho of ['updateWall', 'updateAmbientLight', 'updateAmbientSound']) Hooks.on(gancho, documento => JanelaNet.redesenhar(janela => janela.tile.parent.id === (documento.parent && documento.parent.id)));

Hooks.on('renderTileHUD', botaoNoHud);
Hooks.on('renderTokenHUD', botaoScannerNoHud);
Hooks.on('drawToken', desenharAnel);
Hooks.on('refreshToken', desenharAnel);

// Editor visual a partir da ficha da arquitetura (item NET Architecture do sistema).
Hooks.on('getItemSheetHeaderButtons', (ficha, botoes) => {
  if (!game.user.isGM || !ficha.item || ficha.item.type !== 'netarch') return;
  botoes.unshift({ label: 'Editor visual', class: 'net-architect-editor', icon: 'fa-solid fa-diagram-project', onclick: () => EditorDeArquitetura.abrir(ficha.item) });
});

// ---------------- Token e ficha ----------------
const janelasDoAtor = actor => JanelaNet.redesenhar(janela => {
  const token = janela.tokenId ? janela.tile.parent.tokens.get(janela.tokenId) : null;
  return Boolean(token && token.actor && actor && token.actor.id === actor.id);
});
Hooks.on('updateActor', janelasDoAtor);
for (const gancho of ['createItem', 'updateItem', 'deleteItem', 'createActiveEffect', 'deleteActiveEffect']) Hooks.on(gancho, documento => { if (documento.parent && documento.parent.documentName === 'Actor') janelasDoAtor(documento.parent); });

Hooks.on('updateToken', (token, mudancas) => {
  if (mudancas.flags && token.object) desenharAnel(token.object);
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

// ---------------- Combate ----------------
// A cada turno (no mestre ativo): o fogo queima quem acabou o turno em chamas; no turno do netrunner, as Ações NET
// voltam; na vez de um inimigo da NET, o mestre escolhe quem ele ataca.
Hooks.on('updateCombat', async (combate, mudancas) => {
  if (!souMestreAtivo() || !('turn' in mudancas || 'round' in mudancas)) return;
  const anterior = combate.previous && combate.previous.tokenId && combate.scene ? combate.scene.tokens.get(combate.previous.tokenId) : null;
  if (anterior && anterior.actor) await queimar(anterior.actor, anterior.name).catch(error => console.warn(`${MODULE_ID} | fogo`, error));
  const token = combate.combatant && combate.combatant.token;
  if (!token) return;
  const conexao = conexaoDoToken(token);
  if (conexao) { pedir('zerarAcoes', { tile: conexao.tile, token: token.id }).catch(() => {}); return; }
  if (token.getFlag(MODULE_ID, 'chave')) vezDoInimigo(combate, { pedir, quemEstaNoAndar }).catch(error => console.warn(`${MODULE_ID} | vez do inimigo`, error));
});

export { FLAG_CONEXAO };
