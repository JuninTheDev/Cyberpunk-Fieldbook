// A identidade da arma no Foundry (o C69): o dono, o diário que conta sozinho e os marcos. As contas ficam no
// regras-identidade.mjs. Quem escreve:
// - o ItemCPR._preCreate (documentos.mjs): o dono e a origem, quando a arma entra na ficha de um personagem;
// - o ataque (combate.mjs): a sessão, no primeiro ataque do dia com a arma;
// - o dano (combate/modos.mjs, ferir): o primeiro sangue, o abate e o crítico, com a chave do golpe, que o "Desfazer"
//   do cartão tira (combate/cartao.mjs);
// - a ficha do item (a aba História): o nome próprio, a frase, a aparência, quem fez, o marco à mão e, só do mestre, o
//   dono e a nota.
// Só as armas de personagem têm diário: não a Briga nem as Artes Marciais, nem a arma que vem de um cyberware ou de um
// acessório (ela some e volta com ele).
import { SISTEMA } from './config.mjs';
import { ehArmaMontadaEmItem } from './armas-cyberware.mjs';
import { ehDesarmada } from './regras.mjs';
import * as R from './regras-identidade.mjs';

export const temIdentidade = arma => arma?.type === 'arma' && arma.actor?.type === 'personagem' && !ehArmaMontadaEmItem(arma) && !ehDesarmada(arma.system.tipo);

// A identidade da arma que entra na ficha de um personagem sem dono: o personagem vira o dono, e o diário ganha a origem.
// null: nada a mudar (a cópia que já tem dono, a arma roubada, continua do dono dela).
export function identidadeAoCriar(item) {
  const ator = item.parent;
  if (item.type !== 'arma' || ator?.type !== 'personagem' || !ator.id || ehDesarmada(item.system.tipo) || ehArmaMontadaEmItem(item)) return null;
  const atual = R.normalizar(item.getFlag(SISTEMA, 'arma'));
  if (atual.dono) return null;
  const data = new Date().toISOString();
  // A arma que voltou da wiki (o C70) já tem a origem: fica a dela.
  const origem = atual.eventos.some(evento => evento.tipo === 'origem') ? [] : [R.eventoDeOrigem({ nome: ator.name, wikiUid: item.getFlag(SISTEMA, 'wikiUid') ?? '', data })];
  return { ...atual, dono: { id: ator.id, nome: ator.name }, eventos: [...atual.eventos, ...origem] };
}

// Uma escrita por vez em cada arma: os golpes do autofogo e a sessão chegam juntos.
const filas = new Map();
function naFila(arma, tarefa) {
  const anterior = filas.get(arma.uuid) ?? Promise.resolve();
  const agora = anterior.then(tarefa, tarefa);
  filas.set(arma.uuid, agora.catch(() => null));
  return agora;
}

// Junta os eventos na flag da arma. A arma de antes do C69 (sem dono) ganha o dono, quem a carrega, e a origem. No marco
// de abates, o aviso sussurrado ao dono e ao mestre.
export function registrarEventos(arma, eventos) {
  if (!temIdentidade(arma) || !arma.isOwner || !eventos.filter(Boolean).length) return Promise.resolve(null);
  return naFila(arma, async () => {
    const guardada = arma.getFlag(SISTEMA, 'arma');
    const base = R.normalizar(guardada);
    if (!base.dono) {
      base.dono = { id: arma.actor.id, nome: arma.actor.name };
      base.eventos.unshift(R.eventoDeOrigem({ nome: arma.actor.name, data: new Date().toISOString() }));
    }
    const { identidade, marco } = R.juntarEventos(base, eventos);
    if (guardada && identidade.eventos.length === R.normalizar(guardada).eventos.length && !marco) return null;
    await arma.setFlag(SISTEMA, 'arma', identidade);
    if (marco) await avisarMarco(arma, marco);
    return identidade;
  });
}

// O "Desfazer" do ataque: os eventos do golpe saem.
export function desfazerEventos(arma, chave) {
  if (arma?.type !== 'arma' || !arma.isOwner || !arma.getFlag(SISTEMA, 'arma')) return Promise.resolve(null);
  return naFila(arma, () => arma.setFlag(SISTEMA, 'arma', R.tirarEventos(arma.getFlag(SISTEMA, 'arma'), chave)));
}

async function avisarMarco(arma, marco) {
  const para = game.users.filter(usuario => usuario.isGM || arma.actor?.testUserPermission(usuario, 'OWNER')).map(usuario => usuario.id);
  const nome = R.normalizar(arma.getFlag(SISTEMA, 'arma')).apelido || arma.name;
  await ChatMessage.implementation.create({
    speaker: { alias: arma.actor?.name ?? nome }, whisper: para,
    content: `<p class="${SISTEMA} marco-da-arma"><b>${foundry.utils.escapeHTML(nome)}</b> chegou a ${marco} abates.</p>`,
    flags: { [SISTEMA]: { marcoDaArma: { arma: arma.uuid, abates: marco } } }
  });
}

// O golpe que acertou (ferir, no cliente de quem resolve o ataque): os eventos do diário e a chave para o "Desfazer"
// (ctx.diario, que o cartão guarda). Só contra gente (o personagem e o capanga).
export async function anotarGolpe(ctx, linha, efeito, critico) {
  const arma = ctx.arma;
  const alvo = linha.token?.actor;
  if (!temIdentidade(arma) || !['personagem', 'capanga'].includes(alvo?.type) || alvo === arma.actor) return;
  const chave = `${ctx.pedido?.id ?? foundry.utils.randomID()}:${linha.token.uuid}`;
  const eventos = R.eventosDoGolpe(arma.getFlag(SISTEMA, 'arma'), { chave, alvo: linha.nome ?? alvo.name, hpAntes: efeito.hpAntes, hpDepois: efeito.hpDepois, critico, data: new Date().toISOString() });
  if (!eventos.length) return;
  await registrarEventos(arma, eventos);
  (ctx.diario ??= []).push({ arma: arma.uuid, chave });
}

// A sessão: o primeiro ataque do dia com a arma.
export function anotarSessao(arma) {
  return registrarEventos(arma, [R.eventoDeSessao(new Date().toISOString())]);
}

// O marco à mão (a aba História): uma linha de quem a anotou.
export function anotarMarco(arma, texto) {
  const por = game.user.isGM ? 'mestre' : (game.user.character?.name ?? game.user.name);
  const evento = R.eventoDeMarco(texto, { data: new Date().toISOString(), por });
  return evento ? registrarEventos(arma, [evento]) : Promise.resolve(null);
}

// O mestre passa a arma para quem a carrega agora (a herança, a arma que trocou de mãos de vez).
export async function tornarDono(arma) {
  if (!game.user.isGM || !temIdentidade(arma)) return null;
  const atual = R.normalizar(arma.getFlag(SISTEMA, 'arma'));
  const data = new Date().toISOString();
  const eventos = [...atual.eventos, { chave: `dono:${data}`, tipo: 'origem', data, texto: `Passou a ser de ${arma.actor.name}` }];
  return arma.setFlag(SISTEMA, 'arma', { ...atual, dono: { id: arma.actor.id, nome: arma.actor.name }, eventos });
}

export const API = { ...R, temIdentidade, registrarEventos, desfazerEventos, anotarMarco, tornarDono };
