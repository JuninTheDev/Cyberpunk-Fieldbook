// Agarrar (a wiki, "Agarrar e arremessar", p. 177; o "Grapple" das maquetes do usuário): uma Ação, com uma mão livre.
// Os dois rolam DEX + Briga + 1d10, e quem agarra precisa superar: é o teste resistido, e o empate é do defensor (p.
// 128). O alvo resiste pela janela de reação do dono, como a esquiva (a decisão do usuário de 2026-10-16); pelo NPC, o
// mestre rola. Agarrados, os dois têm −2 em todas as ações (documentos.mjs); o agarrado não usa a Ação de Movimento e é
// arrastado, e ninguém usa arma de duas mãos (o cartão diz; o sistema não impede). Quem agarra solta quando quiser.
// As marcas são os efeitos de status "Agarrando" e "Agarrado", cada um com o outro ator: apagada uma (o "Soltar", ou o
// mestre pelo HUD do token), o mestre ativo apaga a outra.
import { SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { config } from './configuracoes.mjs';
import { defesaContra, destinatarios, naFila, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import { venceuOAgarrao } from './regras.mjs';

const CANAL = `system.${SISTEMA}`;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const avisar = texto => { ui.notifications.warn(texto); return null; };

// O agarrão de um ator: { papel: 'agarrando' ou 'agarrado', outro: o nome de quem está com ele } ou null. A marca posta
// à mão (pelo HUD do token) não diz o outro.
export function agarraoDe(ator) {
  for (const papel of ['agarrando', 'agarrado']) {
    const efeito = ator?.effects.find(e => e.statuses.has(STATUS_AGARRAO[papel]));
    if (efeito) return { papel, outro: efeito.getFlag(SISTEMA, 'agarrao')?.nome ?? '' };
  }
  return null;
}

// ---------------- No cliente de quem agarra ----------------
// O botão "Agarrar" da ficha: o alvo marcado (T), um só. Rola DEX + Briga + 1d10 (com a janela de rolagem, pela ficha)
// e manda ao mestre ativo, que pede a resistência do alvo. Sem mestre na mesa, não rola.
export async function agarrar(ator, { alvo = null, perguntar = false } = {}) {
  const marcados = alvo ? [alvo] : [...game.user.targets];
  const token = marcados.length === 1 ? (marcados[0].document ?? marcados[0]) : null;
  if (!['personagem', 'capanga'].includes(token?.actor?.type)) return avisar('Marque um alvo (tecla T sobre o token), um só, para agarrar.');
  if (token.actor === ator) return avisar('Ninguém agarra a si mesmo.');
  if (agarraoDe(ator)) return avisar(`${ator.name} já está num agarrão.`);
  if (agarraoDe(token.actor)) return avisar(`${token.name} já está num agarrão.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar('Sem mestre na mesa: o agarrão precisa do mestre para a resistência do alvo.');
  const teste = await ator.rolarPericia('brawling', {
    perguntar, rotulo: 'Agarrar', sabor: `contra ${token.name}`, modo: config('escondeAtaque') ? 'gm' : 'public', dados: { agarrar: true }, categoria: 'ataque'
  });
  if (!teste) return null;
  const pedido = { ator: ator.uuid, token: tokenNaCena(ator, token.parent)?.uuid ?? null, alvo: token.uuid, total: teste.total, mensagem: teste.mensagem?.id ?? null };
  if (game.user.isGM) return naFila(() => resolverAgarrao(pedido, game.user));
  game.socket.emit(CANAL, { tipo: 'agarrar', pedido, de: game.user.id });
  return pedido;
}

// "Soltar": quem agarra solta quando quiser (a wiki). Apaga a marca dele; a do outro, o mestre ativo apaga.
export async function soltar(ator) {
  const efeito = ator.effects.find(e => e.statuses.has(STATUS_AGARRAO.agarrando));
  if (!efeito) return null;
  const nome = efeito.getFlag(SISTEMA, 'agarrao')?.nome;
  await efeito.delete();
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<div class="${SISTEMA} cartao agarrao soltou"><p><b>${esc(ator.name)}</b> soltou ${nome ? `<b>${esc(nome)}</b>` : 'quem agarrava'}: o agarrão acabou.</p></div>`
  });
  return true;
}

// ---------------- No mestre ativo ----------------
// A resistência do alvo (combate.defesaContra: a janela de reação do dono, com o prazo e o "responder por ele"; pelo
// NPC, o mestre rola), o resultado, as marcas e o cartão. Devolve o resumo (os testes leem).
export async function resolverAgarrao(pedido, usuario) {
  const [ator, tokenAtq, alvo] = await Promise.all([pedido.ator, pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!ator || !alvo?.actor || !usuario) return null;
  if (!usuario.isGM && !ator.testUserPermission(usuario, 'OWNER')) return null;
  const nomeAtq = tokenAtq?.name ?? ator.name;
  const { resposta, notas } = await defesaContra({ atacante: ator, tokenAtq, alvo, total: pedido.total, modo: 'agarrar', rotulo: 'Agarrar', descricao: 'DEX + Briga + 1d10', opcoes: ['resistir'] });
  const defesa = resposta?.defesa ?? null;
  const resultado = defesa !== null && venceuOAgarrao(pedido.total, defesa) ? 'agarrou' : 'resistiu';
  if (resultado === 'agarrou') {
    await marcar(ator, 'agarrando', alvo.actor, alvo.name);
    await marcar(alvo.actor, 'agarrado', ator, nomeAtq);
  }
  // O total de quem agarrou, escondido até a resistência ("Esconder o total do ataque"), aparece para todos.
  const mensagem = game.messages.get(pedido.mensagem);
  if (mensagem?.whisper.length) await mensagem.update({ whisper: [] });
  const [a, b] = [nomeAtq, alvo.name].map(nome => `<b>${esc(nome)}</b>`);
  const frase = resultado === 'agarrou'
    ? `${a} agarrou ${b} (${pedido.total} contra ${defesa}): os dois têm −2 em todas as ações; ${b} não usa a Ação de Movimento e é arrastado, e ninguém usa arma de duas mãos.`
    : `${b} resistiu ao agarrão de ${a} (${defesa ?? '—'} contra ${pedido.total}${defesa === pedido.total ? ': o empate é do defensor' : ''}).`;
  const para = destinatarios({ usuario, linhas: [{ token: alvo }] });
  const resumo = { resultado, ataque: pedido.total, defesa, atacante: nomeAtq, alvo: alvo.name, notas };
  await ChatMessage.implementation.create({
    speaker: { alias: nomeAtq }, ...(para ? { whisper: para } : {}),
    content: `<div class="${SISTEMA} cartao agarrao ${resultado}"><p>${frase}</p>${notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}</div>`,
    flags: { [SISTEMA]: { agarrao: resumo } }
  });
  return resumo;
}

// A marca de um lado do agarrão: o efeito de status, com o outro ator (para apagar junto) e o nome dele (para a ficha).
async function marcar(ator, papel, outro, nome) {
  // Como o toggleStatusEffect do Foundry, com o flag.
  const efeito = await ActiveEffect.implementation.fromStatusEffect(STATUS_AGARRAO[papel], { parent: ator });
  efeito.updateSource({ [`flags.${SISTEMA}.agarrao`]: { outro: outro.uuid, nome } });
  return ActiveEffect.implementation.create(efeito.toObject(), { parent: ator, keepId: true });
}

// Apagada uma marca do agarrão (o "Soltar" ou o HUD do token), o mestre ativo apaga a do outro lado.
async function aoApagarEfeito(efeito) {
  const dados = efeito.getFlag(SISTEMA, 'agarrao');
  if (!dados?.outro || !souOMestreAtivo() || !(efeito.parent instanceof Actor)) return;
  const outro = await fromUuid(dados.outro);
  await outro?.effects.find(e => e.getFlag(SISTEMA, 'agarrao')?.outro === efeito.parent.uuid)?.delete();
}

export function registrarAgarrao() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'agarrar' || !souOMestreAtivo()) return;
    naFila(() => resolverAgarrao(mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | agarrar`, erro));
  });
  Hooks.on('deleteActiveEffect', efeito => { aoApagarEfeito(efeito).catch(erro => console.error(`${SISTEMA} | agarrão`, erro)); });
}
