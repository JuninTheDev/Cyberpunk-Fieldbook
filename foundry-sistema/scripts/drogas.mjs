// "Usar" a droga (a wiki, "Humanidade e drogas", "Drogas de rua", p. 227–229; as maquetes do usuário: "Use"). Tomar é
// uma Ação: gasta a dose e o efeito primário vale na hora (doses a mais estendem o primário). Quando ele acaba, quem tomou
// rola WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário e precisa superá-la (p. 128); falhar dá o
// efeito secundário permanente e o vício, até a terapia. O Black Lace tira 2d6 de Humanidade ao tomar, devolvidos se
// passar no teste. No Black Lace e no Synthcoke, o −2 do vício vale "quando não está sob efeito": enquanto o primário
// dura, o vício fica suspenso (o "Addicted Primary" do CORE, que faz a mesma conta no Synthcoke, não é usado). As outras
// drogas (Speedheal, Stim...) não têm efeito secundário: "Usar" gasta a dose e liga o efeito, se houver.
import { SISTEMA } from './config.mjs';
import { chaveDaDroga, dependenciaTratada, FLAG_DEPENDENCIAS } from './terapia.mjs';

// As drogas de rua da wiki: a DV do efeito secundário, se o vício só vale fora do efeito, e a Humanidade que custam.
export const DROGAS_DE_RUA = {
  'core_drugs:black-lace': { dv: 17, vicioForaDoEfeito: true, humanidade: '2d6' },
  'core_drugs:blue-glass': { dv: 15 },
  'core_drugs:boost': { dv: 17 },
  'core_drugs:smash': { dv: 15 },
  'core_drugs:synthcoke': { dv: 15, vicioForaDoEfeito: true }
};

// Wiki, Drogas de rua, p. 227–229; Stim, CORE 0.92.4, drug.stim (p. 150).
export const DURACAO_DAS_DROGAS = { 'black-lace': 86400, 'blue-glass': 14400, boost: 86400, smash: 14400, synthcoke: 14400, stim: 3600 };
export const prazoDaDroga = (catalogo, agora, anterior = null) => {
  const segundos = catalogo?.startsWith('core_drugs:') && DURACAO_DAS_DROGAS[catalogo.slice(11)];
  return segundos ? Math.max(agora, Number.isFinite(anterior) ? anterior : agora) + segundos : null;
};

// Cliques simultâneos, uso e expiração não podem gastar a mesma dose nem testar duas vezes o mesmo fim.
const filas = new Map();
function naFila(droga, tarefa) {
  const chave = droga.actor?.uuid;
  const atual = (filas.get(chave) ?? Promise.resolve()).then(tarefa, tarefa);
  filas.set(chave, atual);
  void atual.finally(() => { if (filas.get(chave) === atual) filas.delete(chave); }).catch(() => {});
  return atual;
}

// O efeito primário e o do vício de uma droga, pelos nomes (o "consumo" da droga e o "Addiction" do CORE).
export function efeitosDaDroga(efeitos, consumo) {
  const primario = efeitos.find(efeito => efeito.name === consumo) ?? efeitos.find(efeito => !/Addict/.test(efeito.name)) ?? null;
  const vicio = efeitos.find(efeito => / Addiction$/.test(efeito.name)) ?? null;
  return { primario, vicio };
}

// O teste do efeito secundário: 'passou' (superou a DV) ou 'viciou'.
export const resultadoDoSecundario = (total, dv) => (total > dv ? 'passou' : 'viciou');

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const cartao = (classe, texto, flags) => ({ content: `<div class="${SISTEMA} cartao droga ${classe}"><p>${texto}</p></div>`, flags: { [SISTEMA]: { droga: flags } } });

// "Usar": gasta a dose, liga o primário (e suspende o vício que só vale fora do efeito) e, no Black Lace, tira a
// Humanidade, guardada para devolver.
export function usarDroga(droga) { return naFila(droga, () => tomar(droga)); }
async function tomar(droga) {
  const ator = droga.actor;
  if (droga.type !== 'droga' || !ator?.isOwner || !['personagem', 'capanga'].includes(ator.type) || !ator.items.has(droga.id)) return null;
  // Uma dose depois do prazo inicia outro uso, mesmo se o mestre acabou de entrar no mundo.
  const anterior = droga.getFlag(SISTEMA, 'sobEfeito');
  if (Number.isFinite(anterior?.fim) && anterior.fim <= game.time.worldTime) await encerrar(droga);
  if (droga.system.quantidade < 1) { ui.notifications.warn(`${droga.name}: sem doses.`); return null; }
  const rua = DROGAS_DE_RUA[droga.getFlag(SISTEMA, 'catalogo')] ?? null;
  const { primario, vicio } = efeitosDaDroga(droga.effects.contents, droga.system.consumo);
  const jaSobEfeito = Boolean(droga.getFlag(SISTEMA, 'sobEfeito'));
  await droga.update({ 'system.quantidade': droga.system.quantidade - 1 });
  const fim = prazoDaDroga(droga.getFlag(SISTEMA, 'catalogo'), game.time.worldTime, droga.getFlag(SISTEMA, 'sobEfeito')?.fim);
  const mudancas = [];
  if (primario) mudancas.push({ _id: primario.id, disabled: false, ...(fim === null ? {} : { duration: { value: fim - game.time.worldTime, units: 'seconds' }, start: { time: game.time.worldTime } }) });
  if (rua?.vicioForaDoEfeito && vicio && !vicio.disabled) mudancas.push({ _id: vicio.id, disabled: true });
  if (mudancas.length) await droga.updateEmbeddedDocuments('ActiveEffect', mudancas);
  let humanidade = droga.getFlag(SISTEMA, 'sobEfeito')?.humanidade ?? 0;
  if (rua?.humanidade && !jaSobEfeito) {
    const roll = await new Roll(rua.humanidade).evaluate();
    humanidade = Math.min(ator.system.humanidade.value, roll.total);
    await ator.update({ 'system.humanidade.value': Math.max(0, ator.system.humanidade.value - humanidade) });
  }
  await droga.setFlag(SISTEMA, 'sobEfeito', { humanidade, fim });
  const texto = `<b>${esc(ator.name)}</b> tomou ${esc(droga.name)}${jaSobEfeito ? ': a dose estende o efeito' : primario ? `: ${esc(primario.name)}` : ''}${!jaSobEfeito && humanidade ? `, e perdeu ${humanidade} de Humanidade (volta se passar no teste)` : ''}.`;
  return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao('usou', texto, { droga: droga.name, humanidade, estendeu: jaSobEfeito }) });
}

// "O efeito acabou": desliga o primário e, na droga de rua, rola o teste do efeito secundário. Passou: o Black Lace devolve
// a Humanidade. Falhou: o vício liga e fica (até a terapia). Quem já é viciado rola também (a Humanidade pode voltar), mas
// o vício continua: só a terapia o tira.
export function acabouOEfeito(droga) { return naFila(droga, () => encerrar(droga)); }
async function encerrar(droga) {
  const ator = droga.actor;
  const sob = droga.getFlag(SISTEMA, 'sobEfeito');
  if (droga.type !== 'droga' || !ator?.isOwner || !['personagem', 'capanga'].includes(ator.type) || !ator.items.has(droga.id) || !sob) return null;
  const rua = DROGAS_DE_RUA[droga.getFlag(SISTEMA, 'catalogo')] ?? null;
  const { primario, vicio } = efeitosDaDroga(droga.effects.contents, droga.system.consumo);
  const viciado = Boolean(droga.getFlag(SISTEMA, 'viciado'));
  if (primario && !primario.disabled) await primario.update({ disabled: true });
  if (!rua) {
    await droga.unsetFlag(SISTEMA, 'sobEfeito');
    return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao('acabou', `O efeito de ${esc(droga.name)} em <b>${esc(ator.name)}</b> acabou.`, { droga: droga.name, resultado: 'acabou' }) });
  }
  // A terapia de dependência (o C21; terapia.mjs): por um ano, quem se tratou falha sozinho no teste contra aquela droga.
  const tratada = dependenciaTratada(ator.getFlag(SISTEMA, FLAG_DEPENDENCIAS), chaveDaDroga({ catalogo: droga.getFlag(SISTEMA, 'catalogo'), nome: droga.name }), game.time.worldTime);
  // O cartão seguinte diz o total: o teste fica público, fora do modo do seletor do chat (o C33).
  const teste = tratada ? null : await ator.rolarPericia('resist-torture-drugs', { sabor: `Contra a DV${rua.dv} do efeito secundário de ${droga.name}`, modo: 'public' });
  if (!tratada && !teste) return null;
  const resultado = tratada ? 'viciou' : resultadoDoSecundario(teste.total, rua.dv);
  if (resultado === 'passou' && sob.humanidade) {
    await ator.update({ 'system.humanidade.value': Math.min(ator.system.humanidade.max, ator.system.humanidade.value + sob.humanidade) });
  }
  if (resultado === 'viciou') await droga.setFlag(SISTEMA, 'viciado', true);
  if ((resultado === 'viciou' || viciado) && vicio?.disabled) await vicio.update({ disabled: false });
  await droga.unsetFlag(SISTEMA, 'sobEfeito');
  const contra = tratada ? 'falha sozinho: a terapia de dependência, por um ano' : `${teste.total} contra DV${rua.dv}`;
  const texto = resultado === 'viciou'
    ? `<b>${esc(ator.name)}</b> ${viciado ? 'segue viciado' : 'ficou viciado'} em ${esc(droga.name)} (${contra}): o efeito secundário fica, até a terapia.`
    : `<b>${esc(ator.name)}</b> resistiu ao efeito secundário de ${esc(droga.name)} (${contra})${sob.humanidade ? `, e a Humanidade volta (+${sob.humanidade})` : ''}${viciado ? ', mas segue viciado até a terapia' : ''}.`;
  return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao(resultado, texto, { droga: droga.name, total: teste?.total ?? null, dv: rua.dv, resultado, tratada }) });
}

// Só o mestre ativo resolve os prazos; também confere os capangas soltos de todas as cenas e a volta ao mundo.
export async function expirarDrogas() {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  const atores = new Set([...game.actors, ...game.scenes.contents.flatMap(c => c.tokens.filter(t => !t.actorLink).map(t => t.actor).filter(Boolean))]);
  for (const ator of atores) for (const droga of ator.items.filter(i => i.type === 'droga')) {
    const sob = droga.getFlag(SISTEMA, 'sobEfeito');
    if (Number.isFinite(sob?.fim) && sob.fim <= game.time.worldTime) await acabouOEfeito(droga);
  }
}

export function registrarDrogas() {
  let expiracao = Promise.resolve();
  const conferir = () => { expiracao = expiracao.then(expirarDrogas).catch(erro => console.error(`${SISTEMA} | drogas`, erro)); };
  Hooks.on('updateWorldTime', conferir);
  Hooks.once('ready', conferir);
}
