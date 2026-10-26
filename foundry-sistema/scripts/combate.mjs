// Ataque, defesa e dano: o Fluxo de Combate dentro do sistema (as regras ficam em regras.mjs).
// - Quem ataca marca os alvos (T) e rola pela ficha; o total vai só para ele e para o mestre até a defesa.
// - O mestre ativo resolve: a DV pela distância, a defesa de cada alvo (o jogador do alvo escolhe e rola no computador
//   dele, sem ver o total; pelos NPCs, o mestre escolhe ou o sistema decide), o dano (quem atacou rola, se for
//   jogador) e a ficha (armadura, cabeça, escudo, ablação, Lesão Crítica). No fim, o cartão do resultado, com
//   "Desfazer" para o mestre.
// - Modos: tiro, mirado (cabeça, perna, item na mão), corpo a corpo, autofogo, fogo supressivo, espingarda com
//   cartucho e explosivo em área; das armas de 2077, o ricochete, a carga Tech e a ligação da arma Smart.

import { ATORES_DA_NET, SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { config } from './configuracoes.mjs';
import { perguntarTeste } from './janela-rolagem.mjs';
import * as R from './regras.mjs';
import { testar } from './rolagens.mjs';
import { ehArremesso, podeArremessar } from './arremessar.mjs';
import { CANAL, combateDe, conferirArmaVeicular, conferirDestinos, distancia, esc, montadaNoVeiculo, tokenNaCena } from './combate/apoio.mjs';
import { resolver } from './combate/modos.mjs';
import { naFila } from './combate/socket.mjs';
import { protecaoDoOcupante, veiculoDaTripulacao } from './tripulacao.mjs';

// A porta pública permanece aqui, inclusive para game.system.api.combate.
export { STATUS_SUPRIMIDO, STATUS_COBERTURA, souOMestreAtivo, tokenNaCena, centroDe, distancia, jogadorDe, combateDe } from './combate/apoio.mjs';
export { pedir, desistir, naFila, registrarCombate, perguntarDefesa } from './combate/socket.mjs';
export { resolver, defesaContra, suprimir } from './combate/modos.mjs';
export { destinatarios, desfazer, aplicarDanoDoCartao, rolarLesaoDoCartao, ligarBotoes } from './combate/cartao.mjs';

const { DialogV2 } = foundry.applications.api;

// ---------------- No cliente de quem ataca ----------------
async function perguntarDestinos(alvos, modo) {
  const destinos = {};
  if (modo === 'supressivo') return destinos;
  for (const token of alvos) {
    const veiculo = protecaoDoOcupante(token);
    if (!veiculo) continue;
    const vidros = Object.entries(veiculo.system.janelas ?? {}).map(([id, vidro]) => `<option value="vidro:${esc(id)}">Pessoa atrás de ${esc(vidro.nome)} (${vidro.hp.value} HP)</option>`).join('');
    const escolha = await DialogV2.wait({
      window: { title: `${token.name}: destino do ataque` }, classes: [SISTEMA, 'destino-veicular'],
      content: `<p>Escolha o que o ataque atinge. O mestre confere a posição e se o vidro cobre a pessoa.</p><label>Destino <select name="destino"><option value="pessoa" selected>Pessoa: ${esc(token.name)}</option><option value="veiculo">Veículo: ${esc(veiculo.name)}</option>${vidros}</select></label>`,
      buttons: [{ action: 'confirmar', label: 'Confirmar destino', default: true, callback: (evento, botao) => botao.form.elements.destino.value }], rejectClose: false
    }).catch(() => null);
    if (!escolha) return null;
    const dentro = veiculoDaTripulacao(token), origem = dentro ? { tokenVeiculo: dentro.id } : {};
    if (escolha === 'veiculo') destinos[token.uuid] = { tipo: 'veiculo', veiculo: veiculo.id, ...origem };
    else if (escolha.startsWith('vidro:')) destinos[token.uuid] = { tipo: 'vidro', veiculo: veiculo.id, janela: escolha.slice(6), ...origem };
    else if (escolha !== 'pessoa') return null;
  }
  return destinos;
}

// alvos (ou alvo, um só): Tokens ou TokenDocuments; padrão, os marcados. local: "corpo" ou mirado ("cabeca", "perna",
// "item"). modo: os botões da ficha ("autofogo", "supressivo" e os de 2077: "ricochete", "doisCanos"); senão, a arma e a
// munição dizem (tiro, cartucho, explosivo). A arma Tech carregada (o botão Carregar) gasta a carga no ataque. perguntar:
// abre a janela de rolagem (a ficha abre; Ctrl + clique, não). destinos: por UUID do token, { tipo: 'veiculo', veiculo:
// id } ou { tipo: 'vidro', veiculo: id, janela: chave }; {} mantém as pessoas. Sem o mapa, pergunta pelo veículo ativo.
// movimento e pericia: o golpe das Artes Marciais (artes-marciais.mjs; regras.MOVIMENTOS) e a perícia da forma dele.
// atirador e tokenAtirador (o C46, parte 4; tripulacao.atacarDoAssento): o motorista que dispara a arma montada do veículo
// em que está, também a de outro dono, e o token dele; sem eles, o dono da arma.
export async function atacar(arma, { alvos = null, alvo = null, local = 'corpo', modo: pedido = null, destinos = null, perguntar = false, movimento = null, pericia: periciaDoGolpe = null, atirador = null, tokenAtirador = null } = {}) {
  const atacante = atirador ?? arma.actor;
  if (!atacante) return null;
  // A arma de outro dono: só a montada no veículo (o assento confere qual e de que lugar), com o personagem de quem clica.
  const alheia = atacante.uuid !== arma.actor?.uuid;
  if (alheia && !atacante.isOwner) { ui.notifications.warn(`${atacante.name} não é seu.`); return null; }
  if (alheia && !montadaNoVeiculo(arma)) { ui.notifications.warn(`${arma.name}: de outro dono, só a arma montada do veículo que ${atacante.name} dirige.`); return null; }
  if (pedido === 'arremesso' && !podeArremessar(arma) && arma.system.tipo !== 'thrownWeapon') { ui.notifications.warn('Só uma arma branca solta pode ser arremessada.'); return null; }
  const arremesso = ehArremesso(arma, pedido);
  // As Artes Marciais pedem pelo menos 1 ponto numa forma (o C10).
  if (arma.motivoSemAtaque) { ui.notifications.warn(`${arma.name}: ${arma.motivoSemAtaque}`); return null; }
  // O Aperto de ferro (Aikido, o C10): agarrado nele, nada de ataques à distância.
  if ((arma.system.aDistancia || arremesso) && atacante.effects.find(e => e.statuses.has(STATUS_AGARRAO.agarrado))?.getFlag(SISTEMA, 'agarrao')?.apertoDeFerro) {
    ui.notifications.warn(`${atacante.name} está no Aperto de ferro: nada de ataques à distância enquanto agarrado.`);
    return null;
  }
  // captura.mjs:lerAtaque, no Fluxo: desligado, só a rolagem da arma, sem pedir defesa nem dano.
  const resolverAtaques = config('ativo');
  // O pente da arma de outro dono: quem atira não grava nela; o mestre ativo gasta as balas ao resolver (modos.mjs).
  const penteNoMestre = alheia && !arma.isOwner;
  if (penteNoMestre && !resolverAtaques) { ui.notifications.warn(`${arma.name}: sem o fluxo de combate ligado, só quem controla o dono gasta o pente desta arma.`); return null; }
  const marcados = (alvos ?? (alvo ? [alvo] : [...game.user.targets])).map(token => token?.document ?? token).filter(token => token?.actor);
  // O Black ICE e o demônio ficam na NET: a arma não os atinge (o dano neles vem dos programas e do Zap).
  const lista = marcados.filter(token => !ATORES_DA_NET.includes(token.actor.type));
  if (lista.length < marcados.length) ui.notifications.warn('O Black ICE e o demônio estão na NET: a arma não os atinge.');
  if (marcados.length && !lista.length) return null;
  const municao = arma.municaoCarregada;
  const conferirMira = () => {
    if (municao?.system.efeito !== 'smart' || municao.getFlag(SISTEMA, 'catalogo')?.startsWith('armas-2077:') || atacante.items.some(i => i.type === 'cyberware' && i.system.instalado && !i.inoperante && i.getFlag(SISTEMA, 'catalogo') === 'core_cyberware:targeting-scope')) return true;
    ui.notifications.warn(`${arma.name}: munição Inteligente exige o cyberware Targeting Scope (Luneta de Mira).`);
    return false;
  };
  if (!conferirMira()) return null;
  const pelaArma = { aDistancia: arma.system.aDistancia || arremesso, tipoDeArma: arma.perfilPelaMunicao?.tipo ?? arma.system.tipo, municao: municao?.system.tipo };
  // O ricochete de um cartucho (o Kit) continua cartucho: o leque sai da superfície do ricochete.
  const pelaMunicao = R.classificar(pelaArma);
  const modo = arremesso ? pelaMunicao : pedido === 'ricochete' && pelaMunicao === 'cartucho' ? 'cartucho' : R.classificar({ pedido, ...pelaArma });
  const pedidoDoToken = tokenAtirador?.document ?? tokenAtirador;
  const tokenAtq = pedidoDoToken?.actor?.uuid === atacante.uuid ? pedidoDoToken : tokenNaCena(atacante, lista[0]?.parent ?? canvas.scene);
  if (!conferirArmaVeicular(arma, modo, { atacante, tokenAtq })) return null;
  const montada = Boolean(arma.system.instaladoEm || arma.getFlag(SISTEMA, 'armaVeicular'));
  if (resolverAtaques && !lista.length && modo !== 'supressivo') { ui.notifications.warn('Marque um alvo (tecla T sobre o token) antes de atacar.'); return null; }
  if (resolverAtaques && modo === 'supressivo' && !tokenAtq) { ui.notifications.warn(`Ponha o token de ${atacante.name} na cena para o fogo supressivo.`); return null; }
  if (modo === 'supressivo' && !arma.system.supressivo) { ui.notifications.warn(`${arma.name} não faz fogo supressivo.`); return null; }
  if (modo === 'autofogo' && !arma.system.autofogo) { ui.notifications.warn(`${arma.name} não tem autofogo.`); return null; }
  // Sem mestre na mesa ninguém resolve o ataque de um jogador: avisa antes de gastar a bala e de rolar.
  if (resolverAtaques && !game.user.isGM && !game.users.activeGM) { ui.notifications.warn('Sem mestre na mesa: o ataque precisa do mestre para resolver a defesa e o dano.'); return null; }
  destinos ??= resolverAtaques ? await perguntarDestinos(lista, modo) : {};
  if (destinos === null) return null;
  if (!conferirDestinos(lista, destinos, { modo, local })) return null;
  destinos = structuredClone(destinos);
  // Armas de 2077: a ligação da arma Smart, os modos da classe, a trava e a munição.
  const perfil = arma.perfil2077;
  const de2077 = {
    modo, perfil, pelaMunicao, pedido, ligadaSmart: atacante.temLigacaoSmart, pente: arma.system.pente.max ? arma.system.pente.value : null,
    municao: municao ? { smartMelhorada: Boolean(municao.getFlag(SISTEMA, 'arma2077')?.smartMelhorada) } : null,
    ferrolhoPendente: Boolean(arma.getFlag(SISTEMA, 'ferrolhoPendente'))
  };
  const impedido = R.impedimento2077(de2077);
  if (impedido) { ui.notifications.warn(`${arma.name}: ${impedido}`); return null; }
  const doisCanos = pedido === 'doisCanos';
  // As balas por tiro de 2077 (a Yukimura gasta 3; com menos no pente, dispara o que tem e causa o dano menor).
  // A carga Tech (o Kit): carregada, este ataque (que não seja explosivo nem supressivo) gasta a carga.
  const carga = perfil?.classe === 'tech' && R.gastaACarga(modo) ? cargaDa(arma) : null;
  const comPente = arma.system.aDistancia && arma.system.pente.max;
  const porTiro = comPente ? R.balasPorTiro({ modo, perfil, pente: arma.system.pente.value, doisCanos }) : null;
  // A Omaha carregada gasta até 3 balas por ataque.
  const balasDaCarga = comPente && carga ? R.balasDaCarga({ modo, perfil, pente: arma.system.pente.value }) : null;
  const balas = comPente ? (balasDaCarga ?? porTiro?.balas ?? R.balasDoModo(modo, { autofogo: perfil?.balasDoAutofogo, doisCanos })) : 0;
  if (balas && arma.system.pente.value < balas) { ui.notifications.warn(`${arma.name}: ${balas === 1 ? 'pente vazio' : `precisa de ${balas} balas no pente (tem ${arma.system.pente.value})`}. Recarregue.`); return null; }
  const { pericia, partes } = arma.partesDoAtaque(arremesso ? 'arremesso' : modo, { pericia: periciaDoGolpe, ator: alheia ? atacante : null });
  // Tiro mirado (p. 173): −8 no ataque (o bônus de tiro mirado do cyberware compensa).
  if (R.LOCAIS_MIRADOS[local]) partes.push({ rotulo: 'Mirado', valor: -8 + (atacante.system.bonus.tiroMirado || 0) });
  // O ricochete (o Kit): −4, ou −2 com o Ballistic Coprocessor; num tiro mirado, só a penalidade do mirado.
  const ricochete = pedido === 'ricochete' ? { penalidade: R.penalidadeDoRicochete({ coprocessador: atacante.temCoprocessador, mirado: Boolean(R.LOCAIS_MIRADOS[local]) }), cartucho: modo === 'cartucho' } : null;
  if (ricochete?.penalidade) partes.push({ rotulo: atacante.temCoprocessador ? 'Ricochete (Ballistic Coprocessor)' : 'Ricochete', valor: ricochete.penalidade });
  const golpe = R.MOVIMENTOS[movimento]?.teste === 'ataque' ? R.MOVIMENTOS[movimento] : null;
  const descricao = arremesso ? 'Arremesso' : `${golpe ? `${golpe.nome}, ` : ''}${R.descreverAtaque({ modo, local, doisCanos, ricochete, carga })}`;
  const contra = lista.length ? `contra ${lista.map(alvo => alvo.name).join(', ')}` : 'a até 25 m';
  // Os situacionais (a luneta, pela distância do primeiro alvo) e a janela de rolagem: fechada ou cancelada, não ataca nem
  // gasta bala. Sem a janela, entram os ligados por padrão.
  const situacionais = atacante.situacionaisDoAtaque(arma, { pericia: pericia.id, modo, local, metros: tokenAtq && lista[0] ? distancia(tokenAtq, lista[0]) : null });
  const escolha = perguntar ? await perguntarTeste(atacante, { rotulo: `${arma.name}: ${descricao}`, partes, situacionais }) : null;
  if (perguntar && !escolha) return null;
  if (perguntar && !conferirMira()) return null;
  if (perguntar && perfil?.classe === 'smart') {
    const impedimento = R.impedimento2077({ ...de2077, ligadaSmart: atacante.temLigacaoSmart });
    if (impedimento) { ui.notifications.warn(`${arma.name}: ${impedimento}`); return null; }
  }
  const escolhidas = escolha?.partes ?? situacionais.filter(situacional => situacional.ligado).map(({ rotulo, valor }) => ({ rotulo, valor }));
  // A munição Smart melhorada na arma Smart: as penalidades de visão não contam; as outras voltam na segunda chance.
  const smartMelhorada = R.smartMelhoradaVale({ perfil, municao: municao?.getFlag(SISTEMA, 'arma2077') });
  const extras = smartMelhorada ? escolhidas.filter(parte => !R.ehPenalidadeDeVisao(parte)) : escolhidas;
  if (!conferirArmaVeicular(arma, modo, { atacante, tokenAtq }) || !conferirDestinos(lista, destinos, { modo, local })) return null;
  if (balas && !montada) await arma.update({ 'system.pente.value': arma.system.pente.value - balas });
  // O ataque gasta a carga (a Omaha fica carregada até o fim do turno em que disparou); a Grad pede o ferrolho. O
  // "Desfazer" do mestre devolve os dois. Na montada, as marcas esperam a conferência depois da rolagem.
  const ferrolho = Boolean(perfil?.ferrolho && arma.system.aDistancia);
  if (!montada && (carga || ferrolho)) await marcarDisparo(arma, { carga, perfil, ferrolho });
  const { total, mensagem } = await testar(atacante, {
    rotulo: `${arma.name}: ${descricao}`, sabor: contra, partes: [...partes, ...extras], sorte: escolha?.sorte, modo: resolverAtaques && config('escondeAtaque') ? 'gm' : 'public', dados: { ataque: true }, categoria: 'ataque',
    semFalhaCritica: atacante.system.consciencia.semFalhaCritica
  });
  if (!conferirArmaVeicular(arma, modo, { atacante, tokenAtq }) || !conferirDestinos(lista, destinos, { modo, local })) return null;
  // Na arma montada, só gasta o pente depois de conferir a instalação ao fim da rolagem (a de outro dono, no mestre).
  if (balas && montada) {
    if (arma.system.pente.value < balas) { ui.notifications.warn(`${arma.name}: precisa de ${balas} balas no pente (tem ${arma.system.pente.value}). Recarregue.`); return null; }
    if (!penteNoMestre) await arma.update({ 'system.pente.value': arma.system.pente.value - balas });
  }
  if (montada && (carga || ferrolho)) await marcarDisparo(arma, { carga, perfil, ferrolho });
  const dados = {
    id: foundry.utils.randomID(), modo, arremesso, local, total, arma: arma.uuid, token: tokenAtq?.uuid ?? null, alvos: lista.map(alvo => alvo.uuid), mensagem: mensagem.id,
    atirador: alheia ? atacante.uuid : null,
    carga, doisCanos, porTiro, ricochete, ferrolho, destinos, movimento: golpe ? movimento : null,
    smartMelhorada: smartMelhorada ? { penalidades: [...partes, ...extras].filter(parte => parte.valor < 0), ignoradas: escolhidas.filter(R.ehPenalidadeDeVisao).map(parte => parte.rotulo) } : null
  };
  if (!resolverAtaques) return dados;
  if (game.user.isGM) return naFila(() => resolver(dados, game.user));
  game.socket.emit(CANAL, { tipo: 'ataque', pedido: dados, de: game.user.id });
  return dados;
}

async function marcarDisparo(arma, { carga, perfil, ferrolho }) {
  if (carga && perfil.cargaAteFimDoTurno) {
    const combate = combateDe(arma.actor);
    if (!carga.disparou) await arma.update({ [`flags.${SISTEMA}.cargaTech.disparou`]: { rodada: combate?.round ?? null, turno: combate?.turn ?? null } });
  } else if (carga) await arma.unsetFlag(SISTEMA, 'cargaTech');
  if (ferrolho) await arma.setFlag(SISTEMA, 'ferrolhoPendente', true);
}

// A carga Tech da arma (a flag cargaTech: { combate, rodada } de quando carregou), se ainda vale; senão, null.
export function cargaDa(arma) {
  const marca = arma.getFlag(SISTEMA, 'cargaTech');
  const combate = combateDe(arma.actor);
  return R.cargaValida(marca, combate && { id: combate.id, rodada: combate.round, turno: combate.turn }) ? marca : null;
}

// Carregar a arma Tech (o botão da ficha): gasta a Ação de Movimento, e o chat diz o que vale. Carregada, o botão
// descarrega.
export async function alternarCarga(arma) {
  if (arma.perfil2077?.classe !== 'tech') { ui.notifications.warn(`${arma.name} não é uma arma Tech.`); return null; }
  if (cargaDa(arma)) return arma.unsetFlag(SISTEMA, 'cargaTech');
  const combate = combateDe(arma.actor);
  await arma.setFlag(SISTEMA, 'cargaTech', { combate: combate?.id ?? null, rodada: combate?.round ?? null });
  const perfil = arma.perfil2077;
  const custo = perfil.cargaSemMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento';
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: arma.actor }),
    content: `<div class="${SISTEMA} cartao carga-tech"><p><b>${esc(arma.actor.name)}</b> carrega <b>${esc(arma.name)}</b> (${custo}). O próximo ataque é de ${efeitoDaCarga(perfil)} e ignora metade do SP; a carga fica até ${perfil.cargaAteFimDoTurno ? 'o fim do turno em que disparar' : 'disparar'} ou por ${R.CARGA_TECH.rodadas} rodadas.</p></div>`
  });
}
// "CDT 1, atravessa cobertura fina"; a Omaha, "CDT 2 e até 3 balas, atravessa…"; a Nekomata, "…cobertura fina e grossa".
function efeitoDaCarga(perfil) {
  const balas = perfil?.balasNaCarga ? ` e até ${perfil.balasNaCarga} balas` : '';
  return `CDT ${perfil?.cdtNaCarga || 1}${balas}, atravessa ${R.coberturaDaCarga(perfil)}`;
}

// ---------------- Na ficha: as armas de 2077 ----------------
// Na linha da arma: os botões dos modos de 2077 (modos), os que trocam um estado da arma (alternar: a coronha, a carga
// Tech), os avisos (sem a ligação da arma Smart, coronha recolhida), a dica do "Atacar" (o +1 da arma Smart) e as balas
// do autofogo.
export function acoesDe2077(arma) {
  const perfil = arma.perfil2077;
  const ator = arma.actor;
  const resultado = { modos: [], alternar: [], avisos: [], dicaAtaque: '', balasAutofogo: perfil?.balasDoAutofogo ?? R.BALAS_RAJADA };
  if (!perfil || !ator) return resultado;
  const doisAlvos = perfil.doisAlvos ? ` Trava dois alvos: marque os dois (o primeiro é o alvo); se o tiro não pegar, as balas vão para o segundo, a até ${R.ALCANCE_DOS_DOIS_ALVOS} m dele.` : '';
  if (perfil.doisCanos) resultado.modos.push({ modo: 'doisCanos', rotulo: 'Dois canos', dica: `Os dois canos de uma vez: ${perfil.doisCanos.dano} de dano, e gasta os 2 cartuchos.` });
  if (perfil.coronhaRetratil) {
    const recolhida = arma.coronhaRecolhida;
    resultado.alternar.push(recolhida
      ? { acao: 'alternarCoronha', rotulo: 'Estender', dica: 'Estender a coronha (uma Ação): os ataques voltam ao normal.' }
      : { acao: 'alternarCoronha', rotulo: 'Recolher', dica: 'Recolher a coronha: dá para esconder a arma, mas os ataques têm −1 até estender de novo (uma Ação).' });
    if (recolhida) resultado.avisos.push({ texto: 'coronha recolhida (−1)', dica: 'Dá para esconder a arma; os ataques têm −1 até estender a coronha (uma Ação).' });
  }
  if (perfil.ricocheteia) {
    const penalidade = R.penalidadeDoRicochete({ coprocessador: ator.temCoprocessador });
    const cartucho = arma.system.municoes.includes('shotgunShell') ? ` Com cartucho, o leque de ${R.ALCANCE_CARTUCHO} m sai da superfície do ricochete.` : '';
    resultado.modos.push({
      modo: 'ricochete', rotulo: 'Ricochete',
      dica: `Ricochete: ${penalidade} no ataque${ator.temCoprocessador ? ' (Ballistic Coprocessor)' : ''}, num alvo atrás de cobertura ou fora da linha de visão (no tiro mirado, só a penalidade dele); o alcance é a distância até o alvo.${cartucho}`
    });
  }
  if (perfil.classe === 'tech') {
    const efeito = `o próximo ataque (que não seja explosivo nem fogo supressivo) é de ${efeitoDaCarga(perfil)} e ignora metade do SP do alvo`;
    resultado.alternar.push(cargaDa(arma)
      ? { acao: 'alternarCarga', rotulo: 'Carregada', dica: `Carregada: ${efeito}. Clique para descarregar.` }
      : { acao: 'alternarCarga', rotulo: 'Carregar', dica: `Carregar (${perfil.cargaSemMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento'}): ${efeito}. Fica até ${perfil.cargaAteFimDoTurno ? 'o fim do turno em que disparar' : 'disparar'} ou por ${R.CARGA_TECH.rodadas} rodadas.` });
  }
  if (perfil.classe === 'power') resultado.dicaAtaque = `Arma Power: a lesão crítica causa ${R.BONUS_CRITICO_POWER} de dano bônus (no lugar de ${R.BONUS_CRITICO}).`;
  if (perfil.classe === 'smart') {
    if (!ator.temLigacaoSmart) resultado.avisos.push({ texto: 'sem ligação', dica: 'As armas Smart só disparam ligadas pelo Personal Link (o Interface Plug do Neuroport) ou pelo Subdermal Grip.' });
    else {
      const melhorada = R.smartMelhoradaVale({ perfil, municao: arma.municaoCarregada?.getFlag(SISTEMA, 'arma2077') })
        ? ` Munição Smart melhorada: as penalidades de visão não contam e, se errar por ${R.SEGUNDA_CHANCE.margem} ou menos, tenta de novo com ${R.SEGUNDA_CHANCE.base} + 1d10.` : '';
      resultado.dicaAtaque = `Arma Smart: +${R.BONUS_SMART} nos ataques à distância.${melhorada}${doisAlvos}`;
    }
  }
  // As balas por tiro (o tiro único) e a munição que a Zhuo aceita.
  if (perfil.balasPorTiro > 1) {
    const unidade = arma.system.municoes.length && arma.system.municoes.every(tipo => tipo === 'shotgunShell') ? 'cartuchos' : 'balas';
    const comMenos = perfil.danoComMenos ? `com menos no pente, dispara o que tem e causa ${perfil.danoComMenos}` : `com menos de ${perfil.minimoDeBalas || perfil.balasPorTiro} no pente, não dispara`;
    resultado.dicaAtaque = [resultado.dicaAtaque, `${perfil.balasPorTiro} ${unidade} por tiro (${comMenos}).`].filter(Boolean).join(' ');
  }
  // As regras de cada modelo: o ferrolho da Grad (o botão para manejar), o dano do mirado da Unity e as lesões de quem
  // dispara a Carnage e a Burya.
  if (perfil.ferrolho && arma.getFlag(SISTEMA, 'ferrolhoPendente')) {
    resultado.alternar.push({ acao: 'manejarFerrolho', rotulo: 'Manejar o ferrolho', dica: 'Depois do tiro, uma Ação para manejar o ferrolho antes de atirar de novo. Clique quando gastar a Ação.' });
    resultado.avisos.push({ texto: 'ferrolho', dica: 'Gaste uma Ação para manejar o ferrolho antes de atirar de novo.' });
  }
  const doModelo = [
    perfil.danoMirado ? `No tiro mirado, ${perfil.danoMirado} de dano.` : '',
    perfil.exigeBody && perfil.lesao ? `Quem dispara com BODY menor que ${perfil.exigeBody} sofre a lesão crítica ${R.nomeDaLesao2077(perfil.lesao)}.` : '',
    perfil.lesaoSemCromo ? `Quem dispara sem Grafted Muscle and Bone Lace nem cyberbraço sofre a lesão crítica ${R.nomeDaLesao2077(perfil.lesaoSemCromo)}.` : ''
  ].filter(Boolean);
  if (doModelo.length) resultado.dicaAtaque = [resultado.dicaAtaque, ...doModelo].filter(Boolean).join(' ');
  const carregada = arma.municaoCarregada;
  if (perfil.soSmartMelhorada && carregada && !carregada.getFlag(SISTEMA, 'arma2077')?.smartMelhorada) resultado.avisos.push({ texto: 'só Smart melhorada', dica: 'Esta arma só aceita munição Smart melhorada.' });
  return resultado;
}
