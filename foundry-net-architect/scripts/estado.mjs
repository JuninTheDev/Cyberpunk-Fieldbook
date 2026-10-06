// O motor da NET, sempre no cliente do mestre ativo: conecta e desconecta netrunners, move pela arquitetura,
// resolve as habilidades de Interface e os inimigos (Black ICE, demônios, netrunners inimigos) com as rolagens do
// sistema, aplica os efeitos na ficha, põe os inimigos no combate, executa os comandos dos nós de controle e grava
// o estado no Tile. No Tile só vai o que os jogadores podem ver; o resto fica no item da arquitetura.
import { MODULE_ID, FLAG_PONTO, FLAG_ESTADO, FLAG_CONEXAO, STATUS_ID, HABILIDADES, NOME_DO_TIPO, acoesPorRank, iceDaChave, demonioDaChave } from './constantes.mjs';
import { ENTRADA, lerArquitetura, vizinhos, filhosDe, ehFundo, revelarPathfinder } from './arquitetura.mjs';
import { erro } from './socket.mjs';
import * as rolagens from './rolagens.mjs';
import { aplicarEfeitoDoIce, danoNoCerebro, apagarFogo, emChamas } from './efeitos.mjs';
import { entrarNoCombate, sincronizarCombate, sairDoCombate } from './combate.mjs';
import { acionar, devolver, ligacoesDo } from './ligacoes.mjs';
import { copiarArquivo } from './arquivos.mjs';
import { animar, tocar } from './fx.mjs';

const LOG_MAX = 60;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- Leitura ----------------
export const pontoDoTile = tile => (tile && tile.getFlag(MODULE_ID, FLAG_PONTO)) || null;
export const estadoDoTile = tile => (tile && tile.getFlag(MODULE_ID, FLAG_ESTADO)) || null;
export const conexaoDoToken = token => (token && token.getFlag(MODULE_ID, FLAG_CONEXAO)) || null;

export async function arquiteturaDoPonto(ponto) {
  if (!ponto || !ponto.arquitetura) throw erro('Este ponto de acesso ainda não tem arquitetura: o mestre escolhe na configuração.');
  const item = await fromUuid(ponto.arquitetura);
  if (!item || item.type !== 'netarch') throw erro('A arquitetura deste ponto de acesso não foi encontrada (apagada do compêndio?).');
  return lerArquitetura(item, { dv: ponto.dv });
}

// O netrunner do ator: a Role de netrunning ativa (Interface), o cyberdeck equipado e os programas dele.
export function netrunnerDo(actor) {
  const roles = (actor && actor.itemTypes && actor.itemTypes.role) || [];
  const ativa = actor && actor.system && actor.system.roleInfo ? actor.system.roleInfo.activeNetRole : '';
  const role = roles.find(item => item.id === ativa) || roles.find(item => /interface/i.test(item.system.mainRoleAbility || '')) || null;
  const deck = ((actor && actor.itemTypes && actor.itemTypes.cyberdeck) || []).find(item => item.system.equipped === 'equipped') || null;
  const programas = deck ? (deck.system.installedPrograms || []) : [];
  return { role, deck, programas, rank: role ? Number(role.system.rank) || 0 : 0 };
}

export function faltasPara(ponto, actor) {
  const n = netrunnerDo(actor);
  const faltas = [];
  if (ponto.exigeDeck !== false && !n.deck) faltas.push('um cyberdeck equipado');
  const minimo = Number(ponto.rankMinimo) || 0;
  if (minimo > 0 && n.rank < minimo) faltas.push(`Interface ${minimo} (tem ${n.rank})`);
  return faltas;
}

// Distância (em unidades da cena) do centro do token até o ponto mais próximo do Tile.
export function distancia(tile, token) {
  const cena = tile.parent;
  const tamanho = cena.grid.size;
  const centro = { x: token.x + (token.width * tamanho) / 2, y: token.y + (token.height * tamanho) / 2 };
  const perto = { x: Math.min(Math.max(centro.x, tile.x), tile.x + tile.width), y: Math.min(Math.max(centro.y, tile.y), tile.y + tile.height) };
  return (Math.hypot(centro.x - perto.x, centro.y - perto.y) / tamanho) * cena.grid.distance;
}
export const alcanceDo = (ponto, cena) => (Number(ponto.alcance) > 0 ? Number(ponto.alcance) : cena.grid.distance);

// Ações NET: em combate, cada netrunner tem as do rank por turno; fora de combate não contam.
export function emCombate(token) {
  return game.combats.some(combate => combate.started && combate.combatants.some(item => item.tokenId === token.id && item.sceneId === token.parent.id));
}
function gastarAcao(corredor, token, usuario, quantas = 1) {
  if (!emCombate(token)) return;
  if (!usuario.isGM && corredor.acoes + quantas > corredor.max) throw erro(`Sem Ações NET neste turno (${corredor.acoes} de ${corredor.max}).`);
  corredor.acoes += quantas;
}

function exigirNetrunner(actor) {
  const n = netrunnerDo(actor);
  if (!n.deck) throw erro('Sem cyberdeck equipado: não dá para agir na NET.');
  if (!n.role) throw erro('Sem Role de netrunning (Interface) na ficha: o sistema não sabe com que rank rolar.');
  return n;
}

// ---------------- Inimigos: Black ICE, demônios e netrunners inimigos ----------------
const INIMIGOS = ['ice', 'demonio', 'netrunner'];
export const ehInimigo = conteudo => INIMIGOS.includes(conteudo.tipo);
const conteudosDe = (arq, id) => (id === ENTRADA || !arq.nos[id] ? [] : arq.nos[id].conteudos);
const acharConteudo = (arq, chave) => {
  for (const no of Object.values(arq.nos)) {
    const achado = no.conteudos.find(item => item.chave === chave);
    if (achado) return { no, conteudo: achado };
  }
  return null;
};
const rezMaxDe = conteudo => (conteudo.tipo === 'ice' ? iceDaChave(conteudo.ice).rez : conteudo.tipo === 'demonio' ? demonioDaChave(conteudo.demonio).rez : null);
function rezDe(est, conteudo) {
  if (conteudo.tipo === 'netrunner') return null;
  const salvo = est.ices.find(item => item.chave === conteudo.chave);
  return salvo ? salvo.rez : rezMaxDe(conteudo);
}
function mudarRez(est, conteudo, rez) {
  const valor = Math.max(0, Math.min(rezMaxDe(conteudo), rez));
  est.ices = [...est.ices.filter(item => item.chave !== conteudo.chave), { chave: conteudo.chave, rez: valor }];
  return valor;
}
const inimigoAtivo = (est, conteudo) => (conteudo.tipo === 'netrunner' ? !(est.fora || []).includes(conteudo.chave) : rezDe(est, conteudo) > 0);
const atorDoNetrunner = conteudo => (conteudo.ator ? fromUuidSync(conteudo.ator) : null);
export function nomeDoInimigo(conteudo) {
  if (conteudo.tipo === 'ice') return iceDaChave(conteudo.ice).nome;
  if (conteudo.tipo === 'demonio') return conteudo.nome || demonioDaChave(conteudo.demonio).nome;
  const actor = atorDoNetrunner(conteudo);
  return conteudo.nome || (actor && actor.name) || 'Netrunner inimigo';
}
const inimigosAtivos = (arq, est, id) => conteudosDe(arq, id).filter(conteudo => ehInimigo(conteudo) && inimigoAtivo(est, conteudo));
// Quem segura a descida: Black ICE (a não ser que tenha dado Slide) e demônios. Netrunner inimigo não segura.
const quemSegura = (arq, est, corredor) => inimigosAtivos(arq, est, corredor.no).filter(conteudo => conteudo.tipo === 'demonio' || (conteudo.tipo === 'ice' && !corredor.escapou.includes(conteudo.chave)));

// Defesa do inimigo contra um ataque do netrunner: DEF do ICE, Interface do demônio, ou a defesa do netrunner inimigo.
async function defesaDo(conteudo) {
  const nome = nomeDoInimigo(conteudo);
  if (conteudo.tipo === 'ice') return rolagens.rolagemDoIce({ nome, rotulo: 'DEF', valor: iceDaChave(conteudo.ice).def });
  if (conteudo.tipo === 'demonio') return rolagens.rolagemDoIce({ nome, rotulo: 'Interface', valor: demonioDaChave(conteudo.demonio).interface });
  const actor = atorDoNetrunner(conteudo);
  const n = actor ? netrunnerDo(actor) : null;
  if (n && n.deck && n.role) return rolagens.interfaceRoll({ actor, token: null, deck: n.deck, role: n.role, habilidade: 'defense', titulo: `${nome}: defesa` });
  return rolagens.rolagemDoIce({ nome, rotulo: 'Interface', valor: n ? n.rank : 0 });
}

// Dano no inimigo: REZ (Black ICE e demônio) ou HP do netrunner inimigo (direto no cérebro).
async function danoNoInimigo(est, conteudo, total) {
  if (conteudo.tipo !== 'netrunner') {
    const rez = mudarRez(est, conteudo, rezDe(est, conteudo) - total);
    return rez <= 0 ? ', e ele caiu' : `, fica com ${rez} de REZ`;
  }
  const actor = atorDoNetrunner(conteudo);
  const hp = actor && actor.system.derivedStats && actor.system.derivedStats.hp;
  if (!hp) return ' (aplique no HP)';
  const novo = Math.max(0, Number(hp.value) - total);
  await actor.update({ 'system.derivedStats.hp.value': novo });
  if (novo <= 0) est.fora = [...new Set([...(est.fora || []), conteudo.chave])];
  return novo <= 0 ? ', e ele caiu da NET' : `, fica com HP ${novo}/${hp.max}`;
}

// ---------------- Estado ----------------
const estadoNovo = (ponto, arq) => ({ v: 2, arquitetura: ponto.arquitetura, nome: arq.nome, dv: arq.dv, mapa: false, vistos: [], feitos: [], ices: [], fora: [], arquivos: [], assumidos: [], combatentes: [], corredores: [], nos: [], log: [] });

// Os andares que os jogadores enxergam: os revelados (com o conteúdo) e os vizinhos de quem está na NET ("?").
function vistaPublica(arq, est) {
  const vistos = new Set(est.vistos);
  if (est.mapa) for (const id of Object.keys(arq.nos)) vistos.add(id);
  const feitos = new Set(est.feitos);
  const desconhecidos = new Set();
  for (const corredor of est.corredores) for (const id of vizinhos(arq, corredor.no)) if (id !== ENTRADA && !vistos.has(id)) desconhecidos.add(id);
  const nos = [];
  for (const id of [...vistos, ...desconhecidos]) {
    const no = arq.nos[id];
    if (!no) continue;
    if (!vistos.has(id)) { nos.push({ id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: false }); continue; }
    nos.push({
      id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: true,
      conteudos: no.conteudos.map(conteudo => {
        const publico = { chave: conteudo.chave, tipo: conteudo.tipo, dv: conteudo.dv, feito: feitos.has(conteudo.chave) };
        if (conteudo.tipo === 'ice') publico.inimigo = { ...iceDaChave(conteudo.ice), modelo: conteudo.ice, rezAtual: rezDe(est, conteudo) };
        if (conteudo.tipo === 'demonio') publico.inimigo = { ...demonioDaChave(conteudo.demonio), nome: nomeDoInimigo(conteudo), modelo: conteudo.demonio, classe: 'Demônio', rezAtual: rezDe(est, conteudo) };
        if (conteudo.tipo === 'netrunner') publico.inimigo = { nome: nomeDoInimigo(conteudo), classe: 'Netrunner inimigo', rez: null, rezAtual: null, ativo: inimigoAtivo(est, conteudo) };
        if (publico.inimigo) publico.feito = !inimigoAtivo(est, conteudo);
        if (publico.feito && (conteudo.tipo === 'arquivo' || conteudo.tipo === 'controle')) publico.descricao = conteudo.descricao;
        if (conteudo.tipo === 'arquivo') publico.diario = ((est.arquivos || []).find(item => item.chave === conteudo.chave) || {}).uuid || '';
        return publico;
      })
    });
  }
  return nos;
}

function registrar(est, texto, tipo = 'info') {
  est.log = [...est.log, { t: Date.now(), texto, tipo }].slice(-LOG_MAX);
}

async function gravar(tile, arq, est) {
  est.nos = vistaPublica(arq, est);
  await tile.update({ [`flags.${MODULE_ID}.${FLAG_ESTADO}`]: est });
  return est;
}

// Tudo o que um pedido precisa: o Tile, o token, o ponto, a arquitetura, o estado e o corredor (netrunner na NET).
async function contexto(dados, usuario, { precisaCorredor = true } = {}) {
  const tile = await fromUuid(dados.tile);
  if (!tile || tile.documentName !== 'Tile') throw erro('Ponto de acesso não encontrado.');
  const ponto = pontoDoTile(tile);
  if (!ponto || !ponto.ativo) throw erro('Este Tile não é um ponto de acesso à NET ativo.');
  const token = dados.token ? tile.parent.tokens.get(dados.token) : null;
  if (dados.token && !token) throw erro('O token não está nesta cena.');
  if (token && !usuario.isGM && !(token.actor && token.actor.testUserPermission(usuario, 'OWNER'))) throw erro('Você não controla este token.');
  const arq = await arquiteturaDoPonto(ponto);
  let est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est || est.arquitetura !== ponto.arquitetura) est = estadoNovo(ponto, arq);
  for (const campo of ['fora', 'arquivos', 'assumidos', 'combatentes']) est[campo] = est[campo] || [];
  est.dv = arq.dv;
  est.nome = arq.nome;
  const corredor = token ? est.corredores.find(item => item.token === token.id) : null;
  if (precisaCorredor && !corredor) throw erro('Este netrunner não está conectado a este ponto de acesso.');
  return { tile, token, ponto, arq, est, corredor, actor: token ? token.actor : null, usuario, inicio: Date.now(), havia: est.corredores.length, desmarcar: [], registrar, netrunnerDo };
}
// O contexto de outro corredor (para efeitos que caem em quem não pediu: Giant, desconexão insegura).
const contextoDe = (ctx, corredor) => ({ ...ctx, corredor, token: ctx.tile.parent.tokens.get(corredor.token) });

// Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198): Black ICE e demônios de volta,
// senhas e nós trancados, tokens assumidos devolvidos. Os arquivos copiados continuam.
async function reiniciarDefesas(ctx) {
  const { est, arq, tile } = ctx;
  est.ices = [];
  est.fora = [];
  est.feitos = est.feitos.filter(chave => { const achado = acharConteudo(arq, chave); return achado && achado.conteudo.tipo === 'arquivo'; });
  await devolver(tile.parent, est);
  await sairDoCombate(est, tile.parent);
  registrar(est, 'Ninguém na NET: a arquitetura reiniciou as defesas (Black ICE e demônios de volta, senhas e nós trancados).', 'info');
}

// Tira um corredor da NET (segura ou insegura). Na insegura, o Black ICE encontrado e ativo ataca de graça.
async function retirar(ctx, corredor, { inseguro = false, motivo = '', exceto = null } = {}) {
  const { arq, est, tile } = ctx;
  const token = tile.parent.tokens.get(corredor.token);
  if (inseguro) {
    registrar(est, `${corredor.nome} desconectou de forma insegura${motivo ? ` (${motivo})` : ''}.`, 'falha');
    const ativos = (corredor.engajado || []).map(chave => conteudosDe(arq, corredor.no).find(item => item.chave === chave))
      .filter(item => item && item.tipo === 'ice' && item.chave !== exceto && inimigoAtivo(est, item));
    if (token) for (const conteudo of ativos) await aplicarEfeitoDoIce(contextoDe(ctx, corredor), conteudo);
  } else registrar(est, `${corredor.nome} desconectou.`, 'info');
  est.corredores = est.corredores.filter(item => item.token !== corredor.token);
  await devolver(tile.parent, est, item => item.usuario === corredor.usuario);
  ctx.desmarcar.push(corredor.token);
  if (token) {
    tocar(inseguro ? 'dano' : 'desconectar', token.actor);
    animar(inseguro ? 'dano' : 'desconectar', { token });
  }
}

// Fecha a operação: expulsões (Giant), Skunk que caiu, reinício das defesas, combate, som e gravação.
async function concluir(ctx) {
  const { est, tile, arq, ponto } = ctx;
  for (const corredor of [...est.corredores]) {
    if (!corredor.expulso) continue;
    const fonte = corredor.expulso;
    delete corredor.expulso;
    await retirar(ctx, corredor, { inseguro: true, motivo: 'derrubado pelo Giant', exceto: fonte });
  }
  for (const corredor of est.corredores) {
    corredor.skunks = (corredor.skunks || []).filter(chave => { const achado = acharConteudo(arq, chave); return achado && inimigoAtivo(est, achado.conteudo); });
  }
  if (ctx.havia > 0 && !est.corredores.length && ponto.reiniciar !== false) await reiniciarDefesas(ctx);
  await sincronizarCombate(est, tile.parent, chave => { const achado = acharConteudo(arq, chave); return achado ? rezDe(est, achado.conteudo) : null; });
  // O som da operação para quem pediu: dano, falha ou sucesso (pelo que entrou no registro agora).
  const novos = est.log.filter(linha => linha.t >= ctx.inicio).map(linha => linha.tipo);
  if (ctx.token && ctx.token.actor && est.corredores.some(item => item.token === ctx.token.id)) {
    if (novos.includes('ice')) { tocar('dano', ctx.token.actor); animar('dano', { token: ctx.token }); }
    else if (novos.includes('falha')) tocar('falha', ctx.token.actor);
    else if (novos.includes('ok')) tocar('sucesso', ctx.token.actor);
  }
  await gravar(tile, arq, est);
  for (const id of ctx.desmarcar) { const token = tile.parent.tokens.get(id); if (token) await marcarToken(token, tile, false); }
}

// ---------------- Efeito no token ----------------
async function marcarToken(token, tile, ligado) {
  if (ligado) await token.setFlag(MODULE_ID, FLAG_CONEXAO, { tile: tile.uuid, desde: Date.now() });
  else await token.unsetFlag(MODULE_ID, FLAG_CONEXAO);
  const actor = token.actor;
  if (actor && typeof actor.toggleStatusEffect === 'function') {
    try { await actor.toggleStatusEffect(STATUS_ID, { active: ligado }); } catch (error) { console.warn(`${MODULE_ID} | efeito no token`, error); }
  }
}

// ---------------- Ataques dos inimigos ----------------
// Ao chegar num andar: o Black ICE disputa a velocidade (Interface + velocidade + 1d10 contra SPD + 1d10; se o ICE
// vencer, o efeito vem na hora); demônios sempre vencem a velocidade e só detectam; todos entram no combate.
async function encontrarInimigos(ctx, corredor) {
  const { arq, est, token } = ctx;
  const inimigos = inimigosAtivos(arq, est, corredor.no);
  if (!inimigos.length) return;
  const n = exigirNetrunner(token.actor);
  tocar('alarme', token.actor);
  animar('ice', { token });
  for (const conteudo of inimigos) {
    const nome = nomeDoInimigo(conteudo);
    if (!corredor.engajado.includes(conteudo.chave)) corredor.engajado.push(conteudo.chave);
    if (conteudo.tipo === 'demonio') { registrar(est, `O demônio ${nome} detectou ${corredor.nome} (demônios sempre vencem a velocidade).`, 'falha'); continue; }
    if (conteudo.tipo === 'netrunner') { registrar(est, `${nome}, um netrunner inimigo, está neste andar.`, 'falha'); continue; }
    const ice = iceDaChave(conteudo.ice);
    const meu = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: 'speed', titulo: `Velocidade contra ${ice.nome}` });
    const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'SPD', valor: ice.spd });
    if (meu > dele) registrar(est, `${corredor.nome} viu o ${ice.nome} primeiro (${meu} contra ${dele}).`, 'ok');
    else {
      registrar(est, `O ${ice.nome} foi mais rápido (${dele} contra ${meu}) e ataca na hora.`, 'falha');
      await aplicarEfeitoDoIce(ctx, conteudo);
    }
  }
  await entrarNoCombate(ctx, inimigos, nomeDoInimigo);
}

// O ataque de um inimigo no netrunner (o turno dele, jogado pelo mestre).
async function ataqueDoInimigo(ctx, conteudo) {
  const { est, corredor, token } = ctx;
  const n = exigirNetrunner(token.actor);
  const nome = nomeDoInimigo(conteudo);
  let dele;
  if (conteudo.tipo === 'ice') dele = await rolagens.rolagemDoIce({ nome, rotulo: 'ATK', valor: iceDaChave(conteudo.ice).atk });
  else if (conteudo.tipo === 'demonio') dele = await rolagens.rolagemDoIce({ nome, rotulo: 'Zap (Interface)', valor: demonioDaChave(conteudo.demonio).interface });
  else {
    const actor = atorDoNetrunner(conteudo);
    const m = actor ? netrunnerDo(actor) : null;
    dele = m && m.deck && m.role ? await rolagens.interfaceRoll({ actor, token: null, deck: m.deck, role: m.role, habilidade: 'zap', titulo: `${nome}: Zap` }) : await rolagens.rolagemDoIce({ nome, rotulo: 'Zap (Interface)', valor: m ? m.rank : 0 });
  }
  const meu = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: 'defense', titulo: `Defesa contra ${nome}` });
  if (dele <= meu) { registrar(est, `${corredor.nome} se defendeu do ${nome} (${meu} contra ${dele}).`, 'ok'); return; }
  registrar(est, `O ${nome} acertou ${corredor.nome} (${dele} contra ${meu}).`, 'falha');
  if (conteudo.tipo === 'ice') { await aplicarEfeitoDoIce(ctx, conteudo); return; }
  // Demônio e netrunner inimigo usam Zap: 1d6 direto no cérebro.
  const total = await rolagens.dano({ titulo: `${nome}: Zap`, formula: '1d6', alias: nome });
  await danoNoCerebro(ctx, total, `Zap do ${nome}`);
}

// ---------------- Operações (o que o socket chama) ----------------
export const operacoes = {
  async conectar(dados, usuario) {
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, token, ponto, est, actor } = ctx;
    if (!token || !actor) throw erro('Escolha um token com ficha para conectar.');
    if (ctx.corredor) return { jaConectado: true };
    const outra = conexaoDoToken(token);
    if (outra && outra.tile !== tile.uuid) throw erro('Este netrunner já está conectado em outro ponto de acesso.');
    const faltas = faltasPara(ponto, actor);
    if (faltas.length && !usuario.isGM) throw erro(`Para conectar aqui falta: ${faltas.join(' e ')}.`);
    const longe = distancia(tile, token);
    const alcance = alcanceDo(ponto, tile.parent);
    if (longe > alcance + 0.01 && !usuario.isGM) throw erro(`Longe demais do ponto de acesso: ${longe.toFixed(1)} ${tile.parent.grid.units || 'm'} (alcance ${alcance}).`);
    const n = netrunnerDo(actor);
    const dono = game.users.find(user => !user.isGM && user.active && actor.testUserPermission(user, 'OWNER')) || game.users.find(user => !user.isGM && actor.testUserPermission(user, 'OWNER')) || usuario;
    est.corredores = [...est.corredores, { token: token.id, ator: actor.id, nome: token.name, img: (token.texture && token.texture.src) || actor.img, usuario: dono.id, no: ENTRADA, acoes: emCombate(token) ? 1 : 0, max: acoesPorRank(n.rank), engajado: [], escapou: [], skunks: [], rastro: null, programasNaRodada: [], preso: 0, menosAcoes: 0 }];
    registrar(est, `${token.name} conectou em ${ponto.nome || 'um ponto de acesso'}.`, 'info');
    await concluir(ctx);
    await marcarToken(token, tile, true);
    tocar('conectar', actor);
    animar('conectar', { token, tile });
    return { conectado: true };
  },

  async desconectar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const inseguro = Boolean(dados.inseguro);
    if (!inseguro && ctx.corredor.preso > 0 && !usuario.isGM) throw erro('O Kraken te prende: até o fim do seu próximo turno só dá para fazer a desconexão insegura.');
    if (!inseguro && !usuario.isGM) gastarAcao(ctx.corredor, ctx.token, usuario);
    await retirar(ctx, ctx.corredor, { inseguro, motivo: dados.motivo || '' });
    await concluir(ctx);
    return { desconectado: true };
  },

  async mover(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor } = ctx;
    const destino = dados.destino;
    if (!vizinhos(arq, corredor.no).includes(destino)) throw erro('Só dá para ir a um andar vizinho.');
    const descendo = filhosDe(arq, corredor.no).includes(destino);
    if (descendo) {
      if (corredor.preso > 0) throw erro('O Kraken te prende: não dá para avançar até o fim do seu próximo turno.');
      const senha = conteudosDe(arq, corredor.no).find(conteudo => conteudo.tipo === 'senha' && !est.feitos.includes(conteudo.chave));
      if (senha) throw erro(`A senha deste andar (DV ${senha.dv}) trava a descida: use Backdoor.`);
      const preso = quemSegura(arq, est, corredor)[0];
      if (preso) throw erro(preso.tipo === 'demonio' ? `O demônio ${nomeDoInimigo(preso)} te segura: derrube-o (Zap ou programa). Slide não funciona contra demônios.` : `O ${nomeDoInimigo(preso)} deste andar te segura: derrube-o (Zap ou programa) ou use Slide.`);
    }
    // Andar pela arquitetura não é Ação NET (RED p. 198).
    corredor.no = destino;
    corredor.engajado = [];
    corredor.escapou = [];
    if (destino !== ENTRADA && !est.vistos.includes(destino)) est.vistos = [...est.vistos, destino];
    registrar(est, destino === ENTRADA ? `${corredor.nome} voltou ao ponto de acesso.` : `${corredor.nome} ${descendo ? 'desceu' : 'subiu'} para o andar ${arq.nos[destino].andar}${arq.nos[destino].ramo !== 'a' ? ` (ramo ${arq.nos[destino].ramo.toUpperCase()})` : ''}: ${resumoDoAndar(arq, est, destino)}.`, 'info');
    await encontrarInimigos(ctx, corredor);
    await concluir(ctx);
    return { no: destino };
  },

  async habilidade(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { corredor, token } = ctx;
    const chave = dados.habilidade;
    const info = HABILIDADES[chave];
    if (!info) throw erro('Habilidade desconhecida.');
    if (chave === 'scanner') throw erro('Scanner é uma Ação Carnal, usada fora da NET (botão no HUD do token).');
    const n = exigirNetrunner(token.actor);
    const alvo = escolherAlvo(ctx, chave, dados.alvo);
    let dvVirus = 0;
    if (chave === 'virus') {
      dvVirus = await perguntarVirus(corredor, dados.texto);
      if (!dvVirus) throw erro('O mestre não aceitou o vírus agora.');
    }
    gastarAcao(corredor, token, usuario);
    // Skunk: −2 em Slide por Skunk ativo que acertou este netrunner.
    const mods = chave === 'slide' && (corredor.skunks || []).length ? [{ value: -2 * corredor.skunks.length, source: 'Skunk' }] : [];
    const total = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: chave, sorte: dados.sorte, mods });
    await resolverHabilidade(ctx, { chave, info, alvo, total, dvVirus, texto: dados.texto || '' });
    await concluir(ctx);
    return { total };
  },

  async programa(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { est, corredor, token } = ctx;
    const n = exigirNetrunner(token.actor);
    const programa = n.programas.find(item => item.id === dados.programa);
    if (!programa) throw erro('Este programa não está instalado no cyberdeck equipado.');
    if (dados.acao === 'ativar' || dados.acao === 'desativar') {
      const ligar = dados.acao === 'ativar';
      if (Boolean(programa.system.isRezzed) === ligar) return { ok: true };
      if (corredor.programasNaRodada.includes(programa.id) && emCombate(token) && !usuario.isGM) throw erro('Cada programa só pode ser ativado ou desativado uma vez por rodada.');
      if (ligar && (Number(programa.system.rez && programa.system.rez.value) || 0) <= 0 && (Number(programa.system.rez && programa.system.rez.max) || 0) > 0) throw erro(`${programa.name} está com 0 de REZ.`);
      gastarAcao(corredor, token, usuario);
      corredor.programasNaRodada = [...corredor.programasNaRodada, programa.id];
      await programa.update({ 'system.isRezzed': ligar });
      registrar(est, `${corredor.nome} ${ligar ? 'ativou' : 'desativou'} ${programa.name}.`, 'info');
      await concluir(ctx);
      return { ok: true };
    }
    if (dados.acao === 'atacar') {
      if (!programa.system.isRezzed) throw erro(`Ative ${programa.name} antes de atacar com ele.`);
      if (!/attacker/.test(programa.system.class || '')) throw erro(`${programa.name} não é um programa de ataque.`);
      const antipessoal = /antipersonnel/.test(programa.system.class);
      const alvo = escolherAlvo(ctx, 'zap', dados.alvo);
      if (antipessoal && alvo.tipo !== 'netrunner') throw erro(`${programa.name} é anti-pessoal: só afeta netrunners.`);
      if (!antipessoal && alvo.tipo === 'netrunner') throw erro(`${programa.name} é anti-programa: não afeta netrunners.`);
      gastarAcao(corredor, token, usuario);
      const nome = nomeDoInimigo(alvo);
      const meu = await rolagens.ataqueDePrograma({ actor: token.actor, token, deck: n.deck, role: n.role, programa, sorte: dados.sorte });
      const dele = await defesaDo(alvo);
      if (meu > dele) {
        const dano = programa.system.damage || {};
        const formula = (alvo.tipo === 'ice' || alvo.tipo === 'demonio' ? dano.blackIce || dano.standard : dano.standard) || '1d6';
        const total = await rolagens.dano({ titulo: `${programa.name} contra ${nome}`, formula, actor: token.actor, token });
        registrar(est, `${programa.name} acertou o ${nome} (${meu} contra ${dele}): ${total} de dano${await danoNoInimigo(est, alvo, total)}.`, 'ok');
      } else registrar(est, `${programa.name} errou o ${nome} (${meu} contra ${dele}).`, 'falha');
      await concluir(ctx);
      return { ok: true };
    }
    throw erro('Ação de programa desconhecida.');
  },

  // Comandar um nó de controle já tomado: texto livre (o mestre narra), 1 Ação NET por comando.
  async comandar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token } = ctx;
    const no = conteudosDe(arq, corredor.no).find(conteudo => conteudo.tipo === 'controle' && est.feitos.includes(conteudo.chave));
    if (!no) throw erro('Não há nó de controle tomado neste andar.');
    const texto = String(dados.texto || '').trim().slice(0, 200);
    if (!texto) throw erro('Escreva o comando.');
    gastarAcao(corredor, token, usuario);
    registrar(est, `${corredor.nome} comanda o nó de controle: “${texto}”.`, 'info');
    await concluir(ctx);
    return { ok: true };
  },

  // Comando numa coisa da cena ligada ao nó de controle (porta, luz, som, token): 1 Ação NET.
  async acionar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile, ponto } = ctx;
    const controle = conteudosDe(arq, corredor.no).find(conteudo => conteudo.chave === dados.controle && conteudo.tipo === 'controle');
    if (!controle) throw erro('Este nó de controle não está no seu andar.');
    if (!est.feitos.includes(controle.chave)) throw erro('Tome o nó de controle (Control) antes de comandar.');
    const ligacao = ligacoesDo(ponto, controle.chave)[Number(dados.indice)];
    if (!ligacao) throw erro('Este nó de controle não comanda isso.');
    gastarAcao(corredor, token, usuario);
    let texto;
    try { texto = await acionar(tile.parent, ligacao, dados.acao, { est, usuarioId: corredor.usuario }); } catch (error) { throw erro(error.message); }
    registrar(est, `${corredor.nome} pelo nó de controle: ${texto}.`, 'ok');
    await concluir(ctx);
    return { ok: true };
  },

  // Apagar o fogo do Hellhound: uma Ação Carnal (não gasta Ação NET).
  async apagarFogo(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    if (!emChamas(ctx.token.actor)) return { ok: true };
    await apagarFogo(ctx.token.actor);
    registrar(ctx.est, `${ctx.corredor.nome} apagou o fogo (Ação Carnal).`, 'ok');
    await concluir(ctx);
    return { ok: true };
  },

  // Scanner (Ação Carnal, fora da NET): acha os pontos de acesso até o resultado × 10 m; os ocultos, só se o
  // resultado passar do DV do Scanner do ponto (padrão 10). Os ocultos achados aparecem para quem rolou.
  async scanner(dados, usuario) {
    const cena = game.scenes.get(dados.cena);
    const token = cena && cena.tokens.get(dados.token);
    if (!token || !token.actor) throw erro('Token não encontrado.');
    if (!usuario.isGM && !token.actor.testUserPermission(usuario, 'OWNER')) throw erro('Você não controla este token.');
    if (conexaoDoToken(token)) throw erro('Scanner é usado fora da NET: desconecte antes.');
    const n = exigirNetrunner(token.actor);
    const total = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: 'scanner' });
    const raio = total * 10;
    const donos = game.users.filter(user => !user.isGM && token.actor.testUserPermission(user, 'OWNER')).map(user => user.id);
    const achados = [];
    for (const tile of cena.tiles) {
      const ponto = pontoDoTile(tile);
      if (!ponto || !ponto.ativo) continue;
      const longe = distancia(tile, token);
      if (longe > raio) continue;
      const oculto = tile.hidden || ponto.oculto;
      if (oculto && total <= (Number(ponto.dvScanner) || 10)) continue;
      if (oculto) await tile.setFlag(MODULE_ID, FLAG_PONTO, { ...ponto, revelados: [...new Set([...(ponto.revelados || []), ...donos])] });
      achados.push(`${ponto.nome || 'Ponto de acesso'} (${longe.toFixed(0)} ${cena.grid.units || 'm'}${oculto ? ', estava oculto' : ''})`);
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: token.actor, token }),
      whisper: [...new Set([...game.users.filter(user => user.isGM).map(user => user.id), ...donos])],
      content: `<p><b>Scanner</b> (${total}, até ${raio} ${esc(cena.grid.units || 'm')}): ${achados.length ? `achou ${achados.map(esc).join('; ')}.` : 'nenhum ponto de acesso por perto.'}</p>`
    });
    tocar(achados.length ? 'sucesso' : 'falha', token.actor);
    return { total, achados };
  },

  // ---------- Só o mestre ----------
  async inimigoAtaca(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre joga o turno dos inimigos da NET.');
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor } = ctx;
    const conteudo = conteudosDe(arq, corredor.no).find(item => item.chave === dados.alvo && ehInimigo(item));
    if (!conteudo || !inimigoAtivo(est, conteudo)) throw erro('Este inimigo não está ativo no andar do netrunner.');
    await ataqueDoInimigo(ctx, conteudo);
    await concluir(ctx);
    return { ok: true };
  },

  async ajustarIce(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre ajusta o REZ dos inimigos.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const achado = acharConteudo(ctx.arq, dados.alvo);
    if (!achado || rezMaxDe(achado.conteudo) === null) throw erro('Inimigo com REZ não encontrado.');
    const rez = mudarRez(ctx.est, achado.conteudo, rezDe(ctx.est, achado.conteudo) + (Number(dados.delta) || 0));
    registrar(ctx.est, `O mestre ajustou o ${nomeDoInimigo(achado.conteudo)}: REZ ${rez}.`, 'info');
    await concluir(ctx);
    return { rez };
  },

  async revelar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre revela andares.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { arq, est } = ctx;
    if (dados.tudo) { est.mapa = true; registrar(est, 'O mestre revelou o mapa da arquitetura.', 'info'); }
    else if (arq.nos[dados.no] && !est.vistos.includes(dados.no)) { est.vistos = [...est.vistos, dados.no]; registrar(est, `O mestre revelou o andar ${arq.nos[dados.no].andar}.`, 'info'); }
    await concluir(ctx);
    return { ok: true };
  },

  // Começo do turno do netrunner: as Ações NET voltam (o Wisp tira 1, mínimo 2) e a prisão do Kraken anda.
  async zerarAcoes(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre zera as Ações NET.');
    const ctx = await contexto(dados, usuario);
    const corredor = ctx.corredor;
    corredor.acoes = corredor.menosAcoes ? Math.min(corredor.menosAcoes, Math.max(0, corredor.max - 2)) : 0;
    if (corredor.menosAcoes) registrar(ctx.est, `${corredor.nome} começa o turno com 1 Ação NET a menos (Wisp).`, 'ice');
    corredor.menosAcoes = 0;
    if (corredor.preso > 0) corredor.preso -= 1;
    corredor.programasNaRodada = [];
    await concluir(ctx);
    return { ok: true };
  },

  async reiniciar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre reinicia a arquitetura.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, ponto, arq, est } = ctx;
    await devolver(tile.parent, est);
    await sairDoCombate(est, tile.parent);
    const novo = estadoNovo(ponto, arq);
    novo.arquivos = est.arquivos;
    novo.corredores = est.corredores.map(corredor => ({ ...corredor, no: ENTRADA, engajado: [], escapou: [], skunks: [], acoes: 0, programasNaRodada: [], preso: 0, menosAcoes: 0 }));
    registrar(novo, 'O mestre reiniciou a arquitetura.', 'info');
    await gravar(tile, arq, novo);
    return { ok: true };
  }
};
// Nome antigo do ataque (macros feitas com a versão anterior).
operacoes.iceAtaca = operacoes.inimigoAtaca;

// O alvo da habilidade no andar atual (senha, arquivo, nó de controle, inimigo) ou a arquitetura inteira.
function escolherAlvo(ctx, chave, pedido) {
  const { arq, est, corredor } = ctx;
  const info = HABILIDADES[chave];
  const aqui = conteudosDe(arq, corredor.no);
  if (info.alvo === 'arquitetura') return null;
  if (info.alvo === 'fundo') {
    if (!ehFundo(arq, corredor.no)) throw erro('Virus só no andar mais fundo da arquitetura.');
    return null;
  }
  if (info.alvo === 'ice') {
    // Zap vale contra qualquer inimigo; Slide, só contra Black ICE (demônios e netrunners não se driblam).
    const candidatos = aqui.filter(conteudo => ehInimigo(conteudo) && inimigoAtivo(est, conteudo) && (chave !== 'slide' || conteudo.tipo === 'ice'));
    const alvo = candidatos.find(conteudo => conteudo.chave === pedido) || candidatos[0];
    if (!alvo) throw erro(chave === 'slide' ? 'Não há Black ICE ativo neste andar (Slide não funciona contra demônios nem netrunners).' : 'Não há inimigo ativo neste andar.');
    return alvo;
  }
  const candidatos = aqui.filter(conteudo => conteudo.tipo === info.alvo && !est.feitos.includes(conteudo.chave));
  const alvo = candidatos.find(conteudo => conteudo.chave === pedido) || candidatos[0];
  if (!alvo) throw erro({ senha: 'Não há senha trancada neste andar.', arquivo: 'Não há arquivo por identificar neste andar.', controle: 'Não há nó de controle livre neste andar.' }[info.alvo]);
  return alvo;
}

async function resolverHabilidade(ctx, { chave, info, alvo, total, dvVirus, texto }) {
  const { arq, est, corredor, token, ponto } = ctx;
  const nome = corredor.nome;
  switch (chave) {
    case 'pathfinder': {
      const revelados = revelarPathfinder(arq, corredor.no, total).filter(id => !est.vistos.includes(id));
      est.vistos = [...est.vistos, ...revelados];
      registrar(est, revelados.length ? `Pathfinder (${total}): ${nome} revelou ${revelados.length} andar${revelados.length > 1 ? 'es' : ''}.` : `Pathfinder (${total}): nada novo à vista.`, revelados.length ? 'ok' : 'falha');
      return;
    }
    case 'backdoor':
    case 'eyedee':
    case 'control': {
      const ok = total > alvo.dv;
      if (ok) est.feitos = [...est.feitos, alvo.chave];
      const oQue = { backdoor: 'a senha', eyedee: 'o arquivo', control: 'o nó de controle' }[chave];
      const resultado = { backdoor: 'quebrou a senha', eyedee: 'identificou o arquivo', control: 'tomou o nó de controle' }[chave];
      registrar(est, ok ? `${info.nome} (${total} contra DV ${alvo.dv}): ${nome} ${resultado}${alvo.descricao && chave !== 'backdoor' ? `: ${alvo.descricao.replace(/[.!?…\s]+$/, '')}` : ''}.` : `${info.nome} (${total} contra DV ${alvo.dv}): ${nome} não passou ${oQue}.`, ok ? 'ok' : 'falha');
      if (ok && chave === 'eyedee') {
        const registro = await copiarArquivo({ est, arq, ponto, no: arq.nos[corredor.no], conteudo: alvo, corredor, token });
        registrar(est, `${nome} copiou o arquivo para o deck (diário “${registro.nome}”).`, 'ok');
      }
      return;
    }
    case 'zap': {
      const nomeAlvo = nomeDoInimigo(alvo);
      const dele = await defesaDo(alvo);
      if (total > dele) {
        const dano = await rolagens.dano({ titulo: `Zap contra ${nomeAlvo}`, formula: '1d6', actor: token.actor, token });
        registrar(est, `Zap acertou o ${nomeAlvo} (${total} contra ${dele}): ${dano} de dano${await danoNoInimigo(est, alvo, dano)}.`, 'ok');
      } else registrar(est, `Zap errou o ${nomeAlvo} (${total} contra ${dele}).`, 'falha');
      return;
    }
    case 'slide': {
      const ice = iceDaChave(alvo.ice);
      const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'PER', valor: ice.per });
      if (total > dele) {
        corredor.escapou = [...new Set([...corredor.escapou, alvo.chave])];
        corredor.engajado = corredor.engajado.filter(item => item !== alvo.chave);
        registrar(est, `Slide (${total} contra ${dele}): ${nome} escapou do ${ice.nome} e pode seguir para um andar vizinho.`, 'ok');
      } else registrar(est, `Slide (${total} contra ${dele}): o ${ice.nome} não larga ${nome}.`, 'falha');
      return;
    }
    case 'cloak': {
      corredor.rastro = total;
      registrar(est, `Cloak: ${nome} escondeu os rastros (DV ${total} para achar).`, 'ok');
      return;
    }
    case 'virus': {
      const ok = total > dvVirus;
      registrar(est, ok ? `Virus (${total} contra DV ${dvVirus}): ${nome} deixou o vírus “${texto}” (DV ${total} para remover).` : `Virus (${total} contra DV ${dvVirus}): o vírus não pegou.`, ok ? 'ok' : 'falha');
      return;
    }
    default:
  }
}

// O vírus tem DV e custo definidos pelo mestre (RED p. 200): o mestre responde na hora, numa janela.
async function perguntarVirus(corredor, texto) {
  const DialogV2 = foundry.applications && foundry.applications.api && foundry.applications.api.DialogV2;
  const pergunta = `<p><b>${esc(corredor.nome)}</b> quer deixar um vírus:</p><blockquote>${esc(texto || '(sem descrição)')}</blockquote><div class="form-group"><label>DV do vírus</label><input type="number" name="dv" value="10" min="2" max="30"></div><p class="hint">Exemplos (RED p. 200): mudar o ícone de um Black ICE DV6; desativar um Black ICE ou um nó de controle DV10; apagar todo o Black ICE DV12.</p>`;
  if (!DialogV2) return 10;
  const dv = await DialogV2.prompt({ window: { title: 'Vírus na NET' }, content: pergunta, ok: { label: 'Rolar', callback: (event, button) => Number(button.form.elements.dv.value) || 10 }, rejectClose: false });
  return dv || 0;
}

const resumoDoAndar = (arq, est, id) => {
  const conteudos = conteudosDe(arq, id);
  if (!conteudos.length) return 'vazio';
  return conteudos.map(conteudo => (ehInimigo(conteudo) ? nomeDoInimigo(conteudo) : `${NOME_DO_TIPO[conteudo.tipo]}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}`)).join(', ');
};

// ---------------- Para os ganchos do mestre ----------------
// Netrunners no andar de um inimigo (para a vez dele no combate).
export async function quemEstaNoAndar(tileUuid, chave) {
  const tile = await fromUuid(tileUuid);
  const ponto = pontoDoTile(tile);
  const est = estadoDoTile(tile);
  if (!tile || !ponto || !est) return null;
  const achado = acharConteudo(await arquiteturaDoPonto(ponto), chave);
  if (!achado || !inimigoAtivo(est, achado.conteudo)) return null;
  return est.corredores.filter(corredor => corredor.no === achado.no.id).map(corredor => ({ token: corredor.token, nome: corredor.nome }));
}

// Token apagado com a conexão aberta: o corredor sai do estado (o token já não existe para tirar o efeito).
export async function removerCorredorApagado(tileUuid, tokenId) {
  const tile = await fromUuid(tileUuid);
  const ponto = pontoDoTile(tile);
  if (!tile || !ponto || !estadoDoTile(tile)) return;
  const ctx = await contexto({ tile: tileUuid }, game.user, { precisaCorredor: false });
  const corredor = ctx.est.corredores.find(item => item.token === tokenId);
  if (!corredor) return;
  ctx.est.corredores = ctx.est.corredores.filter(item => item.token !== tokenId);
  registrar(ctx.est, `${corredor.nome} sumiu da cena e caiu da NET.`, 'falha');
  await concluir(ctx);
}
