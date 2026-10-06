// Black ICE, demônios e netrunners inimigos no combate (RED p. 204 e 212): ao serem encontrados, entram na fila de
// iniciativa (o sistema já põe Black ICE e demônios no topo) com um token escondido no ponto de acesso. Na vez
// de cada um, o mestre escolhe quem atacar. Tudo no cliente do mestre ativo; desliga em Configurações do módulo.
import { MODULE_ID, PASTA_ATORES, iceDaChave, demonioDaChave } from './constantes.mjs';

export const combateLigado = () => game.settings.get(MODULE_ID, 'combate');
const ICONE = nome => `systems/cyberpunk-red-core/icons/netrunning/${nome}.png`;

async function pastaDeAtores() {
  return game.folders.find(pasta => pasta.type === 'Actor' && pasta.name === PASTA_ATORES)
    || Folder.create({ name: PASTA_ATORES, type: 'Actor', color: '#6b0012', sorting: 'a' });
}

// O ator de cada inimigo: um blackIce ou demon do sistema por modelo (criado uma vez, na pasta do módulo),
// ou o próprio ator do netrunner inimigo.
async function atorDoInimigo(conteudo) {
  if (conteudo.tipo === 'netrunner') return conteudo.ator ? fromUuid(conteudo.ator) : null;
  const modelo = conteudo.tipo === 'ice' ? `ice:${conteudo.ice || 'generico'}` : `demonio:${conteudo.demonio || 'imp'}`;
  const existente = game.actors.find(actor => actor.getFlag(MODULE_ID, 'modelo') === modelo);
  if (existente) return existente;
  const pasta = await pastaDeAtores();
  if (conteudo.tipo === 'ice') {
    const d = iceDaChave(conteudo.ice);
    const img = conteudo.ice ? ICONE(d.nome) : ICONE('Black_Ice');
    return Actor.create({
      name: d.nome, type: 'blackIce', img, folder: pasta.id,
      system: { class: d.classe === 'Anti-programa' ? 'antiprogram' : 'antipersonnel', stats: { per: d.per, spd: d.spd, atk: d.atk, def: d.def, rez: { value: d.rez, max: d.rez } }, notes: `<p>${d.efeito}</p>` },
      prototypeToken: { name: d.nome, actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, texture: { src: img } },
      flags: { [MODULE_ID]: { modelo } }
    });
  }
  const d = demonioDaChave(conteudo.demonio);
  return Actor.create({
    name: d.nome, type: 'demon', img: ICONE(d.nome), folder: pasta.id,
    system: { stats: { rez: { value: d.rez, max: d.rez }, interface: d.interface, actions: d.acoes, combatNumber: d.combate } },
    prototypeToken: { name: d.nome, actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, texture: { src: ICONE(d.nome) } },
    flags: { [MODULE_ID]: { modelo } }
  });
}

const combateDaCena = cena => game.combats.find(combate => combate.scene && combate.scene.id === cena.id && combate.active)
  || game.combats.find(combate => combate.scene && combate.scene.id === cena.id) || null;

// Põe no combate da cena (criando um, se não houver) o netrunner e os inimigos encontrados no andar.
export async function entrarNoCombate(ctx, conteudos, nomeDe) {
  if (!combateLigado() || !conteudos.length) return null;
  const { tile, token, est } = ctx;
  const cena = tile.parent;
  const combate = combateDaCena(cena) || await Combat.create({ scene: cena.id, active: true });
  if (!combate.combatants.some(item => item.tokenId === token.id)) await combate.createEmbeddedDocuments('Combatant', [{ tokenId: token.id, sceneId: cena.id, actorId: token.actorId }]);
  est.combatentes = (est.combatentes || []).filter(item => cena.tokens.get(item.token));
  for (const conteudo of conteudos) {
    if (est.combatentes.some(item => item.chave === conteudo.chave)) continue;
    const actor = await atorDoInimigo(conteudo);
    if (!actor) continue;
    const tamanho = cena.grid.size;
    const documento = await actor.getTokenDocument({
      x: tile.x + tile.width / 2 - tamanho / 2, y: tile.y + tile.height / 2 - tamanho / 2, hidden: true, name: nomeDe(conteudo),
      flags: { [MODULE_ID]: { tile: tile.uuid, chave: conteudo.chave } }
    });
    const [novo] = await cena.createEmbeddedDocuments('Token', [documento.toObject()]);
    const [combatente] = await combate.createEmbeddedDocuments('Combatant', [{ tokenId: novo.id, sceneId: cena.id, actorId: actor.id, hidden: false }]);
    try { await combate.rollInitiative([combatente.id]); } catch (error) { console.warn(`${MODULE_ID} | iniciativa de ${actor.name}`, error); }
    est.combatentes.push({ chave: conteudo.chave, token: novo.id, combatente: combatente.id, combate: combate.id });
  }
  return combate;
}

// O REZ do estado vai para o token do inimigo (a barra que o mestre vê) e, em 0, o combatente fica derrotado.
export async function sincronizarCombate(est, cena, rezDe) {
  for (const item of est.combatentes || []) {
    const token = cena.tokens.get(item.token);
    if (!token) continue;
    const rez = rezDe(item.chave);
    if (rez === null || rez === undefined) continue;
    if (token.actor && token.actor.system.stats && token.actor.system.stats.rez && token.actor.system.stats.rez.value !== rez) {
      await token.actor.update({ 'system.stats.rez.value': Math.max(0, rez) });
    }
    const combate = game.combats.get(item.combate);
    const combatente = combate && combate.combatants.get(item.combatente);
    if (combatente && combatente.defeated !== (rez <= 0)) await combatente.update({ defeated: rez <= 0 });
  }
}

// Ninguém mais na NET (ou a arquitetura reiniciou): os tokens dos inimigos saem da cena (e do combate).
export async function sairDoCombate(est, cena) {
  const ids = (est.combatentes || []).map(item => item.token).filter(id => cena.tokens.get(id));
  if (ids.length) await cena.deleteEmbeddedDocuments('Token', ids);
  est.combatentes = [];
}

// Na vez de um inimigo da NET, o mestre escolhe quem ele ataca (os netrunners no andar dele).
export async function vezDoInimigo(combate, { pedir, quemEstaNoAndar }) {
  const token = combate.combatant && combate.combatant.token;
  const marca = token && token.getFlag(MODULE_ID, 'chave') ? { tile: token.getFlag(MODULE_ID, 'tile'), chave: token.getFlag(MODULE_ID, 'chave') } : null;
  if (!marca || combate.combatant.defeated) return;
  const alvos = await quemEstaNoAndar(marca.tile, marca.chave);
  if (!alvos) return;
  if (!alvos.length) { ui.notifications.info(`${token.name}: nenhum netrunner no andar dele neste turno.`); return; }
  const DialogV2 = foundry.applications.api.DialogV2;
  const escolha = await DialogV2.wait({
    window: { title: `Turno do ${token.name}` },
    content: `<p>O <b>${token.name}</b> está no topo da iniciativa. Quem ele ataca?</p>`,
    buttons: [...alvos.map((alvo, i) => ({ action: alvo.token, label: `Atacar ${alvo.nome}`, icon: 'fa-solid fa-skull', default: i === 0 })), { action: 'pular', label: 'Pular o turno' }],
    rejectClose: false
  });
  if (escolha && escolha !== 'pular') {
    try { await pedir('inimigoAtaca', { tile: marca.tile, token: escolha, alvo: marca.chave }); } catch (error) { ui.notifications.warn(error.message); }
  }
}
