// Agarrar (a wiki, "Agarrar e arremessar", p. 177; o "Grapple" das maquetes do usuário): uma Ação, com uma mão livre.
// Os dois rolam DEX + Briga + 1d10, e quem agarra precisa superar: é o teste resistido, e o empate é do defensor (p.
// 128). O alvo resiste pela janela de reação do dono, como a esquiva (a decisão do usuário de 2026-10-16); pelo NPC, o
// mestre rola. Agarrados, os dois têm −2 em todas as ações (documentos.mjs); o agarrado não usa a Ação de Movimento e é
// arrastado, e ninguém usa arma de duas mãos (o cartão diz; o sistema não impede). Quem agarra solta quando quiser.
// Agarrando, quem agarra também pode, uma Ação cada: Estrangular (o BODY dele direto no HP do outro, sem a armadura; se
// levaria abaixo de 0, o outro fica com 1 e desmaia; três rodadas seguidas, desmaia) e Derrubar (o BODY direto no HP; o
// outro cai, e o agarrão acaba). Quem é agarrado escapa com um teste de agarrar vencido (uma Ação): quem agarra resiste
// pela janela de reação do dono dele, e o empate é de quem segura.
// As marcas são os efeitos de status "Agarrando" e "Agarrado", cada um com o outro ator: apagada uma (o "Soltar", a fuga,
// o "Derrubar" ou o mestre pelo HUD do token), o mestre ativo apaga a outra.
import { SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { config } from './configuracoes.mjs';
import { combateDe, defesaContra, destinatarios, naFila, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import { danoDoAgarrao, venceuOAgarrao, vezesEstrangulando } from './regras.mjs';

const CANAL = `system.${SISTEMA}`;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const avisar = texto => { ui.notifications.warn(texto); return null; };
const efeitoDe = (ator, papel) => ator?.effects.find(e => e.statuses.has(STATUS_AGARRAO[papel])) ?? null;
const SEM_MESTRE = 'Sem mestre na mesa: o agarrão precisa do mestre para a resistência e para o dano.';

// O agarrão de um ator: { papel: 'agarrando' ou 'agarrado', outro: o nome de quem está com ele } ou null. A marca posta
// à mão (pelo HUD do token) não diz o outro.
export function agarraoDe(ator) {
  for (const papel of ['agarrando', 'agarrado']) {
    const efeito = efeitoDe(ator, papel);
    if (efeito) return { papel, outro: efeito.getFlag(SISTEMA, 'agarrao')?.nome ?? '' };
  }
  return null;
}

// ---------------- No cliente de quem age ----------------
// O mestre resolve na fila dos ataques; o jogador manda pelo socket.
function pedirAoMestre(acao, pedido) {
  if (game.user.isGM) return naFila(() => resolver(acao, pedido, game.user));
  game.socket.emit(CANAL, { tipo: 'agarrao', acao, pedido, de: game.user.id });
  return pedido;
}

// DEX + Briga + 1d10 (com a janela de rolagem, pela ficha), com o total escondido até a resistência, como o do ataque.
const rolarBriga = (ator, { rotulo, contra, acao, perguntar }) => ator.rolarPericia('brawling', {
  perguntar, rotulo, sabor: `contra ${contra}`, modo: config('escondeAtaque') ? 'gm' : 'public', dados: { [acao]: true }, categoria: 'ataque'
});

// "Agarrar": o alvo marcado (T), um só.
export async function agarrar(ator, { alvo = null, perguntar = false } = {}) {
  const marcados = alvo ? [alvo] : [...game.user.targets];
  const token = marcados.length === 1 ? (marcados[0].document ?? marcados[0]) : null;
  if (!['personagem', 'capanga'].includes(token?.actor?.type)) return avisar('Marque um alvo (tecla T sobre o token), um só, para agarrar.');
  if (token.actor === ator) return avisar('Ninguém agarra a si mesmo.');
  if (agarraoDe(ator)) return avisar(`${ator.name} já está num agarrão.`);
  if (agarraoDe(token.actor)) return avisar(`${token.name} já está num agarrão.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const teste = await rolarBriga(ator, { rotulo: 'Agarrar', contra: token.name, acao: 'agarrar', perguntar });
  if (!teste) return null;
  return pedirAoMestre('agarrar', { ator: ator.uuid, token: tokenNaCena(ator, token.parent)?.uuid ?? null, alvo: token.uuid, total: teste.total, mensagem: teste.mensagem?.id ?? null });
}

// "Escapar": quem é agarrado rola; quem agarra resiste (o token dele precisa estar na cena, para a janela de reação).
export async function escapar(ator, { perguntar = false } = {}) {
  const dados = efeitoDe(ator, 'agarrado')?.getFlag(SISTEMA, 'agarrao');
  const quemSegura = dados?.outro ? await fromUuid(dados.outro) : null;
  if (!quemSegura) return avisar(`${ator.name} não está agarrado por ninguém (a marca posta à mão não diz quem segura).`);
  const meu = tokenNaCena(ator);
  if (!tokenNaCena(quemSegura, meu?.parent ?? canvas.scene)) return avisar(`Ponha o token de ${quemSegura.name} na cena, para ele resistir.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const teste = await rolarBriga(ator, { rotulo: 'Escapar do agarrão', contra: dados.nome, acao: 'escapar', perguntar });
  if (!teste) return null;
  return pedirAoMestre('escapar', { ator: ator.uuid, token: meu?.uuid ?? null, total: teste.total, mensagem: teste.mensagem?.id ?? null });
}

// "Estrangular" e "Derrubar": de quem agarra, sem rolagem.
const agindoAgarrando = (ator, acao) => {
  if (!efeitoDe(ator, 'agarrando')?.getFlag(SISTEMA, 'agarrao')?.outro) return avisar(`${ator.name} não está agarrando ninguém (a marca posta à mão não diz quem).`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  return pedirAoMestre(acao, { ator: ator.uuid });
};
export const estrangular = ator => agindoAgarrando(ator, 'estrangular');
export const derrubar = ator => agindoAgarrando(ator, 'derrubar');

// "Soltar": quem agarra solta quando quiser (a wiki). Apaga a marca dele; a do outro, o mestre ativo apaga.
export async function soltar(ator) {
  const efeito = efeitoDe(ator, 'agarrando');
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
async function resolver(acao, pedido, usuario) {
  const ator = await fromUuid(pedido.ator);
  if (!ator || !usuario || !RESOLVER[acao]) return null;
  if (!usuario.isGM && !ator.testUserPermission(usuario, 'OWNER')) return null;
  return RESOLVER[acao](ator, pedido, usuario, acao);
}

// O total de quem rolou, escondido até a resistência ("Esconder o total do ataque"), aparece para todos.
async function mostrarTotal(pedido) {
  const mensagem = game.messages.get(pedido.mensagem);
  if (mensagem?.whisper.length) await mensagem.update({ whisper: [] });
}

// O cartão do agarrão, para quem vê o cartão do ataque (os donos dos dois, pela configuração). Devolve o resumo (os
// testes leem).
async function cartao({ usuario, atores, falante, resumo, frase, notas = [] }) {
  const para = destinatarios({ usuario, linhas: atores.map(actor => ({ token: { actor } })) });
  await ChatMessage.implementation.create({
    speaker: { alias: falante }, ...(para ? { whisper: para } : {}),
    content: `<div class="${SISTEMA} cartao agarrao ${resumo.resultado}"><p>${frase}</p>${notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}</div>`,
    flags: { [SISTEMA]: { agarrao: resumo } }
  });
  return resumo;
}

// A resistência do alvo (combate.defesaContra: a janela de reação do dono, com o prazo e o "responder por ele"; pelo
// NPC, o mestre rola), o resultado e as marcas.
async function resolverAgarrao(ator, pedido, usuario) {
  const [tokenAtq, alvo] = await Promise.all([pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!alvo?.actor) return null;
  const nomeAtq = tokenAtq?.name ?? ator.name;
  const { resposta, notas } = await defesaContra({ atacante: ator, tokenAtq, alvo, total: pedido.total, modo: 'agarrar', rotulo: 'Agarrar', descricao: 'DEX + Briga + 1d10', opcoes: ['resistir'] });
  const defesa = resposta?.defesa ?? null;
  const resultado = defesa !== null && venceuOAgarrao(pedido.total, defesa) ? 'agarrou' : 'resistiu';
  if (resultado === 'agarrou') {
    await marcar(ator, 'agarrando', alvo.actor, alvo.name);
    await marcar(alvo.actor, 'agarrado', ator, nomeAtq);
  }
  await mostrarTotal(pedido);
  const [a, b] = [nomeAtq, alvo.name].map(nome => `<b>${esc(nome)}</b>`);
  const frase = resultado === 'agarrou'
    ? `${a} agarrou ${b} (${pedido.total} contra ${defesa}): os dois têm −2 em todas as ações; ${b} não usa a Ação de Movimento e é arrastado, e ninguém usa arma de duas mãos.`
    : `${b} resistiu ao agarrão de ${a} (${defesa ?? '—'} contra ${pedido.total}${defesa === pedido.total ? ': o empate é do defensor' : ''}).`;
  return cartao({ usuario, atores: [alvo.actor], falante: nomeAtq, frase, notas, resumo: { resultado, ataque: pedido.total, defesa, atacante: nomeAtq, alvo: alvo.name, notas } });
}

// A fuga: quem agarra resiste como o alvo do agarrão; vencendo quem foge, as marcas saem.
async function resolverFuga(ator, pedido, usuario) {
  const dados = efeitoDe(ator, 'agarrado')?.getFlag(SISTEMA, 'agarrao');
  const quemSegura = dados?.outro ? await fromUuid(dados.outro) : null;
  const tokenAtq = pedido.token ? await fromUuid(pedido.token) : null;
  const alvo = quemSegura ? tokenNaCena(quemSegura, tokenAtq?.parent ?? canvas.scene) : null;
  if (!alvo) return null;
  const nome = tokenAtq?.name ?? ator.name;
  const { resposta, notas } = await defesaContra({ atacante: ator, tokenAtq, alvo, total: pedido.total, modo: 'escapar', rotulo: 'Escapar do agarrão', descricao: 'DEX + Briga + 1d10', opcoes: ['resistir'] });
  const defesa = resposta?.defesa ?? null;
  const resultado = defesa !== null && venceuOAgarrao(pedido.total, defesa) ? 'escapou' : 'segurou';
  if (resultado === 'escapou') await efeitoDe(ator, 'agarrado')?.delete();
  await mostrarTotal(pedido);
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const frase = resultado === 'escapou'
    ? `${a} escapou do agarrão de ${b} (${pedido.total} contra ${defesa}): o agarrão acabou.`
    : `${b} segurou ${a} (${defesa ?? '—'} contra ${pedido.total}${defesa === pedido.total ? ': o empate é de quem segura' : ''}): o agarrão continua.`;
  return cartao({ usuario, atores: [ator, quemSegura], falante: nome, frase, notas, resumo: { resultado, ataque: pedido.total, defesa, atacante: nome, alvo: alvo.name, notas } });
}

// Estrangular e Derrubar: o BODY de quem agarra direto no HP do outro (regras.danoDoAgarrao). As rodadas seguidas do
// estrangular ficam na marca de quem agarra.
async function resolverDano(ator, pedido, usuario, acao) {
  const efeito = efeitoDe(ator, 'agarrando');
  const dados = efeito?.getFlag(SISTEMA, 'agarrao');
  const outro = dados?.outro ? await fromUuid(dados.outro) : null;
  if (!outro) return null;
  const body = ator.system.atributos.body.valor;
  const hpAntes = outro.system.hp.value;
  const estrangulando = acao === 'estrangular';
  const combate = combateDe(ator);
  const agora = { combate: combate?.id ?? null, rodada: combate?.round ?? null };
  const vezes = estrangulando ? vezesEstrangulando(dados.estrangulou, agora) : 0;
  const { hp, desmaiou, motivo } = danoDoAgarrao({ hp: hpAntes, body, estrangular: estrangulando, vezes });
  await outro.update({ 'system.hp.value': hp });
  if (desmaiou) await outro.toggleStatusEffect('unconscious', { active: true });
  if (estrangulando) await efeito.setFlag(SISTEMA, 'agarrao', { ...dados, estrangulou: { ...agora, vezes } });
  else {
    await outro.toggleStatusEffect('prone', { active: true });
    await efeito.delete();
  }
  const nome = tokenNaCena(ator)?.name ?? ator.name;
  const [a, b] = [nome, dados.nome].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${body} de dano direto no HP, sem a armadura (${hpAntes} → ${hp})`;
  const fim = {
    abaixoDeZero: `: o dano o levaria abaixo de 0, então fica com ${hp} e desmaia.`,
    tresRodadas: `: é a ${vezes}ª rodada seguida, e ${b} desmaia.`
  }[motivo] ?? (vezes > 1 ? ` (${vezes}ª rodada seguida; na 3ª, desmaia).` : '.');
  const frase = estrangulando ? `${a} estrangulou ${b}: ${conta}${fim}` : `${a} derrubou ${b}: ${conta}; ${b} caiu, e o agarrão acabou.`;
  return cartao({ usuario, atores: [outro], falante: nome, frase, resumo: { resultado: estrangulando ? 'estrangulou' : 'derrubou', dano: body, hpAntes, hp, desmaiou, vezes, alvo: dados.nome } });
}

const RESOLVER = { agarrar: resolverAgarrao, escapar: resolverFuga, estrangular: resolverDano, derrubar: resolverDano };

// A marca de um lado do agarrão: o efeito de status, com o outro ator (para apagar junto) e o nome dele (para a ficha).
async function marcar(ator, papel, outro, nome) {
  // Como o toggleStatusEffect do Foundry, com o flag.
  const efeito = await ActiveEffect.implementation.fromStatusEffect(STATUS_AGARRAO[papel], { parent: ator });
  efeito.updateSource({ [`flags.${SISTEMA}.agarrao`]: { outro: outro.uuid, nome } });
  return ActiveEffect.implementation.create(efeito.toObject(), { parent: ator, keepId: true });
}

// Apagada uma marca do agarrão, o mestre ativo apaga a do outro lado.
async function aoApagarEfeito(efeito) {
  const dados = efeito.getFlag(SISTEMA, 'agarrao');
  if (!dados?.outro || !souOMestreAtivo() || !(efeito.parent instanceof Actor)) return;
  const outro = await fromUuid(dados.outro);
  await outro?.effects.find(e => e.getFlag(SISTEMA, 'agarrao')?.outro === efeito.parent.uuid)?.delete();
}

export function registrarAgarrao() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'agarrao' || !souOMestreAtivo()) return;
    naFila(() => resolver(mensagem.acao, mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | agarrão`, erro));
  });
  Hooks.on('deleteActiveEffect', efeito => { aoApagarEfeito(efeito).catch(erro => console.error(`${SISTEMA} | agarrão`, erro)); });
}
