// Escudo humano (wiki, p. 184): o vínculo continua sendo o agarrão. O cadáver só vira escudo quando está DEFEATED;
// HP 0 ainda é uma pessoa viva. Os PV pertencem à vítima e sobrevivem a soltar, agarrar e alterar BODY depois.
import { SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { danoDoEscudoHumano } from './regras.mjs';

const filas = new WeakMap();
const pessoa = ator => ['personagem', 'capanga'].includes(ator?.type);
const morto = ator => ator.statuses.has(CONFIG.specialStatusEffects.DEFEATED);
const pode = ator => pessoa(ator) && game.user.isGM;
const efeitoDe = (ator, papel) => ator?.effects.find(efeito => !efeito.disabled && efeito.statuses.has(STATUS_AGARRAO[papel])) ?? null;
const dadosDe = efeito => efeito?.getFlag(SISTEMA, 'agarrao');
const pvGravado = ator => ator.getFlag(SISTEMA, 'escudoHumanoCadaver');
const numero = valor => Number.isFinite(Number(valor)) ? Math.max(0, Number(valor)) : 0;
const normalizar = pv => { const max = numero(pv.max); return { value: Math.min(max, numero(pv.value)), max }; };
const inicial = ator => { const max = numero(ator.system.atributos.body.valor); return { value: max, max }; };

async function naFila(ator, operacao) {
  const anterior = filas.get(ator) ?? Promise.resolve();
  const atual = anterior.catch(() => {}).then(operacao);
  filas.set(ator, atual);
  try { return await atual; } finally { if (filas.get(ator) === atual) filas.delete(ator); }
}

function tokenPresente(token, ator, cena = null) {
  return Boolean(token?.parent?.tokens.get(token.id) === token && token.actor?.uuid === ator.uuid
    && (!cena || token.parent === cena));
}

// Vínculo novo: os dois UUIDs de token são explícitos. No legado, só há fallback se a identidade for única.
async function tokensDoPar(ator, outro, dados, reverso, cena) {
  const [proprio, alheio] = await Promise.all([dados.token ?? reverso.tokenOutro, dados.tokenOutro ?? reverso.token]
    .map(uuid => uuid ? fromUuid(uuid) : null));
  if ((dados.token || reverso.tokenOutro) && !tokenPresente(proprio, ator, cena)) return null;
  if ((dados.tokenOutro || reverso.token) && !tokenPresente(alheio, outro, cena)) return null;
  if (proprio && alheio && proprio.parent !== alheio.parent) return null;
  const local = cena ?? proprio?.parent ?? alheio?.parent;
  const cenas = local ? [local] : [...game.scenes];
  const unicos = quem => cenas.flatMap(c => [...c.tokens].filter(t => tokenPresente(t, quem, c)));
  const meus = proprio ? [proprio] : unicos(ator), deles = alheio ? [alheio] : unicos(outro);
  if (meus.length !== 1 || deles.length !== 1 || meus[0].parent !== deles[0].parent) return null;
  const [tokenDoPortador, token] = [meus[0], deles[0]];
  if ([dados.token, reverso.tokenOutro].some(uuid => uuid && uuid !== tokenDoPortador.uuid)
    || [dados.tokenOutro, reverso.token].some(uuid => uuid && uuid !== token.uuid)) return null;
  return { tokenDoPortador, token };
}

// Também usado ao ativar: não exige a marca de escudo, mas nunca aceita só um lado do agarrão.
export async function parParaEscudoHumano(ator, { cena = null } = {}) {
  if (!pessoa(ator) || await fromUuid(ator.uuid) !== ator) return null;
  const efeito = efeitoDe(ator, 'agarrando'), dados = dadosDe(efeito);
  const outro = dados?.outro ? await fromUuid(dados.outro) : null;
  if (!pessoa(outro) || outro === ator) return null;
  const efeitoReverso = efeitoDe(outro, 'agarrado'), reverso = dadosDe(efeitoReverso);
  if (reverso?.outro !== ator.uuid) return null;
  const tokens = await tokensDoPar(ator, outro, dados, reverso, cena);
  if (!tokens || efeitoDe(ator, 'agarrando') !== efeito || efeitoDe(outro, 'agarrado') !== efeitoReverso) return null;
  return { ator: outro, efeito, ...tokens };
}

async function pvDoCadaver(ator) {
  const gravado = pvGravado(ator);
  if (gravado) return normalizar(gravado);
  if (!morto(ator)) return null;
  // A reação pode ser lida pelo dono do portador. Só o mestre grava os PV da vítima.
  if (!pode(ator)) return inicial(ator);
  return naFila(ator, async () => {
    if (!morto(ator) || await fromUuid(ator.uuid) !== ator) return null;
    if (!pode(ator)) return pvGravado(ator) ? normalizar(pvGravado(ator)) : inicial(ator);
    const atual = pvGravado(ator);
    if (atual) return normalizar(atual);
    const pv = inicial(ator);
    await ator.setFlag(SISTEMA, 'escudoHumanoCadaver', pv);
    return pv;
  });
}

export async function escudoHumanoDe(ator, { cena = null } = {}) {
  const par = await parParaEscudoHumano(ator, { cena });
  if (!par || par.efeito.getFlag(SISTEMA, 'escudoHumano') !== true) return null;
  const estaMorto = morto(par.ator), pv = estaMorto ? await pvDoCadaver(par.ator) : null;
  // Uma escrita de PV pode ter esperado na fila enquanto alguém soltava ou apagava o token.
  const atual = await parParaEscudoHumano(ator, { cena });
  if (!atual || atual.efeito !== par.efeito || atual.token !== par.token || atual.tokenDoPortador !== par.tokenDoPortador
    || atual.efeito.getFlag(SISTEMA, 'escudoHumano') !== true || morto(par.ator) !== estaMorto) return null;
  return { ...par, morto: estaMorto, pv };
}

export async function usadoComoEscudo(ator, { cena = null, token = null } = {}) {
  if (!pessoa(ator)) return false;
  const dados = dadosDe(efeitoDe(ator, 'agarrado'));
  const portador = dados?.outro ? await fromUuid(dados.outro) : null;
  const escudo = portador ? await escudoHumanoDe(portador, { cena }) : null;
  return escudo?.ator === ator && (!token || escudo.token.uuid === token);
}

// O combate chama no mestre com a vítima, não com o portador. O dano normal da pessoa viva fica no pipeline comum.
export async function danoNoEscudoHumano(ator, dano, { explosivo = false } = {}) {
  if (!pode(ator)) return null;
  return naFila(ator, async () => {
    if (!pode(ator) || !morto(ator) || await fromUuid(ator.uuid) !== ator) return null;
    const gravado = pvGravado(ator), pv = gravado ? normalizar(gravado) : inicial(ator);
    const resultado = danoDoEscudoHumano({ pv, dano, explosivo });
    if (!gravado || resultado.depois !== pv.value) await ator.setFlag(SISTEMA, 'escudoHumanoCadaver', { value: resultado.depois, max: resultado.max });
    return resultado;
  });
}

// Desfazer devolve apenas a perda daquele ataque, preservando os danos que chegaram depois.
export async function desfazerEscudoHumano(ator, perdeu) {
  if (!pode(ator)) return null;
  return naFila(ator, async () => {
    if (!pode(ator) || await fromUuid(ator.uuid) !== ator) return null;
    const gravado = pvGravado(ator);
    if (!gravado) return null;
    const pv = normalizar(gravado), depois = Math.min(pv.max, pv.value + numero(perdeu));
    if (depois !== pv.value) await ator.setFlag(SISTEMA, 'escudoHumanoCadaver', { value: depois, max: pv.max });
    return { antes: pv.value, depois, recuperou: depois - pv.value, max: pv.max };
  });
}
