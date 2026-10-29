// A NET na mesa (o NET Architect da mesa dentro do sistema; o C8 do ROADMAP): os ganchos do ponto de acesso, do token
// conectado e da janela, o socket e a API (game.system.api.netrun, para macros e testes). O sistema.mjs chama
// registrarNet() no init.
import { souOMestreAtivo } from '../combate.mjs';
import { SISTEMA } from '../config.mjs';
import { vezDoInimigo } from './combate.mjs';
import { FLAG_INIMIGO, STATUS_EM_CHAMAS } from './constantes.mjs';
import { alvosNaVez, conexaoDoToken, estadoDoTile, operacoes, pontoDoTile, removerCorredorApagado, soltarTokens } from './estado.mjs';
import { andaresConhecidos, JanelaDaNet } from './janela.mjs';
import { alcanceDo, distancia, netrunnerDo } from './regras-da-net.mjs';
import { abrirPonto, apagarPontos, arquiteturasDisponiveis, botaoNoHud, botaoScannerNoHud, configurar, conectar, conectarPelaFicha, desenharPontos, escutarCliques, pontosDesenhados } from './ponto-de-acesso.mjs';
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

// O fogo: no fim do turno de quem está em chamas, o dano no HP, com o aviso no chat. O do Hellhound é 2 (a wiki); o do
// quickhack Overheat (neuroport.mjs), 4, que o efeito guarda (flags.fogo.dano), e quem o apaga é uma Ação no turno dele.
async function queimar(ator, nome) {
  const fogo = ator.effects.find(efeito => efeito.active && efeito.statuses.has(STATUS_EM_CHAMAS))?.getFlag(SISTEMA, 'fogo');
  const dano = Number(fogo?.dano) || 2;
  const hp = ator.system.hp.value - dano;
  await ator.update({ 'system.hp.value': hp });
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<p><b>${foundry.utils.escapeHTML(nome)}</b> está em chamas: ${dano} no HP (fica com ${hp}/${ator.system.hp.max}). ${fogo ? 'Uma Ação, no turno dele, apaga o fogo.' : 'Uma Ação Carnal apaga o fogo.'}</p>`
  });
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
      // A ficha: "Conectar" (o ponto de acesso mais perto, com as conferências do clique) e a janela de quem está conectado.
      conectarPelaFicha: ator => conectarPelaFicha(ator),
      andaresConhecidos: tile => andaresConhecidos(estadoDoTile(doc(tile))),
      desconectar: (token, { inseguro = false } = {}) => {
        const conexao = conexaoDoToken(doc(token));
        return conexao ? pedir('desconectar', { tile: conexao.tile, token: doc(token).id, inseguro }) : Promise.resolve(null);
      },
      janela: (tile, opcoes = {}) => JanelaDaNet.abrir(doc(tile), opcoes),
      // O Scanner do token (o botão do HUD): { total, achados }.
      scanner: token => pedir('scanner', { cena: doc(token).parent.id, token: doc(token).id }),
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
    // Os tokens que estavam na NET por este Tile saem dela (a flag e o status), e os inimigos saem do combate e da cena;
    // no mestre ativo.
    if (souOMestreAtivo()) soltarTokens(tile).catch(falha => console.warn(`${SISTEMA} | NET: Tile apagado`, falha));
  });
  Hooks.on('updateTile', (tile, mudancas) => {
    if (daCenaAtual(tile)) desenharPontos();
    if (!mudouAFlag(mudancas)) return;
    const estado = estadoDoTile(tile);
    // A aba NET de quem está conectado aqui mostra a arquitetura ao vivo: a ficha aberta se redesenha.
    for (const corredor of estado?.corredores ?? []) {
      const ficha = tile.parent?.tokens.get(corredor.token)?.actor?.sheet;
      if (ficha?.rendered) ficha.render();
    }
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
  Hooks.on('renderTokenHUD', botaoScannerNoHud);
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

  // O combate: no começo do turno do netrunner conectado, as Ações NET voltam (o mestre ativo); na vez de um inimigo da
  // NET, o mestre escolhe quem ele ataca (o combate.mjs); a janela mostra se as Ações NET contam (em combate) e quantas
  // sobram.
  Hooks.on('updateCombat', (combate, mudancas) => {
    JanelaDaNet.redesenhar();
    if (!souOMestreAtivo() || !combate.started || !('turn' in mudancas || 'round' in mudancas)) return;
    // O fogo do Hellhound (a wiki: 2 no HP por turno): quem acabou o turno em chamas queima. O da munição e o ativo dos
    // perigos do ambiente (perigos.mjs) queimam pelos deles.
    const anterior = combate.combatants.get(combate.previous?.combatantId);
    if (anterior?.actor?.statuses.has(STATUS_EM_CHAMAS) && !anterior.actor.effects.some(e => e.getFlag(SISTEMA, 'municao')?.tipo === 'fogo') && !anterior.actor.effects.some(e => e.active && e.getFlag(SISTEMA, 'perigo') && e.statuses.has(STATUS_EM_CHAMAS))) queimar(anterior.actor, anterior.name).catch(falha => console.warn(`${SISTEMA} | NET: fogo`, falha));
    const token = combate.combatant?.token;
    const conexao = token && conexaoDoToken(token);
    if (conexao) pedir('zerarAcoes', { tile: conexao.tile, token: token.id }).catch(falha => console.warn(`${SISTEMA} | NET: Ações NET do turno`, falha));
    else if (token?.getFlag(SISTEMA, FLAG_INIMIGO)) vezDoInimigo(combate.combatant, { alvos: alvosNaVez, pedir }).catch(falha => ui.notifications.warn(falha.message));
  });
  for (const gancho of ['deleteCombat', 'createCombatant', 'deleteCombatant']) Hooks.on(gancho, () => JanelaDaNet.redesenhar());
  // As portas, as luzes e os sons ligados aos nós de controle (ligacoes.mjs): a janela mostra a situação nova, também
  // quando o mestre os muda pela cena.
  for (const gancho of ['updateWall', 'updateAmbientLight', 'updateAmbientSound']) Hooks.on(gancho, documento => JanelaDaNet.redesenhar(janela => janela.tile.parent?.id === documento.parent?.id));

  // A ficha do netrunner (a Sorte preparada, o cyberdeck, a Interface): a janela dele redesenha.
  const janelasDoAtor = ator => JanelaDaNet.redesenhar(janela => (estadoDoTile(janela.tile)?.corredores ?? []).some(corredor => corredor.ator === ator?.id));
  Hooks.on('updateActor', janelasDoAtor);
  // A REZ mudada no token de um inimigo no combate (a barra, o dano aplicado pelo cartão) volta para o estado da NET (o
  // mestre ativo; igual à do estado, nada muda).
  Hooks.on('updateActor', (ator, mudancas) => {
    const marca = ator.isToken && ator.token?.getFlag(SISTEMA, FLAG_INIMIGO);
    if (!marca || !souOMestreAtivo() || !foundry.utils.hasProperty(mudancas, 'system.rez.value')) return;
    pedir('ajustarRez', { tile: marca.tile, alvo: marca.chave, rez: ator.system.rez.value }).catch(falha => console.warn(`${SISTEMA} | NET: REZ do token`, falha));
  });
  for (const gancho of ['createItem', 'updateItem', 'deleteItem']) Hooks.on(gancho, item => janelasDoAtor(item.parent));
}
