// O combate na NET (o combate.mjs do NET Architect da mesa; a wiki, RED p. 204 e 212: o Black ICE "entra no topo da fila
// de iniciativa", e o demônio "entra no topo da iniciativa quando detecta um intruso"). O Black ICE, o demônio e o
// netrunner inimigo com ficha encontrados entram no combate da cena com um token escondido no ponto de acesso; a
// iniciativa do sistema põe o Black ICE e o demônio no topo. A REZ do estado vai para o token (em 0, o combatente fica
// derrotado), e a REZ mudada no token volta para o estado (o index.mjs). Na vez de cada um, o mestre escolhe quem ele
// ataca. Tudo no mestre ativo; a configuração "Inimigos da NET no combate" desliga.
import { SISTEMA } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { fichaDoModelo } from '../regras.mjs';
import { FLAG_INIMIGO, FLAG_MODELO } from './constantes.mjs';
import { acharConteudo, demonioDe, iceDe, nomeDoInimigo, rezDe } from './regras-da-net.mjs';

const PASTA = 'Inimigos da NET';

// Os tokens dos inimigos deste ponto de acesso, na cena dele.
export const tokensDosInimigos = tile => tile.parent?.tokens.filter(token => token.getFlag(SISTEMA, FLAG_INIMIGO)?.tile === tile.uuid) ?? [];
const combatentesDo = token => game.combats.contents.flatMap(combate => combate.combatants.filter(item => item.tokenId === token.id && item.sceneId === token.parent.id));

// O ator do inimigo: um Black ICE ou um demônio por modelo da tabela da wiki (criado uma vez, na pasta "Inimigos da NET"),
// ou a ficha do netrunner inimigo (sem ficha, ele não entra no combate).
async function atorDoInimigo(conteudo) {
  if (conteudo.tipo === 'netrunner') return conteudo.ator ? fromUuid(conteudo.ator) : null;
  const ice = conteudo.tipo === 'ice' ? iceDe(conteudo.ice) : null;
  if (conteudo.tipo === 'ice' && !ice) return null;
  const modelo = ice ?? demonioDe(conteudo.demonio);
  const marca = `${conteudo.tipo}:${modelo.id}`;
  const existente = game.actors.find(ator => ator.getFlag(SISTEMA, FLAG_MODELO) === marca);
  if (existente) return existente;
  const pasta = game.folders.find(folder => folder.type === 'Actor' && folder.name === PASTA) ?? await CONFIG.Folder.documentClass.create({ name: PASTA, type: 'Actor' });
  return Actor.implementation.create({ ...fichaDoModelo(modelo), type: ice ? 'blackice' : 'demonio', folder: pasta.id, flags: { [SISTEMA]: { [FLAG_MODELO]: marca } } });
}

const combateDaCena = cena => game.combats.find(combate => combate.scene?.id === cena.id && combate.active) ?? game.combats.find(combate => combate.scene?.id === cena.id) ?? null;

// Põe no combate da cena (criando um, se não houver) o netrunner e os inimigos encontrados no andar: o token de cada
// inimigo (escondido no ponto de acesso; o que já tem token, de outro encontro, usa o dele), o combatente e a iniciativa.
export async function entrarNoCombate(ctx, conteudos) {
  if (!config('netNoCombate') || !conteudos.length) return null;
  const { tile, token } = ctx;
  const cena = tile.parent;
  const combate = combateDaCena(cena) ?? await Combat.implementation.create({ scene: cena.id, active: true });
  const naFila = id => combate.combatants.some(combatente => combatente.tokenId === id && combatente.sceneId === cena.id);
  if (!naFila(token.id)) await combate.createEmbeddedDocuments('Combatant', [{ tokenId: token.id, sceneId: cena.id, actorId: token.actorId }]);
  const tamanho = cena.grid.size;
  for (const conteudo of conteudos) {
    let inimigo = tokensDosInimigos(tile).find(item => item.getFlag(SISTEMA, FLAG_INIMIGO).chave === conteudo.chave);
    if (!inimigo) {
      const ator = await atorDoInimigo(conteudo);
      if (!ator) continue;
      const dados = await ator.getTokenDocument({
        name: nomeDoInimigo(conteudo), x: tile.x + tile.width / 2 - tamanho / 2, y: tile.y + tile.height / 2 - tamanho / 2, hidden: true,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, flags: { [SISTEMA]: { [FLAG_INIMIGO]: { tile: tile.uuid, chave: conteudo.chave } } }
      });
      [inimigo] = await cena.createEmbeddedDocuments('Token', [dados.toObject()]);
    }
    if (naFila(inimigo.id)) continue;
    const [combatente] = await combate.createEmbeddedDocuments('Combatant', [{ tokenId: inimigo.id, sceneId: cena.id, actorId: inimigo.actorId }]);
    try {
      await combate.rollInitiative([combatente.id]);
    } catch (falha) {
      console.warn(`${SISTEMA} | NET: iniciativa de ${inimigo.name}`, falha);
    }
  }
  return combate;
}

// A REZ do estado vai para o token de cada Black ICE e demônio (a barra que o mestre vê); em 0, o combatente fica
// derrotado.
export async function sincronizarInimigos(tile, arq, est) {
  for (const token of tokensDosInimigos(tile)) {
    const conteudo = acharConteudo(arq, token.getFlag(SISTEMA, FLAG_INIMIGO).chave)?.conteudo;
    if (!conteudo || conteudo.tipo === 'netrunner' || !token.actor) continue;
    const rez = rezDe(est, conteudo);
    if (token.actor.system.rez.value !== rez) await token.actor.update({ 'system.rez.value': rez });
    for (const combatente of combatentesDo(token)) if (combatente.defeated !== (rez <= 0)) await combatente.update({ defeated: rez <= 0 });
  }
}

// A arquitetura reiniciou (ninguém mais na NET, ou o mestre) ou o Tile foi apagado: os inimigos saem do combate e da cena.
export async function tirarInimigos(tile) {
  const tokens = tokensDosInimigos(tile);
  if (!tokens.length) return;
  for (const combate of game.combats.contents) {
    const ids = combate.combatants.filter(item => tokens.some(token => token.id === item.tokenId && token.parent.id === item.sceneId)).map(item => item.id);
    if (ids.length) await combate.deleteEmbeddedDocuments('Combatant', ids);
  }
  const cena = tile.parent;
  await cena.deleteEmbeddedDocuments('Token', tokens.map(token => token.id).filter(id => cena.tokens.has(id)));
}

// A vez de um inimigo da NET no combate (a wiki: "O mestre joga todos os turnos do Black ICE"): o mestre escolhe quem ele
// ataca entre os netrunners que ele pode atacar no andar dele (o Black ICE driblado com o Slide, não), ou pula a vez.
// alvos(tile, chave) devolve [{ token, nome }], ou null se o inimigo não está mais lá.
export async function vezDoInimigo(combatente, { alvos, pedir }) {
  const token = combatente.token;
  const marca = token?.getFlag(SISTEMA, FLAG_INIMIGO);
  if (!marca || combatente.defeated) return null;
  const lista = await alvos(marca.tile, marca.chave);
  if (!lista) return null;
  if (!lista.length) {
    ui.notifications.info(`${token.name}: nenhum netrunner para atacar no andar dele.`);
    return null;
  }
  const escolha = await foundry.applications.api.DialogV2.wait({
    classes: [SISTEMA, 'net-vez'], window: { title: `A vez de ${token.name} na NET` },
    content: `<p><b>${foundry.utils.escapeHTML(token.name)}</b> está na vez dele. Quem ele ataca?</p>`,
    buttons: [...lista.map((alvo, i) => ({ action: alvo.token, label: `Atacar ${alvo.nome}`, default: i === 0 })), { action: 'pular', label: 'Pular a vez' }],
    rejectClose: false
  });
  if (!escolha || escolha === 'pular') return null;
  return pedir('inimigoAtaca', { tile: marca.tile, token: escolha, alvo: marca.chave });
}
