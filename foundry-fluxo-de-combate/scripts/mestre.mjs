// O motor (só no mestre ativo, um ataque de cada vez): lê o ataque que o cliente de quem atacou mandou, acha a DV
// pela distância, pergunta a defesa a cada alvo (ao jogador dele, ou ao mestre pelos NPCs), compara, rola o dano
// (quem atacou rola, se for jogador) e aplica pela ficha do alvo (armadura, cabeça, escudo, ablação), com as lesões
// críticas na ficha. No fim, mostra o cartão do ataque para todos e posta o cartão do resultado, com "Desfazer".
import { MODULE_ID, PERICIAS, ITENS, TIPOS_DE_ATOR, STATUS_SUPRIMIDO } from './constantes.mjs';
import * as R from './regras.mjs';
import { faixasDaTabela, rolarDano, rolarSegundaChance, aplicarDano, desfazerDano, lesaoCritica } from './sistema.mjs';
import { erro, perguntarAoJogador } from './socket.mjs';
import { JanelaDeDefesa, rolarEscolha } from './defesa.mjs';
import { postarResultado, resumoDoAlvo } from './cartao.mjs';
import { mostrarResultado } from './fx.mjs';

const { DialogV2 } = foundry.applications.api;
const config = chave => game.settings.get(MODULE_ID, chave);
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROTULO = { esquivar: 'esquivou', aguentar: 'aguentou', escudo: 'usou o escudo', concentrar: 'rolou a Concentração' };
const BOTAO = { esquivar: 'Esquivar', aguentar: 'Aguentar', escudo: 'Escudo', concentrar: 'Concentração' };
const precisaRolar = escolha => escolha === 'esquivar' || escolha === 'concentrar';

export const centroDe = token => ({ x: token.x + (token.width * token.parent.grid.size) / 2, y: token.y + (token.height * token.parent.grid.size) / 2 });
// Distância em metros (unidades da cena) entre os centros, com a diferença de elevação.
export function distancia(a, b) {
  const plano = a.parent.grid.measurePath([centroDe(a), centroDe(b)]).distance;
  const altura = (Number(a.elevation) || 0) - (Number(b.elevation) || 0);
  return Math.sqrt(plano * plano + altura * altura);
}

// O jogador que responde por um ator: o dono ativo (de preferência quem tem o ator como personagem).
export function jogadorDe(actor) {
  const donos = game.users.filter(user => user.active && !user.isGM && actor.testUserPermission(user, 'OWNER'));
  return donos.find(user => user.character && user.character.id === actor.id) || donos.sort((a, b) => a.id.localeCompare(b.id))[0] || null;
}

// Reflex Tuner (2077): +1 para esquivar pelo resto da rodada depois de ser atingido.
function reflexTunerAtivo(actor) {
  const ware = (actor.itemTypes.cyberware || []).find(item => item.name === ITENS.reflexTuner && item.system.isInstalled);
  const marca = actor.getFlag(MODULE_ID, 'atingido');
  const combate = game.combat;
  return Boolean(ware && marca && combate && marca.combate === combate.id && marca.rodada === combate.round);
}

function infoDoAlvo(ctx, token) {
  const actor = token.actor;
  const pericia = nome => actor.itemTypes.skill.find(skill => skill.name === nome);
  const nivel = nome => Number(pericia(nome)?.system.level) || 0;
  const ferimentos = Number(actor.getWoundStateMods?.()) || 0;
  const armadura = Number(actor.getArmorPenaltyMods?.('dex')) || 0;
  const reflexo = reflexTunerAtivo(actor) ? [{ value: 1, source: ITENS.reflexTuner }] : [];
  const dex = actor.getStat('dex');
  const will = actor.getStat('will');
  const ajuste = valor => (valor ? ` ${valor > 0 ? '+' : '−'} ${Math.abs(valor)}` : '');
  const escudo = (actor.getEquippedArmors?.('shield') || []).filter(item => Number(item.system.shieldHitPoints?.value) > 0)
    .sort((a, b) => b.system.shieldHitPoints.value - a.system.shieldHitPoints.value)[0];
  return {
    token,
    actor,
    nome: token.name,
    img: token.texture?.src || actor.img,
    dono: jogadorDe(actor),
    ref: actor.getStat('ref'),
    semPerna: actor.itemTypes.criticalInjury.some(item => item.name === ITENS.pernaDesmembrada),
    distancia: distancia(ctx.tokenAtq, token),
    esquiva: {
      texto: `DEX ${dex} + Evasão ${nivel(PERICIAS.evasao)}${ajuste(ferimentos)}${ajuste(armadura)}${reflexo.length ? ' + 1 (Reflex Tuner)' : ''} + 1d10`,
      media: dex + nivel(PERICIAS.evasao) + ferimentos + armadura + reflexo.length + R.MEDIA_D10,
      mods: reflexo
    },
    concentracao: { texto: `WILL ${will} + Concentração ${nivel(PERICIAS.concentracao)}${ajuste(ferimentos)} + 1d10`, mods: [] },
    escudo: escudo ? { nome: escudo.name, hp: Number(escudo.system.shieldHitPoints.value) } : null
  };
}

async function contexto(dados, usuario) {
  const cena = game.scenes.get(dados.cena);
  const tokenAtq = cena && cena.tokens.get(dados.token);
  const atacante = tokenAtq && tokenAtq.actor;
  if (!atacante) throw erro('Não achei quem atacou.');
  if (!usuario.isGM && !atacante.testUserPermission(usuario, 'OWNER')) throw erro('Você não controla quem atacou.');
  const arma = atacante.items.get(dados.arma);
  if (!arma) throw erro('Não achei a arma do ataque.');
  const municao = dados.municao || (typeof arma._getLoadedAmmoProp === 'function' ? arma._getLoadedAmmoProp('variety') : null) || null;
  const modo = R.classificar({ rolagem: dados.rolagem, aDistancia: Boolean(arma.system.isRanged), tipoDeArma: arma.system.weaponType, municao });
  const mirado = dados.rolagem === 'aimed';
  return {
    dados, usuario, cena, tokenAtq, atacante, arma, municao, modo, mirado,
    local: mirado ? dados.local || 'head' : 'body',
    // Ajustes do cpr-2077: tabela de DV, fórmula de dano, multiplicador máximo do autofogo, ablação, parte do SP
    // ignorada, fração que atravessa a cobertura, a segunda chance da Smart melhorada e notas.
    extra: dados.extra || {},
    // O total do ataque (a segunda chance da Smart melhorada troca, nos ataques de área).
    total: dados.total,
    descricao: (dados.extra && dados.extra.descricao) || R.descreverAtaque({ modo, mirado, local: dados.local || 'head' }),
    alvos: (dados.alvos || []).map(id => cena.tokens.get(id)).filter(token => token && token.actor),
    mensagem: game.messages.get(dados.mensagem) || null,
    cabecalho: '',
    linhas: [],
    notas: [...((dados.extra && dados.extra.notas) || [])]
  };
}

// ---------------- DV ----------------
async function dvDoAlvo(ctx, alvo) {
  for (const nome of ctx.extra.tabela ? [ctx.extra.tabela] : R.tabelasCandidatas(ctx.arma.system.dvTable, ctx.modo)) {
    const faixas = await faixasDaTabela(nome);
    if (faixas) return { ...R.dvPelaDistancia(faixas, alvo.distancia), tabela: nome };
  }
  return { dv: null, fora: false, tabela: null };
}

// Arma sem tabela de DV (feita à mão): o mestre diz a DV.
async function dvDoMestre(ctx, alvo) {
  const valor = await DialogV2.prompt({
    window: { title: 'DV do ataque', icon: 'fa-solid fa-crosshairs' },
    content: `<p>${esc(ctx.arma.name)} não tem tabela de DV. Qual a DV de ${esc(ctx.tokenAtq.name)} contra ${esc(alvo.nome)} (${R.formatarMedia(alvo.distancia)} m)?</p><input type="number" name="dv" value="15" autofocus>`,
    ok: { label: 'Usar esta DV', callback: (event, botao) => botao.form.elements.dv.valueAsNumber },
    rejectClose: false
  }).catch(() => null);
  return Number.isFinite(valor) ? valor : null;
}

// ---------------- Defesa ----------------
function pacoteDaPergunta(ctx, alvo, opcoes, padrao, dv) {
  const contra = `${ctx.arma.name} de ${ctx.tokenAtq.name}`;
  return {
    ataque: ctx.dados.id,
    alvoId: alvo.token.id,
    token: alvo.token.uuid,
    atacante: { nome: ctx.tokenAtq.name, img: ctx.tokenAtq.texture?.src || ctx.atacante.img },
    alvo: { nome: alvo.nome, img: alvo.img },
    arma: ctx.arma.name,
    modo: ctx.modo,
    descricao: ctx.descricao,
    distancia: ctx.modo === 'corpo' ? null : Math.round(alvo.distancia * 10) / 10,
    dv,
    opcoes,
    padrao,
    esquiva: alvo.esquiva,
    concentracao: alvo.concentracao,
    escudo: alvo.escudo,
    tempo: Number(config('tempo')) || 0,
    janela: Boolean(config('rolagemManual')),
    titulos: { esquivar: `Evasão contra ${contra}`, concentrar: `Concentração contra o fogo supressivo de ${ctx.tokenAtq.name}` },
    aviso: opcoes.includes('concentrar')
      ? `${ctx.tokenAtq.name} faz fogo supressivo! Role a Concentração para não correr para a cobertura.`
      : `${ctx.tokenAtq.name} ataca ${alvo.nome} com ${ctx.arma.name}: role a Evasão.`
  };
}

// Cartão só do mestre quando um jogador demora: botões para responder por ele.
function avisoDeEspera(ctx, alvo, perguntaId, opcoes) {
  const botoes = opcoes.map(opcao => `<button type="button" data-fluxo-forcar="${perguntaId}" data-escolha="${opcao}">${BOTAO[opcao]}</button>`).join('');
  return ChatMessage.create({
    content: `<div class="fluxo-espera"><p><i class="fa-solid fa-hourglass-half"></i> Esperando <b>${esc(alvo.dono.name)}</b> decidir a defesa de <b>${esc(alvo.nome)}</b> contra ${esc(ctx.arma.name)}.</p><div class="fluxo-botoes"><span>Responder por ele:</span>${botoes}</div></div>`,
    whisper: game.users.filter(user => user.isGM).map(user => user.id),
    speaker: { alias: 'Fluxo de Combate' },
    flags: { [MODULE_ID]: { espera: perguntaId } }
  });
}

const rolarNoMestre = (alvo, escolha, pacote) => rolarEscolha({ actor: alvo.actor, token: alvo.token, escolha, dados: { ...pacote, janela: false } });

// A defesa de um alvo: { escolha, total? }.
async function defender(ctx, alvo, { opcoes, dv = null }) {
  const padrao = R.escolhaPadrao(opcoes);
  if (opcoes.length === 1 && !precisaRolar(opcoes[0])) return { escolha: opcoes[0] };
  const pacote = pacoteDaPergunta(ctx, alvo, opcoes, padrao, dv);
  if (alvo.dono) {
    const promessa = perguntarAoJogador(alvo.dono.id, 'defender', pacote, ((Number(config('tempo')) || 60) + 15) * 1000);
    let criando = null;
    const relogio = setTimeout(() => { criando = avisoDeEspera(ctx, alvo, promessa.id, opcoes); }, 8000);
    const resposta = await promessa;
    clearTimeout(relogio);
    if (criando) (await criando.catch(() => null))?.delete().catch(() => {});
    if (resposta && resposta.escolha) {
      if (resposta.forcada) ctx.notas.push(`O mestre respondeu por ${alvo.dono.name}: ${ROTULO[resposta.escolha]}.`);
      else if (resposta.semResposta || resposta.fechou) ctx.notas.push(`${alvo.dono.name} ${resposta.fechou ? 'fechou a janela' : 'não respondeu a tempo'}: ${alvo.nome} ${ROTULO[resposta.escolha]}.`);
      if (resposta.total !== undefined || !precisaRolar(resposta.escolha)) return resposta;
      return rolarNoMestre(alvo, resposta.escolha, pacote);
    }
    ctx.notas.push(`${alvo.dono.name} não respondeu a tempo: ${alvo.nome} ${ROTULO[padrao]}.`);
    return rolarNoMestre(alvo, padrao, pacote);
  }
  // NPC (ou o jogador está fora): o mestre escolhe numa janela, ou o módulo escolhe pela média.
  if (opcoes.length > 1 && config('defesaDosNpcs') === 'mestre') {
    const resposta = await JanelaDeDefesa.perguntar({ ...pacote, mestre: true, total: ctx.dados.total, janela: false });
    return rolarNoMestre(alvo, (resposta && resposta.escolha) || padrao, pacote);
  }
  const escolha = opcoes.length > 1 ? R.escolhaAutomatica({ opcoes, modo: ctx.modo, dv, mediaEsquiva: alvo.esquiva.media }) : opcoes[0];
  return rolarNoMestre(alvo, escolha, pacote);
}

// Linha do cartão de um alvo (na ordem dos alvos).
function linhaDe(ctx, token) {
  const linha = { token, nome: token.name, img: token.texture?.src || token.actor.img, ator: token.actor.uuid, resultado: null, notas: [] };
  ctx.linhas.push(linha);
  return linha;
}

// Defesa de um alvo que já está no alcance. Preenche a linha e devolve se pegou.
async function defesaDoAlvo(ctx, linha, alvo, dv) {
  const esquiva = R.podeEsquivar({ modo: ctx.modo, ref: alvo.ref, exigeRef8: config('exigeRef8'), semPerna: alvo.semPerna });
  const opcoes = R.opcoesDeDefesa({ modo: ctx.modo, esquiva, escudo: Boolean(alvo.escudo) });
  const resposta = await defender(ctx, alvo, { opcoes, dv });
  linha.escolha = resposta.escolha;
  linha.defesa = resposta.total ?? null;
  linha.dv = dv;
  if (alvo.semPerna && ctx.modo !== 'supressivo') linha.notas.push('Sem a perna, não esquiva.');
  const pegou = R.acertou({ modo: ctx.modo, escolha: resposta.escolha, ataque: ctx.total, defesa: linha.defesa, dv });
  linha.pegou = pegou;
  linha.resultado = pegou === null ? 'semDv' : pegou ? 'acertou' : resposta.escolha === 'esquivar' ? 'esquivou' : 'errou';
  return pegou;
}

// ---------------- Dano ----------------
const ajustesDoDano = ctx => ({ formula: ctx.extra.formula || null, multiplicadorMax: Number(ctx.extra.multiplicadorMax) || null, ablacao: Number(ctx.extra.ablacao) || null, ignorarSP: Number(ctx.extra.ignorarSP) || null });

// Munição Smart melhorada (Mission Kit p. 32): errou por 5 ou menos, 14 + 1d10 contra o mesmo número. Devolve o total
// novo, ou null se não houve segunda chance. A nota vai para `onde` (a linha do alvo ou o cartão).
async function tentarDeNovo(ctx, contra, onde = ctx.notas) {
  if (!ctx.extra.segundaChance || ['corpo', 'supressivo'].includes(ctx.modo)) return null;
  if (!R.temSegundaChance({ ataque: ctx.total, contra })) return null;
  const penalidades = Number(ctx.extra.penalidades) || 0;
  const nova = await rolarSegundaChance({ actor: ctx.atacante, token: ctx.tokenAtq, arma: ctx.arma, base: R.SEGUNDA_CHANCE.base, penalidades });
  onde.push(`Segunda chance da munição Smart melhorada: ${R.SEGUNDA_CHANCE.base} + 1d10${penalidades ? ` ${penalidades}` : ''} = ${nova.total} contra ${contra}: ${nova.total > contra ? 'acertou' : 'errou de novo'}.`);
  return nova.total;
}

// Ataque através de cobertura (extra.fracao, de quem pedir): só a fração chega ao alvo (o resto fica na cobertura). Nada passa: null.
function atravessar(ctx, linha, dano) {
  const fracao = ctx.extra.fracao;
  if (fracao === undefined || fracao === null || Number(fracao) >= 1) return dano;
  const passa = Math.floor(dano.total * Number(fracao));
  linha.cobertura = { rolado: dano.total, passou: passa };
  if (passa <= 0) { linha.notas.push(`Nada dos ${dano.total} atravessou a cobertura.`); return null; }
  linha.notas.push(`${passa} dos ${dano.total} atravessaram a cobertura; o resto ficou nela.`);
  return { ...dano, total: passa };
}

// Quem atacou rola, se for um jogador conectado (com a janela do sistema); senão, o mestre rola sozinho.
async function rolarDanoDoAtaque(ctx, { multiplicador = 1, titulo = '' } = {}) {
  const jogador = !ctx.usuario.isGM && ctx.usuario.active && ctx.atacante.testUserPermission(ctx.usuario, 'OWNER') ? ctx.usuario : null;
  const local = ctx.mirado ? ctx.local : 'body';
  if (jogador && config('rolagemManual')) {
    const resposta = await perguntarAoJogador(jogador.id, 'dano', {
      token: ctx.tokenAtq.uuid, arma: ctx.arma.id, modo: ctx.modo, mirado: ctx.mirado, local, multiplicador, janela: true, titulo, ...ajustesDoDano(ctx),
      aviso: `Acertou! Role o dano de ${ctx.arma.name}${ctx.modo === 'autofogo' ? ` (2d6 × ${multiplicador})` : ''}.`
    }, ((Number(config('tempo')) || 60) + 15) * 1000);
    if (resposta && Number.isFinite(Number(resposta.total))) return resposta;
    ctx.notas.push(`${jogador.name} não rolou o dano a tempo: o mestre rolou.`);
  }
  return rolarDano({ actor: ctx.atacante, token: ctx.tokenAtq, arma: ctx.arma, modo: ctx.modo, mirado: ctx.mirado, local, multiplicador, janela: false, titulo, ...ajustesDoDano(ctx) });
}

// Aplica o dano rolado num alvo e cuida das lesões: dois 6 (tabela da cabeça só em tiro mirado na cabeça), tiro na
// perna que passou da armadura (Perna Quebrada), mortalmente ferido atingido de novo. Marca o Reflex Tuner.
async function ferir(ctx, linha, dano, { escudo = false } = {}) {
  const actor = linha.token.actor;
  const jaMortal = Number(actor.system.derivedStats.hp.value) < 1;
  const efeito = await aplicarDano(actor, { total: dano.total, bonus: dano.bonus, local: dano.local, extra: dano.extra, escudo });
  linha.dano = { ...efeito, rolado: dano.total, formula: dano.formula, bonus: dano.bonus, critico: dano.critico, autofogo: dano.autofogo, localMirado: dano.local, lesoes: [], serio: Number(actor.system.derivedStats.seriouslyWounded) || 0 };
  const modoLesao = config('lesaoCritica');
  const lesao = async opcoes => {
    if (modoLesao === 'nao') return;
    const feita = await lesaoCritica(actor, { token: linha.token, naFicha: modoLesao === 'ficha', ...opcoes });
    if (feita) linha.dano.lesoes.push({ nome: feita.nome, id: feita.item ? feita.item.id : null });
  };
  if (dano.critico) await lesao({ cabeca: dano.local === 'head' });
  if (ctx.mirado && dano.local === 'leg' && efeito.perdeu > 0) await lesao({ nome: ITENS.pernaQuebrada });
  if (ctx.mirado && dano.local === 'heldItem' && efeito.perdeu > 0) linha.notas.push(`${linha.nome} larga o item na mão que ${ctx.tokenAtq.name} escolher.`);
  if (jaMortal && config('mortalmenteFerido')) {
    linha.notas.push('Já estava mortalmente ferido: lesão crítica a mais.');
    await lesao({});
  }
  if (game.combat && game.combat.started) await actor.setFlag(MODULE_ID, 'atingido', { combate: game.combat.id, rodada: game.combat.round });
}

// ---------------- Modos ----------------
const podeDefender = token => token.actor && TIPOS_DE_ATOR.includes(token.actor.type);

// Tiro, autofogo e corpo a corpo: cada alvo se defende; o dano sai para cada um que foi atingido.
// Um alvo: alcance, DV e defesa. Devolve a linha se o ataque pegou.
async function resolverAlvo(ctx, token) {
  const linha = linhaDe(ctx, token);
  if (!podeDefender(token)) { linha.resultado = 'ignorado'; return null; }
  const alvo = infoDoAlvo(ctx, token);
  linha.distancia = alvo.distancia;
  let dv = null;
  if (ctx.modo !== 'corpo') {
    const achada = await dvDoAlvo(ctx, alvo);
    if (achada.fora) { linha.resultado = 'fora'; return null; }
    dv = achada.dv ?? (await dvDoMestre(ctx, alvo));
  }
  if (await defesaDoAlvo(ctx, linha, alvo, dv)) return { linha, alvo };
  // Errou (ou o alvo esquivou) por pouco: a segunda chance da Smart melhorada, só contra este alvo.
  if (!['errou', 'esquivou'].includes(linha.resultado)) return null;
  const contra = linha.escolha === 'esquivar' ? linha.defesa : linha.dv;
  const nova = await tentarDeNovo(ctx, contra, linha.notas);
  if (nova === null || !(nova > contra)) return null;
  Object.assign(linha, { ataque: nova, pegou: true, resultado: 'acertou' });
  return { linha, alvo };
}

// Arma Smart que trava dois alvos (Tsunami Kappa): o ataque vai no primeiro; se não pegar, as balas mudam para o
// segundo, se ele estiver a até 4 m do primeiro.
const ALCANCE_DO_REDIRECIONAMENTO = 4;
async function redirecionado(ctx) {
  const [primeiro, segundo] = ctx.alvos;
  const pegou = await resolverAlvo(ctx, primeiro);
  if (pegou) return [pegou];
  if (distancia(primeiro, segundo) > ALCANCE_DO_REDIRECIONAMENTO + 0.5) {
    ctx.notas.push(`${segundo.name} está a mais de ${ALCANCE_DO_REDIRECIONAMENTO} m de ${primeiro.name}: as balas Smart não mudam de alvo.`);
    return [];
  }
  const segundaVez = await resolverAlvo(ctx, segundo);
  ctx.linhas[ctx.linhas.length - 1].notas.push(`As balas Smart mudaram de alvo: ${primeiro.name} não foi atingido.`);
  return segundaVez ? [segundaVez] : [];
}

async function individual(ctx) {
  const pendentes = ctx.extra.redirecionar && ctx.alvos.length >= 2
    ? await redirecionado(ctx)
    : (await Promise.all(ctx.alvos.map(token => resolverAlvo(ctx, token)))).filter(Boolean);
  if (config('dano') === 'manual') { for (const { linha } of pendentes) linha.notas.push('Role o dano pelo botão do cartão do ataque.'); return; }
  for (const { linha } of ctx.linhas.map(l => pendentes.find(p => p.linha === l)).filter(Boolean)) {
    const contra = linha.escolha === 'esquivar' ? linha.defesa : linha.dv;
    const multiplicador = ctx.modo === 'autofogo' ? R.multiplicadorDeAutofogo(linha.ataque ?? ctx.total, contra) : 1;
    const dano = atravessar(ctx, linha, await rolarDanoDoAtaque(ctx, { multiplicador, titulo: ctx.alvos.length > 1 ? `${ctx.arma.name} em ${linha.nome}` : '' }));
    if (dano) await ferir(ctx, linha, dano, { escudo: linha.escolha === 'escudo' });
  }
}

// Área (explosivo e cartucho): todos se defendem; o dano é rolado uma vez e vale para cada um que ficou.
async function danoNaArea(ctx, pegos) {
  if (!pegos.length) return;
  if (config('dano') === 'manual') { ctx.notas.push('Role o dano pelo botão do cartão do ataque e aplique em quem ficou na área.'); return; }
  const dano = await rolarDanoDoAtaque(ctx);
  for (const linha of ctx.linhas.filter(l => pegos.includes(l))) {
    const passou = atravessar(ctx, linha, dano);
    if (passou) await ferir(ctx, linha, passou, { escudo: linha.escolha === 'escudo' });
  }
}

// Espingarda com cartucho: um ataque contra DV 13; se acertar, cada alvo à frente, até 6 m, leva 3d6 (rolado uma vez).
async function cartucho(ctx) {
  if (!(ctx.total > R.DV_CARTUCHO)) ctx.total = (await tentarDeNovo(ctx, R.DV_CARTUCHO)) ?? ctx.total;
  const passou = ctx.total > R.DV_CARTUCHO;
  ctx.cabecalho = `contra DV ${R.DV_CARTUCHO} do cartucho: ${passou ? 'acertou' : 'errou'}`;
  const pegos = [];
  await Promise.all(ctx.alvos.map(async token => {
    const linha = linhaDe(ctx, token);
    if (!podeDefender(token)) { linha.resultado = 'ignorado'; return; }
    const alvo = infoDoAlvo(ctx, token);
    linha.distancia = alvo.distancia;
    if (!passou) { linha.resultado = 'errou'; linha.dv = R.DV_CARTUCHO; return; }
    if (alvo.distancia > R.ALCANCE_CARTUCHO + 0.5) { linha.resultado = 'fora'; linha.notas.push(`Além dos ${R.ALCANCE_CARTUCHO} m do cartucho.`); return; }
    if (await defesaDoAlvo(ctx, linha, alvo, R.DV_CARTUCHO)) pegos.push(linha);
  }));
  await danoNaArea(ctx, pegos);
}

// Tokens dentro da área de 10 × 10 m em volta do alvo (o centro deles), menos os escondidos.
function naArea(ctx, principal) {
  const metade = ((R.AREA_EXPLOSIVO / 2) / ctx.cena.grid.distance) * ctx.cena.grid.size;
  const centro = centroDe(principal);
  return ctx.cena.tokens.filter(token => token.actor && !token.hidden && R.dentroDaArea(centro, centroDe(token), metade));
}

// Explosivo: o ataque contra a DV do alcance do alvo; se errar, o mestre decide onde caiu. Se acertar, todos na
// área (10 × 10 m) levam o dano, menos quem esquivar (REF 8+, a esquiva tem de passar do ataque).
async function explosao(ctx) {
  const principal = ctx.alvos[0];
  const infoPrincipal = infoDoAlvo(ctx, principal);
  const achada = await dvDoAlvo(ctx, infoPrincipal);
  if (achada.fora) {
    ctx.cabecalho = `fora do alcance (${R.formatarMedia(infoPrincipal.distancia)} m)`;
    Object.assign(linhaDe(ctx, principal), { resultado: 'fora', distancia: infoPrincipal.distancia });
    return;
  }
  const dv = achada.dv ?? (await dvDoMestre(ctx, infoPrincipal));
  if (dv !== null && ctx.total <= dv) ctx.total = (await tentarDeNovo(ctx, dv)) ?? ctx.total;
  if (dv === null || ctx.total <= dv) {
    ctx.cabecalho = dv === null ? 'sem DV' : `contra DV ${dv} (${R.formatarMedia(infoPrincipal.distancia)} m): errou. O mestre decide onde caiu.`;
    Object.assign(linhaDe(ctx, principal), { resultado: 'errou', dv, distancia: infoPrincipal.distancia });
    return;
  }
  ctx.cabecalho = `contra DV ${dv} (${R.formatarMedia(infoPrincipal.distancia)} m): explodiu na área de ${R.AREA_EXPLOSIVO} × ${R.AREA_EXPLOSIVO} m`;
  const area = config('area') ? naArea(ctx, principal) : [];
  const atingidos = [...new Set([...ctx.alvos, ...area])];
  const pegos = [];
  await Promise.all(atingidos.map(async token => {
    const linha = linhaDe(ctx, token);
    if (!podeDefender(token)) { linha.resultado = 'ignorado'; return; }
    const alvo = infoDoAlvo(ctx, token);
    linha.distancia = alvo.distancia;
    if (await defesaDoAlvo(ctx, linha, alvo, dv)) pegos.push(linha);
  }));
  await danoNaArea(ctx, pegos);
}

// Quem o fogo supressivo pega sem alvo marcado: todos a até 25 m, à vista (sem parede no meio, se o mestre está
// vendo a cena), menos quem atirou, os escondidos e os já caídos.
function sobFogo(ctx) {
  const veCena = canvas.ready && canvas.scene && canvas.scene.id === ctx.cena.id;
  const origem = centroDe(ctx.tokenAtq);
  return ctx.cena.tokens.filter(token => {
    if (token.id === ctx.tokenAtq.id || token.hidden || !podeDefender(token)) return false;
    if (token.actor.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return false;
    if (distancia(ctx.tokenAtq, token) > R.RAIO_SUPRESSAO + 0.5) return false;
    if (!veCena) return true;
    try { return !CONFIG.Canvas.polygonBackends.sight.testCollision(origem, centroDe(token), { type: 'sight', mode: 'any' }); } catch { return true; }
  });
}

// Fogo supressivo: cada um rola WILL + Concentração + 1d10 contra o ataque; quem perde fica Suprimido (gasta a
// próxima Ação de Movimento indo para a cobertura). O status sai no fim do próximo turno dele.
async function supressao(ctx) {
  const afetados = ctx.alvos.length ? ctx.alvos.filter(podeDefender) : config('supressao') ? sobFogo(ctx) : [];
  ctx.cabecalho = afetados.length ? `fogo supressivo em ${afetados.length} ${afetados.length === 1 ? 'pessoa' : 'pessoas'}` : 'fogo supressivo: ninguém à vista a até 25 m';
  await Promise.all(afetados.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.distancia = alvo.distancia;
    const perdeu = await defesaDoAlvo(ctx, linha, alvo, null);
    linha.resultado = perdeu ? 'suprimido' : 'firme';
    if (perdeu) await suprimir(token);
    linha.suprimido = perdeu;
  }));
}

export async function suprimir(token) {
  const actor = token.actor;
  await actor.toggleStatusEffect(STATUS_SUPRIMIDO, { active: true });
  const combate = game.combat && game.combat.started ? game.combat : null;
  await actor.setFlag(MODULE_ID, 'suprimido', combate ? { combate: combate.id, rodada: combate.round, turno: combate.turn } : { combate: null });
}

// ---------------- Operações (pedidos ao mestre) ----------------
// O último ataque resolvido (para macros e para o teste): quem, o resultado de cada alvo e o cartão.
export let ultimo = null;

export const operacoes = {
  async ataque(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    if (ctx.modo === 'supressivo') await supressao(ctx);
    else if (!ctx.alvos.length) throw erro('O ataque não tem alvo.');
    else if (ctx.modo === 'explosivo') await explosao(ctx);
    else if (ctx.modo === 'cartucho') await cartucho(ctx);
    else await individual(ctx);
    // O cartão do ataque, escondido dos jogadores até a defesa, aparece para todos.
    if (dados.revelar && ctx.mensagem) await ctx.mensagem.update({ whisper: [] }).catch(() => {});
    for (const linha of ctx.linhas) mostrarResultado(linha.token, resumoDoAlvo(ctx, linha)).catch(error => console.warn(`${MODULE_ID} | efeito`, error));
    const cartao = await postarResultado(ctx);
    ultimo = {
      ataque: dados.id, modo: ctx.modo, total: ctx.total, cartao: cartao && cartao.id, mensagem: dados.mensagem, notas: ctx.notas, cabecalho: ctx.cabecalho,
      descricao: ctx.descricao,
      linhas: ctx.linhas.map(l => ({ token: l.token.id, nome: l.nome, resultado: l.resultado, ataque: l.ataque ?? null, escolha: l.escolha ?? null, defesa: l.defesa ?? null, dv: l.dv ?? null, distancia: l.distancia ?? null, dano: l.dano ? { ...l.dano } : null, cobertura: l.cobertura || null, suprimido: Boolean(l.suprimido), notas: l.notas }))
    };
    return ultimo;
  },

  // Desfaz o resultado de um ataque: HP, armadura e escudo de volta, as lesões e o Suprimido saem da ficha.
  async desfazer({ mensagem }, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre desfaz um ataque.');
    const msg = game.messages.get(mensagem);
    const resultado = msg && msg.getFlag(MODULE_ID, 'resultado');
    if (!resultado || resultado.desfeito) throw erro('Este ataque já foi desfeito (ou não há o que desfazer).');
    for (const item of resultado.desfazer || []) {
      const actor = await fromUuid(item.ator);
      if (!actor) continue;
      if (item.dano) await desfazerDano(actor, item.dano);
      const lesoes = (item.lesoes || []).filter(id => actor.items.has(id));
      if (lesoes.length) await actor.deleteEmbeddedDocuments('Item', lesoes);
      if (item.suprimido) {
        await actor.toggleStatusEffect(STATUS_SUPRIMIDO, { active: false });
        await actor.unsetFlag(MODULE_ID, 'suprimido');
      }
    }
    await msg.update({ [`flags.${MODULE_ID}.resultado.desfeito`]: true, content: msg.content.replace('class="fluxo-cartao', 'class="fluxo-cartao fluxo-desfeito') });
    return { desfeito: true };
  }
};
