// O motor da NET (o estado.mjs do NET Architect da mesa), sempre no mestre ativo: conecta e desconecta os netrunners,
// anda pela arquitetura, resolve as habilidades de Interface contra os andares e contra os inimigos (o Zap e o Slide) e
// grava no Tile o estado público da arquitetura (os andares que os jogadores enxergam, quem está onde, a REZ dos
// inimigos, o registro); o encontro com o Black ICE (a velocidade), o ataque dos inimigos (pelo mestre) e os efeitos de
// cada Black ICE na ficha; o deck (ativar, desativar e atacar com os programas); os inimigos encontrados no combate da
// cena (o combate.mjs). No Tile só vai o que os jogadores podem ver; o resto fica no item da arquitetura.
import { ENTRADA, filhosDe, lerArquitetura } from '../arquitetura.mjs';
import { pedir as pedirAoJogador } from '../combate.mjs';
import { caminho, SISTEMA } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { acoesDeNet, formulaDeDano, NUMEROS_DA_NET, programaDeAtaque } from '../regras.mjs';
import { dadosDoCartao } from '../dados-do-cartao.mjs';
import { testar } from '../rolagens.mjs';
import { entrarNoCombate, sincronizarInimigos, tirarInimigos } from './combate.mjs';
import { FLAG_CONEXAO, FLAG_ESTADO, FLAG_PONTO, STATUS_CONECTADO, STATUS_EM_CHAMAS } from './constantes.mjs';
import {
  acharConteudo, alcanceDo, alvoDaHabilidade, alvoDoPrograma, alvosDoInimigo, comecoDoTurno, conteudosDoNo, demonioDe, distancia, efeitoDoIce, faltasPara, fraseDaChegada, gastarAcoes, iceDaQueda,
  iceDe, inimigosAtivos, inimigosQueAtacam, motivoParaNaoAndar, motivoParaNaoDesconectar, motivoParaNaoMudarPrograma, motivoParaNaoSlide, mudarRez, netrunnerDo, nomeDoInimigo, penalidadeDoSkunk,
  PRISAO_DO_KRAKEN, quemRolaNaNet, resolverAtaque, resolverAtaqueDePrograma, resolverHabilidade, resolverSlide, resolverVelocidade, resolverZap, respostaDoJogador, resumoDoAndar, rezDe, rezMaxDe,
  vistaPublica
} from './regras-da-net.mjs';
import { erro } from './socket.mjs';

const LOG_MAX = 60;

// ---------------- Leitura ----------------
export const pontoDoTile = tile => tile?.getFlag(SISTEMA, FLAG_PONTO) ?? null;
export const estadoDoTile = tile => tile?.getFlag(SISTEMA, FLAG_ESTADO) ?? null;
export const conexaoDoToken = token => token?.getFlag(SISTEMA, FLAG_CONEXAO) ?? null;

export async function arquiteturaDoPonto(ponto) {
  if (!ponto?.arquitetura) throw erro('Este ponto de acesso ainda não tem arquitetura: o mestre escolhe na configuração.');
  const item = await fromUuid(ponto.arquitetura);
  if (item?.type !== 'arquitetura') throw erro('A arquitetura deste ponto de acesso não foi encontrada (apagada do compêndio?).');
  return lerArquitetura({ nome: item.name, andares: item.system.andares, dv: Number(ponto.dv) || item.system.dv });
}

// As Ações NET contam em combate (as do Rank, por turno); fora de combate, não.
export const emCombate = token => game.combats.some(combate => combate.started && combate.combatants.some(item => item.tokenId === token.id && item.sceneId === token.parent.id));

// ---------------- Estado ----------------
const estadoNovo = (ponto, arq) => ({ v: 1, arquitetura: ponto.arquitetura, nome: arq.nome, dv: arq.dv, mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [], nos: [], log: [] });

function registrar(est, texto, tipo = 'info') {
  est.log = [...est.log, { t: Date.now(), texto, tipo }].slice(-LOG_MAX);
}

async function gravar(tile, arq, est) {
  est.nos = vistaPublica(arq, est);
  await tile.update({ [`flags.${SISTEMA}.${FLAG_ESTADO}`]: est });
  return est;
}

// Tudo o que um pedido precisa: o Tile, o token, o ponto, a arquitetura, o estado e o corredor (o netrunner na NET).
async function contexto(dados, usuario, { precisaCorredor = true } = {}) {
  const tile = await fromUuid(dados.tile);
  if (tile?.documentName !== 'Tile') throw erro('Ponto de acesso não encontrado.');
  const ponto = pontoDoTile(tile);
  if (!ponto?.ativo) throw erro('Este Tile não é um ponto de acesso à NET ativo.');
  const token = dados.token ? tile.parent.tokens.get(dados.token) : null;
  if (dados.token && !token) throw erro('O token não está nesta cena.');
  if (token && !usuario.isGM && !token.actor?.testUserPermission(usuario, 'OWNER')) throw erro('Você não controla este token.');
  const arq = await arquiteturaDoPonto(ponto);
  let est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est || est.arquitetura !== ponto.arquitetura) est = estadoNovo(ponto, arq);
  Object.assign(est, { dv: arq.dv, nome: arq.nome });
  const corredor = token ? est.corredores.find(item => item.token === token.id) : null;
  if (precisaCorredor && !corredor) throw erro('Este netrunner não está conectado a este ponto de acesso.');
  return { tile, token, ponto, arq, est, corredor, ator: token?.actor ?? null, usuario, havia: est.corredores.length, desmarcar: [] };
}

// Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198): o Black ICE e os demônios de volta, as senhas e
// os nós trancados. Os arquivos copiados continuam.
function reiniciarDefesas(ctx) {
  const { est, arq } = ctx;
  est.ices = [];
  est.fora = [];
  est.feitos = est.feitos.filter(chave => Object.values(arq.nos).some(no => no.conteudos.some(conteudo => conteudo.chave === chave && conteudo.tipo === 'arquivo')));
  registrar(est, 'Ninguém na NET: a arquitetura reiniciou as defesas (o Black ICE e os demônios de volta, as senhas e os nós trancados).', 'info');
}

// Tira um corredor da NET.
// Na desconexão insegura, o Black ICE que o netrunner encontrou e ainda está ativo age de graça (a wiki: "sofre o efeito de
// todo Black ICE encontrado e ainda ativo"), menos o que causou a queda (exceto).
async function retirar(ctx, corredor, { inseguro = false, motivo = '', exceto = null } = {}) {
  if (corredor.saindo) return;
  corredor.saindo = true;
  registrar(ctx.est, `${corredor.nome} desconectou${inseguro ? ' de forma insegura' : ''}${motivo ? ` (${motivo})` : ''}.`, inseguro ? 'falha' : 'info');
  if (inseguro) for (const ice of iceDaQueda(ctx.arq, ctx.est, corredor, exceto)) await aplicarEfeito(ctx, corredor, ice);
  ctx.est.corredores = ctx.est.corredores.filter(item => item.token !== corredor.token);
  ctx.desmarcar.push(corredor.token);
}

// O token conectado: a flag da conexão e o status "Conectado à NET" (que todos veem).
async function marcarToken(token, tile, ligado) {
  if (ligado) await token.setFlag(SISTEMA, FLAG_CONEXAO, { tile: tile.uuid, desde: Date.now() });
  else await token.unsetFlag(SISTEMA, FLAG_CONEXAO);
  await token.actor?.toggleStatusEffect(STATUS_CONECTADO, { active: ligado });
}

// Fecha a operação: o reinício das defesas (sem ninguém mais na NET), a gravação, os tokens que saíram e os inimigos no
// combate (a REZ nos tokens deles; no reinício, eles saem). Os tokens que saíram perdem a marca antes: o turno que o
// Foundry acerta quando um inimigo sai do combate não dá a vez a quem já não está na NET.
async function concluir(ctx) {
  const { est, tile, arq, ponto } = ctx;
  const reinicia = ctx.havia > 0 && !est.corredores.length && ponto.reiniciar !== false;
  if (reinicia) reiniciarDefesas(ctx);
  await gravar(tile, arq, est);
  for (const id of ctx.desmarcar) {
    const token = tile.parent.tokens.get(id);
    if (token) await marcarToken(token, tile, false);
  }
  if (reinicia) await tirarInimigos(tile);
  else await sincronizarInimigos(tile, arq, est);
}

// O token apagado da cena sai da NET (no mestre ativo).
export async function removerCorredorApagado(tileUuid, tokenId) {
  const tile = await fromUuid(tileUuid);
  const est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est?.corredores.some(item => item.token === tokenId)) return;
  const ponto = pontoDoTile(tile);
  const arq = await arquiteturaDoPonto(ponto);
  const ctx = { tile, ponto, arq, est, havia: est.corredores.length, desmarcar: [] };
  await retirar(ctx, est.corredores.find(item => item.token === tokenId), { motivo: 'o token saiu da cena' });
  ctx.desmarcar = [];
  await concluir(ctx);
}

// O Tile apagado: os tokens que estavam na NET saem dela (a flag e o status), e os inimigos saem do combate e da cena; no
// mestre ativo.
export async function soltarTokens(tile) {
  for (const corredor of estadoDoTile(tile)?.corredores ?? []) {
    const token = tile.parent?.tokens.get(corredor.token);
    if (token) await marcarToken(token, tile, false);
  }
  await tirarInimigos(tile);
}

// Quem o inimigo pode atacar na vez dele no combate (o index.mjs): [{ token, nome }] dos netrunners no andar dele, ou null
// se o ponto de acesso ou o inimigo não estão mais lá.
export async function alvosNaVez(tileUuid, chave) {
  const tile = await fromUuid(tileUuid);
  const ponto = pontoDoTile(tile);
  const est = estadoDoTile(tile);
  if (!ponto?.ativo || !est || est.arquitetura !== ponto.arquitetura) return null;
  const arq = await arquiteturaDoPonto(ponto);
  if (!acharConteudo(arq, chave)) return null;
  return alvosDoInimigo(arq, est, chave).map(corredor => ({ token: corredor.token, nome: corredor.nome }));
}

// ---------------- Andar e as habilidades ----------------
// Quem age na NET tem o cyberdeck equipado e a Interface (o Rank de Netrunner), como na aba NET da ficha.
function exigirNetrunner(ator) {
  if (!netrunnerDo(ator).deck) throw erro('Sem cyberdeck equipado: não dá para agir na NET.');
  if (!ator.system.rankDeInterface) throw erro('Sem Interface (o Rank de Netrunner): só o Netrunner usa as habilidades na NET.');
}
const lugar = (arq, id) => `o andar ${arq.nos[id].andar}${arq.nos[id].ramo !== 'a' ? ` (ramo ${arq.nos[id].ramo.toUpperCase()})` : ''}`;

// O Virus (a wiki: "Ações NET definidas pelo mestre", "contra a DV do mestre"): o mestre responde na hora, com os
// exemplos da wiki (RED p. 200). Fechada a janela, nada acontece.
const EXEMPLOS_DE_VIRUS = [
  ['Muda o ícone de um tipo de Black ICE', 6, 1], ['Desativa um Black ICE até o vírus ser removido', 10, 2], ['Faz um nó de controle falhar até o vírus ser removido', 10, 2],
  ['Apaga todo o Black ICE da arquitetura', 12, 10], ['Corta pela metade os andares da arquitetura, para sempre', 12, 10]
];
async function perguntarVirus(corredor, texto, emCombateAgora) {
  const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));
  const exemplos = EXEMPLOS_DE_VIRUS.map(([oQue, dv, acoes]) => `<tr><td>${oQue}</td><td>${dv}</td><td>${acoes}</td></tr>`).join('');
  const sobram = emCombateAgora ? `<p>Ações NET que sobram a ${esc(corredor.nome)} neste turno: <b>${corredor.max - corredor.acoes} de ${corredor.max}</b>.</p>` : '<p>Fora de combate, as Ações NET não contam.</p>';
  const resposta = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Virus: ${corredor.nome}` }, classes: [SISTEMA, 'net-virus'],
    content: `<p><b>${esc(corredor.nome)}</b> quer deixar um vírus:</p><blockquote>${esc(texto)}</blockquote>
      <div class="colunas"><label>DV <input type="number" name="dv" value="10" min="2" max="30"></label><label>Ações NET <input type="number" name="acoes" value="1" min="1" max="10"></label></div>
      ${sobram}<table class="exemplos"><thead><tr><th>Exemplos da wiki (RED p. 200)</th><th>DV</th><th>Ações</th></tr></thead><tbody>${exemplos}</tbody></table>`,
    ok: { label: 'Rolar o vírus', callback: (evento, botao) => ({ dv: Math.max(2, Number(botao.form.elements.dv.value) || 10), acoes: Math.max(1, Number(botao.form.elements.acoes.value) || 1) }) },
    rejectClose: false
  });
  return resposta || null;
}

// ---------------- Os inimigos ----------------
// A rolagem de um inimigo da arquitetura (o mestre rola; o cartão sai no nome dele): a PER, a SPD, o ATK ou a DEF do
// Black ICE, a Interface do demônio (que não tem DEF), + 1d10. O netrunner inimigo ligado a uma ficha rola a Interface
// dela; sem ficha, só o 1d10.
async function rolagemDoInimigo(conteudo, id) {
  const nome = nomeDoInimigo(conteudo);
  if (conteudo.tipo === 'netrunner') {
    const ator = conteudo.ator ? await fromUuid(conteudo.ator) : null;
    if (ator?.system?.rankDeInterface) return (await ator.rolarInterface(id === 'zap' ? 'zap' : 'defesa')).total;
    return (await testar(null, { rotulo: 'Interface', partes: [], falante: nome })).total;
  }
  const tipo = conteudo.tipo === 'ice' ? 'blackice' : 'demonio';
  const numero = NUMEROS_DA_NET[tipo].find(n => n.id === (tipo === 'demonio' ? 'interface' : id));
  const valor = tipo === 'blackice' ? iceDe(conteudo.ice)?.[numero.id] ?? 0 : demonioDe(conteudo.demonio)[numero.id];
  return (await testar(null, { rotulo: numero.rotulo, partes: [{ rotulo: numero.rotulo, valor }], sabor: numero.dica, falante: nome })).total;
}

// As rolagens do netrunner (o rolagens.mjs do NET Architect): com a configuração "O jogador rola as rolagens da NET", o
// dono do netrunner, conectado, rola no computador dele, pela janela de rolagem (os modificadores e a Sorte): as ações
// que ele pediu (as habilidades de Interface, o ataque dos programas) e as reações (a velocidade contra o Black ICE, a
// defesa), mesmo quando quem pediu foi o mestre. Na ação, a janela cancelada desfaz a ação. Sem resposta no prazo (o
// "Tempo para o jogador responder"), ou com a janela da reação fechada, o mestre rola, com a Sorte preparada na ficha.
// extras: as partes a mais (o Skunk no Slide). Sem Interface, só o 1d10.
const donoDo = ator => game.users.find(user => !user.isGM && user.active && ator.testUserPermission(user, 'OWNER')) ?? null;
async function rolarNoNetrunner(ctx, { rolagem = null, programa = null, extras = [], reacao = false, aviso = '' }) {
  const { ator, usuario } = ctx;
  const jogador = quemRolaNaNet({ ligado: config('netJogadorRola'), pediu: usuario, reacao, dono: reacao ? donoDo(ator) : null });
  if (jogador) {
    const resposta = await pedirAoJogador(jogador, 'net', { ator: ator.uuid, rolagem, programa: programa?.id ?? null, extras, aviso });
    const { total, erro: cancelou, registro } = respostaDoJogador(resposta, { reacao, jogador: jogador.name, netrunner: ctx.corredor?.nome ?? ator.name });
    if (cancelou) throw erro(cancelou);
    if (total !== undefined) return total;
    if (ctx.est) registrar(ctx.est, registro);
  }
  const resultado = programa ? await ator.rolarAtaqueDePrograma(programa) : await ator.rolarInterface(rolagem, { extras });
  return resultado?.total ?? (await testar(ator, { rotulo: rolagem, partes: extras, categoria: 'net' })).total;
}

// O encontro ao chegar (a wiki): o Black ICE disputa a velocidade (vencendo, age na hora); o demônio sempre vence a
// velocidade e só detecta; o netrunner inimigo está ali.
async function encontrar(ctx, corredor, conteudo) {
  const nome = nomeDoInimigo(conteudo);
  if (conteudo.tipo === 'demonio') return registrar(ctx.est, `O demônio ${nome} detectou ${corredor.nome} (o demônio sempre vence a velocidade).`, 'falha');
  if (conteudo.tipo === 'netrunner') return registrar(ctx.est, `${nome}, um netrunner inimigo, está neste andar.`, 'falha');
  const meu = await rolarNoNetrunner(ctx, { rolagem: 'velocidade', reacao: true, aviso: `${nome} no andar: role a velocidade (Interface + 1d10 contra a SPD + 1d10 dele).` });
  const linha = resolverVelocidade(corredor, conteudo, { meu, dele: await rolagemDoInimigo(conteudo, 'spd') });
  registrar(ctx.est, linha.texto, linha.tipo);
  if (linha.iceVence) await aplicarEfeito(ctx, corredor, conteudo);
}

// O cartão de dano sem os botões do mestre (o motor aplica): o de um inimigo da arquitetura, no nome dele; o do programa
// do netrunner, já rolado, no nome do netrunner.
async function cartaoDoRoll(roll, rotulo, speaker) {
  const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano.hbs'), { rotulo, total: roll.total, critico: null, net: true, dados: dadosDoCartao(roll), botoes: [] });
  await ChatMessage.implementation.create({ speaker, content, rolls: [roll] });
  return roll.total;
}
const cartaoDeDano = async (falante, rotulo, formula) => cartaoDoRoll(await new Roll(formula).evaluate(), rotulo, { alias: falante });

// O dano no cérebro (a ficha: o Armor ativo reduz 4; o Shield não para o Black ICE nem o Zap).
async function danoNoCerebro(ctx, corredor, total, { fonte, deBlackIce = true, dePrograma = true }) {
  const ator = ctx.tile.parent.tokens.get(corredor.token)?.actor;
  if (!ator) return;
  const conta = await ator.receberDanoNoCerebro(total, { dePrograma, deBlackIce });
  registrar(ctx.est, `${corredor.nome} levou ${conta.recebido} no cérebro (${fonte}${conta.reduzido ? `; o Armor tirou ${conta.reduzido}` : ''}): HP ${conta.hpDepois}/${ator.system.hp.max}.`, 'ice');
}

// O programa destruído (o Asp; o anti-programa que zera a REZ): sai do deck, desativado e com "(destruído)" no nome; o
// mestre apaga quando quiser (como o dano do anti-programa da ficha do Black ICE, nas dúvidas).
async function destruirPrograma(programa) {
  await programa.update({ name: `${programa.name.replace(/ \(destruído\)$/, '')} (destruído)`, 'system.ativo': false, 'system.instaladoEm': '', [`flags.${SISTEMA}.destruido`]: true });
}
const sortear = lista => (lista.length ? lista[Math.floor(Math.random() * lista.length)] : null);
const ROTULO_DO_ATRIBUTO = { int: 'INT', ref: 'REF', dex: 'DEX', move: 'MOVE' };

// O efeito do Black ICE no netrunner (a tabela da wiki; regras-da-net.EFEITOS_DO_ICE), aplicado na ficha pelo mestre
// ativo: quando o ICE acerta o ataque, vence a velocidade ou age na desconexão insegura.
async function aplicarEfeito(ctx, corredor, ice) {
  const { est } = ctx;
  const ator = ctx.tile.parent.tokens.get(corredor.token)?.actor;
  if (!ator) return;
  const tabela = iceDe(ice.ice) ?? {};
  const nome = nomeDoInimigo(ice);
  const efeito = efeitoDoIce(ice.ice);
  const n = netrunnerDo(ator);
  const formula = formulaDeDano(tabela.dano);
  registrar(est, `${nome}: ${tabela.efeito || 'dano no cérebro'}`, 'ice');
  if (efeito.destroiPrograma) {
    const alvo = sortear(n.programas);
    if (!alvo) registrar(est, `O ${nome} não achou programa no deck.`);
    else {
      const antes = alvo.name;
      await destruirPrograma(alvo);
      registrar(est, `O ${nome} destruiu ${antes}.`, 'ice');
    }
  }
  if (efeito.desativaDefensor) {
    const alvo = sortear(n.programas.filter(programa => programa.system.ativo && programa.system.classe === 'defender'));
    if (alvo) {
      await alvo.update({ 'system.ativo': false });
      registrar(est, `O ${nome} desativou ${alvo.name}.`, 'ice');
    }
  }
  if (efeito.programa) {
    const alvo = sortear(n.programas.filter(programa => programa.system.ativo));
    if (!alvo) registrar(est, `O ${nome} não achou programa ativo no deck.`);
    else {
      const total = await cartaoDeDano(nome, `Dano: ${nome} (no REZ de ${alvo.name})`, formula || '1d6');
      await alvo.perderRez(total);
      if (alvo.rezAtual > 0) registrar(est, `${alvo.name} levou ${total} de REZ (fica com ${alvo.rezAtual}).`, 'ice');
      else {
        const antes = alvo.name;
        await destruirPrograma(alvo);
        registrar(est, `${antes} levou ${total} de REZ, desativou e foi destruído.`, 'ice');
      }
    }
  }
  if (efeito.cerebro && formula) await danoNoCerebro(ctx, corredor, await cartaoDeDano(nome, `Dano: ${nome} (no cérebro)`, formula), { fonte: `o ${nome}` });
  if (efeito.penalidade) {
    const rotulos = efeito.penalidade.map(chave => ROTULO_DO_ATRIBUTO[chave]).join(', ').replace(/, ([^,]*)$/, ' e $1');
    const valor = await cartaoDeDano(nome, `${nome}: −1d6 em ${rotulos} por 1 hora`, '1d6');
    await ator.createEmbeddedDocuments('ActiveEffect', [{
      name: `${nome} (−${valor} em ${rotulos}, 1 hora)`, img: 'icons/svg/downgrade.svg', type: 'base',
      system: { changes: efeito.penalidade.map(chave => ({ key: `system.atributos.${chave}.valor`, type: 'add', value: String(-valor), phase: 'initial', priority: null })) },
      duration: { value: 1, units: 'hours' }, start: { time: game.time.worldTime }, flags: { [SISTEMA]: { efeitoDaNet: ice.ice } }
    }]);
    registrar(est, `${corredor.nome}: −${valor} em ${rotulos} por 1 hora.`, 'ice');
  }
  if (efeito.skunk) {
    corredor.skunks = [...new Set([...(corredor.skunks ?? []), ice.chave])];
    registrar(est, `${corredor.nome} leva −2 no Slide enquanto este Skunk estiver ativo.`, 'ice');
  }
  if (efeito.prende) {
    corredor.preso = PRISAO_DO_KRAKEN;
    registrar(est, `O ${nome} prende ${corredor.nome}: até o fim do próximo turno, não avança nem desconecta com segurança.`, 'ice');
  }
  if (efeito.menosAcoes) {
    corredor.menosAcoes = 1;
    registrar(est, `${corredor.nome} terá 1 Ação NET a menos no próximo turno (no mínimo 2).`, 'ice');
  }
  if (efeito.fogo) {
    if (n.isolado) registrar(est, `O fogo do ${nome} não pegou: o deck tem o Insulated Wiring.`);
    else if (!ator.statuses.has(STATUS_EM_CHAMAS)) {
      await ator.toggleStatusEffect(STATUS_EM_CHAMAS, { active: true });
      registrar(est, `${corredor.nome} pegou fogo: 2 no HP no fim de cada turno, até gastar uma Ação Carnal para apagar.`, 'ice');
    }
  }
  if (efeito.derruba && !corredor.saindo) {
    if (n.krash) registrar(est, `A KRASH Barrier do deck segurou a conexão: o ${nome} não derrubou ${corredor.nome}.`, 'ok');
    else await retirar(ctx, corredor, { inseguro: true, motivo: `derrubado pelo ${nome}`, exceto: ice.chave });
  }
}

// O Zap do netrunner no inimigo (a wiki): a defesa dele; acertando, o 1d6 (o cartão sem os botões do mestre: o motor
// aplica) na REZ do Black ICE ou do demônio, ou no cérebro do netrunner inimigo (que cai da NET com o HP em 0).
async function zap(ctx, alvo, total) {
  const { est, corredor, ator } = ctx;
  const defesa = await rolagemDoInimigo(alvo, 'def');
  const dano = total > defesa ? (await ator.rolarDanoDoZap({ botoes: false })).total : 0;
  const linha = resolverZap(est, corredor, alvo, { total, defesa, dano });
  if (linha.acertou && alvo.tipo === 'netrunner') {
    const inimigo = alvo.ator ? await fromUuid(alvo.ator) : null;
    const resultado = await inimigo?.receberDanoNoCerebro?.(dano, { dePrograma: false });
    if (resultado && resultado.hpDepois <= 0) {
      est.fora = [...new Set([...(est.fora ?? []), alvo.chave])];
      linha.texto += ` ${nomeDoInimigo(alvo)} caiu da NET.`;
    } else if (!resultado) linha.texto += ' (sem ficha ligada: o mestre aplica o dano).';
  }
  return linha;
}

// ---------------- Operações (o que o socket chama, no mestre ativo) ----------------
export const operacoes = {
  async conectar(dados, usuario) {
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, token, ponto, est, ator } = ctx;
    if (!token || !ator) throw erro('Escolha um token com ficha para conectar.');
    if (ctx.corredor) return { jaConectado: true };
    const outra = conexaoDoToken(token);
    if (outra && outra.tile !== tile.uuid) throw erro('Este netrunner já está conectado em outro ponto de acesso.');
    const faltas = faltasPara(ponto, ator);
    if (faltas.length && !usuario.isGM) throw erro(`Para conectar aqui falta ${faltas.join(' e ')}.`);
    const n = netrunnerDo(ator);
    const longe = distancia(tile, token);
    const alcance = alcanceDo(ponto, tile.parent, n);
    if (longe > alcance + 0.01 && !usuario.isGM) throw erro(`Longe demais do ponto de acesso: ${longe.toFixed(1)} ${tile.parent.grid.units || 'm'} (alcance ${alcance}).`);
    const dono = game.users.find(user => !user.isGM && user.active && ator.testUserPermission(user, 'OWNER'))
      ?? game.users.find(user => !user.isGM && ator.testUserPermission(user, 'OWNER')) ?? usuario;
    est.corredores = [...est.corredores, {
      token: token.id, ator: ator.id, nome: token.name, img: token.texture?.src || ator.img, usuario: dono.id, no: ENTRADA,
      acoes: emCombate(token) ? 1 : 0, max: acoesDeNet(n.rank), engajado: [], escapou: [], programasNaRodada: [], preso: 0
    }];
    registrar(est, `${token.name} conectou em ${ponto.nome || 'um ponto de acesso'}.`, 'info');
    await concluir(ctx);
    await marcarToken(token, tile, true);
    return { conectado: true };
  },

  // Desconectar com segurança é 1 Ação NET (a wiki); a desconexão insegura, não.
  async desconectar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const inseguro = Boolean(dados.inseguro);
    const preso = inseguro || usuario.isGM ? null : motivoParaNaoDesconectar(ctx.corredor);
    if (preso) throw erro(preso);
    const semAcao = inseguro ? null : gastarAcoes(ctx.corredor, { emCombate: emCombate(ctx.token), mestre: usuario.isGM });
    if (semAcao) throw erro(`${semAcao} Espere o seu turno ou faça a desconexão insegura.`);
    await retirar(ctx, ctx.corredor, { inseguro, motivo: dados.motivo || '' });
    await concluir(ctx);
    return { desconectado: true };
  },

  // Andar a um andar vizinho (a wiki: não é Ação NET; vai até a próxima obstrução). O andar a que chega fica visto; os
  // inimigos encontrados nele entram no combate da cena (o combate.mjs).
  async mover(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor } = ctx;
    const motivo = motivoParaNaoAndar(arq, est, corredor, dados.destino);
    if (motivo) throw erro(motivo);
    const descendo = filhosDe(arq, corredor.no).includes(dados.destino);
    corredor.no = dados.destino;
    const inimigos = inimigosAtivos(arq, est, corredor.no);
    Object.assign(corredor, { engajado: inimigos.map(conteudo => conteudo.chave), escapou: [] });
    if (corredor.no === ENTRADA) registrar(est, `${corredor.nome} voltou ao ponto de acesso.`);
    else {
      if (!est.vistos.includes(corredor.no)) est.vistos = [...est.vistos, corredor.no];
      registrar(est, `${corredor.nome} ${descendo ? 'desceu' : 'subiu'} para ${lugar(arq, corredor.no)}: ${resumoDoAndar(arq, corredor.no)}.`);
      const seguram = fraseDaChegada(arq, est, corredor);
      if (seguram) registrar(est, seguram, 'falha');
      for (const conteudo of inimigos) if (est.corredores.includes(corredor)) await encontrar(ctx, corredor, conteudo);
      if (est.corredores.includes(corredor)) await entrarNoCombate(ctx, inimigos);
    }
    await concluir(ctx);
    return { no: corredor.no };
  },

  // Uma habilidade de Interface contra os andares: o alvo aqui, a Ação NET (em combate), a rolagem (o jogador que pediu
  // rola, ou o mestre: rolarNoNetrunner) e o resultado. O Virus pergunta ao mestre a DV e as Ações NET.
  async habilidade(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, ator } = ctx;
    const chave = dados.habilidade;
    const { alvo, erro: problema } = alvoDaHabilidade(arq, est, corredor, chave, dados.alvo);
    if (problema) throw erro(problema);
    exigirNetrunner(ator);
    const texto = String(dados.texto ?? '').trim().slice(0, 200);
    if (chave === 'virus' && !texto) throw erro('Escreva o que o vírus faz: o mestre define a DV e as Ações NET.');
    const agora = emCombate(token);
    const virus = chave === 'virus' ? await perguntarVirus(corredor, texto, agora) : null;
    if (chave === 'virus' && !virus) throw erro('O mestre não aceitou o vírus agora.');
    const umSlide = chave === 'slide' ? motivoParaNaoSlide(corredor, agora) : null;
    if (umSlide && !usuario.isGM) throw erro(umSlide);
    const semAcao = gastarAcoes(corredor, { emCombate: agora, mestre: usuario.isGM, quantas: virus?.acoes ?? 1 });
    if (semAcao) throw erro(semAcao);
    const skunk = chave === 'slide' ? penalidadeDoSkunk(arq, est, corredor) : 0;
    const rolagem = { total: await rolarNoNetrunner(ctx, { rolagem: chave, extras: skunk ? [{ rotulo: 'Skunk', valor: skunk }] : [] }) };
    let linha;
    if (chave === 'zap') linha = await zap(ctx, alvo, rolagem.total);
    else if (chave === 'slide') {
      if (agora) corredor.slides = (corredor.slides ?? 0) + 1;
      linha = resolverSlide(corredor, alvo, { total: rolagem.total, per: await rolagemDoInimigo(alvo, 'per') });
    } else linha = resolverHabilidade(arq, est, corredor, { chave, alvo, total: rolagem.total, dvVirus: virus?.dv, texto });
    registrar(est, linha.texto, linha.tipo);
    await concluir(ctx);
    return { total: rolagem.total };
  },

  // Um comando no nó de controle tomado neste andar (a wiki: 1 Ação NET por comando); o mestre narra.
  async comandar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token } = ctx;
    if (!conteudosDoNo(arq, corredor.no).some(conteudo => conteudo.tipo === 'controle' && est.feitos.includes(conteudo.chave))) throw erro('Não há nó de controle tomado neste andar.');
    const texto = String(dados.texto ?? '').trim().slice(0, 200);
    if (!texto) throw erro('Escreva o comando.');
    const semAcao = gastarAcoes(corredor, { emCombate: emCombate(token), mestre: usuario.isGM });
    if (semAcao) throw erro(semAcao);
    registrar(est, `${corredor.nome} comanda o nó de controle: “${texto}”.`);
    await concluir(ctx);
    return { ok: true };
  },

  // O mestre revela um andar ou o mapa inteiro.
  async revelar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre revela andares.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { arq, est } = ctx;
    if (dados.tudo) {
      est.mapa = true;
      registrar(est, 'O mestre revelou o mapa da arquitetura.');
    } else if (arq.nos[dados.no] && !est.vistos.includes(dados.no)) {
      est.vistos = [...est.vistos, dados.no];
      registrar(est, `O mestre revelou ${lugar(arq, dados.no)}.`);
    }
    await concluir(ctx);
    return { ok: true };
  },

  // O mestre muda a REZ de um Black ICE ou demônio da arquitetura (o dano que veio de fora, a REZ cheia de volta). Com
  // dados.rez, é a REZ que mudou no token do inimigo no combate (o index.mjs): igual à do estado, nada muda.
  async ajustarRez(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre ajusta a REZ dos inimigos.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const achado = acharConteudo(ctx.arq, dados.alvo);
    if (!achado || !['ice', 'demonio'].includes(achado.conteudo.tipo)) throw erro('Este inimigo não está na arquitetura.');
    const { conteudo } = achado;
    const antes = rezDe(ctx.est, conteudo);
    const doToken = dados.rez !== undefined;
    const pedida = doToken ? Number(dados.rez) || 0 : dados.cheia ? Infinity : antes + (Number(dados.delta) || 0);
    if (doToken && Math.max(0, Math.min(rezMaxDe(conteudo), pedida)) === antes) return { rez: antes };
    const rez = mudarRez(ctx.est, conteudo, pedida);
    registrar(ctx.est, doToken ? `A REZ do ${nomeDoInimigo(conteudo)} mudou no token: ${rez ? `fica com ${rez}` : 'ele caiu'}.` : `O mestre pôs a REZ do ${nomeDoInimigo(conteudo)} em ${rez}.`);
    await concluir(ctx);
    return { rez };
  },

  // A vez de um inimigo (a wiki: "O mestre joga todos os turnos do Black ICE"): ele ataca o netrunner do andar dele. O
  // Black ICE com o ATK + 1d10, acertando, faz o efeito dele; o demônio e o netrunner inimigo, com o Zap (1d6 no cérebro).
  async inimigoAtaca(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre joga a vez dos inimigos.');
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor } = ctx;
    const inimigo = inimigosQueAtacam(arq, est, corredor).find(conteudo => conteudo.chave === dados.alvo);
    if (!inimigo) throw erro(`Este inimigo não ataca ${corredor.nome} agora (não está ativo no andar dele, ou foi driblado com o Slide).`);
    const nome = nomeDoInimigo(inimigo);
    const ataque = await rolagemDoInimigo(inimigo, inimigo.tipo === 'ice' ? 'atk' : 'zap');
    const defesa = await rolarNoNetrunner(ctx, { rolagem: 'defesa', reacao: true, aviso: `${nome} ataca (${ataque}): role a defesa (Interface + 1d10).` });
    const linha = resolverAtaque(corredor, inimigo, { ataque, defesa });
    registrar(est, linha.texto, linha.tipo);
    if (linha.acertou && inimigo.tipo === 'ice') await aplicarEfeito(ctx, corredor, inimigo);
    else if (linha.acertou) await danoNoCerebro(ctx, corredor, await cartaoDeDano(nome, `Dano: Zap do ${nome} (no cérebro)`, '1d6'), { fonte: `o Zap do ${nome}`, deBlackIce: false, dePrograma: false });
    await concluir(ctx);
    return { acertou: linha.acertou };
  },

  // O deck (a wiki, "Ações NET" e "Programas: ataque"): ativar ou desativar um programa instalado no deck equipado é 1
  // Ação NET (em combate, cada programa uma vez por rodada); atacar com um programa de ataque ativo é 1 Ação NET (o
  // Interface + ATK + 1d10 contra a defesa do inimigo; o anti-pessoal só em netrunner, o anti-programa só no Black ICE e no
  // demônio), e ele desativa sozinho depois de usado.
  async programa(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, ator } = ctx;
    exigirNetrunner(ator);
    const programa = netrunnerDo(ator).programas.find(item => item.id === dados.programa);
    if (!programa) throw erro('Este programa não está instalado no cyberdeck equipado.');
    const agora = emCombate(token);
    if (dados.acao === 'ativar' || dados.acao === 'desativar') {
      const ativar = dados.acao === 'ativar';
      if (programa.system.ativo === ativar) return { ok: true };
      const motivo = usuario.isGM ? null : motivoParaNaoMudarPrograma(programa, corredor, { emCombate: agora, ativar });
      if (motivo) throw erro(motivo);
      const semAcao = gastarAcoes(corredor, { emCombate: agora, mestre: usuario.isGM });
      if (semAcao) throw erro(semAcao);
      if (agora) corredor.programasNaRodada = [...new Set([...(corredor.programasNaRodada ?? []), programa.id])];
      await programa.update({ 'system.ativo': ativar });
      registrar(est, `${corredor.nome} ${ativar ? 'ativou' : 'desativou'} ${programa.name}.`);
      await concluir(ctx);
      return { ok: true };
    }
    if (dados.acao !== 'atacar') throw erro('Ação de programa desconhecida.');
    if (!programaDeAtaque(programa.system.classe)) throw erro(`${programa.name} não é um programa de ataque.`);
    if (!programa.system.ativo) throw erro(`Ative ${programa.name} antes de atacar com ele.`);
    const { alvo, erro: problema } = alvoDoPrograma(arq, est, corredor, programa, dados.alvo);
    if (problema) throw erro(problema);
    const semAcao = gastarAcoes(corredor, { emCombate: agora, mestre: usuario.isGM });
    if (semAcao) throw erro(semAcao);
    const ataque = await rolarNoNetrunner(ctx, { programa });
    const defesa = await rolagemDoInimigo(alvo, 'def');
    let dano = 0;
    if (ataque > defesa) {
      const contra = alvo.tipo === 'netrunner' ? 'padrao' : 'blackIce';
      const rolagem = await programa.rolarDanoDePrograma(contra, { falar: false });
      dano = rolagem ? await cartaoDoRoll(rolagem.roll, `Dano: ${programa.name} (${alvo.tipo === 'netrunner' ? 'no cérebro' : 'na REZ'} de ${nomeDoInimigo(alvo)})`, ChatMessage.implementation.getSpeaker({ actor: ator })) : 0;
    }
    const linha = resolverAtaqueDePrograma(est, corredor, programa, alvo, { ataque, defesa, dano });
    if (linha.acertou && alvo.tipo === 'netrunner') {
      const inimigo = alvo.ator ? await fromUuid(alvo.ator) : null;
      const resultado = await inimigo?.receberDanoNoCerebro?.(dano, { dePrograma: true });
      if (resultado && resultado.hpDepois <= 0) {
        est.fora = [...new Set([...(est.fora ?? []), alvo.chave])];
        linha.texto += ` ${nomeDoInimigo(alvo)} caiu da NET.`;
      } else if (!resultado) linha.texto += ' (sem ficha ligada: o mestre aplica o dano).';
    }
    registrar(est, linha.texto, linha.tipo);
    await programa.update({ 'system.ativo': false });
    registrar(est, `${programa.name} desativou depois do ataque (o programa de ataque desativa sozinho depois de usado).`);
    await concluir(ctx);
    return { acertou: linha.acertou };
  },

  // Apagar o fogo do Hellhound (a wiki: uma Ação Carnal): o dono do netrunner ou o mestre.
  async apagarFogo(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    if (!ctx.ator.statuses.has(STATUS_EM_CHAMAS)) throw erro(`${ctx.corredor.nome} não está em chamas.`);
    await ctx.ator.toggleStatusEffect(STATUS_EM_CHAMAS, { active: false });
    registrar(ctx.est, `${ctx.corredor.nome} apagou o fogo (uma Ação Carnal).`, 'ok');
    await concluir(ctx);
    return { ok: true };
  },

  // O começo do turno do netrunner (pelo combate, no mestre ativo, ou pelo botão do mestre): as Ações NET voltam.
  async zerarAcoes(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre zera as Ações NET.');
    const ctx = await contexto(dados, usuario);
    if (comecoDoTurno(ctx.corredor)) registrar(ctx.est, `${ctx.corredor.nome} começa o turno com 1 Ação NET a menos (o Wisp).`, 'ice');
    await concluir(ctx);
    return { ok: true };
  },

  // O mestre volta a arquitetura ao começo (ninguém conectado): as defesas, o mapa e o registro.
  async reiniciar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre reinicia a arquitetura.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    if (ctx.est.corredores.length) throw erro('Tem netrunner conectado: desconecte antes de reiniciar.');
    const est = estadoNovo(ctx.ponto, ctx.arq);
    registrar(est, 'O mestre reiniciou a arquitetura.', 'info');
    await gravar(ctx.tile, ctx.arq, est);
    await tirarInimigos(ctx.tile);
    return { reiniciado: true };
  }
};
