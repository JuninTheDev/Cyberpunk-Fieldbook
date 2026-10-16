// "Usar" a droga (a wiki, "Humanidade e drogas", "Drogas de rua", p. 227–229; as maquetes do usuário: "Use"). Tomar é
// uma Ação: gasta a dose e o efeito primário vale na hora (doses a mais estendem o primário). Quando ele acaba, quem tomou
// rola WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário e precisa superá-la (p. 128); falhar dá o
// efeito secundário permanente e o vício, até a terapia. O Black Lace tira 2d6 de Humanidade ao tomar, devolvidos se
// passar no teste. No Black Lace e no Synthcoke, o −2 do vício vale "quando não está sob efeito": enquanto o primário
// dura, o vício fica suspenso (o "Addicted Primary" do CORE, que faz a mesma conta no Synthcoke, não é usado). As outras
// drogas (Speedheal, Stim...) não têm efeito secundário: "Usar" gasta a dose e liga o efeito, se houver.
import { SISTEMA } from './config.mjs';

// As drogas de rua da wiki: a DV do efeito secundário, se o vício só vale fora do efeito, e a Humanidade que custam.
export const DROGAS_DE_RUA = {
  'core_drugs:black-lace': { dv: 17, vicioForaDoEfeito: true, humanidade: '2d6' },
  'core_drugs:blue-glass': { dv: 15 },
  'core_drugs:boost': { dv: 17 },
  'core_drugs:smash': { dv: 15 },
  'core_drugs:synthcoke': { dv: 15, vicioForaDoEfeito: true }
};

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
export async function usarDroga(droga) {
  const ator = droga.actor;
  if (droga.type !== 'droga' || !ator) return null;
  if (droga.system.quantidade < 1) { ui.notifications.warn(`${droga.name}: sem doses.`); return null; }
  const rua = DROGAS_DE_RUA[droga.getFlag(SISTEMA, 'catalogo')] ?? null;
  const { primario, vicio } = efeitosDaDroga(droga.effects.contents, droga.system.consumo);
  const jaSobEfeito = Boolean(droga.getFlag(SISTEMA, 'sobEfeito'));
  await droga.update({ 'system.quantidade': droga.system.quantidade - 1 });
  const mudancas = [];
  if (primario?.disabled) mudancas.push({ _id: primario.id, disabled: false });
  if (rua?.vicioForaDoEfeito && vicio && !vicio.disabled) mudancas.push({ _id: vicio.id, disabled: true });
  if (mudancas.length) await droga.updateEmbeddedDocuments('ActiveEffect', mudancas);
  let humanidade = droga.getFlag(SISTEMA, 'sobEfeito')?.humanidade ?? 0;
  if (rua?.humanidade && !jaSobEfeito) {
    const roll = await new Roll(rua.humanidade).evaluate();
    humanidade = roll.total;
    await ator.update({ 'system.humanidade.value': Math.max(0, ator.system.humanidade.value - humanidade) });
  }
  await droga.setFlag(SISTEMA, 'sobEfeito', { humanidade });
  const texto = `<b>${esc(ator.name)}</b> tomou ${esc(droga.name)}${jaSobEfeito ? ': a dose estende o efeito' : primario ? `: ${esc(primario.name)}` : ''}${!jaSobEfeito && humanidade ? `, e perdeu ${humanidade} de Humanidade (volta se passar no teste)` : ''}.`;
  return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao('usou', texto, { droga: droga.name, humanidade, estendeu: jaSobEfeito }) });
}

// "O efeito acabou": desliga o primário e, na droga de rua, rola o teste do efeito secundário. Passou: o Black Lace devolve
// a Humanidade. Falhou: o vício liga e fica (até a terapia). Quem já é viciado rola também (a Humanidade pode voltar), mas
// o vício continua: só a terapia o tira.
export async function acabouOEfeito(droga) {
  const ator = droga.actor;
  const sob = droga.getFlag(SISTEMA, 'sobEfeito');
  if (droga.type !== 'droga' || !ator || !sob) return null;
  const rua = DROGAS_DE_RUA[droga.getFlag(SISTEMA, 'catalogo')] ?? null;
  const { primario, vicio } = efeitosDaDroga(droga.effects.contents, droga.system.consumo);
  const viciado = Boolean(droga.getFlag(SISTEMA, 'viciado'));
  if (primario && !primario.disabled) await primario.update({ disabled: true });
  await droga.unsetFlag(SISTEMA, 'sobEfeito');
  if (!rua) return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao('acabou', `O efeito de ${esc(droga.name)} em <b>${esc(ator.name)}</b> acabou.`, { droga: droga.name, resultado: 'acabou' }) });
  const teste = await ator.rolarPericia('resist-torture-drugs', { sabor: `Contra a DV${rua.dv} do efeito secundário de ${droga.name}` });
  if (!teste) return null;
  const resultado = resultadoDoSecundario(teste.total, rua.dv);
  if (resultado === 'passou' && sob.humanidade) {
    await ator.update({ 'system.humanidade.value': Math.min(ator.system.humanidade.max, ator.system.humanidade.value + sob.humanidade) });
  }
  if (resultado === 'viciou') await droga.setFlag(SISTEMA, 'viciado', true);
  if ((resultado === 'viciou' || viciado) && vicio?.disabled) await vicio.update({ disabled: false });
  const contra = `${teste.total} contra DV${rua.dv}`;
  const texto = resultado === 'viciou'
    ? `<b>${esc(ator.name)}</b> ${viciado ? 'segue viciado' : 'ficou viciado'} em ${esc(droga.name)} (${contra}): o efeito secundário fica, até a terapia.`
    : `<b>${esc(ator.name)}</b> resistiu ao efeito secundário de ${esc(droga.name)} (${contra})${sob.humanidade ? `, e a Humanidade volta (+${sob.humanidade})` : ''}${viciado ? ', mas segue viciado até a terapia' : ''}.`;
  return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), ...cartao(resultado, texto, { droga: droga.name, total: teste.total, dv: rua.dv, resultado }) });
}
