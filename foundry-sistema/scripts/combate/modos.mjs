// Resolução do ataque no mestre: defesa de cada alvo, dano e modos individuais ou de área.

import { DEFESAS, SISTEMA } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { TABELAS_DV } from '../gerado.mjs';
import { escolhaDeLesao, lesaoCritica, PERNA_QUEBRADA } from '../lesoes.mjs';
import { aplicarMunicaoSemDano, incendiar, rolarInteligente } from '../municoes.mjs';
import * as R from '../regras.mjs';
import { techAtravessaVidro } from '../regras-veiculos.mjs';
import { rolarDano } from '../rolagens.mjs';
import { STATUS_COBERTURA, STATUS_SUPRIMIDO, ROTULO, precisaRolar, centroDe, combateDe, conferirArmaVeicular, conferirDestinos, destinoEstrutural, destinoVeicular, distancia, esc, jogadorDe } from './apoio.mjs';
import { cartaoDoResultado } from './cartao.mjs';
import { pedir, perguntarDefesa, rolarDefesa, rolarSegundaChance } from './socket.mjs';

const BOTAO = { ...DEFESAS, escudo: 'Escudo', concentrar: 'Rolar Concentração', resistir: 'Resistir', vontade: 'Rolar a Vontade', interface: 'Rolar a Interface' };

// ---------------- No mestre ativo ----------------
async function contexto(pedido, usuario) {
  const arma = await fromUuid(pedido.arma);
  const atacante = arma?.actor;
  if (!atacante || !usuario) return null;
  if (!usuario.isGM && !atacante.testUserPermission(usuario, 'OWNER')) return null;
  const tokenAtq = pedido.token ? await fromUuid(pedido.token) : null;
  const alvos = (await Promise.all(pedido.alvos.map(uuid => fromUuid(uuid)))).filter(token => token?.actor);
  if (!conferirDestinos(alvos, pedido.destinos ?? {}, pedido)) return null;
  return {
    pedido, usuario, arma, atacante, tokenAtq, cena: tokenAtq?.parent ?? alvos[0]?.parent ?? canvas.scene, alvos,
    modo: pedido.modo, local: pedido.local, descricao: R.descreverAtaque(pedido), nomeAtq: tokenAtq?.name ?? atacante.name,
    perfil: arma.perfil2077,
    // devolver: o que o "Desfazer" põe de volta (a carga Tech que o ataque gastou).
    linhas: [], notas: notasDe2077(pedido, arma), rolagens: [], marcas: [], devolver: [...(pedido.carga ? [{ doc: arma.uuid, chave: 'cargaTech', valor: pedido.carga }] : []), ...(pedido.ferrolho ? [{ doc: arma.uuid, chave: 'ferrolhoPendente', valor: null }] : [])],
    lesoesDoAtirador: [], cabecalho: '',
    falhaDaArma: R.falhaDaArma({ qualidade: arma.system.qualidade, efeito: arma.system.falhaCritica, critico: game.messages.get(pedido.mensagem)?.getFlag(SISTEMA, 'teste')?.critico })
  };
}

// A regra de 2077 deste ataque, para o cartão.
function notasDe2077(pedido, arma) {
  const notas = [];
  if (arma.getFlag(SISTEMA, 'armaVeicular')?.frontal) notas.push('Arma instalada voltada para a frente do veículo: confira a orientação antes de disparar.');
  if (pedido.porTiro) {
    const { balas, danoComMenos } = pedido.porTiro;
    const unidade = pedido.modo === 'cartucho' ? 'cartucho' : 'bala';
    notas.push(danoComMenos ? `Só ${balas} ${unidade}${balas === 1 ? '' : 's'} no pente: dispara o que tem e causa ${danoComMenos}.` : `Gasta ${balas} ${unidade}s no tiro.`);
  }
  const ignoradas = pedido.smartMelhorada?.ignoradas ?? [];
  if (ignoradas.length) notas.push(`Munição Smart melhorada: as penalidades de visão não contam (${ignoradas.join(', ')}).`);
  if (pedido.doisCanos) {
    const dano = arma.perfil2077?.doisCanos?.dano;
    notas.push(`Os dois canos de uma vez: gastou 2 cartuchos${dano ? `, e o dano é ${dano}` : ''}.`);
  }
  if (pedido.ricochete) {
    const { penalidade, cartucho: doCartucho } = pedido.ricochete;
    const conta = penalidade ? `${penalidade} no ataque` : 'no tiro mirado, só a penalidade dele';
    notas.push(doCartucho
      ? `Ricochete do cartucho (${conta}): o leque de ${R.ALCANCE_CARTUCHO} m sai da superfície do ricochete, a até ${R.ALCANCE_CARTUCHO} m de quem atira, na direção escolhida (não para trás dela); o mestre confere quem está nele.`
      : `Ricochete (${conta}): o alcance é a distância até o alvo, e precisa de um caminho livre do ponto do ricochete até ele.`);
  }
  const perfil = arma.perfil2077;
  if (pedido.carga) {
    const cdt = perfil?.cdtNaCarga ? `continua CDT ${perfil.cdtNaCarga}` : 'CDT 1';
    const balas = perfil?.balasNaCarga ? ` e gasta até ${perfil.balasNaCarga} balas por ataque` : '';
    const turno = perfil?.cargaAteFimDoTurno ? '; fica carregada até o fim do turno' : '';
    notas.push(`Carregada: ${cdt}${balas}${turno}; atravessa ${R.coberturaDaCarga(perfil)} (a cobertura não perde HP) e ignora metade do SP do alvo, arredondada para cima.`);
  }
  if (R.LOCAIS_MIRADOS[pedido.local] && perfil?.danoMirado) notas.push(`Tiro mirado: ${perfil.danoMirado} de dano.`);
  if (pedido.ferrolho) notas.push('Depois do tiro, gaste uma Ação para manejar o ferrolho antes de atirar de novo.');
  return notas;
}

// A Carnage sem BODY 10 e a Burya sem cromo no braço: quem dispara sofre a lesão (se ainda não tem), pela configuração
// "Lesão crítica" (na ficha, só anunciar; desligada, só a nota). O "Desfazer" a tira.
async function lesoesDoAtirador(ctx) {
  const ator = ctx.atacante;
  const tem = ator.items.filter(item => item.type === 'lesao').map(item => item.getFlag(SISTEMA, 'catalogo'));
  const cromo = ator.items.some(item => item.type === 'cyberware' && item.system.instalado
    && R.ehCromoNoBraco({ nome: item.name, catalogo: item.getFlag(SISTEMA, 'catalogo') ?? '', tipo: item.system.tipo, fundacional: item.system.fundacional }));
  const modo = config('lesaoCritica');
  for (const { id, nome, motivo } of R.lesoesDoAtirador({ perfil: ctx.perfil, body: ator.system.atributos?.body?.valor ?? 0, cromo, tem })) {
    ctx.notas.push(`${ctx.nomeAtq} ${motivo}: sofre a lesão crítica ${nome}.`);
    const feita = modo === 'nao' ? null : await lesaoCritica(ator, { id, naFicha: modo === 'ficha' });
    if (feita?.item) ctx.lesoesDoAtirador.push(feita.item.id);
  }
}

// Defesa, acerto, dano e o cartão do resultado. Devolve o resumo (macros e o teste leem).
export async function resolver(pedido, usuario = game.user) {
  if (!config('ativo')) return null;
  const ctx = await contexto(pedido, usuario);
  if (!ctx) return null;
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return null;
  if (ctx.modo === 'supressivo') await supressao(ctx);
  else if (ctx.modo === 'explosivo') await explosao(ctx);
  else if (ctx.modo === 'cartucho') await cartucho(ctx);
  else await individual(ctx);
  await lesoesDoAtirador(ctx);
  // O total do ataque, escondido até a defesa ("Esconder o total do ataque"), aparece para todos.
  const mensagem = game.messages.get(pedido.mensagem);
  if (mensagem?.whisper.length) await mensagem.update({ whisper: [] });
  return cartaoDoResultado(ctx);
}

function infoDoAlvo(ctx, token) {
  const ator = token.actor;
  const esquiva = ator.partesDaPericia('evasion').partes.reduce((soma, parte) => soma + parte.valor, 0);
  return { token, ator, nome: token.name, dono: jogadorDe(ator), ref: ator.system.atributos.ref.valor, semPerna: ator.system.semPerna, metros: distancia(ctx.tokenAtq, token), mediaEsquiva: esquiva + R.MEDIA_D10, escudo: ator.escudo };
}

// A DV pela distância, na tabela da arma (autofogo: a tabela "(Autofire)"; ricochete e rajada Tech: a de autofogo
// deles). Sem distância: null.
function dvDoAlvo(ctx, alvo) {
  if (alvo.metros === null) return { dv: null, fora: false };
  for (const nome of R.tabelasCandidatas(ctx.arma.tabelaDaArma, ctx.modo, ctx.arma.system.tipo)) {
    if (TABELAS_DV[nome]) return R.dvPelaDistancia(TABELAS_DV[nome], alvo.metros);
  }
  return { dv: null, fora: false, semTabela: true };
}

// Arma sem tabela de DV (feita à mão): o mestre diz a DV.
async function dvDoMestre(ctx, alvo) {
  const { DialogV2 } = foundry.applications.api;
  const valor = await DialogV2.prompt({
    window: { title: 'DV do ataque' },
    content: `<p>Não há DV definida para este ataque contra ${esc(alvo.nome)}. ${ctx.modo === 'corpo' ? 'O veículo e o vidro não se esquivam; o mestre define a DV para atingir a estrutura.' : `${esc(ctx.arma.name)} não tem tabela de DV para esta distância.`} Qual DV usar${alvo.metros === null ? '' : ` (${alvo.metros} m)`}?</p><input type="number" name="dv" value="15" autofocus>`,
    ok: { label: 'Usar esta DV', callback: (evento, botao) => botao.form.elements.dv.valueAsNumber },
    rejectClose: false
  }).catch(() => null);
  return Number.isFinite(valor) ? valor : null;
}

// Cartão só do mestre quando o jogador demora: botões para responder por ele.
function avisoDeEspera(alvo, id, opcoes) {
  const botoes = opcoes.map(opcao => `<button type="button" data-cprf-acao="responder" data-pedido="${id}" data-escolha="${opcao}">${BOTAO[opcao]}</button>`).join('');
  return ChatMessage.implementation.create({
    content: `<div class="${SISTEMA} cartao espera"><p>Esperando <b>${esc(alvo.dono.name)}</b> decidir a defesa de <b>${esc(alvo.nome)}</b>.</p><div class="botoes"><span>Responder por ele:</span>${botoes}</div></div>`,
    whisper: game.users.filter(usuario => usuario.isGM).map(usuario => usuario.id), speaker: { alias: 'Combate' }
  });
}

// A defesa de um alvo: { escolha, defesa? }.
async function defender(ctx, alvo, { opcoes, dv = null }) {
  const padrao = R.escolhaPadrao(opcoes);
  if (opcoes.length === 1 && !precisaRolar(opcoes[0])) return { escolha: opcoes[0] };
  // O total só vai para o jogador quando ele está à vista ("Esconder o total do ataque" desligado).
  const pacote = {
    alvo: alvo.token.uuid, arma: ctx.arma?.uuid ?? null, rotulo: ctx.rotulo ?? null, atacante: ctx.nomeAtq, imgAtq: ctx.tokenAtq?.texture?.src || ctx.atacante.img, modo: ctx.modo,
    descricao: ctx.descricao, metros: ['corpo', 'agarrar', 'escapar'].includes(ctx.modo) ? null : alvo.metros, dv, opcoes, padrao, ...(config('escondeAtaque') ? {} : { total: ctx.pedido.total })
  };
  if (alvo.dono) {
    const promessa = pedir(alvo.dono, 'defesa', pacote);
    let aviso = null;
    const relogio = setTimeout(() => { aviso = avisoDeEspera(alvo, promessa.id, opcoes); }, 8000);
    const resposta = await promessa;
    clearTimeout(relogio);
    if (aviso) (await aviso.catch(() => null))?.delete().catch(() => {});
    if (resposta?.escolha) {
      if (resposta.forcada) ctx.notas.push(`O mestre respondeu por ${alvo.dono.name}: ${alvo.nome} ${ROTULO[resposta.escolha]}.`);
      else if (resposta.fechou) ctx.notas.push(`${alvo.dono.name} fechou a janela: ${alvo.nome} ${ROTULO[resposta.escolha]}.`);
      else if (resposta.semResposta) ctx.notas.push(`${alvo.dono.name} não respondeu a tempo: ${alvo.nome} ${ROTULO[resposta.escolha]}.`);
      if (resposta.defesa !== undefined || !precisaRolar(resposta.escolha)) return resposta;
      return rolarDefesa(alvo.ator, alvo.nome, resposta.escolha);
    }
    ctx.notas.push(`${alvo.dono.name} não respondeu a tempo: ${alvo.nome} ${ROTULO[padrao]}.`);
    return precisaRolar(padrao) ? rolarDefesa(alvo.ator, alvo.nome, padrao) : { escolha: padrao };
  }
  // NPC (ou o jogador está fora): o mestre escolhe numa janela, vendo o total, ou o sistema escolhe pela média.
  if (opcoes.length > 1 && config('defesaDosNpcs') === 'mestre') {
    const resposta = await perguntarDefesa({ ...pacote, total: ctx.pedido.total }, { mestre: true });
    if (resposta) return resposta;
  }
  const escolha = opcoes.length > 1 ? R.escolhaAutomatica({ opcoes, modo: ctx.modo, dv, mediaEsquiva: alvo.mediaEsquiva }) : opcoes[0];
  return precisaRolar(escolha) ? rolarDefesa(alvo.ator, alvo.nome, escolha) : { escolha };
}

// A resistência a uma ação que não é de arma (o agarrão, agarrao.mjs), pela mesma defesa do ataque: a janela de reação do
// dono (sem o total, com o prazo e o "responder por ele" do mestre) ou, pelo NPC, o mestre rola. alvo: o TokenDocument.
// Devolve a resposta ({ escolha, defesa }) e as notas da espera, para o cartão.
export async function defesaContra({ atacante, tokenAtq = null, alvo, total, modo, rotulo, descricao, opcoes }) {
  const ctx = { pedido: { total }, atacante, tokenAtq, arma: null, rotulo, nomeAtq: tokenAtq?.name ?? atacante.name, modo, descricao, notas: [] };
  const resposta = await defender(ctx, infoDoAlvo(ctx, alvo), { opcoes });
  return { resposta, notas: ctx.notas };
}

export const linhaDe = (ctx, token) => {
  const linha = { token, nome: token.name, img: token.texture?.src || token.actor.img, resultado: null, notas: [] };
  const destino = destinoVeicular(ctx, token);
  if (destino) linha.notas.push(destino.tipo === 'veiculo' ? `Destino: estrutura de ${destino.item?.name ?? 'veículo'}.` : `Destino: pessoa atrás de ${destino.item?.system.janelas[destino.janela]?.nome ?? 'vidro'} de ${destino.item?.name ?? 'veículo'}.`);
  if (ctx.modo !== 'corpo' && token.actor?.statuses.has(STATUS_COBERTURA)) {
    linha.notas.push(ctx.pedido?.carga
      ? `${token.name} está em cobertura: a carga Tech atravessa ${R.coberturaDaCarga(ctx.perfil)} (que não perde HP)${ctx.perfil?.cargaGrossa ? '' : '; a grossa para o tiro'} (o mestre decide; wiki, p. 182).`
      : `${token.name} está em cobertura: se ela para a bala e o tira da linha de visão, o tiro para nela (o mestre decide; wiki, p. 182).`);
  }
  ctx.linhas.push(linha);
  return linha;
};

// A segunda chance da munição Smart melhorada (regras.cabeSegundaChance): o ataque à distância que errou por 5 ou menos
// tenta de novo, na hora. Quem atacou rola, se for um jogador conectado (a janela de rolagem, com a Sorte); senão, ou se
// ele não responder, o mestre rola direto. Devolve o total novo, ou null (não cabe).
const SEM_SEGUNDA_CHANCE_NO_ALVO = ['corpo', 'supressivo', 'cartucho', 'explosivo'];
async function segundaChance(ctx, contra) {
  const smart = ctx.pedido.smartMelhorada;
  if (!smart || !R.cabeSegundaChance({ ataque: ctx.pedido.total, contra })) return null;
  const rotulo = `${ctx.arma.name}: segunda chance (munição Smart melhorada)`;
  const partes = R.partesDaSegundaChance(smart.penalidades);
  const jogador = !ctx.usuario.isGM && ctx.usuario.active ? ctx.usuario : null;
  if (jogador) {
    const resposta = await pedir(jogador, 'segundaChance', { arma: ctx.arma.uuid, rotulo, partes });
    if (Number.isFinite(Number(resposta?.total))) return Number(resposta.total);
    ctx.notas.push(`${jogador.name} não rolou a segunda chance a tempo: o mestre rolou.`);
  }
  return (await rolarSegundaChance(ctx.atacante, { rotulo, partes, sorte: jogador ? 0 : undefined })).total;
}

// A defesa de um alvo já no alcance. Preenche a linha e devolve se pegou.
async function defesaDoAlvo(ctx, linha, alvo, dv) {
  if (!conferirDestinos([alvo.token], ctx.pedido.destinos?.[alvo.token.uuid] ? { [alvo.token.uuid]: ctx.pedido.destinos[alvo.token.uuid] } : {}, ctx)) {
    linha.resultado = 'semDestino';
    return false;
  }
  // Wiki, Veículos (p. 189–192): estruturas não esquivam. No corpo a corpo, a DV vem do mestre.
  const estrutura = destinoEstrutural(ctx, alvo.token);
  let resposta;
  if (estrutura) {
    resposta = { escolha: 'aguentar' };
    linha.notas.push('A estrutura não se esquiva.');
  } else {
    const esquiva = R.podeEsquivar({ modo: ctx.modo, ref: alvo.ref, exigeRef8: config('exigeRef8'), semPerna: alvo.semPerna });
    const opcoes = R.opcoesDeDefesa({ modo: ctx.modo, esquiva, escudo: Boolean(alvo.escudo) });
    resposta = await defender(ctx, alvo, { opcoes, dv });
  }
  Object.assign(linha, { escolha: resposta.escolha, defesa: resposta.defesa ?? null, dv });
  if (!estrutura && alvo.semPerna && ctx.modo !== 'supressivo') linha.notas.push('Sem a perna, não esquiva.');
  const acertou = ataque => estrutura
    ? ['explosivo', 'cartucho'].includes(ctx.modo) ? true : dv === null ? null : ataque > dv
    : R.acertou({ modo: ctx.modo, escolha: resposta.escolha, ataque, defesa: linha.defesa, dv });
  let pegou = acertou(ctx.pedido.total);
  // A munição Smart melhorada, no ataque de cada alvo (no cartucho e no explosivo, a área já passou da DV): errou por 5
  // ou menos, a segunda chance contra a mesma DV, ou contra a mesma esquiva.
  if (pegou === false && !SEM_SEGUNDA_CHANCE_NO_ALVO.includes(ctx.modo)) {
    const contra = resposta.escolha === 'esquivar' ? linha.defesa : dv;
    const novo = await segundaChance(ctx, contra);
    if (novo !== null) {
      linha.segundaChance = novo;
      linha.notas.push(`Munição Smart melhorada: errou por ${contra - ctx.pedido.total}; a segunda chance deu ${novo}${acertou(novo) ? ' e pegou' : ''}.`);
      pegou = acertou(novo);
    }
  }
  linha.pegou = pegou;
  linha.resultado = pegou === null ? 'semDv' : pegou ? 'acertou' : resposta.escolha === 'esquivar' ? 'esquivou' : 'errou';
  return pegou;
}

// ---------------- Dano ----------------
// "O primeiro da rodada" (Ponto Fraco e Deflexão de Dano do Solo): uma vez por rodada do combate de que o ator participa,
// marcado nele; fora de combate não há rodada, e toda vez conta como a primeira. As marcas do ataque (e a da carga Tech,
// na arma) vão para o cartão: o "Desfazer" as devolve.
function primeiraNaRodada(ator, chave) {
  const combate = combateDe(ator);
  const marca = combate ? ator.getFlag(SISTEMA, chave) : null;
  return !(marca && marca.combate === combate.id && marca.rodada === combate.round);
}
async function marcarRodada(ctx, ator, chave) {
  const combate = combateDe(ator);
  if (!combate) return;
  const marca = { combate: combate.id, rodada: combate.round };
  await ator.setFlag(SISTEMA, chave, marca);
  ctx.marcas.push({ ator: ator.uuid, chave, ...marca });
}

// Quem atacou rola, se for um jogador conectado; senão (ou se ele não responder), o mestre. O Ponto Fraco do Solo soma
// no dano (antes da armadura) do primeiro acerto dele na rodada.
async function rolarDanoDoAtaque(ctx, { multiplicador = 1, formula = null } = {}) {
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return null;
  let dano = null;
  const jogador = !ctx.usuario.isGM && ctx.usuario.active ? ctx.usuario : null;
  if (jogador && config('rolagemManual') && config('jogadorRolaDano')) {
    const resposta = await pedir(jogador, 'dano', { arma: ctx.arma.uuid, multiplicador, formula });
    if (Number.isFinite(Number(resposta?.total))) dano = resposta;
    else ctx.notas.push(`${jogador.name} não rolou o dano a tempo: o mestre rolou.`);
  }
  if (!dano) {
    const rolado = await rolarDano(ctx.arma, { multiplicador, formula });
    ctx.rolagens.push(rolado.roll);
    dano = { total: rolado.total, critico: rolado.critico, bonus: rolado.bonus, formula: rolado.formula };
  }
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return null;
  const pontoFraco = ctx.atacante.system.consciencia.pontoFraco;
  if (pontoFraco && primeiraNaRodada(ctx.atacante, 'pontoFraco')) {
    await marcarRodada(ctx, ctx.atacante, 'pontoFraco');
    dano = { ...dano, total: dano.total + pontoFraco, pontoFraco };
  }
  return dano;
}

const SEM_LESAO_DE_BORRACHA = 'Munição de borracha: sem lesão crítica.';

// Aplica o dano num alvo e cuida das lesões: dois 6 (a tabela da cabeça só no tiro mirado na cabeça), tiro na perna
// que passou da armadura (Perna quebrada), mortalmente ferido atingido de novo. A Deflexão de Dano do Solo tira do
// primeiro dano que ele sofre na rodada. A munição de borracha não mata nem causa lesão crítica (wiki, munições). A carga
// Tech ignora metade do SP (regras.CARGA_TECH). lesaoDoCritico: false no dano aplicado pelo cartão, em que a lesão do crítico sai pelo botão "Rolar a lesão".
export async function ferir(ctx, linha, dano, { escudo = false, lesaoDoCritico = true } = {}) {
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return;
  if (!conferirDestinos([linha.token], ctx.pedido.destinos?.[linha.token.uuid] ? { [linha.token.uuid]: ctx.pedido.destinos[linha.token.uuid] } : {}, ctx)) return;
  const ator = linha.token.actor;
  const municao = ctx.arma.municaoCarregada;
  const destino = destinoVeicular(ctx, linha.token);
  if (destino?.tipo === 'veiculo') {
    const recebido = await destino.item.receberDanoVeicular({ dano: dano.total,
      ignorarPct: ctx.pedido?.carga ? Math.max(Number(ctx.arma.system.ignorarArmadura) || 0, R.CARGA_TECH.ignorarPct) : ctx.arma.system.ignorarArmadura,
      ignorarAbaixo: ctx.arma.system.ignorarAbaixo, ablacao: municao?.system.ablacao ?? 1 });
    if (recebido) linha.veicular = { tipo: 'veiculo', ...recebido };
    return;
  }
  if (destino?.tipo === 'vidro') {
    const vidro = destino.item.system.janelas[destino.janela];
    if (techAtravessaVidro({ carga: ctx.pedido.carga, grossa: ctx.arma.getFlag(SISTEMA, 'arma2077')?.cargaGrossa, max: vidro.hp.max })) {
      linha.veicular = { tipo: 'vidro', veiculo: destino.item.uuid, janela: destino.janela, nome: `${destino.item.name}: ${vidro.nome}`,
        antes: vidro.hp.value, depois: vidro.hp.value, perdeu: 0, passou: true, atravessado: true };
      linha.notas.push('A carga Tech atravessou o vidro sem tirar HP da cobertura; a pessoa conserva a defesa e a armadura.');
    } else {
      const recebido = await destino.item.receberDanoNoVidro({ janela: destino.janela, dano: dano.total, explosivo: ctx.modo === 'explosivo' });
      if (!recebido) return;
      linha.veicular = { tipo: 'vidro', ...recebido };
      if (!recebido.passou) return;
      linha.notas.push(recebido.antes > 0 ? 'A explosão destruiu o vidro: o dano total alcança a pessoa.' : 'O vidro está sem HP: não protege a pessoa.');
    }
  }
  const jaMortal = ator.system.hp.value < 1;
  const borracha = municao?.system.efeito === 'rubber';
  const deflexao = ator.system.consciencia.deflexao && primeiraNaRodada(ator, 'deflexao') ? ator.system.consciencia.deflexao : 0;
  const efeito = await ator.receberDano({
    dano: dano.total, bonus: dano.bonus, local: ctx.local, ignorarPct: ctx.pedido?.carga ? Math.max(Number(ctx.arma.system.ignorarArmadura) || 0, R.CARGA_TECH.ignorarPct) : ctx.arma.system.ignorarArmadura,
    ignorarAbaixo: ctx.arma.system.ignorarAbaixo, ablacao: municao?.system.ablacao ?? 1, letal: !borracha, escudo, explosivo: ctx.modo === 'explosivo', reducao: deflexao
  });
  // A deflexão só se gasta quando entra dano de verdade: o que a armadura ou o escudo seguraram inteiro não é "dano
  // sofrido".
  const sofreu = deflexao > 0 && efeito.entrou > 0;
  if (sofreu) await marcarRodada(ctx, ator, 'deflexao');
  linha.dano = { ...efeito, critico: dano.critico, formula: dano.formula, pontoFraco: dano.pontoFraco || 0, deflexao: sofreu ? deflexao : 0, lesoes: [] };
  const modo = config('lesaoCritica');
  const lesao = async opcoes => {
    if (borracha) {
      if (!linha.notas.includes(SEM_LESAO_DE_BORRACHA)) linha.notas.push(SEM_LESAO_DE_BORRACHA);
      return;
    }
    if (modo === 'nao') return;
    // O Monowire (o Kit; o C11, parte 2b): a lesão da tabela sai duas vezes, num cartão em que o mestre aplica a que quem
    // atacou escolher. A lesão certa (a Perna quebrada do tiro na perna) entra direto.
    if (!opcoes.id && ctx.arma?.origemDaArma === R.MONOWIRE) {
      const roladas = await escolhaDeLesao(ator, { cabeca: Boolean(opcoes.cabeca), naFicha: modo === 'ficha', atacante: ctx.nomeAtq, arma: ctx.arma.name });
      if (!roladas.length) return;
      linha.dano.lesoes.push({ nome: roladas.map(lesao => lesao.nome).join(' ou '), item: null });
      linha.notas.push(`${ctx.arma.name}: ${ctx.nomeAtq} rolou duas lesões e escolhe a que ${linha.nome} sofre; o mestre aplica pelo cartão delas.`);
      return;
    }
    const feita = await lesaoCritica(ator, { naFicha: modo === 'ficha', ...opcoes });
    if (feita) linha.dano.lesoes.push({ nome: feita.nome, item: feita.item?.id ?? null });
    if (municao?.system.efeito === 'expansive' && feita?.id.includes(':foreign-object')) {
      const segunda = await lesaoCritica(ator, { naFicha: modo === 'ficha', cabeca: ctx.local === 'cabeca', excluir: [feita.id] });
      if (segunda) linha.dano.lesoes.push({ nome: segunda.nome, item: segunda.item?.id ?? null });
      linha.notas.push('Munição expansiva: outra lesão além do objeto estranho, sem segundo dano bônus.');
    }
  };
  if (dano.critico && lesaoDoCritico) await lesao({ cabeca: ctx.local === 'cabeca' });
  if (ctx.local === 'perna' && efeito.passou) await lesao({ id: PERNA_QUEBRADA });
  if (ctx.local === 'item' && efeito.passou) linha.notas.push(`${linha.nome} larga o item na mão que ${ctx.nomeAtq} escolher.`);
  // Os golpes das Artes Marciais (o C10): a lesão certa do Golpe quebra-ossos e do Ponto de pressão (a da cabeça no
  // mirado), e a queda da Voadora, que o "Desfazer" tira.
  const golpe = R.MOVIMENTOS[ctx.pedido?.movimento];
  if (golpe?.lesoes) await lesao({ id: golpe.lesoes[ctx.local === 'cabeca' ? 'cabeca' : 'corpo'] });
  if (golpe?.derruba && !ator.statuses.has('prone')) {
    await ator.toggleStatusEffect('prone', { active: true });
    linha.derrubado = true;
    linha.notas.push(`${golpe.nome}: ${linha.nome} caiu e, numa moto ou num veículo aberto, foi derrubado dele.`);
  }
  if (jaMortal && !borracha && config('mortalmenteFerido')) {
    linha.notas.push('Já estava mortalmente ferido: uma lesão crítica a mais.');
    await lesao({});
  }
  // Reflex Tuner (2077): atingido, +1 para se esquivar pelo resto da rodada. A marca vai para o cartão, e o "Desfazer"
  // a tira.
  if (ator.temReflexTuner) await marcarRodada(ctx, ator, 'atingido');
  await incendiar(ctx, linha);
}

// ---------------- Modos ----------------
// A segunda tentativa da munição Inteligente RED (inclui o míssil, pela wiki e pelo Rocket (Smart) do CORE).
async function repetirInteligente(ctx, contra) {
  const municao = ctx.arma.municaoCarregada;
  const efeito = municao?.getFlag(SISTEMA, 'catalogo')?.startsWith('armas-2077:') ? null : municao?.system.efeito;
  if (!R.podeRepetirComInteligente({ efeito, modo: ctx.modo, local: ctx.local, ataque: ctx.pedido.total, contra, municao: municao?.system.tipo })) return null;
  const dados = { ator: ctx.atacante.uuid };
  const segunda = (ctx.usuario.isGM ? null : await pedir(ctx.usuario, 'inteligente', dados)) ?? await rolarInteligente(dados, { perguntar: !config('rolarDireto') });
  if (segunda) ctx.falhaDaArma ??= R.falhaDaArma({ qualidade: ctx.arma.system.qualidade, efeito: ctx.arma.system.falhaCritica, critico: segunda.critico });
  return segunda;
}

function registrarSegundaTentativa(ctx, linha, contra, segunda) {
  linha.segundaTentativa = { primeiro: ctx.pedido.total, contra, total: segunda.total };
  linha.notas.push(`Inteligente: errou com ${ctx.pedido.total} contra ${contra}; segunda tentativa 10 + 1d10 (só a Sorte): ${segunda.total}.`);
}

async function revelarSegundaTentativa(segunda) {
  const mensagem = segunda && game.messages.get(segunda.mensagem);
  if (mensagem?.whisper.length) await mensagem.update({ whisper: [] });
}

// Um alvo de tiro, autofogo ou corpo a corpo: alcance, DV e defesa. Devolve a linha se o ataque pegou.
async function resolverAlvo(ctx, token) {
  const linha = linhaDe(ctx, token);
  const alvo = infoDoAlvo(ctx, token);
  linha.metros = alvo.metros;
  // O Monowire (o Kit) alcança até 6 m; o corpo a corpo não confere o alcance, e a nota fica com o mestre (o C11, parte 2b).
  if (ctx.arma?.origemDaArma === R.MONOWIRE) linha.notas.push(R.notaDoMonowire(linha.nome, alvo.metros));
  let dv = null;
  if (ctx.modo === 'corpo' && destinoEstrutural(ctx, token)) dv = await dvDoMestre(ctx, alvo);
  else if (ctx.modo !== 'corpo') {
    const achada = dvDoAlvo(ctx, alvo);
    if (achada.fora) { linha.resultado = 'fora'; return null; }
    dv = achada.dv ?? (achada.semTabela ? await dvDoMestre(ctx, alvo) : null);
  }
  if (await defesaDoAlvo(ctx, linha, alvo, dv)) return linha;
  const contra = linha.escolha === 'esquivar' ? linha.defesa : linha.dv;
  const segunda = await repetirInteligente(ctx, contra);
  if (!segunda) return null;
  registrarSegundaTentativa(ctx, linha, contra, segunda);
  const pegou = await defesaDoAlvo({ ...ctx, pedido: { ...ctx.pedido, total: segunda.total } }, linha, alvo, dv);
  await revelarSegundaTentativa(segunda);
  return pegou ? linha : null;
}

// Arma Smart que trava dois alvos (a Tsunami Kappa), no tiro (não no mirado): vai no primeiro marcado; se não pegar, as
// balas mudam para o segundo, se ele estiver a até 4 m do primeiro. Os outros marcados ficam de fora.
async function redirecionado(ctx) {
  const [primeiro, segundo, ...resto] = ctx.alvos;
  if (resto.length) ctx.notas.push(`${ctx.arma.name} trava dois alvos: ${resto.map(token => token.name).join(', ')} ${resto.length > 1 ? 'ficaram' : 'ficou'} de fora.`);
  const pegou = await resolverAlvo(ctx, primeiro);
  if (pegou) return [pegou];
  if (!R.mudaDeAlvo(distancia(primeiro, segundo))) {
    ctx.notas.push(`${segundo.name} está a mais de ${R.ALCANCE_DOS_DOIS_ALVOS} m de ${primeiro.name}: as balas Smart não mudam de alvo.`);
    return [];
  }
  const linha = await resolverAlvo(ctx, segundo);
  ctx.linhas.at(-1).notas.push(`As balas Smart mudaram de alvo: ${primeiro.name} não foi atingido.`);
  return [linha];
}

// Tiro, autofogo, corpo a corpo e os modos de 2077: cada alvo se defende; o dano sai para cada um que foi atingido. O
// autofogo rola 2d6 × o multiplicador (até o da arma).
async function individual(ctx) {
  const doisAlvos = ctx.perfil?.doisAlvos && ctx.modo === 'tiro' && !R.LOCAIS_MIRADOS[ctx.local] && ctx.alvos.length >= 2;
  const atingidas = new Set((await (doisAlvos ? redirecionado(ctx) : Promise.all(ctx.alvos.map(token => resolverAlvo(ctx, token))))).filter(Boolean));
  const pegas = ctx.linhas.filter(l => atingidas.has(l));
  // mestre.mjs:individual, no Fluxo: só a defesa; o dano fica com o botão Dano da ficha.
  if (config('dano') === 'manual') { for (const linha of pegas) linha.notas.push('Role o dano pelo botão Dano da ficha.'); return; }
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return;
  if (!conferirDestinos(ctx.alvos, ctx.pedido.destinos ?? {}, ctx)) return;
  if (await aplicarMunicaoDoAtaque(ctx, pegas)) return;
  const rajada = ctx.modo === 'autofogo';
  const maximo = ctx.arma.system.autofogo;
  const doMirado = R.LOCAIS_MIRADOS[ctx.local] ? ctx.perfil?.danoMirado : null;
  const formula = rajada ? '2d6' : ctx.pedido.porTiro?.danoComMenos ?? doMirado ?? ctx.perfil?.danoFixo ?? null;
  for (const linha of pegas) {
    const contra = linha.escolha === 'esquivar' ? linha.defesa : linha.dv;
    const multiplicador = rajada ? R.multiplicadorDeAutofogo(linha.segundaChance ?? ctx.pedido.total, contra, maximo) : 1;
    if (rajada) linha.multiplicador = multiplicador;
    const dano = await rolarDanoDoAtaque(ctx, { multiplicador, formula });
    if (!dano) return;
    await ferir(ctx, linha, dano, { escudo: linha.escolha === 'escudo' });
  }
}

// Área (explosivo e cartucho): o dano é rolado uma vez e vale para cada um que ficou.
async function danoNaArea(ctx, pegas, formula = null) {
  // mestre.mjs:danoNaArea, no Fluxo: nenhum dano automático nos alvos da área.
  if (config('dano') === 'manual') { if (pegas.length) ctx.notas.push('Role o dano pelo botão Dano da ficha e aplique em quem ficou na área.'); return; }
  if (!conferirArmaVeicular(ctx.arma, ctx.modo)) return;
  if (!conferirDestinos(ctx.alvos, ctx.pedido.destinos ?? {}, ctx)) return;
  if (!pegas.length || await aplicarMunicaoDoAtaque(ctx, pegas)) return;
  const dano = await rolarDanoDoAtaque(ctx, { formula });
  if (!dano) return;
  for (const linha of ctx.linhas.filter(l => pegas.includes(l))) await ferir(ctx, linha, dano, { escudo: linha.escolha === 'escudo' });
}

// O ataque de área (o cartucho e o explosivo) passou da DV? Com a munição Smart melhorada, a segunda chance vale para a
// área toda. Devolve o contexto que vale para a área (com a segunda chance, uma cópia com o total novo, como a segunda
// tentativa da Inteligente: as esquivas dos alvos são contra ele), ou null se não passou.
async function contraADvDaArea(ctx, dv) {
  if (ctx.pedido.total > dv) return ctx;
  const novo = await segundaChance(ctx, dv);
  if (novo === null) return null;
  ctx.notas.push(`Munição Smart melhorada: errou a DV ${dv} por ${dv - ctx.pedido.total}; a segunda chance deu ${novo}${novo > dv ? ' e passou' : ''}.`);
  ctx.segundaChance = novo;
  return novo > dv ? { ...ctx, pedido: { ...ctx.pedido, total: novo } } : null;
}

// Resistências e estados pertencem à pessoa. Vidro intacto protege; a munição sem dano não destrói a estrutura.
async function aplicarMunicaoDoAtaque(ctx, pegas) {
  const pessoas = pegas.filter(linha => !destinoEstrutural(ctx, linha.token));
  const semDano = await aplicarMunicaoSemDano(ctx, pessoas);
  if (semDano) for (const linha of pegas.filter(linha => !pessoas.includes(linha))) linha.notas.push('Esta munição não causa dano da arma à estrutura; a pessoa continua protegida.');
  return semDano;
}

// Espingarda com cartucho: um ataque contra DV 13; se acertar, cada alvo à frente, até 6 m, leva 3d6 (rolado uma vez).
async function cartucho(ctx) {
  const area = await contraADvDaArea(ctx, R.DV_CARTUCHO);
  const passou = Boolean(area);
  ctx.cabecalho = `contra DV ${R.DV_CARTUCHO} do cartucho: ${passou ? 'acertou' : 'errou'}`;
  const pegas = [];
  await Promise.all(ctx.alvos.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.metros = alvo.metros;
    if (!passou) { Object.assign(linha, { resultado: 'errou', dv: R.DV_CARTUCHO }); return; }
    if (!ctx.pedido.ricochete && alvo.metros !== null && alvo.metros > R.ALCANCE_CARTUCHO + 0.5) { linha.resultado = 'fora'; linha.notas.push(`Além dos ${R.ALCANCE_CARTUCHO} m do cartucho.`); return; }
    if (await defesaDoAlvo(area, linha, alvo, R.DV_CARTUCHO)) pegas.push(linha);
  }));
  // Os dois cartuchos de uma vez (a Testera): o dano da arma para isso.
  await danoNaArea(ctx, pegas, (ctx.pedido.doisCanos && ctx.perfil?.doisCanos?.dano) || ctx.pedido.porTiro?.danoComMenos || ctx.perfil?.danoFixo || '3d6');
}

// Tokens com o centro na área de 10 × 10 m em volta do alvo, menos os escondidos.
function naArea(ctx, principal) {
  const metade = ((R.AREA_EXPLOSIVO / 2) / ctx.cena.grid.distance) * ctx.cena.grid.size;
  const centro = centroDe(principal);
  return ctx.cena.tokens.filter(token => token.actor && !token.hidden && R.dentroDaArea(centro, centroDe(token), metade));
}

// Explosivo: o ataque contra a DV do alcance do alvo; errou, o mestre decide onde caiu. Acertou, todos na área levam o
// dano, menos quem esquivar (REF 8+, e a esquiva tem de passar do ataque).
async function explosao(ctx) {
  const principal = ctx.alvos[0];
  const info = infoDoAlvo(ctx, principal);
  const achada = dvDoAlvo(ctx, info);
  const onde = info.metros === null ? '' : ` (${info.metros} m)`;
  if (achada.fora) {
    ctx.cabecalho = `fora do alcance${onde}`;
    Object.assign(linhaDe(ctx, principal), { resultado: 'fora', metros: info.metros });
    return;
  }
  const dv = achada.dv ?? (achada.semTabela ? await dvDoMestre(ctx, info) : null);
  const segunda = dv !== null && ctx.pedido.total <= dv ? await repetirInteligente(ctx, dv) : null;
  const tentativa = segunda ? { ...ctx, pedido: { ...ctx.pedido, total: segunda.total } } : dv === null ? ctx : await contraADvDaArea(ctx, dv);
  if (dv === null || !tentativa || tentativa.pedido.total <= dv) {
    ctx.cabecalho = dv === null ? 'sem DV: o mestre decide' : `contra DV ${dv}${onde}: errou. O mestre decide onde caiu.`;
    const linha = linhaDe(ctx, principal);
    Object.assign(linha, { resultado: dv === null ? 'semDv' : 'errou', dv, metros: info.metros });
    if (segunda) registrarSegundaTentativa(ctx, linha, dv, segunda);
    await revelarSegundaTentativa(segunda);
    return;
  }
  ctx.cabecalho = `contra DV ${dv}${onde}: explodiu na área de ${R.AREA_EXPLOSIVO} × ${R.AREA_EXPLOSIVO} m`;
  const atingidos = [...new Set([...ctx.alvos, ...(config('area') ? naArea(ctx, principal) : [])])];
  const pegas = [];
  await Promise.all(atingidos.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.metros = alvo.metros;
    if (segunda) registrarSegundaTentativa(ctx, linha, dv, segunda);
    if (await defesaDoAlvo(tentativa, linha, alvo, dv)) pegas.push(linha);
  }));
  await revelarSegundaTentativa(segunda);
  await danoNaArea(ctx, pegas);
}

// Quem o fogo supressivo pega sem alvo marcado: todos a até 25 m e à vista (sem parede no meio, se o mestre está
// vendo a cena), menos quem atirou, os escondidos e os derrotados.
function sobFogo(ctx) {
  const veCena = canvas.ready && canvas.scene?.id === ctx.cena.id;
  const origem = centroDe(ctx.tokenAtq);
  return ctx.cena.tokens.filter(token => {
    if (token.id === ctx.tokenAtq.id || token.hidden || !token.actor) return false;
    if (token.actor.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return false;
    const metros = distancia(ctx.tokenAtq, token);
    if (metros === null || metros > R.RAIO_SUPRESSAO + 0.5) return false;
    if (!veCena) return true;
    try { return !CONFIG.Canvas.polygonBackends.sight.testCollision(origem, centroDe(token), { type: 'sight', mode: 'any' }); } catch { return true; }
  });
}

// Fogo supressivo: cada um rola WILL + Concentração + 1d10 contra o ataque; quem perde fica Suprimido (gasta a
// próxima Ação de Movimento indo para a cobertura). O status sai no fim do próximo turno dele (turnos.mjs).
async function supressao(ctx) {
  const afetados = ctx.alvos.length ? ctx.alvos : config('supressao') ? sobFogo(ctx) : [];
  ctx.cabecalho = afetados.length ? `fogo supressivo em ${afetados.length} ${afetados.length === 1 ? 'pessoa' : 'pessoas'}` : 'fogo supressivo: ninguém à vista a até 25 m';
  await Promise.all(afetados.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.metros = alvo.metros;
    const perdeu = await defesaDoAlvo(ctx, linha, alvo, null);
    linha.resultado = perdeu ? 'suprimido' : 'firme';
    linha.suprimido = Boolean(perdeu);
    if (perdeu) await suprimir(token.actor);
  }));
}

export async function suprimir(ator) {
  await ator.toggleStatusEffect(STATUS_SUPRIMIDO, { active: true });
  const combate = game.combat?.started ? game.combat : null;
  await ator.setFlag(SISTEMA, 'suprimido', combate ? { combate: combate.id, rodada: combate.round, turno: combate.turn } : { combate: null });
}
