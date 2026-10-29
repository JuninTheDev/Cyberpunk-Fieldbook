// O Neuroport (a NET de 2077, o C9 do ROADMAP; a wiki, "Quickhacks no Neuroport", Kit p. 16–17 e 26–27): o netrunner
// entra no Neuroport de um alvo à vista, no alcance do deck, e de lá passa os Passwalls (o Breach) e faz os quickhacks; o
// alvo que percebeu tenta expulsá-lo. Em combate, o Jack In, o Breach e o quickhack gastam as Ações NET da rodada (as do
// Rank; fora de combate, não contam). Por enquanto:
// - Jack In: Interface + 1d10 contra a WILL + 1d10 do alvo. O alvo resiste pela janela de reação do dono, como no
//   agarrão (a decisão do usuário de 2026-10-17: "rolagens e efeitos simples"); pelo NPC, o mestre rola. Falhando (o
//   empate é do alvo), entra assim mesmo, mas o alvo percebe; o alvo netrunner sempre percebe, sem rolar. Cada Neuroport
//   é uma Ação NET, e dá para ficar ligado em quantos quiser. Com Interface Rank 1 ou 2, antes, o firewall de fábrica
//   (Interface + 1d10 contra DV6): falhando, não entra, e o alvo não sabe;
// - Conexão direta: pelo Personal Link, a até 2 m, sem rolar: com o alvo inconsciente ou agarrado, ou quando o dono aceita
//   (a decisão do usuário de 2026-10-17). Ligado direto, uma Ação NET a mais por turno e os Passwalls passados; a mais de
//   2 m, ou com o cabo arrancado, cai à força;
// - Jack Out: sai do Neuroport do alvo com segurança;
// - Breach: passa um Passwall do alvo (um por Self-ICE, até 3; a DV de todos é 6, 8 ou 10, pelo número), Interface (a
//   habilidade Breach) + 1d10 contra a DV. Passa um por vez; o quickhack só vem depois de todos (ligacao.passados);
// - Quickhack: com os Passwalls passados, um dos do Rank do netrunner (o catálogo: os 11 do Kit e os 5 do suplemento que
//   a mesa aprovou), a habilidade Quickhack + 1d10 contra a DV dele; um por alvo por rodada de combate. O que deu certo
//   alerta o alvo (menos o Lure e os que o cartão diz que não). O sistema aplica o que é número (efeitoDoQuickhack: o
//   dano do Synapse Burnout, o fogo do Overheat, o MOVE do Impair Movement e do Slow, o System Reset); o resto vai ao
//   cartão, e o mestre narra;
// - Expulsar: o alvo que percebeu, com uma Ação, WILL + Concentração + 1d10 contra a Interface + 1d10 do netrunner (o
//   empate é do netrunner); expulso, a ligação some dos dois lados;
// - Jack Out inseguro: expulso, fora do alcance (o netrunner ou o alvo andou) ou com o alvo morto, a ligação some, e o
//   netrunner só entra de novo nesse alvo daqui a 60 minutos do tempo do mundo; o cartão diz o Black ICE do deck do alvo
//   que age (o mestre aplica). O token que sai da cena leva junto as ligações dele (a varredura do deleteToken);
// - o Neuroport como arquitetura (a decisão do usuário de 2026-10-17: simples): a ficha mostra os andares de cada ligação
//   (o Black ICE do deck do alvo, os Passwalls e o nó do Holophone), sem descer andares.
// A ligação fica nas flags dos dois atores, que o mestre ativo grava: no netrunner, neuroport.ligacoes ([{ alvo: o uuid do
// token, nome, percebido }]); no alvo, neuroport.invasores ([{ netrunner: o uuid do ator, nome, percebido }]). A ficha do
// netrunner mostra as dele; a do alvo, as que ele percebeu (o mestre vê todas).
import { SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { config } from './configuracoes.mjs';
import { centroDe, combateDe, defesaContra, distancia, jogadorDe, naFila, pedir as pedirAoDono, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import {
  acoesNetComDireta, acoesNetNaRodada, alcanceDaLigacao, alcanceDoJackIn, andaresDoNeuroport, bloqueioDoAlvo, CONEXAO_DIRETA, EFEITOS_DE_QUICKHACK, expulsou, fazOQuickhack, FIREWALL_DE_FABRICA,
  jaFezOQuickhack, JACK_OUT_INSEGURO, passouOFirewall, passouOPasswall, passouOQuickhack, passwallsDoAlvo, passwallsPassados, pedeOFirewall, percebeuOJackIn, sabeDoJackIn, semAcaoNet
} from './regras.mjs';
import { STATUS_EM_CHAMAS } from './netrun/constantes.mjs';
import { netrunnerDo, paredeNoMeio } from './netrun/regras-da-net.mjs';
import { iconeDoEfeito } from './regras-icones.mjs';

const CANAL = `system.${SISTEMA}`;
const FLAG = 'neuroport';
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const avisar = texto => { ui.notifications.warn(texto); return null; };
const SEM_MESTRE = 'Sem mestre na mesa: o Jack In precisa do mestre para a resistência do alvo.';

// O Neuroport instalado: o cyberware de 2077 do catálogo, ou o feito à mão com o mesmo nome.
export const temNeuroport = ator => Boolean(ator?.items.some(item => item.type === 'cyberware' && item.system.instalado && !item.inoperante
  && (item.getFlag(SISTEMA, 'catalogo') === 'cyberware-2077:neuroport' || item.name === 'Neuroport')));

// Os Self-ICE instalados (cada um põe um Passwall no Neuroport).
export const selfIcesDe = ator => (ator?.items ?? []).filter(item => item.type === 'cyberware' && item.system.instalado && !item.inoperante
  && (item.getFlag(SISTEMA, 'catalogo') === 'cyberware-2077:self-ice' || item.name === 'Self-ICE')).length;

// O Black ICE do Neuroport: o do cyberdeck equipado do dono (a wiki: "O Neuroport não instala Black ICE: ele usa o Black
// ICE do cyberdeck ligado a ele").
export const blackIceDoNeuroport = ator => (ator ? netrunnerDo(ator).programas.filter(programa => programa.system.classe === 'blackice') : []);
// Os andares do Neuroport, de cima para baixo (regras.andaresDoNeuroport): o Black ICE do deck, os Passwalls e o Holophone.
export const andaresDe = ator => andaresDoNeuroport({ blackIce: blackIceDoNeuroport(ator).map(programa => programa.name), selfIce: selfIcesDe(ator) });

// O EMP interrompe o equipamento sem apagar as ligações; o Jack Out continua livre.
function equipamentoOperante(ator, alvo) {
  if (!netrunnerDo(ator).deck) return avisar(`${ator.name} não tem cyberdeck operante equipado.`);
  if (!temNeuroport(alvo)) return avisar(`${alvo?.name ?? 'O alvo'} não tem Neuroport operante.`);
  return true;
}

// As ligações de um ator: as que ele fez (ligacoes) e as que fizeram nele (invasores); e, no netrunner, as Ações NET da
// rodada (acoes: { combate, rodada, usadas }) e os alvos do Jack Out inseguro (bloqueios: [{ alvo, nome, ate }]).
export const neuroportDe = ator => {
  const dados = ator?.getFlag(SISTEMA, FLAG) ?? {};
  return { ligacoes: dados.ligacoes ?? [], invasores: dados.invasores ?? [], acoes: dados.acoes ?? null, bloqueios: dados.bloqueios ?? [] };
};

// ---------------- No cliente de quem age ----------------
function pedirAoMestre(acao, pedido) {
  if (game.user.isGM) return naFila(() => resolver(acao, pedido, game.user));
  game.socket.emit(CANAL, { tipo: 'neuroport', acao, pedido, de: game.user.id });
  return pedido;
}

// As conferências da entrada no Neuroport (o Jack In e a conexão direta): o alvo marcado (T), um só, com Neuroport; a
// Interface e o deck; sem ligação nem bloqueio nesse alvo; o token do netrunner na cena. { token, meu, n } ou null.
function entrada(ator, alvo, oQue) {
  const marcados = alvo ? [alvo] : [...game.user.targets];
  const token = marcados.length === 1 ? (marcados[0].document ?? marcados[0]) : null;
  if (!['personagem', 'capanga'].includes(token?.actor?.type)) return avisar(`Marque um alvo (tecla T sobre o token), um só, para ${oQue}.`);
  if (token.actor === ator) return avisar('O Jack In é no Neuroport de outra pessoa.');
  if (!ator.system.rankDeInterface) return avisar(`${ator.name} não tem Interface: só o Netrunner faz o Jack In.`);
  const n = netrunnerDo(ator);
  if (!n.deck) return avisar(`${ator.name} não tem cyberdeck equipado.`);
  if (!temNeuroport(token.actor)) return avisar(`${token.name} não tem Neuroport: só dá para hackear quem tem.`);
  if (neuroportDe(ator).ligacoes.some(ligacao => ligacao.alvo === token.uuid)) return avisar(`${ator.name} já está no Neuroport de ${token.name}.`);
  const bloqueio = bloqueioDoAlvo(neuroportDe(ator).bloqueios, token.uuid, game.time.worldTime);
  if (bloqueio) return avisar(`${ator.name} só entra de novo no Neuroport de ${token.name} daqui a ${Math.ceil((bloqueio.ate - game.time.worldTime) / 60)} min (o Jack Out inseguro).`);
  const meu = tokenNaCena(ator, token.parent);
  if (!meu) return avisar(`Ponha o token de ${ator.name} na cena de ${token.name}.`);
  return { token, meu, n };
}

// O firewall de fábrica (Interface Rank 1 ou 2): antes de entrar, Interface contra DV6. Falhando, o pedido do firewall ao
// mestre (não entra, e o alvo não sabe) e null; passando, { total }; sem o teste (Rank 3 ou mais), { total: null }.
async function firewallDe(ator, token, meu, { perguntar, modo }) {
  if (!pedeOFirewall(ator.system.rankDeInterface)) return { total: null };
  const passe = await ator.rolarJackIn({ perguntar, rotulo: 'Firewall de fábrica', sabor: `contra o firewall de fábrica de ${token.name} (DV ${FIREWALL_DE_FABRICA.dv})`, modo, dados: { firewall: true }, categoria: 'net' });
  if (!passe) return null;
  if (!passouOFirewall(passe.total)) {
    await pedirAoMestre('firewall', { ator: ator.uuid, token: meu.uuid, alvo: token.uuid, total: passe.total });
    return null;
  }
  return { total: passe.total };
}

// "Jack In": no alvo marcado, à vista e no alcance do deck.
export async function jackIn(ator, { alvo = null, perguntar = false } = {}) {
  const ok = entrada(ator, alvo, 'o Jack In');
  if (!ok) return null;
  const { token, meu, n } = ok;
  const longe = distancia(meu, token);
  const alcance = alcanceDoJackIn(n);
  if (longe > alcance + 0.01) return avisar(`${token.name} está longe demais para o Jack In: ${longe.toFixed(1)} m (alcance ${alcance} m).`);
  if (paredeNoMeio(token.parent.walls, centroDe(meu), centroDe(token), 'sight')) return avisar(`${token.name} não está à vista: o Jack In precisa ver o alvo.`);
  if (faltaAcaoNet(ator)) return avisar(faltaAcaoNet(ator));
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const modo = config('escondeAtaque') ? 'gm' : 'public';
  const firewall = await firewallDe(ator, token, meu, { perguntar, modo });
  if (!firewall) return null;
  if (!equipamentoOperante(ator, token.actor)) return null;
  const teste = await ator.rolarJackIn({ perguntar, sabor: `contra ${token.name}`, modo, dados: { jackin: true }, categoria: 'net' });
  if (!teste) return null;
  return pedirAoMestre('jackin', { ator: ator.uuid, token: meu.uuid, alvo: token.uuid, total: teste.total, firewall: firewall.total, mensagem: teste.mensagem?.id ?? null });
}

// "Conexão direta": pelo Personal Link (o cabo), no alvo marcado a até 2 m, sem rolar (o mestre confere se o alvo está
// inconsciente ou agarrado, ou pede ao dono que aceite). O firewall de fábrica vale (não é um Passwall).
export async function conexaoDireta(ator, { alvo = null, perguntar = false } = {}) {
  const ok = entrada(ator, alvo, 'a conexão direta');
  if (!ok) return null;
  const { token, meu } = ok;
  const longe = distancia(meu, token);
  if (longe > CONEXAO_DIRETA.alcance + 0.01) return avisar(`${token.name} está longe demais para a conexão direta: ${longe.toFixed(1)} m (o cabo vai até ${CONEXAO_DIRETA.alcance} m).`);
  if (faltaAcaoNet(ator)) return avisar(faltaAcaoNet(ator));
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const firewall = await firewallDe(ator, token, meu, { perguntar, modo: config('escondeAtaque') ? 'gm' : 'public' });
  if (!firewall) return null;
  return pedirAoMestre('direta', { ator: ator.uuid, token: meu.uuid, alvo: token.uuid, firewall: firewall.total });
}

// "Arrancar o cabo": no Neuroport deste ator, o netrunner ligado direto (o uuid do ator) cai à força.
export function arrancarCabo(ator, netrunner) {
  const invasor = neuroportDe(ator).invasores.find(item => item.netrunner === netrunner);
  if (!invasor?.direta) return avisar(`Nenhum cabo de ${invasor?.nome ?? 'netrunner'} no Neuroport de ${ator.name}.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  return pedirAoMestre('cabo', { ator: ator.uuid, netrunner });
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
  if (!equipamentoOperante(ator, fromUuidSync(alvo)?.actor)) return null;
  const { quantos, dv } = passwallsDoAlvo(selfIcesDe(fromUuidSync(alvo)?.actor));
  if (passwallsPassados(ligacao, quantos) >= quantos) return avisar(quantos ? `${ator.name} já passou os Passwalls de ${ligacao.nome}.` : `${ligacao.nome} não tem Passwall (nenhum Self-ICE).`);
  if (faltaAcaoNet(ator)) return avisar(faltaAcaoNet(ator));
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const teste = await ator.rolarInterface('backdoor', { perguntar, sabor: `contra o Passwall de ${ligacao.nome} (DV ${dv})` });
  if (!teste) return null;
  return pedirAoMestre('breach', { ator: ator.uuid, alvo, total: teste.total });
}

// A rodada do combate em que o netrunner está (para o "um quickhack por alvo por turno"); fora de combate, null.
const agoraDe = ator => {
  const combate = combateDe(ator);
  return combate ? { combate: combate.id, rodada: combate.round } : null;
};

// As Ações NET do netrunner na rodada, fora da arquitetura (o Jack In, o Breach e o quickhack): em combate, { usadas, max
// }; fora, null. A conta da arquitetura (a janela da NET) é outra.
// As do Rank, e uma a mais com uma conexão direta.
const maxAcoesNet = ator => acoesNetComDireta(ator.system.acoesDeNet, neuroportDe(ator).ligacoes.some(item => item.direta));
export const acoesNetDe = ator => {
  const agora = agoraDe(ator);
  return agora ? { usadas: acoesNetNaRodada(neuroportDe(ator).acoes, agora), max: maxAcoesNet(ator) } : null;
};
// Sem Ação NET na rodada: o aviso (o mestre passa do limite, como na arquitetura).
const faltaAcaoNet = (ator, usuario = game.user) => {
  const agora = agoraDe(ator);
  const { acoes } = neuroportDe(ator);
  const max = maxAcoesNet(ator);
  return !usuario.isGM && semAcaoNet(acoes, agora, max) ? `Sem Ações NET neste turno (${acoesNetNaRodada(acoes, agora)} de ${max}).` : null;
};

// Os quickhacks que o netrunner faz: os do catálogo até o Rank de Interface dele ({ id, nome, dv, rank, alerta }).
export async function quickhacksDe(ator) {
  const catalogo = await game.system.api.wiki.carregarCatalogo();
  return Object.entries(catalogo).filter(([, item]) => item.system?.classe === 'quickhack' && fazOQuickhack(ator.system.rankDeInterface, item.flags?.[SISTEMA]?.quickhack?.rank))
    .map(([id, item]) => ({ id, nome: item.name, ...item.flags[SISTEMA].quickhack }));
}

async function escolherQuickhack(ator, ligacao, lista) {
  const opcoes = lista.map(item => `<option value="${esc(item.id)}">${esc(item.nome)} (DV ${item.dv})</option>`).join('');
  return foundry.applications.api.DialogV2.prompt({
    window: { title: `Quickhack em ${ligacao.nome}` }, classes: [SISTEMA, 'escolher-quickhack'],
    content: `<p>Os quickhacks até o Rank ${ator.system.rankDeInterface}: a habilidade Quickhack + 1d10 contra a DV dele.</p><select name="quickhack" aria-label="Quickhack">${opcoes}</select>`,
    ok: { label: 'Rolar o quickhack', callback: (evento, botao) => botao.form.elements.quickhack.value },
    rejectClose: false
  }).catch(() => null);
}

// "Quickhack": no alvo com os Passwalls passados, o escolhido (na janela, ou pelo id do catálogo).
export async function quickhack(ator, alvo, { perguntar = false, escolha = null } = {}) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === alvo);
  if (!ligacao) return avisar(`${ator.name} não está nesse Neuroport.`);
  if (!equipamentoOperante(ator, fromUuidSync(alvo)?.actor)) return null;
  const { quantos } = passwallsDoAlvo(selfIcesDe(fromUuidSync(alvo)?.actor));
  if (passwallsPassados(ligacao, quantos) < quantos) return avisar(`Passe antes os Passwalls de ${ligacao.nome} (o Breach).`);
  if (jaFezOQuickhack(ligacao.ultimoQuickhack, agoraDe(ator))) return avisar(`Um quickhack por alvo por turno: ${ator.name} já tentou um em ${ligacao.nome} nesta rodada.`);
  if (faltaAcaoNet(ator)) return avisar(faltaAcaoNet(ator));
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const lista = await quickhacksDe(ator);
  const id = escolha ?? await escolherQuickhack(ator, ligacao, lista);
  const escolhido = lista.find(item => item.id === id);
  if (!escolhido || !equipamentoOperante(ator, fromUuidSync(alvo)?.actor)) return null;
  const teste = await ator.rolarInterface('quickhack', { perguntar, sabor: `${escolhido.nome} contra ${ligacao.nome} (DV ${escolhido.dv})` });
  if (!teste) return null;
  return pedirAoMestre('quickhack', { ator: ator.uuid, alvo, id, total: teste.total });
}

// "Expulsar": no Neuroport deste ator, o netrunner (o uuid do ator) que ele percebeu; uma Ação: WILL + Concentração +
// 1d10 contra a Interface + 1d10 do netrunner, que defende pela janela de reação do dono (pelo NPC, o mestre rola).
export async function expulsar(ator, netrunner, { perguntar = false } = {}) {
  const invasor = neuroportDe(ator).invasores.find(item => item.netrunner === netrunner);
  if (!invasor) return avisar(`Esse netrunner não está no Neuroport de ${ator.name}.`);
  if (!invasor.percebido) return avisar(`${ator.name} não percebeu ${invasor.nome}: só dá para expulsar quem se percebeu.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar('Sem mestre na mesa: a expulsão precisa do mestre para a Interface do netrunner.');
  const teste = await ator.rolarPericia('concentration', { perguntar, sabor: `Expulsar ${invasor.nome} do Neuroport (uma Ação), contra a Interface + 1d10 dele`, modo: config('escondeAtaque') ? 'gm' : 'public', dados: { expulsar: true } });
  if (!teste) return null;
  return pedirAoMestre('expulsar', { ator: ator.uuid, netrunner, total: teste.total, mensagem: teste.mensagem?.id ?? null });
}

// ---------------- No mestre ativo ----------------
async function resolver(acao, pedido, usuario) {
  const ator = await fromUuid(pedido.ator);
  if (!ator || !usuario || !RESOLVER[acao]) return null;
  if (!usuario.isGM && !ator.testUserPermission(usuario, 'OWNER')) return null;
  if (['jackin', 'firewall', 'direta', 'breach', 'quickhack'].includes(acao) && !equipamentoOperante(ator, (await fromUuid(pedido.alvo))?.actor)) return null;
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

// Em combate, a Ação NET da rodada (o Jack In, o Breach e o quickhack): sem nenhuma, nada feito (menos pelo mestre).
async function gastarAcaoNet(ator, usuario) {
  const agora = agoraDe(ator);
  if (!agora) return true;
  const dados = neuroportDe(ator);
  if (!usuario.isGM && semAcaoNet(dados.acoes, agora, maxAcoesNet(ator))) return false;
  await ator.setFlag(SISTEMA, FLAG, { ...dados, acoes: { ...agora, usadas: acoesNetNaRodada(dados.acoes, agora) + 1 } });
  return true;
}

// O Jack Out inseguro (expulso ou fora do alcance): a ligação some dos dois lados, e o netrunner só entra de novo nesse
// alvo daqui a 60 minutos do tempo do mundo. O Black ICE do deck do alvo (o Neuroport como arquitetura) é outra parte.
const NOTA_INSEGURO = 'Jack Out inseguro: só entra de novo nesse Neuroport daqui a 60 minutos.';
// Devolve as notas do cartão: o Jack Out inseguro e o Black ICE do deck do alvo que age (o mestre aplica; a decisão do
// usuário de 2026-10-17).
async function desligarInseguro(netrunner, alvo) {
  await gravar(netrunner, alvo, {});
  const agora = game.time.worldTime;
  const dados = neuroportDe(netrunner);
  const bloqueios = [...dados.bloqueios.filter(item => Number(item.ate) > agora && item.alvo !== alvo.uuid), { alvo: alvo.uuid, nome: alvo.name, ate: agora + JACK_OUT_INSEGURO.segundos }];
  await netrunner.setFlag(SISTEMA, FLAG, { ...dados, bloqueios });
  // "Sofre o efeito de todo Black ICE encontrado e ainda ativo" (a wiki): o do deck do alvo com REZ.
  const ativos = blackIceDoNeuroport(alvo.actor).filter(programa => programa.rezAtual > 0);
  const efeito = programa => String(programa.system.descricao ?? '').replace(/<[^>]+>/g, '').trim();
  return [NOTA_INSEGURO, ...(ativos.length ? [`No Jack Out inseguro, age o Black ICE do deck de ${alvo.name} (o mestre aplica): ${ativos.map(programa => `${programa.name} (${efeito(programa)})`).join('; ')}`] : [])];
}

// A resistência do alvo (combate.defesaContra: a janela de reação do dono; pelo NPC, o mestre rola), a ligação e o
// cartão. As conferências do cliente valem de novo aqui.
async function resolverJackIn(ator, pedido, usuario) {
  const [meu, alvo] = await Promise.all([pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!alvo?.actor || !temNeuroport(alvo.actor) || neuroportDe(ator).ligacoes.some(item => item.alvo === alvo.uuid)) return null;
  if (pedeOFirewall(ator.system.rankDeInterface) && !passouOFirewall(pedido.firewall)) return null;
  if (bloqueioDoAlvo(neuroportDe(ator).bloqueios, alvo.uuid, game.time.worldTime) || !await gastarAcaoNet(ator, usuario)) return null;
  const nome = meu?.name ?? ator.name;
  // O alvo netrunner sempre sabe (a wiki): sem a resistência.
  const sabe = sabeDoJackIn(alvo.actor.system.rankDeInterface);
  const { resposta, notas } = sabe ? { resposta: null, notas: [] }
    : await defesaContra({ atacante: ator, tokenAtq: meu, alvo, total: pedido.total, modo: 'jackin', rotulo: 'Jack In', descricao: 'Interface + 1d10', opcoes: ['vontade'] });
  if (!equipamentoOperante(ator, alvo.actor)) return null;
  const defesa = resposta?.defesa ?? null;
  const percebido = sabe || defesa === null || percebeuOJackIn(pedido.total, defesa);
  await mostrarTotal(pedido);
  await gravar(ator, alvo, { ligacao: { alvo: alvo.uuid, nome: alvo.name, percebido }, invasor: { netrunner: ator.uuid, nome, percebido } });
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = sabe ? `Jack In ${pedido.total}` : `${pedido.total} contra ${defesa ?? '—'}`;
  const frase = sabe ? `${a} entrou no Neuroport de ${b} (${conta}), mas ${b} é netrunner e sempre sabe.`
    : percebido ? `${a} entrou no Neuroport de ${b} (${conta}), mas ${b} percebeu.` : `${a} entrou no Neuroport de ${b} (${conta}) sem ser percebido.`;
  return cartao({ ator, alvo: alvo.actor, percebido, falante: nome, frase, notas, resumo: { resultado: percebido ? 'percebido' : 'entrou', ataque: pedido.total, defesa, netrunner: nome, alvo: alvo.name } });
}

// O firewall de fábrica que barrou o Jack In: a Ação NET gasta (em combate), e o cartão só ao mestre e aos donos do
// netrunner (o alvo não sabe).
async function resolverFirewall(ator, pedido, usuario) {
  const [meu, alvo] = await Promise.all([pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!alvo?.actor || !temNeuroport(alvo.actor) || !pedeOFirewall(ator.system.rankDeInterface) || passouOFirewall(pedido.total)) return null;
  if (!await gastarAcaoNet(ator, usuario)) return null;
  const nome = meu?.name ?? ator.name;
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  return cartao({
    ator, alvo: alvo.actor, percebido: false, falante: nome, frase: `${a} não passou o firewall de fábrica do Neuroport de ${b} (${pedido.total} contra DV ${FIREWALL_DE_FABRICA.dv}), e ${b} não percebe.`,
    resumo: { resultado: 'firewall', total: pedido.total, dv: FIREWALL_DE_FABRICA.dv, netrunner: nome, alvo: alvo.name }
  });
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
async function resolverBreach(ator, pedido, usuario) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === pedido.alvo);
  const alvo = await fromUuid(pedido.alvo);
  if (!ligacao || !alvo?.actor) return null;
  const { quantos, dv } = passwallsDoAlvo(selfIcesDe(alvo.actor));
  const antes = passwallsPassados(ligacao, quantos);
  if (antes >= quantos || !await gastarAcaoNet(ator, usuario)) return null;
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

// O que o quickhack faz quando dá certo (regras.EFEITOS_DE_QUICKHACK; a decisão do usuário: o sistema aplica o que é
// número). Os que duram "60 segundos (20 rodadas)" o Foundry acaba sozinho, pela duração do efeito:
// - Synapse Burnout: 3d6 direto no HP (sem a armadura e sem ablar);
// - Overheat: o fogo (o status "Em chamas"), 4 no HP no fim de cada turno do alvo (netrun/index.mjs), até ele apagar;
// - Impair Movement e Slow: o MOVE cai 1 e 1d6 (a mudança no MOVE);
// - System Reset: inconsciente, ou até sofrer dano (acordarComODano), e caído;
// - os outros: o cartão com o efeito, para o mestre narrar.
async function efeitoDoQuickhack(id, item, alvo, falante) {
  const regra = EFEITOS_DE_QUICKHACK[id.split(':')[1]] ?? {};
  const duracao = regra.rodadas ? { duration: { value: regra.rodadas, units: 'rounds' } } : {};
  const rolar = async (formula, rotulo) => {
    const rolagem = await new Roll(formula).evaluate();
    await rolagem.toMessage({ speaker: { alias: falante }, flavor: `${item.name} em ${alvo.name}: ${rotulo}` });
    return rolagem.total;
  };
  if (regra.dano) {
    const dano = await rolar(regra.dano, `${regra.dano} direto no HP`);
    const hpAntes = alvo.actor.system.hp.value;
    await alvo.actor.update({ 'system.hp.value': hpAntes - dano });
    return { dano, texto: `${dano} de dano direto no HP de ${alvo.name}, sem a armadura (${hpAntes} → ${alvo.actor.system.hp.value}).` };
  }
  if (regra.fogo) {
    if (!alvo.actor.statuses.has(STATUS_EM_CHAMAS)) {
      const efeito = await ActiveEffect.implementation.fromStatusEffect(STATUS_EM_CHAMAS, { parent: alvo.actor });
      efeito.updateSource({ [`flags.${SISTEMA}`]: { fogo: { dano: regra.fogo, de: item.name }, quickhack: id } });
      await ActiveEffect.implementation.create(efeito.toObject(), { parent: alvo.actor, keepId: true });
    }
    return { texto: `${alvo.name} pegou fogo: ${regra.fogo} de dano direto no HP no fim de cada turno dele, até apagar o fogo (uma Ação, no turno dele).` };
  }
  if (regra.move) {
    const quanto = /^\d+$/.test(regra.move) ? Number(regra.move) : await rolar(regra.move, `MOVE −${regra.move}`);
    await ActiveEffect.implementation.create({
      name: `${item.name}: MOVE −${quanto}`, img: iconeDoEfeito('penalidade'), ...duracao, flags: { [SISTEMA]: { quickhack: id } },
      system: { changes: [{ key: 'system.atributos.move.valor', type: 'add', value: String(-quanto), phase: 'initial', priority: null }] }
    }, { parent: alvo.actor });
    return { move: quanto, texto: `O MOVE de ${alvo.name} cai ${quanto} por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação de Movimento.` };
  }
  if (regra.inconsciente) {
    const efeito = await ActiveEffect.implementation.fromStatusEffect('unconscious', { parent: alvo.actor });
    efeito.updateSource({ name: `${item.name}: inconsciente`, ...duracao, [`flags.${SISTEMA}`]: { quickhack: id, ateDano: regra.ateDano } });
    await ActiveEffect.implementation.create(efeito.toObject(), { parent: alvo.actor });
    if (regra.caido) await alvo.actor.toggleStatusEffect('prone', { active: true });
    return { texto: `${alvo.name} cai inconsciente por 60 segundos (20 rodadas), ou até sofrer dano, e fica caído.` };
  }
  const efeito = String(item.system.descricao ?? '').split('</p>')[1]?.replace(/<[^>]+>/g, '').trim();
  return { texto: `O mestre aplica: ${efeito || item.name}` };
}

// O System Reset acaba quando o alvo sofre dano (o HP cai): no cliente que muda o HP (o gancho do preUpdateActor, que
// ainda vê o HP de antes; quem muda o ator pode apagar o efeito dele).
function acordarComODano(ator, mudancas) {
  const hp = foundry.utils.getProperty(mudancas, 'system.hp.value');
  if (hp === undefined || !(Number(ator.system.hp.value) > Number(hp))) return;
  const efeitos = ator.effects.filter(efeito => efeito.getFlag(SISTEMA, 'ateDano')).map(efeito => efeito.id);
  if (efeitos.length) ator.deleteEmbeddedDocuments('ActiveEffect', efeitos).catch(erro => console.error(`${SISTEMA} | System Reset`, erro));
}

// O quickhack: as conferências de novo; a vez (a rodada) fica marcada, certo ou errado; o que deu certo alerta o alvo
// (os dois lados da ligação passam a "percebido"), menos o que não alerta.
async function resolverQuickhack(ator, pedido, usuario) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === pedido.alvo);
  const alvo = await fromUuid(pedido.alvo);
  if (!ligacao || !alvo?.actor) return null;
  const { quantos } = passwallsDoAlvo(selfIcesDe(alvo.actor));
  const agora = agoraDe(ator);
  if (passwallsPassados(ligacao, quantos) < quantos || jaFezOQuickhack(ligacao.ultimoQuickhack, agora)) return null;
  const item = (await game.system.api.wiki.carregarCatalogo())[pedido.id];
  const nivel = item?.flags?.[SISTEMA]?.quickhack;
  if (!nivel || !fazOQuickhack(ator.system.rankDeInterface, nivel.rank) || !equipamentoOperante(ator, alvo.actor) || !await gastarAcaoNet(ator, usuario)) return null;
  const passou = passouOQuickhack(pedido.total, nivel.dv);
  const alertou = passou && nivel.alerta;
  const percebido = ligacao.percebido || alertou;
  const meu = neuroportDe(ator);
  await ator.setFlag(SISTEMA, FLAG, { ...meu, ligacoes: meu.ligacoes.map(outra => (outra.alvo === pedido.alvo ? { ...outra, ultimoQuickhack: agora, percebido } : outra)) });
  if (alertou) {
    const dele = neuroportDe(alvo.actor);
    await alvo.actor.setFlag(SISTEMA, FLAG, { ...dele, invasores: dele.invasores.map(invasor => (invasor.netrunner === ator.uuid ? { ...invasor, percebido: true } : invasor)) });
  }
  const nome = tokenNaCena(ator, alvo.parent)?.name ?? ator.name;
  const efeito = passou ? await efeitoDoQuickhack(pedido.id, item, alvo, nome) : null;
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${pedido.total} contra DV ${nivel.dv}`;
  const frase = passou
    ? `${a} fez o ${esc(item.name)} em ${b} (${conta})${alertou ? `, e ${b} percebeu` : ' sem alertar o alvo'}.`
    : `${a} não conseguiu o ${esc(item.name)} em ${b} (${conta}).`;
  return cartao({
    ator, alvo: alvo.actor, percebido, falante: nome, frase, notas: efeito ? [efeito.texto] : [],
    resumo: { resultado: passou ? 'quickhack' : 'falhou', quickhack: item.name, total: pedido.total, dv: nivel.dv, alertou, dano: efeito?.dano ?? null, netrunner: nome, alvo: alvo.name }
  });
}

// A expulsão: a Interface do netrunner pela janela de reação do dono dele (pelo NPC, o mestre rola); expulso (o empate é
// do netrunner; sem a defesa, sai), é o Jack Out inseguro. As conferências do cliente valem de novo aqui.
async function resolverExpulsar(ator, pedido) {
  const invasor = neuroportDe(ator).invasores.find(item => item.netrunner === pedido.netrunner);
  const netrunner = await fromUuid(pedido.netrunner);
  if (!invasor?.percebido || !netrunner) return null;
  // A ligação do netrunner neste alvo (pelo token marcado no Jack In) e o token do netrunner na mesma cena.
  const ligacao = neuroportDe(netrunner).ligacoes.find(item => fromUuidSync(item.alvo)?.actor === ator);
  const alvo = ligacao ? await fromUuid(ligacao.alvo) : null;
  const meu = alvo ? tokenNaCena(netrunner, alvo.parent) : null;
  if (!meu) return null;
  const { resposta, notas } = await defesaContra({ atacante: ator, tokenAtq: alvo, alvo: meu, total: pedido.total, modo: 'expulsar', rotulo: 'Expulsar', descricao: 'WILL + Concentração + 1d10', opcoes: ['interface'] });
  const defesa = resposta?.defesa ?? null;
  const fora = defesa === null || expulsou(pedido.total, defesa);
  await mostrarTotal(pedido);
  const quedas = fora ? await desligarInseguro(netrunner, alvo) : [];
  const [a, b] = [alvo.name, meu.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${pedido.total} contra ${defesa ?? '—'}`;
  const frase = fora ? `${a} expulsou ${b} do Neuroport dele (${conta}).` : `${a} não conseguiu expulsar ${b} do Neuroport dele (${conta}).`;
  return cartao({
    ator: netrunner, alvo: ator, percebido: true, falante: alvo.name, frase, notas: [...notas, ...quedas],
    resumo: { resultado: fora ? 'expulso' : 'resistiu', ataque: pedido.total, defesa, netrunner: meu.name, alvo: alvo.name }
  });
}

// O sim do dono do alvo para a conexão direta: a janela pelo socket (combate.pedir), ou a do mestre, pelo NPC. Sem
// resposta no tempo, não.
async function aceitaADireta(alvo, nome) {
  const texto = `<b>${esc(nome)}</b> quer se ligar direto ao Neuroport de <b>${esc(alvo.name)}</b> pelo Personal Link (o cabo). Aceita?`;
  const dono = jogadorDe(alvo.actor);
  if (dono) return Boolean((await pedirAoDono(dono, 'consentir', { titulo: 'Conexão direta no seu Neuroport', texto }))?.aceitou);
  const resposta = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Conexão direta em ${alvo.name}` }, classes: [SISTEMA, 'consentir'], content: `<p>${texto}</p>`, rejectClose: false,
    yes: { label: 'Aceitar' }, no: { label: 'Recusar' }
  }).catch(() => null);
  return resposta === true;
}

// A conexão direta: as conferências de novo (a 2 m pelo destino dos tokens); com o alvo inconsciente ou agarrado, liga;
// senão, o dono aceita ou não. Ligada, os Passwalls ficam passados, e o alvo acordado sabe.
async function resolverDireta(ator, pedido, usuario) {
  const [meu, alvo] = await Promise.all([pedido.token, pedido.alvo].map(uuid => (uuid ? fromUuid(uuid) : null)));
  if (!meu || !alvo?.actor || !temNeuroport(alvo.actor) || neuroportDe(ator).ligacoes.some(item => item.alvo === alvo.uuid)) return null;
  if (pedeOFirewall(ator.system.rankDeInterface) && !passouOFirewall(pedido.firewall)) return null;
  if (bloqueioDoAlvo(neuroportDe(ator).bloqueios, alvo.uuid, game.time.worldTime)) return null;
  const longe = distancia(noDestino(meu), noDestino(alvo));
  if (longe === null || longe > CONEXAO_DIRETA.alcance + 0.01 || !await gastarAcaoNet(ator, usuario)) return null;
  const [a, b] = [meu.name, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  const inconsciente = alvo.actor.statuses.has('unconscious');
  let como = inconsciente ? 'inconsciente' : alvo.actor.statuses.has(STATUS_AGARRAO.agarrado) ? 'agarrado' : null;
  if (!como) {
    if (!await aceitaADireta(alvo, meu.name)) {
      return cartao({ ator, alvo: alvo.actor, percebido: true, falante: meu.name, frase: `${b} não aceitou a conexão direta de ${a}.`, resumo: { resultado: 'recusou', netrunner: meu.name, alvo: alvo.name } });
    }
    como = 'aceitou';
  }
  if (!equipamentoOperante(ator, alvo.actor)) return null;
  const percebido = !inconsciente;
  const { quantos } = passwallsDoAlvo(selfIcesDe(alvo.actor));
  await gravar(ator, alvo, { ligacao: { alvo: alvo.uuid, nome: alvo.name, percebido, direta: true, passados: quantos }, invasor: { netrunner: ator.uuid, nome: meu.name, percebido, direta: true } });
  const porque = { inconsciente: `${b} está inconsciente e não percebe`, agarrado: `${b} está agarrado e percebe`, aceitou: `${b} aceitou` }[como];
  return cartao({
    ator, alvo: alvo.actor, percebido, falante: meu.name, frase: `${a} se ligou direto ao Neuroport de ${b} pelo Personal Link (${porque}).`,
    notas: ['Conexão direta: uma Ação NET a mais por turno e os Passwalls passados; a mais de 2 m, ou com o cabo arrancado, cai à força.'],
    resumo: { resultado: 'direta', como, percebido, netrunner: meu.name, alvo: alvo.name }
  });
}

// O cabo arrancado (pelo alvo, ou pelo mestre): o netrunner ligado direto cai à força (o Jack Out inseguro).
async function resolverCabo(ator, pedido) {
  const invasor = neuroportDe(ator).invasores.find(item => item.netrunner === pedido.netrunner);
  const netrunner = await fromUuid(pedido.netrunner);
  if (!invasor?.direta || !netrunner) return null;
  const ligacao = neuroportDe(netrunner).ligacoes.find(item => item.direta && fromUuidSync(item.alvo)?.actor === ator);
  const alvo = ligacao ? await fromUuid(ligacao.alvo) : null;
  if (!alvo) return null;
  const quedas = await desligarInseguro(netrunner, alvo);
  const nome = tokenNaCena(netrunner, alvo.parent)?.name ?? netrunner.name;
  const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
  return cartao({
    ator: netrunner, alvo: ator, percebido: true, falante: alvo.name, frase: `${b} arrancou o cabo do Personal Link: ${a} caiu do Neuroport dele.`,
    notas: quedas, resumo: { resultado: 'inseguro', motivo: 'cabo', netrunner: nome, alvo: alvo.name }
  });
}

const RESOLVER = {
  jackin: resolverJackIn, firewall: resolverFirewall, direta: resolverDireta, cabo: resolverCabo, jackout: resolverJackOut, breach: resolverBreach, quickhack: resolverQuickhack, expulsar: resolverExpulsar
};

// Fora do alcance do deck (o netrunner ou o alvo andou): o Jack Out inseguro de cada ligação desse token, com o cartão.
// A conta usa o destino (o _source): enquanto o token anda, o x e o y ainda são os de antes (a lição do ciclo 95).
const noDestino = token => ({ parent: token.parent, x: token._source.x, y: token._source.y, width: token._source.width, height: token._source.height, elevation: token._source.elevation });
async function conferirAlcance(token) {
  const ator = token.actor;
  if (!ator) return;
  const pares = [];
  // O netrunner que andou: os alvos dele nesta cena.
  for (const ligacao of neuroportDe(ator).ligacoes) {
    const alvo = fromUuidSync(ligacao.alvo);
    if (alvo?.actor && alvo.parent === token.parent) pares.push([ator, token, alvo, ligacao]);
  }
  // O alvo que andou: os netrunners no Neuroport dele.
  for (const invasor of neuroportDe(ator).invasores) {
    const netrunner = fromUuidSync(invasor.netrunner);
    const ligacao = netrunner && neuroportDe(netrunner).ligacoes.find(item => item.alvo === token.uuid);
    const meu = ligacao ? tokenNaCena(netrunner, token.parent) : null;
    if (meu) pares.push([netrunner, meu, token, ligacao]);
  }
  for (const [netrunner, meu, alvo, ligacao] of pares) {
    const alcance = alcanceDaLigacao(ligacao, netrunnerDo(netrunner));
    const longe = distancia(noDestino(meu), noDestino(alvo));
    if (longe === null || longe <= alcance + 0.01) continue;
    const quedas = await desligarInseguro(netrunner, alvo);
    const [a, b] = [meu.name, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
    await cartao({
      ator: netrunner, alvo: alvo.actor, percebido: ligacao.percebido, falante: meu.name, frase: `${a} saiu do alcance do Neuroport de ${b} (${longe} m; alcance ${alcance} m).`,
      notas: quedas, resumo: { resultado: 'inseguro', metros: longe, netrunner: meu.name, alvo: alvo.name }
    });
  }
}

// O alvo que morreu (o status de derrotado, o do Death Save que falhou): quem estava no Neuroport dele cai (o Jack Out
// inseguro), com o cartão.
async function alvoMorreu(ator) {
  for (const invasor of neuroportDe(ator).invasores) {
    const netrunner = fromUuidSync(invasor.netrunner);
    const ligacao = netrunner ? neuroportDe(netrunner).ligacoes.find(item => fromUuidSync(item.alvo)?.actor === ator) : null;
    const alvo = ligacao ? fromUuidSync(ligacao.alvo) : null;
    if (!alvo) continue;
    const quedas = await desligarInseguro(netrunner, alvo);
    const nome = tokenNaCena(netrunner, alvo.parent)?.name ?? netrunner.name;
    const [a, b] = [nome, alvo.name].map(texto => `<b>${esc(texto)}</b>`);
    await cartao({
      ator: netrunner, alvo: ator, percebido: ligacao.percebido, falante: nome, frase: `${a} caiu do Neuroport de ${b}: ${b} morreu.`,
      notas: quedas, resumo: { resultado: 'inseguro', motivo: 'morreu', netrunner: nome, alvo: alvo.name }
    });
  }
}

// O token que saiu da cena: as ligações que ficaram sem o alvo, ou sem o netrunner na cena do alvo, caem (com o cartão
// ao netrunner que ficou), e os invasores sem a ligação de volta saem do alvo.
async function limparLigacoes(cena) {
  const atores = new Set([...game.actors, ...cena.tokens.map(token => token.actor).filter(Boolean)]);
  for (const ator of atores) {
    for (const ligacao of neuroportDe(ator).ligacoes) {
      const alvo = fromUuidSync(ligacao.alvo);
      if (alvo?.actor && tokenNaCena(ator, alvo.parent)) continue;
      if (alvo?.actor) await gravar(ator, alvo, {});
      else await ator.setFlag(SISTEMA, FLAG, { ...neuroportDe(ator), ligacoes: neuroportDe(ator).ligacoes.filter(item => item.alvo !== ligacao.alvo) });
      const [a, b] = [ator.name, ligacao.nome].map(texto => `<b>${esc(texto)}</b>`);
      await cartao({
        ator, alvo: alvo?.actor ?? null, percebido: ligacao.percebido, falante: ator.name, frase: `${a} caiu do Neuroport de ${b}: ${alvo?.actor ? a : b} saiu da cena.`,
        resumo: { resultado: 'inseguro', motivo: 'cena', netrunner: ator.name, alvo: ligacao.nome }
      });
    }
  }
  for (const ator of atores) {
    const { invasores } = neuroportDe(ator);
    const ficam = invasores.filter(invasor => {
      const netrunner = fromUuidSync(invasor.netrunner);
      return netrunner && neuroportDe(netrunner).ligacoes.some(item => fromUuidSync(item.alvo)?.actor === ator);
    });
    if (ficam.length !== invasores.length) await ator.setFlag(SISTEMA, FLAG, { ...neuroportDe(ator), invasores: ficam });
  }
}

export function registrarNeuroport() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'neuroport' || !souOMestreAtivo()) return;
    naFila(() => resolver(mensagem.acao, mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | Neuroport`, erro));
  });
  Hooks.on('preUpdateActor', acordarComODano);
  Hooks.on('updateToken', (token, mudancas) => {
    if (!souOMestreAtivo() || !['x', 'y', 'elevation'].some(chave => chave in mudancas)) return;
    naFila(() => conferirAlcance(token)).catch(erro => console.error(`${SISTEMA} | Neuroport: o alcance`, erro));
  });
  Hooks.on('createActiveEffect', efeito => {
    if (!souOMestreAtivo() || efeito.parent?.documentName !== 'Actor' || !efeito.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return;
    naFila(() => alvoMorreu(efeito.parent)).catch(erro => console.error(`${SISTEMA} | Neuroport: o alvo morreu`, erro));
  });
  Hooks.on('deleteToken', token => {
    if (souOMestreAtivo() && token.parent) naFila(() => limparLigacoes(token.parent)).catch(erro => console.error(`${SISTEMA} | Neuroport: o token saiu`, erro));
  });
}
