// O mestre pede um teste aos jogadores (o C65; pedido do usuário, 2026-11-23). Como o pedido de rolagem do Monk's
// TokenBar e do Sephral's Roll Requests, num cartão só que se atualiza:
// - a janela "Pedir teste" (o /teste no chat, o botão do HUD do token ou a API): a perícia, a família (Linguagem,
//   Especialista Local...) ou o STAT; a DV da escala da wiki (ou outra, ou nenhuma); se os jogadores veem a DV; quem vê os
//   resultados (todos, o mestre e quem rolou, só o mestre); o motivo; e quem rola (os tokens selecionados ou marcados e,
//   sem nenhum, os personagens dos jogadores);
// - o cartão "Pedido de teste" no chat: uma linha por personagem (esperando, o total e se passou, ou "não rolou"), o
//   resumo e os botões: o dono rola a dele; o mestre rola por qualquer um, rola os que faltam (os NPCs) e encerra;
// - no computador do jogador, a janela "O mestre pede um teste" abre sozinha; o teste é o da ficha (a janela de rolagem,
//   com os situacionais e a Sorte, menos com "Rolar direto");
// - o resultado: o jogador avisa o mestre pelo socket, e o mestre lê o total da mensagem da rolagem (feita por aquele
//   jogador, do ator dele, para aquele pedido e aquela linha), e não do aviso: um jogador não responde pela linha de outro
//   nem reaproveita uma rolagem velha (a lição do C56). Os dados, como em toda rolagem do Foundry, saem do cliente de quem
//   rola.
// As contas (a DV, o que cada um vê, o resumo) ficam no regras-pedido-teste.mjs.
import { jogadorDe, souOMestreAtivo } from './combate.mjs';
import { CANAL } from './combate/apoio.mjs';
import { SIGLA, SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';
import * as R from './regras-pedido-teste.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const FLAG = 'pedidoDeTeste';
const dadosDe = mensagem => mensagem?.getFlag(SISTEMA, FLAG) ?? null;
const comTeste = ator => ['personagem', 'capanga'].includes(ator?.type);

// ---------------- Quem rola ----------------
// Os candidatos da janela: os tokens controlados e os marcados (marcados na janela) e os personagens dos jogadores (marcados
// quando não há nenhum token). Um por ator.
function candidatos(tokens = null) {
  const daCena = tokens ?? [...(canvas.tokens?.controlled ?? []), ...game.user.targets];
  const lista = [];
  const vistos = new Set();
  const somar = (ator, token, marcado) => {
    if (!comTeste(ator) || vistos.has(ator.uuid)) return;
    vistos.add(ator.uuid);
    lista.push({ ator: ator.uuid, token: token?.document?.uuid ?? token?.uuid ?? null, nome: token?.name ?? ator.name, img: token?.document?.texture?.src ?? token?.texture?.src ?? ator.img, marcado });
  };
  for (const token of daCena) somar(token.actor, token, true);
  for (const usuario of game.users) if (!usuario.isGM && usuario.character) somar(usuario.character, null, !daCena.length);
  return lista;
}

// ---------------- A janela do mestre ----------------
const valorDoTeste = teste => (teste ? `${teste.tipo}:${teste.id ?? teste.familia ?? teste.chave}` : '');
function opcoesDoTeste(inicial) {
  const grupos = {};
  for (const p of [...PERICIAS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))) (grupos[p.grupo] ??= []).push(p);
  const opcao = (valor, nome) => `<option value="${valor}"${valor === inicial ? ' selected' : ''}>${esc(nome)}</option>`;
  return [
    ...Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt')).map(grupo => `<optgroup label="${esc(grupo)}">${grupos[grupo].map(p => opcao(`pericia:${p.id}`, p.nome)).join('')}</optgroup>`),
    `<optgroup label="Com tipo (o do personagem)">${Object.entries(FAMILIAS).map(([id, f]) => opcao(`familia:${id}`, f.nome)).join('')}</optgroup>`,
    `<optgroup label="Só o STAT">${R.ATRIBUTOS_DO_TESTE.map(chave => opcao(`atributo:${chave}`, SIGLA[chave])).join('')}</optgroup>`
  ].join('');
}
const lerTeste = (valor, tipoDaFamilia) => {
  const [tipo, id] = String(valor).split(':');
  const teste = tipo === 'pericia' ? { tipo, id } : tipo === 'familia' ? { tipo, familia: id, tipoDaFamilia: String(tipoDaFamilia ?? '').trim() } : { tipo, chave: id };
  return R.testeValido(teste) ? teste : null;
};

// Abre a janela (só o mestre). teste e dv preenchem (o /teste); tokens: os do HUD. Pedido: a mensagem do cartão; fechada, null.
export async function abrir({ teste = null, dv = null, tokens = null } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre pede um teste aos jogadores.'); return null; }
  const quem = candidatos(tokens);
  if (!quem.length) { ui.notifications.warn('Pedir teste: selecione os tokens (ou marque os alvos), ou dê um personagem aos jogadores.'); return null; }
  const inicialDv = R.dvValida(dv);
  const naEscala = R.DIFICULDADES.some(d => d.dv === inicialDv);
  const escolha = await DialogV2.wait({
    window: { title: 'Pedir teste', icon: 'fa-solid fa-dice-d10' },
    classes: [SISTEMA, 'pedido-de-teste', 'themed', 'theme-dark'],
    position: { width: 460 },
    rejectClose: false,
    content: `<div class="form-group"><label>Teste <select name="teste">${opcoesDoTeste(valorDoTeste(teste) || 'pericia:perception')}</select></label></div>
      <div class="form-group" data-campo="tipo"><label>Qual <input name="tipoDaFamilia" type="text" placeholder="Japonês, Watson... (vazio: a melhor do personagem)" value="${esc(teste?.tipoDaFamilia ?? '')}"></label></div>
      <div class="form-group"><label>DV <select name="dv"><option value="">Sem DV (o mestre decide)</option>${R.DIFICULDADES.map(d => `<option value="${d.dv}"${d.dv === inicialDv ? ' selected' : ''}>${d.dv}: ${esc(d.nome)}</option>`).join('')}<option value="outra"${inicialDv && !naEscala ? ' selected' : ''}>Outra</option></select></label>
        <input name="outraDv" type="number" min="1" max="99" step="1" value="${inicialDv && !naEscala ? inicialDv : 15}" data-campo="outra"></div>
      <div class="form-group"><label><input name="mostrarDv" type="checkbox"> Mostrar a DV aos jogadores</label></div>
      <div class="form-group"><label>Quem vê os resultados <select name="modo">${Object.entries(R.MODOS).map(([id, m]) => `<option value="${id}">${esc(m.nome)}</option>`).join('')}</select></label></div>
      <div class="form-group"><label>Motivo <input name="motivo" type="text" maxlength="200" placeholder="Opcional: o que os personagens tentam (só aparece no cartão)"></label></div>
      <fieldset class="quem"><legend>Quem rola</legend>${quem.map((c, i) => `<label><input type="checkbox" name="quem" value="${i}"${c.marcado ? ' checked' : ''}> ${esc(c.nome)}</label>`).join('')}</fieldset>`,
    buttons: [
      { action: 'pedir', label: 'Pedir', icon: 'fa-solid fa-paper-plane', default: true, callback: (evento, botao) => {
        const f = botao.form.elements;
        return {
          teste: lerTeste(f.teste.value, f.tipoDaFamilia.value), dv: f.dv.value === 'outra' ? R.dvValida(f.outraDv.value) : R.dvValida(f.dv.value),
          mostrarDv: f.mostrarDv.checked, modo: f.modo.value, motivo: f.motivo.value.trim().slice(0, 200),
          atores: [...botao.form.querySelectorAll('[name="quem"]:checked')].map(caixa => quem[Number(caixa.value)])
        };
      } },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ],
    render: (evento, janela) => {
      const form = janela.element.querySelector('form') ?? janela.element;
      const mostrar = () => {
        form.querySelector('[data-campo="tipo"]').style.display = form.elements.teste.value.startsWith('familia:') ? '' : 'none';
        form.querySelector('[data-campo="outra"]').style.display = form.elements.dv.value === 'outra' ? '' : 'none';
      };
      form.addEventListener('change', mostrar);
      mostrar();
    }
  });
  if (!escolha || typeof escolha !== 'object') return null;
  if (!escolha.atores.length) { ui.notifications.warn('Pedir teste: ninguém foi marcado para rolar.'); return null; }
  return pedir(escolha);
}

// O pedido sem a janela (a API e os testes do G4): { teste, dv, mostrarDv, modo, motivo, atores: [{ ator (uuid), token,
// nome, img }] }. acao: o que o resultado faz (o C72: { tipo: 'instalarMod', mod, arma }), lido por quem se registrou no
// aoResultado. Devolve a mensagem do cartão.
export async function pedir({ teste, dv = null, mostrarDv = false, modo = 'publico', motivo = '', atores = [], acao = null }) {
  if (!game.user.isGM) throw new Error('Só o mestre pede um teste aos jogadores.');
  if (!R.testeValido(teste)) throw new Error('Pedir teste: o teste não existe.');
  const linhas = [];
  for (const entrada of atores) {
    const ator = typeof entrada === 'string' ? await fromUuid(entrada) : await fromUuid(entrada.ator);
    if (!comTeste(ator) || linhas.some(l => l.ator === ator.uuid)) continue;
    linhas.push({ ator: ator.uuid, token: entrada.token ?? null, nome: entrada.nome || ator.name, img: entrada.img || ator.img, estado: 'esperando', total: null, critico: null, mensagem: null, porMestre: false });
  }
  if (!linhas.length) throw new Error('Pedir teste: nenhum personagem para rolar.');
  const dados = { teste, rotulo: R.rotuloDoTeste(teste), dv: R.dvValida(dv), mostrarDv: Boolean(mostrarDv), modo: R.MODOS[modo] ? modo : 'publico', motivo: String(motivo ?? '').slice(0, 200), linhas, aberto: true, ...(acao ? { acao } : {}) };
  return ChatMessage.implementation.create({
    speaker: { alias: 'Mestre' }, content: conteudo(dados, {}), flags: { [SISTEMA]: { [FLAG]: dados } }
  });
}

// ---------------- O cartão ----------------
// O HTML do cartão para quem vê (mestre, ou o usuário de agora). O que fica no content é o de quem não é dono nem
// mestre (sem os totais nos modos fechados); cada cliente troca pelo seu ao mostrar (o renderChatMessageHTML).
export function conteudo(dados, { mestre = false, usuario = null } = {}) {
  const ehDono = linha => Boolean(usuario) && !mestre && Boolean(fromUuidSync(linha.ator)?.testUserPermission?.(usuario, 'OWNER'));
  const visto = linha => R.oQueVe(dados, { mestre, dono: ehDono(linha) });
  const geral = R.oQueVe(dados, { mestre });
  const dvTexto = dados.dv === null ? 'Sem DV: o mestre decide.' : geral.dv ? `DV ${dados.dv}${R.nomeDaDv(dados.dv) ? ` (${R.nomeDaDv(dados.dv)})` : ''}: o total precisa superar a DV.` : 'DV oculta.';
  const linhas = dados.linhas.map((linha, indice) => {
    const ve = visto(linha);
    const passou = R.passou(linha.total, dados.dv);
    let rotulo = 'Esperando';
    let classe = 'esperando';
    if (linha.estado === 'naoRolou') { rotulo = 'Não rolou'; classe = 'nao-rolou'; }
    if (linha.estado === 'rolou') {
      classe = ve.passou && passou !== null ? (passou ? 'passou' : 'falhou') : 'rolou';
      rotulo = ve.total ? `${linha.total}${ve.passou && passou !== null ? (passou ? ' · passou' : ' · falhou') : ''}${linha.critico ? ` · ${linha.critico === 'sucesso' ? 'sucesso crítico' : 'falha crítica'}` : ''}` : 'Rolou';
    }
    const podeRolar = dados.aberto && linha.estado === 'esperando' && (mestre || ehDono(linha));
    const botao = podeRolar ? `<button type="button" data-cprf-pedido="rolar" data-linha="${indice}">${mestre ? 'Rolar' : 'Rolar o teste'}</button>` : '';
    const nota = mestre && linha.porMestre ? ' <span class="contra">(o mestre rolou)</span>' : '';
    return `<li class="alvo resultado-${classe}" data-linha="${indice}"><div class="linha"><img src="${esc(linha.img)}" alt=""><b>${esc(linha.nome)}</b><span class="rotulo">${esc(rotulo)}</span>${nota}${botao}</div></li>`;
  }).join('');
  const resumo = R.resumoDoPedido(dados.linhas, dados.dv);
  const contas = [`${resumo.rolaram} de ${resumo.total} rolaram`];
  if (geral.passou && resumo.passaram !== null) contas.push(`${resumo.passaram} ${resumo.passaram === 1 ? 'passou' : 'passaram'}`);
  if (geral.total && resumo.passaram === null && resumo.maior !== null) contas.push(`o maior: ${resumo.maior}`);
  const botoes = mestre && dados.aberto
    ? `<div class="botoes">${resumo.faltam ? '<button type="button" data-cprf-pedido="rolarTodos">Rolar os que faltam</button>' : ''}<button type="button" data-cprf-pedido="encerrar">Encerrar</button></div>`
    : '';
  const modo = dados.modo === 'publico' ? '' : ` Os resultados: ${R.MODOS[dados.modo].nome.toLowerCase()}.`;
  return `<div class="cpr-fieldbook cartao pedido-teste${dados.aberto ? '' : ' encerrado'}">
    <header><h3>Teste: ${esc(dados.rotulo)}</h3></header>
    <p class="partes">${esc(dvTexto)}</p>
    ${dados.motivo ? `<p class="sabor">${esc(dados.motivo)}</p>` : ''}
    <ul class="alvos">${linhas}</ul>
    <p class="resultado">${esc(contas.join(' · '))}.${dados.aberto ? '' : ' Encerrado.'}</p>
    <p class="nota">Pedido do mestre.${modo}</p>
    ${botoes}
  </div>`;
}

// ---------------- A rolagem ----------------
// O teste do ator, pela ficha: a perícia, a da família (a com o nome pedido ou a melhor; sem nenhuma, o STAT dela, "sem a
// perícia") ou o STAT, no modo do pedido. A DV entra no sabor do cartão da rolagem só quando os jogadores a veem. A
// rolagem leva o pedido e a linha que responde (flags.teste.pedido e .linha): o mestre só aceita a que responde àquela
// linha (uma rolagem velha do jogador, reenviada, não vale).
export async function rolarOTeste(ator, dados, { perguntar = false, aoAbrir = null, pedido = null, linha = null } = {}) {
  const modoDaRolagem = R.MODOS[dados.modo]?.mensagem ?? 'public';
  const dvVisivel = dados.dv !== null && (dados.mostrarDv || game.user.isGM);
  const sabor = [dados.motivo, dvVisivel ? `Pedido do mestre: supere a DV${dados.dv}` : 'Pedido do mestre'].filter(Boolean).join(' · ');
  const opcoes = { perguntar, aoAbrir, sabor, dados: { pedido, linha } };
  const { teste } = dados;
  // A habilidade de Role (o C72): a ficha rola a Expertise com a perícia do pedido; quem não tem a Role não rola.
  if (teste.tipo === 'role') {
    if (ator.type !== 'personagem' || !ator.rolagemDeRole(teste.id)) { ui.notifications.warn(`${ator.name} não tem ${dados.rotulo}.`); return null; }
    return ator.rolarRole(teste.id, { ...opcoes, pericia: teste.pericia ?? null, modo: modoDaRolagem });
  }
  if (teste.tipo === 'atributo') return ator.rolarAtributo(teste.chave, { ...opcoes, modo: modoDaRolagem });
  if (teste.tipo === 'familia') {
    const pericias = Object.entries(ator.system.pericias ?? {}).map(([id, p]) => ({ id, ...p }));
    const id = R.periciaDaFamilia(pericias, teste.familia, teste.tipoDaFamilia);
    if (id) return ator.rolarPericia(id, { ...opcoes, modo: modoDaRolagem });
    return ator.rolarAtributo(R.atributoDaFamilia(teste.familia), { ...opcoes, modo: modoDaRolagem, sabor: `${sabor} · sem ${dados.rotulo}: só o STAT` });
  }
  return ator.rolarPericia(teste.id, { ...opcoes, modo: modoDaRolagem });
}

// Um clique por linha de cada vez neste cliente (o clique duplo não rola duas vezes).
const emAndamento = new Set();
// Rola a linha (o dono, ou o mestre por ele) e registra: o mestre direto; o jogador avisa o mestre.
export async function rolarLinha(mensagem, indice, { perguntar = !config('rolarDireto') } = {}) {
  const dados = dadosDe(mensagem);
  const linha = dados?.linhas[indice];
  if (!dados?.aberto || linha?.estado !== 'esperando') return null;
  const chave = `${mensagem.id}:${indice}`;
  if (emAndamento.has(chave)) return null;
  emAndamento.add(chave);
  try {
    const ator = await fromUuid(linha.ator);
    if (!ator) { ui.notifications.warn(`Pedido de teste: ${linha.nome} não está mais na mesa.`); return null; }
    if (!ator.isOwner) { ui.notifications.warn('Pedido de teste: este personagem não é seu.'); return null; }
    const resultado = await rolarOTeste(ator, dados, { perguntar, pedido: mensagem.id, linha: indice });
    if (!resultado) return null;
    if (game.user.isGM) return registrar(mensagem.id, indice, { total: resultado.total, critico: resultado.critico, mensagem: resultado.mensagem?.id ?? null, porMestre: Boolean(jogadorDe(ator)) });
    game.socket.emit(CANAL, { tipo: FLAG, acao: 'resultado', mensagem: mensagem.id, linha: indice, rolagem: resultado.mensagem?.id ?? null });
    return resultado;
  } finally {
    emAndamento.delete(chave);
  }
}

// ---------------- No mestre ----------------
// As atualizações do cartão uma de cada vez (dois resultados chegando juntos não se apagam).
let fila = Promise.resolve();
const naFila = tarefa => { const r = fila.then(tarefa, tarefa); fila = r.catch(() => {}); return r; };
function atualizar(mensagemId, mudar) {
  return naFila(async () => {
    const mensagem = game.messages.get(mensagemId);
    const dados = dadosDe(mensagem);
    if (!dados) return null;
    const novo = mudar(foundry.utils.deepClone(dados));
    if (!novo) return null;
    await mensagem.update({ content: conteudo(novo, {}), [`flags.${SISTEMA}.${FLAG}`]: novo });
    return novo;
  });
}
// Quem quer saber do resultado de um pedido com ação (o C72, a instalação): fn(mensagem, dados, indice), no mestre, uma
// vez por linha que rolou.
const ouvintes = [];
export const aoResultado = fn => { ouvintes.push(fn); };
// Registra um resultado na linha (só se ela ainda espera).
export async function registrar(mensagemId, indice, resultado) {
  const novo = await atualizar(mensagemId, dados => {
    const linhas = R.registrarResultado(dados.linhas, indice, resultado);
    return linhas ? { ...dados, linhas } : null;
  });
  if (novo?.acao) for (const fn of ouvintes) await Promise.resolve(fn(game.messages.get(mensagemId), novo, indice)).catch(erro => console.error(`${SISTEMA} | pedido de teste`, erro));
  return novo;
}
export function encerrarPedido(mensagemId) {
  return atualizar(mensagemId, dados => (dados.aberto ? { ...dados, aberto: false, linhas: R.encerrar(dados.linhas) } : null));
}
// O mestre rola os que faltam (os NPCs, quem não está na mesa), direto, um por um.
export async function rolarOsQueFaltam(mensagem) {
  const dados = dadosDe(mensagem);
  if (!game.user.isGM || !dados?.aberto) return;
  for (const [indice, linha] of dados.linhas.entries()) {
    if (linha.estado === 'esperando') await rolarLinha(game.messages.get(mensagem.id), indice, { perguntar: false });
  }
}

// O aviso do jogador: vale só de quem é dono do ator da linha, e o total sai da mensagem da rolagem (que esse jogador
// criou, com o teste daquele ator, em resposta a este pedido e a esta linha), não do aviso. A mensagem pode chegar depois
// do aviso: espera até 3 s.
async function receberResultado({ mensagem: mensagemId, linha: indice, rolagem }, remetente) {
  const quem = game.users.get(remetente);
  const dados = dadosDe(game.messages.get(mensagemId));
  const linha = dados?.linhas[indice];
  if (!quem || !linha || linha.estado !== 'esperando') return;
  const ator = await fromUuid(linha.ator);
  if (!ator?.testUserPermission(quem, 'OWNER')) return;
  let rolada = null;
  for (let i = 0; i < 30 && !(rolada = game.messages.get(rolagem)); i++) await new Promise(resolve => setTimeout(resolve, 100));
  const teste = rolada?.getFlag(SISTEMA, 'teste');
  if (!teste || teste.pedido !== mensagemId || teste.linha !== indice || rolada.author?.id !== quem.id || rolada.speaker?.actor !== ator.id) return;
  await registrar(mensagemId, indice, { total: teste.total, critico: teste.critico ?? null, mensagem: rolada.id });
}

// ---------------- No jogador ----------------
// O cartão novo: a janela "O mestre pede um teste" abre para quem rola cada personagem (o jogador dele, jogadorDe), com um
// botão por personagem. Fechada, o botão do cartão continua.
async function avisarOJogador(mensagem) {
  const dados = dadosDe(mensagem);
  if (game.user.isGM || !dados?.aberto) return;
  const minhas = [];
  for (const [indice, linha] of dados.linhas.entries()) {
    const ator = linha.estado === 'esperando' ? await fromUuid(linha.ator) : null;
    if (ator && jogadorDe(ator)?.id === game.user.id) minhas.push({ indice, nome: linha.nome });
  }
  if (!minhas.length) return;
  const dv = dados.dv !== null && dados.mostrarDv ? ` contra a DV ${dados.dv}` : '';
  const escolha = await DialogV2.wait({
    window: { title: 'O mestre pede um teste', icon: 'fa-solid fa-dice-d10' }, classes: [SISTEMA, 'pedido-de-teste-jogador', 'themed', 'theme-dark'],
    position: { width: 400 }, rejectClose: false,
    content: `<p><b>${esc(dados.rotulo)}</b>${esc(dv)}.</p>${dados.motivo ? `<p>${esc(dados.motivo)}</p>` : ''}`,
    buttons: [
      ...minhas.map(({ indice, nome }) => ({ action: `rolar-${indice}`, label: minhas.length > 1 ? `Rolar: ${nome}` : 'Rolar', icon: 'fa-solid fa-dice-d10', default: indice === minhas[0].indice, callback: () => indice })),
      { action: 'depois', label: 'Depois', icon: 'fa-solid fa-clock' }
    ]
  }).catch(() => null);
  if (Number.isInteger(escolha)) await rolarLinha(game.messages.get(mensagem.id), escolha);
}

// ---------------- O registro ----------------
const ACOES = {
  rolar: (mensagem, botao) => rolarLinha(mensagem, Number(botao.dataset.linha)),
  rolarTodos: mensagem => rolarOsQueFaltam(mensagem),
  encerrar: mensagem => encerrarPedido(mensagem.id)
};
// Cada cliente mostra o cartão do seu jeito (o mestre vê tudo; o dono, a linha dele) e liga os botões.
function mostrarCartao(mensagem, html) {
  const dados = dadosDe(mensagem);
  const cartao = dados && html.querySelector('.cartao.pedido-teste');
  if (!cartao) return;
  cartao.outerHTML = conteudo(dados, { mestre: game.user.isGM, usuario: game.user });
  for (const botao of html.querySelectorAll('[data-cprf-pedido]')) {
    botao.addEventListener('click', evento => {
      evento.preventDefault();
      ACOES[botao.dataset.cprfPedido]?.(mensagem, botao)?.catch?.(erro => console.error(`${SISTEMA} | pedido de teste`, erro));
    });
  }
}

// O botão do HUD do token (só o mestre), como o do perigo: abre a janela com este token e os outros controlados.
function botaoNoHud(app, elemento) {
  if (!game.user.isGM) return;
  const doc = app?.document ?? app?.object?.document;
  if (!comTeste(doc?.actor)) return;
  const coluna = (elemento instanceof HTMLElement ? elemento : app?.element)?.querySelector?.('.col.left');
  if (!coluna || coluna.querySelector(`.${SISTEMA}-pedido-teste`)) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `control-icon ${SISTEMA}-pedido-teste`;
  botao.dataset.tooltip = 'Pedir teste';
  botao.innerHTML = '<i class="fa-solid fa-dice-d10"></i>';
  botao.addEventListener('click', evento => {
    evento.preventDefault();
    evento.stopPropagation();
    app.close?.();
    const controlados = canvas.tokens?.controlled ?? [];
    const tokens = controlados.some(t => t.document === doc) ? controlados : [doc.object ?? doc, ...controlados];
    abrir({ tokens }).catch(erro => console.error(`${SISTEMA} | pedido de teste`, erro));
  });
  coluna.append(botao);
}

// No init: o /teste (só o mestre; a mensagem não vai ao chat), o HUD, o cartão, o aviso do jogador e o socket.
export function registrarPedidoDeTeste() {
  Hooks.on('chatMessage', (_, mensagem) => {
    const comando = R.lerComandoTeste(mensagem);
    if (!comando) return true;
    if (!game.user.isGM) { ui.notifications.warn('Só o mestre pede um teste aos jogadores.'); return false; }
    if (comando.erro) ui.notifications.warn(comando.erro);
    abrir(comando).catch(erro => console.error(`${SISTEMA} | pedido de teste`, erro));
    return false;
  });
  Hooks.on('renderTokenHUD', botaoNoHud);
  Hooks.on('renderChatMessageHTML', mostrarCartao);
  Hooks.on('createChatMessage', mensagem => { if (dadosDe(mensagem)) avisarOJogador(mensagem).catch(erro => console.error(`${SISTEMA} | pedido de teste`, erro)); });
}
export function registrarSocketDoPedido() {
  game.socket.on(CANAL, (mensagem, remetente) => {
    if (mensagem?.tipo !== FLAG || mensagem.acao !== 'resultado' || !souOMestreAtivo()) return;
    receberResultado(mensagem, remetente).catch(erro => console.error(`${SISTEMA} | pedido de teste`, erro));
  });
}

export const API = { abrir, pedir, conteudo, rolarLinha, rolarOsQueFaltam, encerrar: encerrarPedido, regras: R };
