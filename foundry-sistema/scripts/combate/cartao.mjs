// Cartão do resultado, destinatários, efeitos na mesa e os botões do chat.

import { SISTEMA } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { animar, textoFlutuante } from '../efeitos.mjs';
import { aplicarPerdaDeHumanidade } from '../humanidade.mjs';
import { escolherLesao, lesaoCritica } from '../lesoes.mjs';
import { desfazerMunicao, escolherEmp, encerrarEfeitos, apagarFogo } from '../municoes.mjs';
import { aplicarDanoDeNet } from '../net.mjs';
import * as R from '../regras.mjs';
import { CANAL, STATUS_SUPRIMIDO, ROTULO, conferirArmaVeicular, renderizar } from './apoio.mjs';
import { ferir, linhaDe } from './modos.mjs';
import { desistir } from './socket.mjs';

// ---------------- Cartão do resultado e "Desfazer" ----------------
const RESULTADOS = {
  acertou: 'acertou', errou: 'errou', esquivou: 'esquivou', fora: 'fora do alcance', semDv: 'sem DV: o mestre decide',
  semDestino: 'destino indisponível: escolha novamente', suprimido: 'suprimido: gasta o próximo movimento indo para a cobertura', firme: 'ficou firme'
};

// A barra de HP do alvo no cartão (só o desenho: o número está na linha do dano), em texto (o 0 também desenha).
const barraDeHp = linha => {
  const max = linha.token?.actor?.system.hp?.max;
  return linha.dano && max ? String(Math.max(0, Math.min(100, Math.round((100 * linha.dano.hpDepois) / max)))) : null;
};

export async function cartaoDoResultado(ctx) {
  const linhas = ctx.linhas.map(l => ({
    nome: l.nome, img: l.img, resultado: l.resultado, rotulo: RESULTADOS[l.resultado] ?? l.resultado, escolha: l.escolha ?? null, defesa: l.defesa ?? null,
    dv: l.dv ?? null, metros: l.metros ?? null, segundaTentativa: l.segundaTentativa ?? null, multiplicador: l.multiplicador ?? null, dano: l.dano ?? null, veicular: l.veicular ?? null, municao: l.municao ?? null, suprimido: Boolean(l.suprimido), notas: l.notas,
    segundaChance: l.segundaChance ?? null
  }));
  const resumo = {
    id: ctx.pedido.id, modo: ctx.modo, descricao: ctx.descricao, local: ctx.local, ataque: ctx.pedido.total, segundaChance: ctx.segundaChance ?? null, atacante: ctx.nomeAtq, arma: ctx.arma.name,
    cabecalho: ctx.cabecalho, notas: ctx.notas, falhaDaArma: ctx.falhaDaArma ?? null, linhas
  };
  const desfazer = ctx.linhas.filter(l => l.dano || l.veicular?.perdeu || l.veicular?.ablado || l.suprimido || l.municao?.efeitos.length || l.municao?.itens.length || (l.municao?.efeito === 'emp' && !l.municao.resistencia.passou)).map(l => ({
    ator: l.token.actor.uuid, veicular: l.veicular ?? null, suprimido: Boolean(l.suprimido), derrubado: Boolean(l.derrubado), municao: l.municao ?? null, lesoes: (l.dano?.lesoes ?? []).map(lesao => lesao.item).filter(Boolean),
    dano: l.dano ? { perdeu: l.dano.hpAntes - l.dano.hpDepois, armaduraId: l.dano.armaduraId, lugar: l.dano.lugar, ablado: l.dano.ablado, armaduras: l.dano.armaduras, escudoId: l.dano.escudoId, escudoAblado: l.dano.escudoAblado } : null
  }));
  if (ctx.lesoesDoAtirador?.length) desfazer.push({ ator: ctx.atacante.uuid, suprimido: false, municao: null, lesoes: ctx.lesoesDoAtirador, dano: null });
  const content = await renderizar('ataque.hbs', { ...resumo, linhas: linhas.map((l, i) => ({ ...l, hp: barraDeHp(ctx.linhas[i]), contra: l.escolha === 'esquivar' || l.escolha === 'concentrar' ? `${l.escolha === 'concentrar' ? 'Concentração' : 'esquiva'} ${l.defesa}` : l.dv !== null ? `DV ${l.dv}` : null, escolhaNome: ROTULO[l.escolha] ?? '' })), desfazer: desfazer.length > 0 || (ctx.devolver?.length ?? 0) > 0 });
  const para = destinatarios(ctx);
  await ChatMessage.implementation.create({ speaker: { alias: ctx.nomeAtq }, content, rolls: ctx.rolagens, ...(para ? { whisper: para } : {}), flags: { [SISTEMA]: { ataque: resumo, desfazer, marcas: ctx.marcas, devolver: ctx.devolver ?? [] } } });
  mostrarNaMesa(ctx, para);
  return resumo;
}

// Quem vê o cartão do resultado ("Quem vê o cartão do resultado"): todos (null), os envolvidos (o mestre, quem atacou e
// os donos dos alvos) ou só o mestre. O cartão do agarrão também usa (agarrao.mjs).
export function destinatarios(ctx) {
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
// e a Deflexão de Dano gastos nele voltam, se a marca ainda for a deste ataque (o mesmo combate e a mesma rodada); a
// carga Tech que ele gastou volta para a arma.
export async function desfazer(mensagem) {
  if (!game.user.isGM) return false;
  const lista = mensagem.getFlag(SISTEMA, 'desfazer');
  const devolver = mensagem.getFlag(SISTEMA, 'devolver') ?? [];
  if ((!lista?.length && !devolver.length) || mensagem.getFlag(SISTEMA, 'desfeito')) { ui.notifications.warn('Este ataque já foi desfeito (ou não há o que desfazer).'); return false; }
  for (const item of lista ?? []) {
    const ator = await fromUuid(item.ator);
    if (!ator) continue;
    if (item.veicular) {
      const veiculo = await fromUuid(item.veicular.veiculo);
      if (veiculo?.type === 'veiculo' && veiculo.actor?.uuid === ator.uuid) {
        if (item.veicular.tipo === 'vidro') await veiculo.desfazerDanoNoVidro(item.veicular);
        else if (item.veicular.tipo === 'veiculo') await veiculo.desfazerDanoVeicular(item.veicular);
      }
    }
    if (item.dano) await ator.desfazerDano(item.dano);
    await desfazerMunicao(ator, item.municao);
    const lesoes = item.lesoes.filter(id => ator.items.has(id));
    if (lesoes.length) await ator.deleteEmbeddedDocuments('Item', lesoes);
    if (item.derrubado) await ator.toggleStatusEffect('prone', { active: false });
    if (item.suprimido) {
      await ator.toggleStatusEffect(STATUS_SUPRIMIDO, { active: false });
      await ator.unsetFlag(SISTEMA, 'suprimido');
    }
  }
  // A marca fica no ator (Ponto Fraco, Deflexão): "ator" é o uuid dele.
  for (const { ator: uuid, chave, combate, rodada } of mensagem.getFlag(SISTEMA, 'marcas') ?? []) {
    const doc = await fromUuid(uuid);
    const marca = doc?.getFlag(SISTEMA, chave);
    if (marca?.combate === combate && marca.rodada === rodada) await doc.unsetFlag(SISTEMA, chave);
  }
  for (const { doc: uuid, chave, valor } of devolver) {
    const doc = await fromUuid(uuid);
    if (!doc) continue;
    await doc.unsetFlag(SISTEMA, chave);
    if (valor !== null && valor !== undefined) await doc.setFlag(SISTEMA, chave, valor);
  }
  await mensagem.update({ [`flags.${SISTEMA}.desfeito`]: true });
  return true;
}

// ---------------- O dano rolado à parte, pelos botões do cartão ----------------
// Os alvos marcados (T) do mestre que levam dano de arma: quem tem HP (personagem e capanga).
const alvosComHp = () => [...game.user.targets].map(token => token.document ?? token).filter(token => ['personagem', 'capanga'].includes(token.actor?.type));

// "Aplicar dano" (o "apply damage" das maquetes do usuário): o dano rolado pelo botão "Dano" da ficha, nos alvos marcados
// (T), como o ataque aplica (ferir: a armadura, o +5 do crítico, a Deflexão, a munição de borracha, o mortalmente ferido).
// No corpo: a cabeça só pelo tiro mirado (a decisão do usuário de 2026-10-15, pela wiki). A lesão do crítico sai pelo
// "Rolar a lesão". O resultado vai no cartão do ataque, com o "Desfazer".
export async function aplicarDanoDoCartao(mensagem) {
  const dados = mensagem.getFlag(SISTEMA, 'danoDeArma');
  if (!dados || !game.user.isGM) return null;
  const arma = await fromUuid(dados.arma);
  if (!arma?.actor) { ui.notifications.warn('A arma deste dano não está mais na ficha.'); return null; }
  if (!conferirArmaVeicular(arma, 'tiro')) return null;
  const alvos = alvosComHp();
  if (!alvos.length) { ui.notifications.warn('Marque o alvo (T) do dano.'); return null; }
  const ctx = {
    pedido: { id: foundry.utils.randomID(), total: null }, usuario: game.user, arma, atacante: arma.actor, tokenAtq: null, cena: alvos[0].parent, alvos,
    modo: 'tiro', local: 'corpo', descricao: 'dano rolado à parte', nomeAtq: arma.actor.name, perfil: null, linhas: [], rolagens: [], marcas: [],
    notas: dados.critico ? ['Crítico: a lesão sai pelo botão "Rolar a lesão" do cartão do dano.'] : [], cabecalho: `${dados.total} de dano${dados.critico ? ', crítico' : ''}, no corpo`
  };
  for (const token of alvos) {
    const linha = linhaDe(ctx, token);
    linha.resultado = 'acertou';
    await ferir(ctx, linha, { total: dados.total, bonus: dados.bonus, critico: dados.critico, formula: dados.formula }, { lesaoDoCritico: false });
  }
  return cartaoDoResultado(ctx);
}

// "Rolar a lesão" (o "roll critical" das maquetes): a tabela do corpo (RED p. 187) em cada alvo marcado, pelo cartão do
// dano crítico rolado à parte, como o ataque faz no crítico. Uma vez por alvo neste cartão.
export async function rolarLesaoDoCartao(mensagem) {
  const dados = mensagem.getFlag(SISTEMA, 'danoDeArma');
  if (!dados?.critico || !game.user.isGM) return null;
  const modo = config('lesaoCritica');
  if (modo === 'nao') { ui.notifications.warn('A configuração "Lesão crítica" está desligada.'); return null; }
  const alvos = alvosComHp();
  if (!alvos.length) { ui.notifications.warn('Marque o alvo (T) da lesão.'); return null; }
  const feitos = new Set(mensagem.getFlag(SISTEMA, 'lesoesRoladas') ?? []);
  const novos = alvos.filter(token => !feitos.has(token.uuid));
  if (!novos.length) { ui.notifications.warn('Este dano já rolou a lesão desses alvos.'); return null; }
  const lesoes = [];
  for (const token of novos) lesoes.push(await lesaoCritica(token.actor, { naFicha: modo === 'ficha' }));
  await mensagem.setFlag(SISTEMA, 'lesoesRoladas', [...feitos, ...novos.map(token => token.uuid)]);
  return lesoes;
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
      else if (botao.dataset.cprfAcao === 'aplicarDano') aplicarDanoDoCartao(mensagem);
      else if (botao.dataset.cprfAcao === 'rolarLesao') rolarLesaoDoCartao(mensagem);
      else if (botao.dataset.cprfAcao === 'escolherLesao') escolherLesao(mensagem, botao.dataset.lesao);
      else if (botao.dataset.cprfAcao === 'aplicarHumanidade') aplicarPerdaDeHumanidade(mensagem);
      else if (botao.dataset.cprfAcao === 'aplicarEmp') escolherEmp(mensagem, botao.dataset.ator);
      else if (botao.dataset.cprfAcao === 'encerrarMunicao') encerrarEfeitos(mensagem, botao.dataset.ator);
      else if (botao.dataset.cprfAcao === 'apagarFogo') fromUuid(botao.dataset.ator).then(apagarFogo);
    });
  }
  if (mensagem.getFlag(SISTEMA, 'desfeito')) html.querySelector('.cartao.ataque')?.classList.add('desfeito');
}
