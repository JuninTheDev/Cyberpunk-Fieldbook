// O Neuroport (a NET de 2077, o C9 do ROADMAP; a wiki, "Quickhacks no Neuroport", Kit p. 16–17 e 26–27): o netrunner
// entra no Neuroport de um alvo à vista, no alcance do deck, e de lá passa os Passwalls (o Breach) e faz os quickhacks; o
// alvo que percebeu tenta expulsá-lo. As Ações NET fora da arquitetura são a próxima parte do C9. Por enquanto:
// - Jack In: Interface + 1d10 contra a WILL + 1d10 do alvo. O alvo resiste pela janela de reação do dono, como no
//   agarrão (a decisão do usuário de 2026-10-17: "rolagens e efeitos simples"); pelo NPC, o mestre rola. Falhando (o
//   empate é do alvo), entra assim mesmo, mas o alvo percebe; o alvo netrunner sempre percebe, sem rolar. Cada Neuroport
//   é uma Ação NET, e dá para ficar ligado em quantos quiser (a conta das Ações NET fora da arquitetura é outra parte);
// - Jack Out: sai do Neuroport do alvo com segurança;
// - Breach: passa um Passwall do alvo (um por Self-ICE, até 3; a DV de todos é 6, 8 ou 10, pelo número), Interface (a
//   habilidade Breach) + 1d10 contra a DV. Passa um por vez; o quickhack só vem depois de todos (ligacao.passados);
// - Quickhack: com os Passwalls passados, um dos do Rank do netrunner (o catálogo: os 11 do Kit e os 5 do suplemento que
//   a mesa aprovou), a habilidade Quickhack + 1d10 contra a DV dele; um por alvo por rodada de combate. O que deu certo
//   alerta o alvo (menos o Lure e os que o cartão diz que não). O sistema aplica o que é número (efeitoDoQuickhack: o
//   dano do Synapse Burnout, o fogo do Overheat, o MOVE do Impair Movement e do Slow, o System Reset); o resto vai ao
//   cartão, e o mestre narra;
// - Expulsar: o alvo que percebeu, com uma Ação, WILL + Concentração + 1d10 contra a Interface + 1d10 do netrunner (o
//   empate é do netrunner); expulso, a ligação some dos dois lados.
// A ligação fica nas flags dos dois atores, que o mestre ativo grava: no netrunner, neuroport.ligacoes ([{ alvo: o uuid do
// token, nome, percebido }]); no alvo, neuroport.invasores ([{ netrunner: o uuid do ator, nome, percebido }]). A ficha do
// netrunner mostra as dele; a do alvo, as que ele percebeu (o mestre vê todas).
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { centroDe, combateDe, defesaContra, distancia, naFila, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import { alcanceDoJackIn, EFEITOS_DE_QUICKHACK, expulsou, fazOQuickhack, jaFezOQuickhack, passouOPasswall, passouOQuickhack, passwallsDoAlvo, percebeuOJackIn, sabeDoJackIn } from './regras.mjs';
import { STATUS_EM_CHAMAS } from './netrun/constantes.mjs';
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

// A rodada do combate em que o netrunner está (para o "um quickhack por alvo por turno"); fora de combate, null.
const agoraDe = ator => {
  const combate = combateDe(ator);
  return combate ? { combate: combate.id, rodada: combate.round } : null;
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
  const { quantos } = passwallsDoAlvo(selfIcesDe(fromUuidSync(alvo)?.actor));
  if ((ligacao.passados ?? 0) < quantos) return avisar(`Passe antes os Passwalls de ${ligacao.nome} (o Breach).`);
  if (jaFezOQuickhack(ligacao.ultimoQuickhack, agoraDe(ator))) return avisar(`Um quickhack por alvo por turno: ${ator.name} já tentou um em ${ligacao.nome} nesta rodada.`);
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  const lista = await quickhacksDe(ator);
  const id = escolha ?? await escolherQuickhack(ator, ligacao, lista);
  const escolhido = lista.find(item => item.id === id);
  if (!escolhido) return null;
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
  // O alvo netrunner sempre sabe (a wiki): sem a resistência.
  const sabe = sabeDoJackIn(alvo.actor.system.rankDeInterface);
  const { resposta, notas } = sabe ? { resposta: null, notas: [] }
    : await defesaContra({ atacante: ator, tokenAtq: meu, alvo, total: pedido.total, modo: 'jackin', rotulo: 'Jack In', descricao: 'Interface + 1d10', opcoes: ['vontade'] });
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
      name: `${item.name}: MOVE −${quanto}`, img: 'icons/svg/downgrade.svg', ...duracao, flags: { [SISTEMA]: { quickhack: id } },
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
async function resolverQuickhack(ator, pedido) {
  const ligacao = neuroportDe(ator).ligacoes.find(item => item.alvo === pedido.alvo);
  const alvo = await fromUuid(pedido.alvo);
  if (!ligacao || !alvo?.actor) return null;
  const { quantos } = passwallsDoAlvo(selfIcesDe(alvo.actor));
  const agora = agoraDe(ator);
  if ((ligacao.passados ?? 0) < quantos || jaFezOQuickhack(ligacao.ultimoQuickhack, agora)) return null;
  const item = (await game.system.api.wiki.carregarCatalogo())[pedido.id];
  const nivel = item?.flags?.[SISTEMA]?.quickhack;
  if (!nivel || !fazOQuickhack(ator.system.rankDeInterface, nivel.rank)) return null;
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
// do netrunner; sem a defesa, sai), a ligação some dos dois lados. As conferências do cliente valem de novo aqui.
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
  if (fora) await gravar(netrunner, alvo, {});
  const [a, b] = [alvo.name, meu.name].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${pedido.total} contra ${defesa ?? '—'}`;
  const frase = fora ? `${a} expulsou ${b} do Neuroport dele (${conta}).` : `${a} não conseguiu expulsar ${b} do Neuroport dele (${conta}).`;
  return cartao({ ator: netrunner, alvo: ator, percebido: true, falante: alvo.name, frase, notas, resumo: { resultado: fora ? 'expulso' : 'resistiu', ataque: pedido.total, defesa, netrunner: meu.name, alvo: alvo.name } });
}

const RESOLVER = { jackin: resolverJackIn, jackout: resolverJackOut, breach: resolverBreach, quickhack: resolverQuickhack, expulsar: resolverExpulsar };

export function registrarNeuroport() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'neuroport' || !souOMestreAtivo()) return;
    naFila(() => resolver(mensagem.acao, mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | Neuroport`, erro));
  });
  Hooks.on('preUpdateActor', acordarComODano);
}
