// Ataque, defesa e dano: o Fluxo de Combate dentro do sistema (as regras ficam em regras.mjs).
// - Quem ataca marca os alvos (T) e rola pela ficha; o total vai só para ele e para o mestre até a defesa.
// - O mestre ativo resolve: a DV pela distância, a defesa de cada alvo (o jogador do alvo escolhe e rola no computador
//   dele, sem ver o total; pelos NPCs, o mestre escolhe ou o sistema decide), o dano (quem atacou rola, se for
//   jogador) e a ficha (armadura, cabeça, escudo, ablação, Lesão Crítica). No fim, o cartão do resultado, com
//   "Desfazer" para o mestre.
// - Modos: tiro, mirado (cabeça, perna, item na mão), corpo a corpo, autofogo, fogo supressivo, espingarda com
//   cartucho e explosivo em área; das armas de 2077, o ricochete, a carga e a rajada Tech e o teste Smart.
import { ATORES_DA_NET, DEFESAS, SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { animar, textoFlutuante } from './efeitos.mjs';
import { TABELAS_DV } from './gerado.mjs';
import { JanelaDeDefesa } from './janela-defesa.mjs';
import { perguntarTeste } from './janela-rolagem.mjs';
import { aplicarDanoDeNet } from './net.mjs';
import { lesaoCritica, PERNA_QUEBRADA } from './lesoes.mjs';
import * as R from './regras.mjs';
import { rolarDano, testar } from './rolagens.mjs';

const CANAL = `system.${SISTEMA}`;
export const STATUS_SUPRIMIDO = `${SISTEMA}-suprimido`;
const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const renderizar = (arquivo, dados) => foundry.applications.handlebars.renderTemplate(`systems/${SISTEMA}/templates/chat/${arquivo}`, dados);
export const souOMestreAtivo = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const ROTULO = { esquivar: 'esquivou', aguentar: 'aguentou', escudo: 'usou o escudo', concentrar: 'rolou a Concentração' };
const BOTAO = { ...DEFESAS, escudo: 'Escudo', concentrar: 'Rolar Concentração' };
const precisaRolar = escolha => escolha === 'esquivar' || escolha === 'concentrar';

// ---------------- Pedidos pelo socket (com resposta) ----------------
// O mestre pede algo a um jogador (a defesa, o dano, o Death Save) e espera; passou o tempo, segue sem a resposta.
const esperando = new Map();
// As janelas de defesa abertas neste cliente, pelo id do pedido: o mestre fecha quando desiste de esperar.
const janelas = new Map();

export function pedir(usuario, pedido, dados, tempo = (Number(config('tempo')) + 15) * 1000) {
  const id = foundry.utils.randomID();
  const promessa = new Promise(resolve => {
    const relogio = setTimeout(() => desistir(id, null), tempo);
    esperando.set(id, resposta => { clearTimeout(relogio); esperando.delete(id); resolve(resposta); });
  });
  promessa.id = id;
  game.socket.emit(CANAL, { tipo: 'pedido', id, usuario: usuario.id, pedido, dados });
  return promessa;
}

// O mestre encerra um pedido sem a resposta do jogador (o tempo acabou, ou respondeu por ele): a janela do jogador fecha.
export function desistir(id, resposta) {
  if (!esperando.has(id)) return false;
  game.socket.emit(CANAL, { tipo: 'expirou', id });
  esperando.get(id)(resposta);
  return true;
}

// No cliente do jogador, as rolagens pedidas abrem a janela de rolagem (menos com "Rolar direto"), que o mestre fecha
// quando o prazo do pedido acaba (a janela entra em "janelas" pelo id do pedido).
const registrarJanela = id => (id ? janela => janelas.set(id, janela) : null);
const TRATADORES = {
  defesa: (dados, id) => perguntarDefesa(dados, { id }),
  dano: (dados, id) => rolarDanoDoAtacante(dados, { id }),
  // A rolagem do netrunner na NET (o netrun/estado.mjs pede): a Interface ou o ataque do programa, pela janela de
  // rolagem. A janela cancelada volta como { cancelado }.
  net: async ({ ator, rolagem, programa, extras, aviso }, id) => {
    const quem = await fromUuid(ator);
    if (!quem) return null;
    if (aviso) ui.notifications.info(aviso);
    const opcoes = { perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) };
    const resultado = programa ? await quem.rolarAtaqueDePrograma(quem.items.get(programa), opcoes) : await quem.rolarInterface(rolagem, { ...opcoes, extras: extras ?? [] });
    janelas.delete(id);
    return resultado ? { total: resultado.total } : { cancelado: true };
  },
  deathSave: async ({ ator }, id) => {
    const resultado = await (await fromUuid(ator)).rolarDeathSave({ perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) });
    janelas.delete(id);
    return resultado && { total: resultado.total, passou: resultado.passou };
  }
};

// Um ataque por vez no mestre, como o Fluxo: o próximo só começa quando o anterior termina (a defesa, o dano e o
// cartão), para as janelas de reação e os pedidos não se misturarem. O "Desfazer" não entra na fila: o mestre não
// espera o ataque em curso para desfazer outro.
let fila = Promise.resolve();
function naFila(tarefa) {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => {});
  return resultado;
}

export function registrarCombate() {
  game.socket.on(CANAL, async mensagem => {
    if (mensagem.tipo === 'ataque' && souOMestreAtivo()) {
      await naFila(() => resolver(mensagem.pedido, game.users.get(mensagem.de))).catch(erro => console.error(`${SISTEMA} | ataque`, erro));
    } else if (mensagem.tipo === 'pedido' && mensagem.usuario === game.user.id) {
      const tratar = TRATADORES[mensagem.pedido];
      const resposta = tratar ? await tratar(mensagem.dados, mensagem.id).catch(erro => { console.error(`${SISTEMA} | ${mensagem.pedido}`, erro); return null; }) : null;
      game.socket.emit(CANAL, { tipo: 'resposta', id: mensagem.id, resposta: resposta ?? null });
    } else if (mensagem.tipo === 'resposta') {
      esperando.get(mensagem.id)?.(mensagem.resposta);
    } else if (mensagem.tipo === 'expirou') {
      // A janela de reação fecha sem resposta (expirar); a de rolagem, só fecha.
      const janela = janelas.get(mensagem.id);
      if (janela?.expirar) janela.expirar(); else janela?.close();
      janelas.delete(mensagem.id);
    } else if (mensagem.tipo === 'texto') {
      textoFlutuante(mensagem.dados);
    }
  });
}

// ---------------- Tokens e distância ----------------
// O token de um ator na cena (o do próprio ataque, se o ator é de um token).
const tokenNaCena = (ator, cena = canvas.scene) => ator.token ?? cena?.tokens.find(token => token.actorId === ator.id) ?? null;
export const centroDe = token => ({ x: token.x + (token.width * token.parent.grid.size) / 2, y: token.y + (token.height * token.parent.grid.size) / 2 });
// Distância em metros entre dois tokens da mesma cena, pela grade da cena, com a diferença de elevação.
export function distancia(a, b) {
  if (!a || !b || a.parent !== b.parent) return null;
  const plano = a.parent.grid.measurePath([centroDe(a), centroDe(b)]).distance;
  const altura = (Number(a.elevation) || 0) - (Number(b.elevation) || 0);
  return Math.round(Math.sqrt(plano * plano + altura * altura) * 10) / 10;
}

// O jogador que responde por um ator: o dono ativo (de preferência quem tem o ator como personagem).
export function jogadorDe(ator) {
  const donos = game.users.filter(usuario => usuario.active && !usuario.isGM && ator.testUserPermission(usuario, 'OWNER'));
  return donos.find(usuario => usuario.character?.id === ator.id) ?? donos[0] ?? null;
}

// ---------------- No cliente de quem ataca ----------------
// alvos (ou alvo, um só): Tokens ou TokenDocuments; padrão, os marcados. local: "corpo" ou mirado ("cabeca", "perna",
// "item"). modo: os botões da ficha ("autofogo", "supressivo" e os de 2077: "ricochete", "carga", "rajadaTech",
// "smart", "doisCanos"); senão, a arma e a munição dizem (tiro, cartucho, explosivo). cobertura: a do alvo na carga
// Tech ("nenhuma", "fina", "grossa"); sem ela, a janela pergunta a quem atira. perguntar: abre a janela de rolagem (a
// ficha abre; Ctrl + clique, não).
export async function atacar(arma, { alvos = null, alvo = null, local = 'corpo', modo: pedido = null, cobertura = null, perguntar = false } = {}) {
  const atacante = arma.actor;
  if (!atacante) return null;
  const marcados = (alvos ?? (alvo ? [alvo] : [...game.user.targets])).map(token => token?.document ?? token).filter(token => token?.actor);
  // O Black ICE e o demônio ficam na NET: a arma não os atinge (o dano neles vem dos programas e do Zap).
  const lista = marcados.filter(token => !ATORES_DA_NET.includes(token.actor.type));
  if (lista.length < marcados.length) ui.notifications.warn('O Black ICE e o demônio estão na NET: a arma não os atinge.');
  if (marcados.length && !lista.length) return null;
  const municao = arma.municaoCarregada;
  const pelaArma = { aDistancia: arma.system.aDistancia, tipoDeArma: arma.system.tipo, municao: municao?.system.tipo };
  const modo = R.classificar({ pedido, ...pelaArma });
  const tokenAtq = tokenNaCena(atacante, lista[0]?.parent ?? canvas.scene);
  if (!lista.length && modo !== 'supressivo') { ui.notifications.warn('Marque um alvo (tecla T sobre o token) antes de atacar.'); return null; }
  if (modo === 'supressivo' && !tokenAtq) { ui.notifications.warn(`Ponha o token de ${atacante.name} na cena para o fogo supressivo.`); return null; }
  if (modo === 'supressivo' && !arma.system.supressivo) { ui.notifications.warn(`${arma.name} não faz fogo supressivo.`); return null; }
  if (modo === 'autofogo' && !arma.system.autofogo) { ui.notifications.warn(`${arma.name} não tem autofogo.`); return null; }
  // Sem mestre na mesa ninguém resolve o ataque de um jogador: avisa antes de gastar a bala e de rolar.
  if (!game.user.isGM && !game.users.activeGM) { ui.notifications.warn('Sem mestre na mesa: o ataque precisa do mestre para resolver a defesa e o dano.'); return null; }
  // Armas de 2077: o Smart Link, os modos da classe, a carga que esfria e a cobertura do alvo (quem atira diz).
  const perfil = arma.perfil2077;
  const de2077 = { modo, perfil, pelaMunicao: R.classificar(pelaArma), pedido, smartLink: atacante.temSmartLink, smartSemLink: config('smartSemLink') };
  const tech = modo === 'carga' || modo === 'rajadaTech';
  const esfria = tech ? esfriaAte(arma) : null;
  let impedido = R.impedimento2077(de2077) ?? (esfria ? `ainda está esfriando: carrega de novo na rodada ${esfria}.` : null);
  if (!impedido && tech) {
    cobertura ??= await perguntarCobertura(arma, modo);
    if (!cobertura) return null;
    impedido = R.impedimento2077({ ...de2077, cobertura });
  }
  if (impedido) { ui.notifications.warn(`${arma.name}: ${impedido}`); return null; }
  const doisCanos = pedido === 'doisCanos';
  const balas = arma.system.aDistancia && arma.system.pente.max ? R.balasDoModo(modo, { rajadaTech: perfil?.balasDaRajadaTech, autofogo: perfil?.balasDoAutofogo, doisCanos }) : 0;
  if (balas && arma.system.pente.value < balas) { ui.notifications.warn(`${arma.name}: ${balas === 1 ? 'pente vazio' : `precisa de ${balas} balas no pente (tem ${arma.system.pente.value})`}. Recarregue.`); return null; }
  const smart = R.testeSmart({ perfil, modo, local, pedido, smartLink: de2077.smartLink, smartAtaque: config('smartAtaque') });
  const { pericia, partes } = arma.partesDoAtaque(modo, { smart });
  // Tiro mirado (p. 173): −8 no ataque (o bônus de tiro mirado do cyberware compensa).
  if (R.LOCAIS_MIRADOS[local]) partes.push({ rotulo: 'Mirado', valor: -8 + (atacante.system.bonus.tiroMirado || 0) });
  if (modo === 'ricochete' && atacante.temCoprocessador) partes.push({ rotulo: 'Ballistic Coprocessor', valor: R.BONUS_COPROCESSADOR });
  if (!tech) cobertura = null;
  const descricao = R.descreverAtaque({ modo, local, smart, cobertura, doisCanos });
  const contra = lista.length ? `contra ${lista.map(alvo => alvo.name).join(', ')}` : 'a até 25 m';
  // Os situacionais (a luneta, pela distância do primeiro alvo) e a janela de rolagem: fechada ou cancelada, não ataca nem
  // gasta bala. Sem a janela, entram os ligados por padrão.
  const situacionais = atacante.situacionaisDoAtaque(arma, { pericia: pericia.id, modo, local, metros: tokenAtq && lista[0] ? distancia(tokenAtq, lista[0]) : null });
  const escolha = perguntar ? await perguntarTeste(atacante, { rotulo: `${arma.name}: ${descricao}`, partes, situacionais }) : null;
  if (perguntar && !escolha) return null;
  const extras = escolha?.partes ?? situacionais.filter(situacional => situacional.ligado).map(({ rotulo, valor }) => ({ rotulo, valor }));
  if (balas) await arma.update({ 'system.pente.value': arma.system.pente.value - balas });
  // A carga marca a rodada na arma, para esfriar; o "Desfazer" do mestre tira a marca.
  const carga = tech ? await marcarCarga(arma) : null;
  const { total, mensagem } = await testar(atacante, {
    rotulo: `${arma.name}: ${descricao}`, sabor: contra, partes: [...partes, ...extras], sorte: escolha?.sorte, modo: config('escondeAtaque') ? 'gm' : 'public', dados: { ataque: true }, categoria: 'ataque',
    semFalhaCritica: atacante.system.consciencia.semFalhaCritica
  });
  const dados = {
    id: foundry.utils.randomID(), modo, local, total, arma: arma.uuid, token: tokenAtq?.uuid ?? null, alvos: lista.map(alvo => alvo.uuid), mensagem: mensagem.id,
    smart, cobertura, carga, doisCanos
  };
  if (game.user.isGM) return naFila(() => resolver(dados, game.user));
  game.socket.emit(CANAL, { tipo: 'ataque', pedido: dados, de: game.user.id });
  return dados;
}

// A cobertura do alvo na carga Tech, que quem atira diz. A rajada não atravessa cobertura grossa: nem aparece.
function perguntarCobertura(arma, modo) {
  const opcoes = Object.entries(R.COBERTURAS).filter(([, cobertura]) => cobertura[modo] > 0);
  const passa = opcoes.filter(([chave]) => chave !== 'nenhuma').map(([, cobertura]) => `${Math.round(cobertura[modo] * 100)}% da ${cobertura.rotulo}`).join(' e ');
  return DialogV2.wait({
    window: { title: `${arma.name}: ${R.MODOS[modo]}` }, classes: [SISTEMA, 'cobertura'],
    content: `<p>O alvo está atrás de cobertura? A ${modo === 'carga' ? 'carga' : 'rajada'} atravessa ${passa}${modo === 'rajadaTech' ? '; a grossa, não' : ''}.</p>`,
    buttons: opcoes.map(([chave, cobertura]) => ({ action: chave, label: chave === 'nenhuma' ? 'Sem cobertura' : `Atrás de ${cobertura.rotulo}`, default: chave === 'nenhuma' })),
    rejectClose: false
  }).catch(() => null);
}

async function marcarCarga(arma) {
  const combate = combateDe(arma.actor);
  if (!combate) return null;
  const marca = { combate: combate.id, rodada: combate.round };
  await arma.setFlag(SISTEMA, 'carga', marca);
  return marca;
}

// No cliente de quem atacou (jogador): rola o dano, com os dados aparecendo para ele, e devolve ao mestre. A janela de
// rolagem (o modificador do mestre) abre, menos com "Rolar direto"; fechada, o mestre rola.
async function rolarDanoDoAtacante({ arma, multiplicador, formula }, { id = null } = {}) {
  const dano = await rolarDano(await fromUuid(arma), { falar: true, multiplicador, formula, perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) });
  if (id) janelas.delete(id);
  return dano && { total: dano.total, critico: dano.critico, bonus: dano.bonus, formula: dano.formula };
}

// ---------------- No cliente de quem defende ----------------
// A janela de reação (janela-defesa.mjs: sem o total do ataque, menos para o mestre, com a conta de cada escolha e o
// tempo) e a rolagem dele. O mestre a fechou (desistiu de esperar ou respondeu por ele): null. Sem resposta no tempo, ou
// fechada no X, vale a escolha padrão (a resposta diz qual dos dois).
export async function perguntarDefesa(pacote, { id = null, mestre = false } = {}) {
  const [arma, alvo] = await Promise.all([fromUuid(pacote.arma), fromUuid(pacote.alvo)]);
  const ator = alvo.actor;
  let resposta = pacote.opcoes.length === 1 && !precisaRolar(pacote.opcoes[0]) ? { escolha: pacote.opcoes[0] } : null;
  if (!resposta) {
    // A conta de cada escolha sai do ator, aqui: a esquiva, a Concentração e o escudo.
    const escudo = ator.escudo;
    resposta = await JanelaDeDefesa.perguntar({
      ...pacote, mestre, arma: arma.name, tempo: mestre ? 0 : Number(config('tempo')) || 0,
      atacante: { nome: pacote.atacante, img: pacote.imgAtq || 'icons/svg/mystery-man.svg' }, alvo: { nome: alvo.name, img: alvo.texture?.src || ator.img },
      esquiva: R.contaDaDefesa(ator.partesDaPericia('evasion').partes), concentracao: R.contaDaDefesa(ator.partesDaPericia('concentration').partes),
      escudo: escudo ? { nome: escudo.name, pv: escudo.system.pvEscudo.value } : null
    }, registrarJanela(id));
    if (id) janelas.delete(id);
    if (!resposta) return null;
  }
  const { escolha } = resposta;
  const comoFoi = { fechou: Boolean(resposta.fechou), semResposta: Boolean(resposta.semResposta) };
  if (!precisaRolar(escolha)) return { escolha, ...comoFoi };
  // O jogador rola na janela de rolagem (menos com "Rolar direto", ou quando valeu a escolha padrão: aí rola direto),
  // ainda dentro do prazo do pedido; pelos NPCs, o mestre rola direto.
  const perguntar = !mestre && !config('rolarDireto') && !comoFoi.fechou && !comoFoi.semResposta;
  const resultado = await rolarDefesa(ator, alvo.name, escolha, { perguntar, aoAbrir: registrarJanela(id) });
  if (id) janelas.delete(id);
  return resultado && { ...resultado, ...comoFoi };
}

// Esquiva (DEX + Evasão + 1d10) ou Concentração (WILL + Concentração + 1d10), com as penalidades do alvo. Com a janela de
// rolagem (perguntar), os situacionais, os modificadores comuns, o do mestre e a Sorte; fechada, null.
async function rolarDefesa(ator, nome, escolha, { perguntar = false, aoAbrir = null } = {}) {
  const pericia = escolha === 'concentrar' ? 'concentration' : 'evasion';
  const rotulo = `${escolha === 'concentrar' ? 'Concentração' : 'Esquiva'} de ${nome}`;
  let { partes } = ator.partesDaPericia(pericia);
  let sorte;
  if (perguntar) {
    const fixas = ator.partesDaPericia(pericia, { situacionais: [] }).partes;
    const resposta = await perguntarTeste(ator, { rotulo, partes: fixas, situacionais: ator.situacionaisDoTeste(pericia), aoAbrir });
    if (!resposta) return null;
    partes = [...fixas, ...resposta.partes];
    sorte = resposta.sorte;
  }
  const { total } = await testar(ator, { rotulo, partes, sorte, dados: { defesa: escolha }, categoria: 'defesa' });
  return { escolha, defesa: total };
}

// ---------------- No mestre ativo ----------------
async function contexto(pedido, usuario) {
  const arma = await fromUuid(pedido.arma);
  const atacante = arma?.actor;
  if (!atacante || !usuario) return null;
  if (!usuario.isGM && !atacante.testUserPermission(usuario, 'OWNER')) return null;
  const tokenAtq = pedido.token ? await fromUuid(pedido.token) : null;
  const alvos = (await Promise.all(pedido.alvos.map(uuid => fromUuid(uuid)))).filter(token => token?.actor);
  return {
    pedido, usuario, arma, atacante, tokenAtq, cena: tokenAtq?.parent ?? alvos[0]?.parent ?? canvas.scene, alvos,
    modo: pedido.modo, local: pedido.local, descricao: R.descreverAtaque(pedido), nomeAtq: tokenAtq?.name ?? atacante.name,
    perfil: arma.perfil2077, cobertura: R.COBERTURAS[pedido.cobertura] ?? null,
    linhas: [], notas: notasDe2077(pedido, arma), rolagens: [], marcas: pedido.carga ? [{ ator: arma.uuid, chave: 'carga', ...pedido.carga }] : [], cabecalho: ''
  };
}

// A regra de 2077 deste ataque, para o cartão.
function notasDe2077(pedido, arma) {
  const notas = [];
  if (pedido.smart) notas.push(`Teste Smart: ${pedido.smart} + 1d10 no lugar de REF + perícia.`);
  if (pedido.doisCanos) {
    const dano = arma.perfil2077?.doisCanos?.dano;
    notas.push(`Os dois canos de uma vez: gastou 2 cartuchos${dano ? `, e o dano é ${dano}` : ''}.`);
  }
  if (pedido.modo === 'ricochete') {
    notas.push(`Ricochete: DV da tabela ${R.tabelaDoRicochete(arma.system.tipo).replace('DV ', '')} e ${R.umDadoAMenos(arma.system.dano)} de dano (um dado a menos).`);
  }
  const cobertura = R.COBERTURAS[pedido.cobertura];
  if (cobertura) {
    const onde = pedido.cobertura === 'nenhuma' ? 'sem cobertura' : `através de ${cobertura.rotulo}`;
    const esfria = pedido.carga && config('cargaEsfria') ? ' A arma esfria uma rodada.' : '';
    notas.push(`${R.MODOS[pedido.modo]} ${onde}: chega ${Math.round(cobertura[pedido.modo] * 100)}% do dano, e a armadura perde ${cobertura.ablacao} de SP se o dano passar dela.${esfria}`);
  }
  return notas;
}

// Defesa, acerto, dano e o cartão do resultado. Devolve o resumo (macros e o teste leem).
export async function resolver(pedido, usuario = game.user) {
  const ctx = await contexto(pedido, usuario);
  if (!ctx) return null;
  if (ctx.modo === 'supressivo') await supressao(ctx);
  else if (ctx.modo === 'explosivo') await explosao(ctx);
  else if (ctx.modo === 'cartucho') await cartucho(ctx);
  else await individual(ctx);
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
  for (const nome of R.tabelasCandidatas(ctx.arma.system.tabelaDV, ctx.modo, ctx.arma.system.tipo)) {
    if (TABELAS_DV[nome]) return R.dvPelaDistancia(TABELAS_DV[nome], alvo.metros);
  }
  return { dv: null, fora: false, semTabela: true };
}

// Arma sem tabela de DV (feita à mão): o mestre diz a DV.
async function dvDoMestre(ctx, alvo) {
  const valor = await DialogV2.prompt({
    window: { title: 'DV do ataque' },
    content: `<p>${esc(ctx.arma.name)} não tem tabela de DV. Qual a DV de ${esc(ctx.nomeAtq)} contra ${esc(alvo.nome)} (${alvo.metros} m)?</p><input type="number" name="dv" value="15" autofocus>`,
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
    alvo: alvo.token.uuid, arma: ctx.arma.uuid, atacante: ctx.nomeAtq, imgAtq: ctx.tokenAtq?.texture?.src || ctx.atacante.img, modo: ctx.modo, descricao: ctx.descricao,
    metros: ctx.modo === 'corpo' ? null : alvo.metros, dv, opcoes, padrao, ...(config('escondeAtaque') ? {} : { total: ctx.pedido.total })
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

const linhaDe = (ctx, token) => {
  const linha = { token, nome: token.name, img: token.texture?.src || token.actor.img, resultado: null, notas: [] };
  ctx.linhas.push(linha);
  return linha;
};

// A defesa de um alvo já no alcance. Preenche a linha e devolve se pegou.
async function defesaDoAlvo(ctx, linha, alvo, dv) {
  const esquiva = R.podeEsquivar({ modo: ctx.modo, ref: alvo.ref, exigeRef8: config('exigeRef8'), semPerna: alvo.semPerna });
  const opcoes = R.opcoesDeDefesa({ modo: ctx.modo, esquiva, escudo: Boolean(alvo.escudo) });
  const resposta = await defender(ctx, alvo, { opcoes, dv });
  Object.assign(linha, { escolha: resposta.escolha, defesa: resposta.defesa ?? null, dv });
  if (alvo.semPerna && ctx.modo !== 'supressivo') linha.notas.push('Sem a perna, não esquiva.');
  const pegou = R.acertou({ modo: ctx.modo, escolha: resposta.escolha, ataque: ctx.pedido.total, defesa: linha.defesa, dv });
  linha.pegou = pegou;
  linha.resultado = pegou === null ? 'semDv' : pegou ? 'acertou' : resposta.escolha === 'esquivar' ? 'esquivou' : 'errou';
  return pegou;
}

// ---------------- Dano ----------------
// "O primeiro da rodada" (Ponto Fraco e Deflexão de Dano do Solo): uma vez por rodada do combate de que o ator participa,
// marcado nele; fora de combate não há rodada, e toda vez conta como a primeira. As marcas do ataque (e a da carga Tech,
// na arma) vão para o cartão: o "Desfazer" as devolve.
const combateDe = ator => game.combats.find(combate => combate.started && combate.combatants.some(c => c.actor === ator)) ?? null;
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

// A rodada em que a arma Tech carrega de novo, no combate do dono; null se já pode (ou a regra está desligada).
export function esfriaAte(arma) {
  if (!config('cargaEsfria')) return null;
  const combate = combateDe(arma.actor);
  return R.rodadaDaProximaCarga(arma.getFlag(SISTEMA, 'carga'), combate && { id: combate.id, rodada: combate.round });
}

// Quem atacou rola, se for um jogador conectado; senão (ou se ele não responder), o mestre. O Ponto Fraco do Solo soma
// no dano (antes da armadura) do primeiro acerto dele na rodada.
async function rolarDanoDoAtaque(ctx, { multiplicador = 1, formula = null } = {}) {
  let dano = null;
  const jogador = !ctx.usuario.isGM && ctx.usuario.active ? ctx.usuario : null;
  if (jogador && config('jogadorRolaDano')) {
    const resposta = await pedir(jogador, 'dano', { arma: ctx.arma.uuid, multiplicador, formula });
    if (Number.isFinite(Number(resposta?.total))) dano = resposta;
    else ctx.notas.push(`${jogador.name} não rolou o dano a tempo: o mestre rolou.`);
  }
  if (!dano) {
    const rolado = await rolarDano(ctx.arma, { multiplicador, formula });
    ctx.rolagens.push(rolado.roll);
    dano = { total: rolado.total, critico: rolado.critico, bonus: rolado.bonus, formula: rolado.formula };
  }
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
// primeiro dano que ele sofre na rodada. A munição de borracha não mata nem causa lesão crítica (wiki, munições). Na
// carga Tech, a ablação é a da carga (4 sem cobertura, 2 através dela), no lugar da munição.
async function ferir(ctx, linha, dano, { escudo = false } = {}) {
  const ator = linha.token.actor;
  const jaMortal = ator.system.hp.value < 1;
  const municao = ctx.arma.municaoCarregada;
  const borracha = municao?.system.efeito === 'rubber';
  const deflexao = ator.system.consciencia.deflexao && primeiraNaRodada(ator, 'deflexao') ? ator.system.consciencia.deflexao : 0;
  const efeito = await ator.receberDano({
    dano: dano.total, bonus: dano.bonus, local: ctx.local, ignorarPct: ctx.arma.system.ignorarArmadura, ignorarAbaixo: ctx.arma.system.ignorarAbaixo,
    ablacao: ctx.cobertura?.ablacao ?? municao?.system.ablacao ?? 1, letal: !borracha, escudo, explosivo: ctx.modo === 'explosivo', reducao: deflexao
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
    const feita = await lesaoCritica(ator, { naFicha: modo === 'ficha', ...opcoes });
    if (feita) linha.dano.lesoes.push({ nome: feita.nome, item: feita.item?.id ?? null });
  };
  if (dano.critico) await lesao({ cabeca: ctx.local === 'cabeca' });
  if (ctx.local === 'perna' && efeito.passou) await lesao({ id: PERNA_QUEBRADA });
  if (ctx.local === 'item' && efeito.passou) linha.notas.push(`${linha.nome} larga o item na mão que ${ctx.nomeAtq} escolher.`);
  if (jaMortal && !borracha && config('mortalmenteFerido')) {
    linha.notas.push('Já estava mortalmente ferido: uma lesão crítica a mais.');
    await lesao({});
  }
  // Reflex Tuner (2077): atingido, +1 para se esquivar pelo resto da rodada. A marca vai para o cartão, e o "Desfazer"
  // a tira.
  if (ator.temReflexTuner) await marcarRodada(ctx, ator, 'atingido');
}

// ---------------- Modos ----------------
// Um alvo de tiro, autofogo ou corpo a corpo: alcance, DV e defesa. Devolve a linha se o ataque pegou.
async function resolverAlvo(ctx, token) {
  const linha = linhaDe(ctx, token);
  const alvo = infoDoAlvo(ctx, token);
  linha.metros = alvo.metros;
  let dv = null;
  if (ctx.modo !== 'corpo') {
    const achada = dvDoAlvo(ctx, alvo);
    if (achada.fora) { linha.resultado = 'fora'; return null; }
    dv = achada.dv ?? (achada.semTabela ? await dvDoMestre(ctx, alvo) : null);
  }
  return (await defesaDoAlvo(ctx, linha, alvo, dv)) ? linha : null;
}

// Munição que não causa dano (biotoxina, veneno, EMP...): quem foi pego não leva o dano da arma, e o cartão diz o efeito
// dela, que o mestre resolve. Devolve se era o caso.
function semDano(ctx, linhas) {
  const municao = ctx.arma.municaoCarregada;
  const efeito = R.MUNICAO_SEM_DANO[municao?.system.efeito];
  if (!efeito) return false;
  for (const linha of linhas) linha.notas.push(`${municao.name}: não causa dano. ${efeito[0].toUpperCase()}${efeito.slice(1)} O mestre resolve.`);
  return true;
}

// Arma Smart que trava dois alvos (a Tsunami Kappa), no teste Smart: o tiro vai no primeiro marcado; se não pegar, as
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
// autofogo e a rajada Tech rolam 2d6 × o multiplicador (até o da arma); o ricochete, um dado a menos.
async function individual(ctx) {
  const doisAlvos = ctx.pedido.smart && ctx.perfil?.doisAlvos && ctx.alvos.length >= 2;
  const atingidas = new Set((await (doisAlvos ? redirecionado(ctx) : Promise.all(ctx.alvos.map(token => resolverAlvo(ctx, token))))).filter(Boolean));
  const pegas = ctx.linhas.filter(l => atingidas.has(l));
  if (semDano(ctx, pegas)) return;
  const rajada = ctx.modo === 'autofogo' || ctx.modo === 'rajadaTech';
  const maximo = ctx.modo === 'rajadaTech' ? ctx.perfil.rajadaTech : ctx.arma.system.autofogo;
  const formula = rajada ? '2d6' : ctx.modo === 'ricochete' ? R.umDadoAMenos(ctx.arma.system.dano) : null;
  for (const linha of pegas) {
    const contra = linha.escolha === 'esquivar' ? linha.defesa : linha.dv;
    const multiplicador = rajada ? R.multiplicadorDeAutofogo(ctx.pedido.total, contra, maximo) : 1;
    if (rajada) linha.multiplicador = multiplicador;
    const dano = atravessar(ctx, linha, await rolarDanoDoAtaque(ctx, { multiplicador, formula }));
    if (dano) await ferir(ctx, linha, dano, { escudo: linha.escolha === 'escudo' });
  }
}

// A carga Tech através de cobertura: só a fração do dano chega ao alvo; o resto fica na cobertura. Nada passou: null.
function atravessar(ctx, linha, dano) {
  const fracao = ctx.cobertura?.[ctx.modo] ?? 1;
  if (fracao >= 1) return dano;
  const passou = R.atravessarCobertura(dano.total, fracao);
  const rotulo = ctx.cobertura.rotulo;
  linha.notas.push(passou > 0 ? `${passou} dos ${dano.total} de dano atravessaram a ${rotulo}; o resto ficou nela.` : `Nada dos ${dano.total} de dano atravessou a ${rotulo}.`);
  return passou > 0 ? { ...dano, total: passou } : null;
}

// Área (explosivo e cartucho): o dano é rolado uma vez e vale para cada um que ficou.
async function danoNaArea(ctx, pegas, formula = null) {
  if (!pegas.length || semDano(ctx, pegas)) return;
  const dano = await rolarDanoDoAtaque(ctx, { formula });
  for (const linha of ctx.linhas.filter(l => pegas.includes(l))) await ferir(ctx, linha, dano, { escudo: linha.escolha === 'escudo' });
}

// Espingarda com cartucho: um ataque contra DV 13; se acertar, cada alvo à frente, até 6 m, leva 3d6 (rolado uma vez).
async function cartucho(ctx) {
  const passou = ctx.pedido.total > R.DV_CARTUCHO;
  ctx.cabecalho = `contra DV ${R.DV_CARTUCHO} do cartucho: ${passou ? 'acertou' : 'errou'}`;
  const pegas = [];
  await Promise.all(ctx.alvos.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.metros = alvo.metros;
    if (!passou) { Object.assign(linha, { resultado: 'errou', dv: R.DV_CARTUCHO }); return; }
    if (alvo.metros !== null && alvo.metros > R.ALCANCE_CARTUCHO + 0.5) { linha.resultado = 'fora'; linha.notas.push(`Além dos ${R.ALCANCE_CARTUCHO} m do cartucho.`); return; }
    if (await defesaDoAlvo(ctx, linha, alvo, R.DV_CARTUCHO)) pegas.push(linha);
  }));
  // Os dois cartuchos de uma vez (a Testera): o dano da arma para isso.
  await danoNaArea(ctx, pegas, (ctx.pedido.doisCanos && ctx.perfil?.doisCanos?.dano) || '3d6');
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
  if (dv === null || ctx.pedido.total <= dv) {
    ctx.cabecalho = dv === null ? 'sem DV: o mestre decide' : `contra DV ${dv}${onde}: errou. O mestre decide onde caiu.`;
    Object.assign(linhaDe(ctx, principal), { resultado: dv === null ? 'semDv' : 'errou', dv, metros: info.metros });
    return;
  }
  ctx.cabecalho = `contra DV ${dv}${onde}: explodiu na área de ${R.AREA_EXPLOSIVO} × ${R.AREA_EXPLOSIVO} m`;
  const atingidos = [...new Set([...ctx.alvos, ...(config('area') ? naArea(ctx, principal) : [])])];
  const pegas = [];
  await Promise.all(atingidos.map(async token => {
    const linha = linhaDe(ctx, token);
    const alvo = infoDoAlvo(ctx, token);
    linha.metros = alvo.metros;
    if (await defesaDoAlvo(ctx, linha, alvo, dv)) pegas.push(linha);
  }));
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

// ---------------- Na ficha: as armas de 2077 ----------------
// Na linha da arma: os botões dos modos de 2077 (modos), os que trocam um estado da arma (alternar: a coronha), os
// avisos (sem Smart Link, esfriando, coronha recolhida), o teste Smart que o "Atacar" usa, com a dica, e as balas do
// autofogo.
export function acoesDe2077(arma) {
  const perfil = arma.perfil2077;
  const ator = arma.actor;
  const resultado = { modos: [], alternar: [], avisos: [], smart: 0, dicaAtaque: '', balasAutofogo: perfil?.balasDoAutofogo ?? R.BALAS_RAJADA };
  if (!perfil || !ator) return resultado;
  const doisAlvos = perfil.doisAlvos ? ` Trava dois alvos: marque os dois (o primeiro é o alvo); se o tiro não pegar, as balas vão para o segundo, a até ${R.ALCANCE_DOS_DOIS_ALVOS} m dele.` : '';
  if (perfil.doisCanos && (perfil.doisCanos.dano || ator.temSmartLink)) {
    const efeito = perfil.doisCanos.teste ? `teste Smart ${perfil.doisCanos.teste} + 1d10` : `${perfil.doisCanos.dano} de dano`;
    resultado.modos.push({ modo: 'doisCanos', rotulo: 'Dois canos', dica: `Os dois canos de uma vez: ${efeito}, e gasta os 2 cartuchos.` });
  }
  if (perfil.coronhaRetratil) {
    const recolhida = arma.coronhaRecolhida;
    resultado.alternar.push(recolhida
      ? { acao: 'alternarCoronha', rotulo: 'Estender', dica: 'Estender a coronha (uma Ação): os ataques voltam ao normal.' }
      : { acao: 'alternarCoronha', rotulo: 'Recolher', dica: 'Recolher a coronha: dá para esconder a arma, mas os ataques têm −1 até estender de novo (uma Ação).' });
    if (recolhida) resultado.avisos.push({ texto: 'coronha recolhida (−1)', dica: 'Dá para esconder a arma; os ataques têm −1 até estender a coronha (uma Ação).' });
  }
  if (perfil.ricocheteia) {
    const coprocessador = ator.temCoprocessador ? ` Ballistic Coprocessor: +${R.BONUS_COPROCESSADOR}.` : '';
    resultado.modos.push({ modo: 'ricochete', rotulo: 'Ricochete', dica: `Ricochete: tiro único num alvo atrás de cobertura. DV da tabela de autofogo, um dado a menos de dano; REF 8+ esquiva.${coprocessador}` });
  }
  if (perfil.classe === 'tech') {
    resultado.modos.push({ modo: 'carga', rotulo: 'Carga', dica: 'Carga Tech: tiro único que atravessa cobertura (metade da fina, um quarto da grossa); se o dano passar, a armadura perde 4 de SP (2 através de cobertura). A arma esfria uma rodada.' });
    if (perfil.rajadaTech) {
      resultado.modos.push({ modo: 'rajadaTech', rotulo: `Rajada ×${perfil.rajadaTech}`, dica: `Rajada Tech: autofogo carregado (tabela da SMG, até ×${perfil.rajadaTech}), ${perfil.balasDaRajadaTech} balas; atravessa um quarto da cobertura fina e nada da grossa. A arma esfria uma rodada.` });
    }
    const rodada = esfriaAte(arma);
    if (rodada) resultado.avisos.push({ texto: `esfriando: carga na rodada ${rodada}`, dica: 'Depois de uma carga, a arma Tech esfria uma rodada.' });
  }
  if (perfil.classe === 'smart') {
    const smartLink = ator.temSmartLink;
    if (!smartLink) resultado.avisos.push({ texto: 'sem Smart Link', dica: config('smartSemLink') === 'naoDispara' ? 'As armas Smart só disparam com o cyberware Smart Link instalado.' : 'Sem o Smart Link, dispara como arma comum (REF + perícia).' });
    else if (config('smartAtaque') === 'alternativa') resultado.modos.push({ modo: 'smart', rotulo: 'Smart', dica: `Teste Smart: ${perfil.smart} + 1d10 no lugar de REF + perícia.${doisAlvos}` });
    resultado.smart = R.testeSmart({ perfil, modo: 'tiro', smartLink, smartAtaque: config('smartAtaque') });
    if (resultado.smart) resultado.dicaAtaque = `Teste Smart: ${resultado.smart} + 1d10 no lugar de REF + perícia.${doisAlvos}`;
  }
  return resultado;
}

// ---------------- Cartão do resultado e "Desfazer" ----------------
const RESULTADOS = {
  acertou: 'acertou', errou: 'errou', esquivou: 'esquivou', fora: 'fora do alcance', semDv: 'sem DV: o mestre decide',
  suprimido: 'suprimido: gasta o próximo movimento indo para a cobertura', firme: 'ficou firme'
};

// A barra de HP do alvo no cartão (só o desenho: o número está na linha do dano), em texto (o 0 também desenha).
const barraDeHp = linha => {
  const max = linha.token?.actor?.system.hp?.max;
  return linha.dano && max ? String(Math.max(0, Math.min(100, Math.round((100 * linha.dano.hpDepois) / max)))) : null;
};

async function cartaoDoResultado(ctx) {
  const linhas = ctx.linhas.map(l => ({
    nome: l.nome, img: l.img, resultado: l.resultado, rotulo: RESULTADOS[l.resultado] ?? l.resultado, escolha: l.escolha ?? null, defesa: l.defesa ?? null,
    dv: l.dv ?? null, metros: l.metros ?? null, multiplicador: l.multiplicador ?? null, dano: l.dano ?? null, suprimido: Boolean(l.suprimido), notas: l.notas
  }));
  const resumo = { id: ctx.pedido.id, modo: ctx.modo, descricao: ctx.descricao, local: ctx.local, ataque: ctx.pedido.total, atacante: ctx.nomeAtq, arma: ctx.arma.name, cabecalho: ctx.cabecalho, notas: ctx.notas, linhas };
  const desfazer = ctx.linhas.filter(l => l.dano || l.suprimido).map(l => ({
    ator: l.token.actor.uuid, suprimido: Boolean(l.suprimido), lesoes: (l.dano?.lesoes ?? []).map(lesao => lesao.item).filter(Boolean),
    dano: l.dano ? { perdeu: l.dano.hpAntes - l.dano.hpDepois, armaduraId: l.dano.armaduraId, lugar: l.dano.lugar, ablado: l.dano.ablado, escudoId: l.dano.escudoId, escudoAblado: l.dano.escudoAblado } : null
  }));
  const content = await renderizar('ataque.hbs', { ...resumo, linhas: linhas.map((l, i) => ({ ...l, hp: barraDeHp(ctx.linhas[i]), contra: l.escolha === 'esquivar' || l.escolha === 'concentrar' ? `${l.escolha === 'concentrar' ? 'Concentração' : 'esquiva'} ${l.defesa}` : l.dv !== null ? `DV ${l.dv}` : null, escolhaNome: ROTULO[l.escolha] ?? '' })), desfazer: desfazer.length > 0 });
  const para = destinatarios(ctx);
  await ChatMessage.implementation.create({ speaker: { alias: ctx.nomeAtq }, content, rolls: ctx.rolagens, ...(para ? { whisper: para } : {}), flags: { [SISTEMA]: { ataque: resumo, desfazer, marcas: ctx.marcas } } });
  mostrarNaMesa(ctx, para);
  return resumo;
}

// Quem vê o cartão do resultado ("Quem vê o cartão do resultado"): todos (null), os envolvidos (o mestre, quem atacou e
// os donos dos alvos) ou só o mestre.
function destinatarios(ctx) {
  const modo = config('resultado');
  if (modo === 'publico') return null;
  const ids = new Set(game.users.filter(usuario => usuario.isGM).map(usuario => usuario.id));
  if (modo === 'envolvidos') {
    ids.add(ctx.usuario.id);
    for (const linha of ctx.linhas) for (const usuario of game.users) if (linha.token.actor?.testUserPermission(usuario, 'OWNER')) ids.add(usuario.id);
  }
  return [...ids];
}

// O texto em cima de cada alvo, para quem vê o cartão (aqui e, pelo socket, nos outros clientes), e a animação
// (efeitos.mjs), pela configuração "Efeitos na mesa".
function mostrarNaMesa(ctx, para) {
  const modo = config('animacoes');
  if (modo === 'nao') return;
  for (const linha of ctx.linhas) {
    const resumo = R.textoNoToken(linha);
    if (!resumo) continue;
    const dados = { cena: linha.token.parent.id, token: linha.token.id, ...resumo, para };
    textoFlutuante(dados);
    game.socket.emit(CANAL, { tipo: 'texto', dados });
    if (modo === 'auto' && !linha.token.hidden) animar(linha.token, resumo.estilo).catch(erro => console.warn(`${SISTEMA} | efeito`, erro));
  }
}

// Desfaz o resultado de um ataque: HP, armadura e escudo voltam, e as lesões e o Suprimido saem da ficha. O Ponto Fraco
// e a Deflexão de Dano gastos nele (e a carga Tech da arma) voltam, se a marca ainda for a deste ataque (o mesmo
// combate e a mesma rodada).
export async function desfazer(mensagem) {
  if (!game.user.isGM) return false;
  const lista = mensagem.getFlag(SISTEMA, 'desfazer');
  if (!lista?.length || mensagem.getFlag(SISTEMA, 'desfeito')) { ui.notifications.warn('Este ataque já foi desfeito (ou não há o que desfazer).'); return false; }
  for (const item of lista) {
    const ator = await fromUuid(item.ator);
    if (!ator) continue;
    if (item.dano) await ator.desfazerDano(item.dano);
    const lesoes = item.lesoes.filter(id => ator.items.has(id));
    if (lesoes.length) await ator.deleteEmbeddedDocuments('Item', lesoes);
    if (item.suprimido) {
      await ator.toggleStatusEffect(STATUS_SUPRIMIDO, { active: false });
      await ator.unsetFlag(SISTEMA, 'suprimido');
    }
  }
  // A marca fica no ator (Ponto Fraco, Deflexão) ou na arma (carga Tech): "ator" é o uuid de um ou de outro.
  for (const { ator: uuid, chave, combate, rodada } of mensagem.getFlag(SISTEMA, 'marcas') ?? []) {
    const doc = await fromUuid(uuid);
    const marca = doc?.getFlag(SISTEMA, chave);
    if (marca?.combate === combate && marca.rodada === rodada) await doc.unsetFlag(SISTEMA, chave);
  }
  await mensagem.update({ [`flags.${SISTEMA}.desfeito`]: true });
  return true;
}

// Os tipos de cartão que mudam o visual da mensagem inteira (styles/tema.css): a borda vermelha do dano e da morte.
const TIPOS_DE_CARTAO = ['teste', 'ataque', 'dano', 'death-save', 'falhou', 'espera', 'morte'];

// Ao desenhar uma mensagem com um cartão deste sistema: o visual do tema na mensagem inteira (quem falou, a hora) e os
// botões dos cartões (só o mestre vê): Desfazer e "responder pelo jogador".
export function ligarBotoes(mensagem, html) {
  const cartao = html.querySelector('.cpr-fieldbook.cartao');
  if (cartao) html.classList.add('cprf-mensagem', ...TIPOS_DE_CARTAO.filter(tipo => cartao.classList.contains(tipo)).map(tipo => `cprf-${tipo}`));
  for (const botao of html.querySelectorAll('[data-cprf-acao]')) {
    if (!game.user.isGM) { botao.remove(); continue; }
    botao.addEventListener('click', evento => {
      evento.preventDefault();
      if (botao.dataset.cprfAcao === 'desfazer') desfazer(mensagem);
      else if (botao.dataset.cprfAcao === 'responder') desistir(botao.dataset.pedido, { escolha: botao.dataset.escolha, forcada: true });
      else if (botao.dataset.cprfAcao === 'aplicarNet') aplicarDanoDeNet(mensagem, botao.dataset.onde);
    });
  }
  if (mensagem.getFlag(SISTEMA, 'desfeito')) html.querySelector('.cartao.ataque')?.classList.add('desfeito');
}
