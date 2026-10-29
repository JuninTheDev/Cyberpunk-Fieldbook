// O Black Chrome na mesa (o C48, parte 3): o teste para perceber a armadura com aparência de moda. As regras ficam em
// regras-black-chrome.mjs; o mestre (ou o dono) faz o teste pela ficha da armadura, com o token de quem observa.
import { ESTILOS_ROUPA, SISTEMA } from './config.mjs';
import { DV_DA_MODA, percebeuAArmadura } from './regras-black-chrome.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));

// Quem observa rola a perícia (Percepção ou Guarda-roupa e Estilo) contra a DV dela; o resultado vai só para o mestre.
// Devolve { total, dv, percebeu } ou null (a armadura sem aparência de moda, a perícia errada ou o teste fechado).
export async function perceberArmadura(armadura, observador, pericia) {
  const dv = DV_DA_MODA[pericia];
  if (armadura?.type !== 'armadura' || !armadura.system.moda || !dv || !observador) return null;
  // O teste é só para o mestre, como o resultado: quem usa a armadura não sabe que foi percebido.
  const teste = await observador.rolarPericia(pericia, { modo: 'gm', sabor: `para perceber a armadura de ${armadura.actor?.name ?? 'alguém'} (DV${dv})` });
  if (!teste) return null;
  const percebeu = percebeuAArmadura({ pericia, total: teste.total });
  const estilo = ESTILOS_ROUPA[armadura.system.moda] ?? armadura.system.moda;
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: observador }), whisper: ChatMessage.implementation.getWhisperRecipients('GM').map(usuario => usuario.id),
    content: `<p><b>${esc(observador.name)}</b> ${percebeu ? 'percebe' : 'não percebe'} que ${esc(armadura.name)} (que parece ${esc(estilo.toLowerCase())}) é armadura: ${teste.total} contra DV${dv}.</p>`,
    flags: { [SISTEMA]: { perceberArmadura: { armadura: armadura.uuid, observador: observador.uuid, pericia, total: teste.total, dv, percebeu } } }
  });
  return { total: teste.total, dv, percebeu };
}
