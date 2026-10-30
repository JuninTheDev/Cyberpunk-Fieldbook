// Os movimentos especiais das Artes Marciais (o C10, parte 2; a wiki, "Movimentos de artes marciais", p. 178–180). A
// decisão do usuário (2026-10-19): a rolagem e o efeito automáticos; o sistema confere a WILL, o MOVE, o agarrão e o
// "caído", e o jogador confirma o requisito "neste turno".
// - Os testes contra a DV vão como o agarrão (agarrao.mjs): quem age rola DEX + a forma + 1d10 na ficha, e o mestre
//   ativo aplica o efeito e manda o cartão.
// - Os golpes (Golpe quebra-ossos, Ponto de pressão e Voadora) são ataques com a arma de Artes Marciais: o fluxo do
//   ataque (combate.mjs) põe a lesão ou a queda no acerto, e o "Desfazer" do cartão as tira.
import { SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { config } from './configuracoes.mjs';
import { destinatarios, distancia, naFila, souOMestreAtivo, tokenNaCena } from './combate.mjs';
import { lesaoCritica } from './lesoes.mjs';
import { tomarObjeto } from './agarrao.mjs';
import { FAMILIA_ARTES_MARCIAIS, FORMAS_DAS_ARTES_MARCIAIS, formaDaPericia, LESOES_DOS_GOLPES, MOVIMENTOS, movimentosDisponiveis, passouNoMovimento } from './regras.mjs';

const CANAL = `system.${SISTEMA}`;
const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const avisar = texto => { ui.notifications.warn(texto); return null; };
const SEM_MESTRE = 'Sem mestre na mesa: o movimento precisa do mestre para o efeito.';
const efeitoDoAgarrao = (ator, papel) => ator?.effects.find(e => e.statuses.has(STATUS_AGARRAO[papel])) ?? null;

// As formas do ator (as perícias da família Artes Marciais) e os movimentos que ele pode usar (regras.movimentosDisponiveis).
export function formasDe(ator) {
  return Object.entries(ator?.system.pericias ?? {}).filter(([, p]) => p.familia === FAMILIA_ARTES_MARCIAIS)
    .map(([id, p]) => ({ forma: formaDaPericia({ id, nome: p.nome }), pericia: id, nivel: p.nivel }));
}
export function movimentosDe(ator) {
  const a = ator?.system.atributos;
  return a ? movimentosDisponiveis(formasDe(ator), { will: a.will.valor, move: a.move.valor }) : [];
}

// A arma de Artes Marciais do ator para o golpe: a da forma do movimento, ou a da família toda.
const armaDeArtesMarciais = (ator, pericia) => {
  const armas = ator.items.filter(item => item.type === 'arma' && item.system.tipo === 'martialArts');
  return armas.find(arma => arma.system.pericia === pericia) ?? armas.find(arma => arma.system.pericia === FAMILIA_ARTES_MARCIAIS) ?? armas[0] ?? null;
};

// O requisito "neste turno" (e, no Desarme combinado, se o objeto fica com quem desarma ou cai): o jogador confirma.
async function perguntarRequisito(m) {
  const destino = m.id === 'desarmeCombinado'
    ? '<p><label><input type="radio" name="destino" value="ficar" checked> O objeto fica com você</label> <label><input type="radio" name="destino" value="cair"> O objeto cai</label></p>' : '';
  const resposta = await DialogV2.wait({
    window: { title: m.nome }, classes: [SISTEMA, 'movimento'],
    content: `<p><b>Requisito:</b> ${esc(m.confirmar)}</p><p>${esc(m.efeito)}</p>${destino}`,
    buttons: [
      { action: 'sim', label: 'Aconteceu', default: true, callback: (evento, botao) => ({ confirmado: true, ficar: botao.form.elements.destino?.value !== 'cair' }) },
      { action: 'nao', label: 'Cancelar', callback: () => null }
    ],
    rejectClose: false
  }).catch(() => null);
  return resposta && typeof resposta === 'object' ? resposta : null;
}

// Usar um movimento (o botão da aba Combate). alvo: o token (padrão, o marcado, T). confirmado: o requisito "neste turno"
// já confirmado (a macro, o teste); null pergunta. ficar: no Desarme combinado, o objeto fica com quem desarma (padrão)
// ou cai. local: nos golpes, "cabeca" é o mirado (−8).
export async function usarMovimento(ator, id, { alvo = null, perguntar = false, confirmado = null, ficar = true, local = 'corpo' } = {}) {
  const base = MOVIMENTOS[id];
  if (!base) return avisar(`Movimento desconhecido: ${id}.`);
  const m = movimentosDe(ator).find(mov => mov.id === id);
  if (!m) return avisar(`${ator.name}: ${base.nome} pede pelo menos 1 ponto em ${base.forma ? `Artes Marciais (${FORMAS_DAS_ARTES_MARCIAIS[base.forma]})` : 'uma forma de Artes Marciais'}.`);
  if (m.bloqueio) return avisar(`${ator.name}: ${m.nome}. ${m.bloqueio}`);
  if (m.caido && !ator.statuses.has('prone')) return avisar(`${ator.name} não está caído: a Recuperação é para se levantar.`);
  const precisaDeAlvo = m.alvo || m.teste === 'ataque';
  const marcados = alvo ? [alvo] : [...game.user.targets];
  const token = precisaDeAlvo && marcados.length === 1 ? (marcados[0].document ?? marcados[0]) : null;
  if (precisaDeAlvo && !['personagem', 'capanga'].includes(token?.actor?.type)) return avisar('Marque um alvo (tecla T sobre o token), um só.');
  if (token?.actor === ator) return avisar('O movimento é contra outra pessoa.');
  const agarrao = m.agarrao ? efeitoDoAgarrao(ator, m.agarrao)?.getFlag(SISTEMA, 'agarrao') : null;
  if (m.agarrao && !agarrao?.outro) return avisar(m.agarrao === 'agarrando' ? `${ator.name} não está agarrando ninguém (a marca posta à mão não diz quem).` : `${ator.name} não está agarrado por ninguém (a marca posta à mão não diz quem segura).`);
  if (id === 'apertoDeFerro') {
    const outro = await fromUuid(agarrao.outro);
    if (efeitoDoAgarrao(outro, 'agarrado')?.getFlag(SISTEMA, 'agarrao')?.apertoDeFerro) return avisar(`${outro.name} já está no Aperto de ferro.`);
  }
  if (!game.user.isGM && !game.users.activeGM) return avisar(SEM_MESTRE);
  // A Voadora: o alvo a até 4 m, com os dois tokens na mesma cena.
  if (m.alcance && token) {
    const meu = tokenNaCena(ator, token.parent);
    const metros = meu ? distancia(meu, token) : null;
    if (metros !== null && metros > m.alcance) return avisar(`${m.nome}: ${token.name} está a ${metros} m; a Voadora alcança até ${m.alcance} m.`);
  }
  let escolha = { confirmado, ficar };
  if (m.confirmar && confirmado === null) {
    escolha = await perguntarRequisito(m);
    if (!escolha) return null;
  }
  if (m.confirmar && !escolha.confirmado) return avisar(`${m.nome} pede: ${m.confirmar}`);
  if (m.teste === 'ataque') {
    const arma = armaDeArtesMarciais(ator, m.pericia);
    if (!arma) return avisar(`${ator.name}: ${m.nome} é um golpe de Artes Marciais. Ponha na ficha a arma "Martial Arts" (o compêndio de armas).`);
    return arma.atacar({ alvo: token, local, perguntar, movimento: id, pericia: m.pericia });
  }
  // O teste do movimento é do fluxo do combate: fica público, fora do modo do seletor do chat (o C33).
  const teste = await ator.rolarPericia(m.pericia, { perguntar, rotulo: `${m.nome} (${m.nomeDaForma})`, sabor: `DV ${m.teste.dv}`, dados: { movimento: id }, categoria: 'ataque', modo: 'public' });
  if (!teste) return null;
  return pedirAoMestre({ id, ator: ator.uuid, alvo: token?.uuid ?? null, total: teste.total, ficar: escolha.ficar !== false });
}

// ---------------- No mestre ativo ----------------
function pedirAoMestre(pedido) {
  if (game.user.isGM) return naFila(() => resolver(pedido, game.user));
  game.socket.emit(CANAL, { tipo: 'artesMarciais', pedido, de: game.user.id });
  return pedido;
}

// O cartão do movimento, para quem vê o cartão do ataque (os donos dos envolvidos, pela configuração). Devolve o resumo.
async function cartao({ usuario, atores, falante, resumo, frase, notas = [] }) {
  const para = destinatarios({ usuario, linhas: atores.filter(Boolean).map(actor => ({ token: { actor } })) });
  await ChatMessage.implementation.create({
    speaker: { alias: falante }, ...(para ? { whisper: para } : {}),
    content: `<div class="${SISTEMA} cartao movimento ${resumo.resultado}"><p>${frase}</p>${notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}</div>`,
    flags: { [SISTEMA]: { movimento: resumo } }
  });
  return resumo;
}

// O efeito de cada movimento que passou. Devolve a frase do cartão (a e b: os nomes, em negrito; conta: o total e a DV).
const EFEITOS = {
  recuperacao: async ({ a, conta }) => `${a} se levantou sem gastar a Ação (${conta}).`,
  // O objeto na mão é o mesmo do "Tomar objeto" do agarrão (agarrao.tomarObjeto).
  desarmeCombinado: async ({ ator, alvo, a, b, conta, pedido, notas }) => {
    const tomado = await tomarObjeto(alvo, ator, { ficar: pedido.ficar });
    if (!tomado) return `${a} desarmou ${b} (${conta}), mas não havia nada na mão dele.`;
    if (!tomado.ficou) return `${a} desarmou ${b} (${conta}): ${esc(tomado.nome)} caiu.`;
    notas.push('Os acessórios instalados e a munição de reserva ficaram com o dono.');
    return `${a} desarmou ${b} (${conta}): ${esc(tomado.nome)} ficou com ${a}.`;
  },
  apertoDeFerro: async ({ ator, a, conta }) => {
    const outro = await fromUuid(efeitoDoAgarrao(ator, 'agarrando').getFlag(SISTEMA, 'agarrao').outro);
    const efeito = efeitoDoAgarrao(outro, 'agarrado');
    await efeito.setFlag(SISTEMA, 'agarrao', { ...efeito.getFlag(SISTEMA, 'agarrao'), apertoDeFerro: true });
    return `${a} aplicou o Aperto de ferro em <b>${esc(outro.name)}</b> (${conta}): −2 a mais para escapar, e nada de ataques à distância enquanto agarrado.`;
  },
  quebraArmadura: async ({ alvo, a, b, conta }) => {
    const item = alvo.items.get(alvo.system.armadura?.corpo?.item);
    if (!item) return `${a} acertou a Combinação quebra-armadura em ${b} (${conta}), mas ${b} não tem armadura no corpo.`;
    const antes = item.system.sp.corpo.value;
    const depois = Math.max(0, antes - 2);
    await item.update({ 'system.sp.corpo.value': depois });
    return `${a} acertou a Combinação quebra-armadura em ${b} (${conta}): ${esc(item.name)} perde 2 SP (${antes} → ${depois}).`;
  },
  contraQueda: async ({ alvo, a, b, conta }) => {
    await alvo.toggleStatusEffect('prone', { active: true });
    return `${a} derrubou ${b} com a Contra-queda (${conta}): não pode ser evitado.`;
  },
  escapeDeAgarrao: async ({ ator, a, conta }) => {
    const efeito = efeitoDoAgarrao(ator, 'agarrado');
    const outro = await fromUuid(efeito.getFlag(SISTEMA, 'agarrao').outro);
    await efeito.delete();
    const modo = config('lesaoCritica');
    const lesao = outro && modo !== 'nao' ? await lesaoCritica(outro, { id: LESOES_DOS_GOLPES.braco, naFicha: modo === 'ficha' }) : null;
    return `${a} escapou do agarrão de <b>${esc(outro?.name ?? '')}</b> (${conta})${lesao ? `, e ${esc(outro.name)} sofre ${esc(lesao.nome)}` : ''}.`;
  }
};

async function resolver(pedido, usuario) {
  const ator = await fromUuid(pedido.ator);
  const m = MOVIMENTOS[pedido.id];
  if (!ator || !m?.teste?.dv || !usuario) return null;
  if (!usuario.isGM && !ator.testUserPermission(usuario, 'OWNER')) return null;
  const token = pedido.alvo ? await fromUuid(pedido.alvo) : null;
  const alvo = token?.actor ?? null;
  const passou = passouNoMovimento(pedido.total, m.teste.dv);
  const nome = tokenNaCena(ator)?.name ?? ator.name;
  const [a, b] = [nome, token?.name ?? ''].map(texto => `<b>${esc(texto)}</b>`);
  const conta = `${pedido.total} contra DV ${m.teste.dv}`;
  const notas = [];
  let frase;
  if (pedido.id === 'recuperacao') await ator.toggleStatusEffect('prone', { active: false });
  if (passou) frase = await EFEITOS[pedido.id]({ ator, alvo, a, b, conta, pedido, notas });
  else if (pedido.id === 'recuperacao') frase = `${a} se levantou, mas gastou a Ação (${conta}).`;
  else frase = `${a} tentou ${esc(m.nome)}${token ? ` em ${b}` : ''} (${conta}): não passou.`;
  const resumo = { movimento: pedido.id, resultado: passou ? 'passou' : 'falhou', total: pedido.total, dv: m.teste.dv, ator: nome, alvo: token?.name ?? '', frase: frase.replace(/<[^>]+>/g, ''), notas };
  return cartao({ usuario, atores: [ator, alvo], falante: nome, frase, notas, resumo });
}

export function registrarArtesMarciais() {
  game.socket.on(CANAL, mensagem => {
    if (mensagem.tipo !== 'artesMarciais' || !souOMestreAtivo()) return;
    naFila(() => resolver(mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | artes marciais`, erro));
  });
}
