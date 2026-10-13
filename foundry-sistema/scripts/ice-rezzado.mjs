// O Black ICE próprio do netrunner na cena (o _rezBlackIceToken do cyberdeck do CORE): ativar o programa de Black ICE num
// deck põe o token dele ao lado do token do netrunner, com os números e a REZ do programa (o ator é um Black ICE com o nome
// do programa, criado na pasta "Black ICE rezzado" se não houver). Desativar, tirar do deck ou apagar o programa tira o
// token. A REZ que o token perde volta para o programa (o SyncBlackIceWithProgram do CORE), e em 0 o programa desativa.
// Tudo no cliente do mestre ativo: no Foundry 14 o jogador não cria tokens (a permissão TOKEN_CREATE é de assistente para
// cima), e o mestre recebe o updateItem do programa que o jogador ativa.
import { souOMestreAtivo } from './combate.mjs';
import { SISTEMA } from './config.mjs';
import { formulaDeDano } from './regras.mjs';

const PASTA = 'Black ICE rezzado';
const FLAG = 'iceRezzado';

const ehBlackIce = item => item?.type === 'programa' && item.system.classe === 'blackice';
const textoDe = html => new window.DOMParser().parseFromString(String(html ?? ''), 'text/html').body.textContent.trim();
// O token do Black ICE deste programa, se está numa cena.
const tokenDoIce = programa => {
  const marca = programa.getFlag(SISTEMA, FLAG);
  return (marca && game.scenes.get(marca.cena)?.tokens.get(marca.token)) ?? null;
};
// O token do netrunner: o da ficha (num token solto) ou o do ator na cena vista (ou na ativa).
const tokenDoNetrunner = ator => (ator.isToken ? ator.token
  : [game.scenes.viewed, game.scenes.active].filter(Boolean).map(cena => cena.tokens.find(token => token.actorId === ator.id)).find(Boolean) ?? null);
// Os números do Black ICE pelos do programa, com a REZ de agora.
const numerosDoPrograma = programa => {
  const s = programa.system;
  return {
    classe: s.tipoDeIce, per: s.per, spd: s.spd, atk: s.atk, def: s.def, rez: { value: programa.rezAtual, max: s.rez },
    dano: formulaDeDano(s.dano.padrao), custo: s.preco, efeito: textoDe(s.descricao)
  };
};

// O ator de Black ICE com o nome do programa, ou um novo na pasta "Black ICE rezzado".
async function atorDoIce(programa) {
  const existente = game.actors.find(ator => ator.type === 'blackice' && ator.name === programa.name);
  if (existente) return existente;
  const pasta = game.folders.find(folder => folder.type === 'Actor' && folder.name === PASTA) ?? await CONFIG.Folder.documentClass.create({ name: PASTA, type: 'Actor' });
  const modelo = (programa.getFlag(SISTEMA, 'catalogo') ?? '').replace(/^black-ice:/, '');
  return Actor.implementation.create({ name: programa.name, type: 'blackice', img: programa.img, folder: pasta.id, system: { modelo, ...numerosDoPrograma(programa) } });
}

async function rezzar(programa) {
  const netrunner = tokenDoNetrunner(programa.actor);
  if (!netrunner) {
    ui.notifications.warn(`${programa.name}: ponha o token de ${programa.actor.name} na cena para o Black ICE entrar nela.`);
    return null;
  }
  const cena = netrunner.parent;
  const ator = await atorDoIce(programa);
  const dados = await ator.getTokenDocument({
    name: programa.name, x: netrunner.x + cena.grid.size, y: netrunner.y, elevation: netrunner.elevation, disposition: netrunner.disposition, actorLink: false,
    flags: { [SISTEMA]: { programa: programa.uuid } }
  });
  const [token] = await cena.createEmbeddedDocuments('Token', [dados.toObject()]);
  await token.actor.update({ system: numerosDoPrograma(programa) });
  await programa.setFlag(SISTEMA, FLAG, { cena: cena.id, token: token.id });
  return token;
}

// Põe ou tira o token conforme o programa (de Black ICE, ativo e num deck). Um de cada vez por programa: o mesmo programa
// mudando de novo no meio espera a vez.
async function acertar(uuid) {
  const programa = fromUuidSync(uuid);
  const token = programa ? tokenDoIce(programa) : null;
  const querToken = Boolean(ehBlackIce(programa) && programa.system.ativo && programa.instaladoNo);
  if (querToken && !token) return rezzar(programa);
  if (!querToken && token) {
    await token.delete();
    await programa.unsetFlag(SISTEMA, FLAG);
  }
  return null;
}
const fila = new Map();
export function acertarIceRezzado(uuid) {
  const vez = (fila.get(uuid) ?? Promise.resolve()).then(() => acertar(uuid)).catch(erro => console.error(`${SISTEMA} | Black ICE rezzado`, erro));
  fila.set(uuid, vez);
  return vez;
}
const tirarToken = programa => {
  const marca = programa.getFlag(SISTEMA, FLAG);
  return marca ? game.scenes.get(marca.cena)?.tokens.get(marca.token)?.delete() : null;
};

export function registrarIceRezzado() {
  Hooks.on('updateItem', (item, mudancas) => {
    if (!souOMestreAtivo() || (!ehBlackIce(item) && !item.getFlag(SISTEMA, FLAG))) return;
    if (['system.ativo', 'system.instaladoEm', 'system.classe'].some(chave => foundry.utils.hasProperty(mudancas, chave))) acertarIceRezzado(item.uuid);
  });
  // O programa apagado (sozinho ou com o netrunner) leva o token junto.
  Hooks.on('deleteItem', item => { if (souOMestreAtivo() && ehBlackIce(item)) tirarToken(item); });
  Hooks.on('deleteActor', ator => { if (souOMestreAtivo()) for (const item of ator.items.filter(ehBlackIce)) tirarToken(item); });
  // A REZ que o token perde volta para o programa; em 0, o programa desativa (e o token sai).
  Hooks.on('updateActor', (ator, mudancas) => {
    if (!souOMestreAtivo() || ator.type !== 'blackice' || !ator.isToken || !foundry.utils.hasProperty(mudancas, 'system.rez.value')) return;
    const uuid = ator.token.getFlag(SISTEMA, 'programa');
    const programa = uuid ? fromUuidSync(uuid) : null;
    if (!ehBlackIce(programa)) return;
    const rez = Math.max(0, Number(ator.system.rez.value) || 0);
    const mudar = { 'system.rezPerdida': Math.max(0, programa.system.rez - rez), ...(rez === 0 && programa.system.ativo ? { 'system.ativo': false } : {}) };
    if (mudar['system.rezPerdida'] !== programa.system.rezPerdida || 'system.ativo' in mudar) programa.update(mudar);
  });
}
