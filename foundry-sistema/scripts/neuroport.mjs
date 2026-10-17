// O Neuroport (a NET de 2077, o C9 do ROADMAP; a wiki, "Quickhacks no Neuroport", Kit p. 16–17 e 26–27): o netrunner
// entra no Neuroport de um alvo à vista, no alcance do deck, e de lá passa os Passwalls (o Breach) e faz os quickhacks (as
// próximas partes do C9). Por enquanto, o Jack In, o Jack Out e o Breach:
// - Jack In: Interface + 1d10 contra a WILL + 1d10 do alvo. O alvo resiste pela janela de reação do dono, como no
//   agarrão (a decisão do usuário de 2026-10-17: "rolagens e efeitos simples"); pelo NPC, o mestre rola. Falhando (o
//   empate é do alvo), entra assim mesmo, mas o alvo percebe. Cada Neuroport é uma Ação NET, e dá para ficar ligado em
//   quantos quiser (a conta das Ações NET fora da arquitetura é outra parte);
// - Jack Out: sai do Neuroport do alvo com segurança;
// - Breach: passa um Passwall do alvo (um por Self-ICE, até 3; a DV de todos é 6, 8 ou 10, pelo número), Interface (a
//   habilidade Breach) + 1d10 contra a DV. Passa um por vez; o quickhack só vem depois de todos (ligacao.passados).
// A ligação fica nas flags dos dois atores, que o mestre ativo grava: no netrunner, neuroport.ligacoes ([{ alvo: o uuid do
// token, nome, percebido }]); no alvo, neuroport.invasores ([{ netrunner: o uuid do ator, nome, percebido }]). A ficha do
// netrunner mostra as dele; a do alvo, as que ele percebeu (o mestre vê todas).
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { centroDe, defesaContra, distancia, naFila, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import { alcanceDoJackIn, passouOPasswall, passwallsDoAlvo, percebeuOJackIn } from './regras.mjs';
import { netrunnerDo, paredeNoMeio } from './netrun/regras-da-net.mjs';

const CANAL = `system.${SISTEMA}`;
const FLAG = 'neuroport';
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const avisar = texto => { ui.notifications.warn(texto); return null; };
const SEM_MESTRE = 'Sem mestre na mesa: o Jack In precisa do mestre para a resistência do alvo.';

// O Neuroport instalado: o cyberware de 2077 do catálogo, ou o feito à mão com o mesmo nome.
export const temNeuroport = ator => Boolean(ator?.items.some(item => item.type === 'cyberware' && item.system.instalado
  && (item.getFlag(SISTEMA, 'catalogo') === 'cyberware-2077:neuroport' || item.name === 'Neuroport')));

// Os Self-ICE instalados (cada um põe um Passwall no Neuroport).
export const selfIcesDe = ator => (ator?.items ?? []).filter(item => item.type === 'cyberware' && item.system.instalado
  && (item.getFlag(SISTEMA, 'catalogo') === 'cyberware-2077:self-ice' || item.name === 'Self-ICE')).length;

// As ligações de um ator: as que ele fez (ligacoes) e as que fizeram nele (invasores).
export const neuroportDe = ator => {
  const dados = ator?.getFlag(SISTEMA, FLAG) ?? {};
  return { ligacoes: dados.ligacoes ?? [], invasores: dados.invasores ?? [] };
};

// ---------------- No cliente de quem age ----------------
function pedirAoMestre(acao, pedido) {
  if (game.user.isGM) return naFila(() => resolver(acao, pedido, game.user));
  game.socket.emit(CANAL, { tipo: 'neuroport', acao, pedido, de: game.user.id });
  return pedido;
}

// "Jack In": o alvo marcado (T), um só, com Neuroport, à vista e no alcance do deck.
export async function jackIn(ator, { alvo = null, perguntar = false } = {}) {
  const marcados = alvo ? [alvo] : [...game.user.targets];
  const token = marcados.length === 1 ? (marcados[0].document ?? marcados[0]) : null;
  if (!['personagem', 'capanga'].includes(token?.actor?.type)) return avisar('Marque um alvo (tecla T sobre o token), um só, para o Jack In.');
  if (token.actor === ator) return avisar('O Jack In é no Neuroport de outra pessoa.');
  if (!ator.system.rankDeInterface) return avisar(`${ator.name} não tem Interface: só o Netrunner faz o Jack In.`);
  const n = netrunnerDo(ator);
  if (!n.deck) return avisar(`${ator.name} não tem cyberdeck equipado.`);
  if (!temNeuroport(token.actor)) return avisar(`${token.name} não tem Neuroport: só dá para hackear quem tem.`);
  if (neuroportDe(ator).ligacoes.some(ligacao => ligacao.alvo === token.uuid)) return avisar(`${ator.name} já está no Neuroport de ${token.name}.`);
  const meu = tokenNaCena(ator, token.parent);
  if (!meu) return avisar(`Ponha o token de ${ator.name} na cena de ${token.name}.`);
  const longe = distancia(meu, token);
  const alcance = alcanceDoJackIn({ rangeUpgrade: n.rangeUpgrade });
  if (longe > alcance + 0.01) return avisar(`${token.name} está longe demais para o Jack In: ${longe.toFixed(1)} m (alcance ${alcance} m).`);
  if (paredeNoMeio(token.parent.walls, centroDe(meu), centroDe(token), 'sight')) return avisar(`${token.name} não está à vista: o Jack In precisa ver o alvo.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const teste = await ator.rolarJackIn({ perguntar, sabor: `contra ${token.name}`, modo: config('escondeAtaque') ? 'gm' : 'public', dados: { jackin: true }, categoria: 'net' });
  if (!teste) return null;
  return pedirAoMestre('jackin', { ator: ator.uuid, token: meu.uuid, alvo: token.uuid, total: teste.total, mensagem: teste.mensagem?.id ?? null });
}

// "Jack Out": sai do Neuroport de um alvo (o uuid do token) com segurança.
export function jackOut(ator, alvo) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === alvo);
  if (!ligacao) return avisar(`${ator.name} não está nesse Neuroport.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  return pedirAoMestre('jackout', { ator: ator.uuid, alvo });
}

// "Breach": passa o próximo Passwall do alvo (o uuid do token), com a habilidade Breach (o bônus do Worm vale).
export async function breach(ator, alvo, { perguntar = false } = {}) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === alvo);
  if (!ligacao) return avisar(`${ator.name} não está nesse Neuroport.`);
  const { quantos, dv } = passwallsDoAlvo(selfIcesDe(fromUuidSync(alvo)?.actor));
  if ((ligacao.passados ?? 0) >= quantos) return avisar(quantos ? `${ator.name} já passou os Passwalls de ${ligacao.nome}.` : `${ligacao.nome} não tem Passwall (nenhum Self-ICE).`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const teste = await ator.rolarInterface('backdoor', { perguntar, sabor: `contra o Passwall de ${ligacao.nome} (DV ${dv})` });
  if (!teste) return null;
  return pedirAoMestre('breach', { ator: ator.uuid, alvo, total: teste.total });
}

// ---------------- No mestre ativo ----------------
async function resolver(acao, pedido, usuario) {
  const ator = await fromUuid(pedido.ator);
  if (!ator || !usuario || !RESOLVER[acao]) return null;
  if (!usuario.isGM && !ator.testUserPermission(usuario, 'OWNER')) return null;
  return RESOLVER[acao](ator, pedido, usuario);
}

// Quem vê o cartão: o mestre e os donos do netrunner; os donos do alvo, se ele percebeu.
const donosDe = ator => game.users.filter(usuario => !usuario.isGM && ator?.testUserPermission(usuario, 'OWNER')).map(usuario => usuario.id);
async function cartao({ ator, alvo, percebido, falante, resumo, frase, notas = [] }) {
  const para = new Set([...game.users.filter(usuario => usuario.isGM).map(usuario => usuario.id), ...donosDe(ator), ...(percebido ? donosDe(alvo) : [])]);
  await ChatMessage.implementation.create({
    speaker: { alias: falante }, whisper: [...para],
    content: `<div class="${SISTEMA} cartao neuroport ${resumo.resultado}"><p>${frase}</p>${notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}</div>`,
    flags: { [SISTEMA]: { neuroport: resumo } }
  });
  return resumo;
}

// O total de quem rolou, escondido até a resistência ("Esconder o total do ataque"), aparece para quem vê o cartão.
async function mostrarTotal(pedido) {
  const mensagem = game.messages.get(pedido.mensagem);
  if (mensagem?.whisper.length) await mensagem.update({ whisper: [] });
}

// Grava a ligação nos dois lados (ou a tira, com o netrunner e o alvo).
async function gravar(ator, alvo, { ligacao = null, invasor = null }) {
  const meu = neuroportDe(ator);
  const dele = neuroportDe(alvo.actor);
  await ator.setFlag(SISTEMA, FLAG, { ...meu, ligacoes: [...meu.ligacoes.filter(item => item.alvo !== alvo.uuid), ...(ligacao ? [ligacao] : [])] });
  await alvo.actor.setFlag(SISTEMA, FLAG, { ...dele, invasores: [...dele.invasores.filter(item => item.netrunner !== ator.uuid), ...(invasor ? [invasor] : [])] });
}

// A resistência do alvo (combate.defesaContra: a janela de reação do dono; pelo NPC, o mestre rola), a ligação e o
// cartão. As conferências do cliente valem de novo aqui.
async function resolverJackIn(ator, pedido) {
  const [meu, alvo] = await Promise.all([pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!alvo?.actor || !temNeuroport(alvo.actor) || neuroportDe(ator).ligacoes.some(item => item.alvo === alvo.uuid)) return null;
  const nome = meu?.name ?? ator.name;
  const { resposta, notas } = await defesaContra({ atacante: ator, tokenAtq: meu, alvo, total: pedido.total, modo: 'jackin', rotulo: 'Jack In', descricao: 'Interface + 1d10', opcoes: ['vontade'] });
  const defesa = resposta?.defesa ?? null;
  const percebido = defesa === null || percebeuOJackIn(pedido.total, defesa);
  await mostrarTotal(pedido);
  await gravar(ator, alvo, { ligacao: { alvo: alvo.uuid, nome: alvo.name, percebido }, invasor: { netrunner: ator.uuid, nome, percebido } });
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${pedido.total} contra ${defesa ?? '—'}`;
  const frase = percebido ? `${a} entrou no Neuroport de ${b} (${conta}), mas ${b} percebeu.` : `${a} entrou no Neuroport de ${b} (${conta}) sem ser percebido.`;
  return cartao({ ator, alvo: alvo.actor, percebido, falante: nome, frase, notas, resumo: { resultado: percebido ? 'percebido' : 'entrou', ataque: pedido.total, defesa, netrunner: nome, alvo: alvo.name } });
}

async function resolverJackOut(ator, pedido) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === pedido.alvo);
  if (!ligacao) return null;
  const alvo = await fromUuid(pedido.alvo);
  const nome = tokenNaCena(ator, alvo?.parent)?.name ?? ator.name;
  if (alvo?.actor) await gravar(ator, alvo, {});
  else await ator.setFlag(SISTEMA, FLAG, { ...neuroportDe(ator), ligacoes: neuroportDe(ator).ligacoes.filter(item => item.alvo !== pedido.alvo) });
  return cartao({
    ator, alvo: alvo?.actor ?? null, percebido: ligacao.percebido, falante: nome, frase: `<b>${esc(nome)}</b> saiu do Neuroport de <b>${esc(ligacao.nome)}</b> (Jack Out).`,
    resumo: { resultado: 'saiu', netrunner: nome, alvo: ligacao.nome }
  });
}

// O Breach: o próximo Passwall, contra a DV pelo Self-ICE do alvo de agora; passando, a ligação conta mais um.
async function resolverBreach(ator, pedido) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === pedido.alvo);
  const alvo = await fromUuid(pedido.alvo);
  if (!ligacao || !alvo?.actor) return null;
  const { quantos, dv } = passwallsDoAlvo(selfIcesDe(alvo.actor));
  const antes = ligacao.passados ?? 0;
  if (antes >= quantos) return null;
  const passou = passouOPasswall(pedido.total, dv);
  const passados = antes + (passou ? 1 : 0);
  if (passou) {
    const meu = neuroportDe(ator);
    await ator.setFlag(SISTEMA, FLAG, { ...meu, ligacoes: meu.ligacoes.map(item => (item.alvo === pedido.alvo ? { ...item, passados } : item)) });
  }
  const nome = tokenNaCena(ator, alvo.parent)?.name ?? ator.name;
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `Breach ${pedido.total} contra DV ${dv}`;
  const faltam = quantos - passados;
  const frase = passou
    ? `${a} passou um Passwall de ${b} (${conta}): ${faltam ? `falta${faltam > 1 ? 'm' : ''} ${faltam}` : 'o Neuroport está aberto aos quickhacks'}.`
    : `${a} não passou o Passwall de ${b} (${conta}).`;
  return cartao({ ator, alvo: alvo.actor, percebido: false, falante: nome, frase, resumo: { resultado: passou ? 'passou' : 'barrado', total: pedido.total, dv, passados, quantos, netrunner: nome, alvo: alvo.name } });
}

const RESOLVER = { jackin: resolverJackIn, jackout: resolverJackOut, breach: resolverBreach };

export function registrarNeuroport() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'neuroport' || !souOMestreAtivo()) return;
    naFila(() => resolver(mensagem.acao, mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | Neuroport`, erro));
  });
}
