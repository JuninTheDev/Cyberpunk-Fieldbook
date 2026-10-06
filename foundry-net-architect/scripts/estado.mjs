// O motor da NET, sempre no cliente do mestre ativo: conecta e desconecta netrunners, move pela arquitetura,
// resolve as habilidades de Interface e o Black ICE com as rolagens do sistema e grava o estado no Tile.
// No Tile só vai o que os jogadores podem ver (andares revelados, o que já foi feito); o resto (DVs e conteúdos
// ainda escondidos, descrições) fica no item da arquitetura, que só o mestre lê.
import { MODULE_ID, FLAG_PONTO, FLAG_ESTADO, FLAG_CONEXAO, STATUS_ID, HABILIDADES, NOME_DO_TIPO, acoesPorRank, iceDaChave } from './constantes.mjs';
import { ENTRADA, lerArquitetura, vizinhos, filhosDe, paiDoNo, ehFundo, revelarPathfinder } from './arquitetura.mjs';
import { erro } from './socket.mjs';
import * as rolagens from './rolagens.mjs';

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

const estadoNovo = (ponto, arq) => ({ v: 1, arquitetura: ponto.arquitetura, nome: arq.nome, dv: arq.dv, mapa: false, vistos: [], feitos: [], ices: [], corredores: [], nos: [], log: [] });

// Os andares que os jogadores enxergam: os revelados (com o conteúdo) e os vizinhos de quem está na NET ("?").
function vistaPublica(arq, est) {
  const vistos = new Set(est.vistos);
  if (est.mapa) for (const id of Object.keys(arq.nos)) vistos.add(id);
  const feitos = new Set(est.feitos);
  const ices = Object.fromEntries(est.ices.map(ice => [ice.chave, ice]));
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
        const feito = feitos.has(conteudo.chave);
        const publico = { chave: conteudo.chave, tipo: conteudo.tipo, dv: conteudo.dv, feito };
        if (conteudo.tipo === 'ice') {
          const dados = iceDaChave(conteudo.ice);
          const atual = ices[conteudo.chave];
          publico.ice = { ...dados, chave: conteudo.ice, rezAtual: atual ? atual.rez : dados.rez };
          publico.feito = publico.ice.rezAtual <= 0;
        }
        if (feito && (conteudo.tipo === 'arquivo' || conteudo.tipo === 'controle')) publico.descricao = conteudo.descricao;
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
  if (token && !usuario.isGM && !token.actor?.testUserPermission(usuario, 'OWNER')) throw erro('Você não controla este token.');
  const arq = await arquiteturaDoPonto(ponto);
  let est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est || est.arquitetura !== ponto.arquitetura) est = estadoNovo(ponto, arq);
  est.dv = arq.dv;
  est.nome = arq.nome;
  const corredor = token ? est.corredores.find(item => item.token === token.id) : null;
  if (precisaCorredor && !corredor) throw erro('Este netrunner não está conectado a este ponto de acesso.');
  return { tile, token, ponto, arq, est, corredor, actor: token ? token.actor : null };
}

// Conteúdos do andar em que o corredor está.
const conteudosDe = (arq, id) => (id === ENTRADA || !arq.nos[id] ? [] : arq.nos[id].conteudos);
const iceAtual = (est, conteudo) => {
  const salvo = est.ices.find(ice => ice.chave === conteudo.chave);
  return salvo ? salvo.rez : iceDaChave(conteudo.ice).rez;
};
function mudarRez(est, conteudo, rez) {
  const max = iceDaChave(conteudo.ice).rez;
  const valor = Math.max(0, Math.min(max, rez));
  est.ices = [...est.ices.filter(ice => ice.chave !== conteudo.chave), { chave: conteudo.chave, rez: valor }];
  return valor;
}
const icesAtivos = (arq, est, id) => conteudosDe(arq, id).filter(conteudo => conteudo.tipo === 'ice' && iceAtual(est, conteudo) > 0);

// Ações NET: em combate, cada netrunner tem as do rank por turno (o mestre pode passar do limite).
function emCombate(token) {
  return game.combats.some(combate => combate.started && combate.combatants.some(item => item.tokenId === token.id && item.sceneId === token.parent.id));
}
function gastarAcao(corredor, token, usuario, quantas = 1) {
  if (!usuario.isGM && emCombate(token) && corredor.acoes + quantas > corredor.max) throw erro(`Sem Ações NET neste turno (${corredor.acoes} de ${corredor.max}).`);
  corredor.acoes += quantas;
}

function exigirNetrunner(actor) {
  const n = netrunnerDo(actor);
  if (!n.deck) throw erro('Sem cyberdeck equipado: não dá para agir na NET.');
  if (!n.role) throw erro('Sem Role de netrunning (Interface) na ficha: o sistema não sabe com que rank rolar.');
  return n;
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

// ---------------- Black ICE ----------------
// O efeito de um Black ICE que acertou (ou que ganhou na velocidade): dano no cérebro (HP) ou no REZ de um
// programa ativo, e o texto do efeito para o mestre aplicar o resto.
async function efeitoDoIce(ctx, conteudo, corredor) {
  const { est, token } = ctx;
  const actor = token.actor;
  const ice = iceDaChave(conteudo.ice);
  registrar(est, `${ice.nome}: ${ice.efeito}`, 'ice');
  if (!ice.dano) return;
  const total = await rolagens.dano({ titulo: `${ice.nome}: ${ice.classe === 'Anti-programa' ? 'dano no programa' : 'dano no cérebro'}`, formula: ice.dano, alias: ice.nome });
  if (ice.classe === 'Anti-programa') {
    const ativos = netrunnerDo(actor).programas.filter(programa => programa.system.isRezzed);
    if (!ativos.length) { registrar(est, `${ice.nome} não achou programa ativo para atacar.`, 'info'); return; }
    const alvo = ativos[Math.floor(Math.random() * ativos.length)];
    const rez = Math.max(0, (Number(alvo.system.rez?.value) || 0) - total);
    await alvo.update({ 'system.rez.value': rez, ...(rez <= 0 ? { 'system.isRezzed': false } : {}) });
    registrar(est, rez <= 0 ? `${alvo.name} levou ${total} de REZ e caiu: o efeito diz que é destruído (apague do deck se a mesa concordar).` : `${alvo.name} levou ${total} de REZ (fica com ${rez}).`, 'ice');
    return;
  }
  // Dano no cérebro: direto no HP, sem armadura. O programa Armor ativo tira 4.
  const armor = netrunnerDo(actor).programas.some(programa => programa.system.isRezzed && /^armor$/i.test(programa.name));
  const final = Math.max(0, total - (armor ? 4 : 0));
  const hp = actor.system.derivedStats?.hp;
  if (hp && game.settings.get(MODULE_ID, 'danoAutomatico')) {
    await actor.update({ 'system.derivedStats.hp.value': Math.max(0, Number(hp.value) - final) });
    registrar(est, `${corredor.nome} levou ${final} no cérebro${armor ? ' (Armor tirou 4)' : ''}: HP ${Math.max(0, Number(hp.value) - final)}/${hp.max}.`, 'ice');
  } else {
    registrar(est, `${corredor.nome} leva ${final} no cérebro${armor ? ' (Armor tirou 4)' : ''}: aplique no HP.`, 'ice');
  }
}

// Ao chegar num andar com Black ICE ativo: Interface + velocidade + 1d10 contra SPD do ICE + 1d10.
// Se o ICE vencer, o efeito vem na hora (RED p. 204).
async function encontrarIce(ctx, corredor, n) {
  const { arq, est, token } = ctx;
  for (const conteudo of icesAtivos(arq, est, corredor.no)) {
    const ice = iceDaChave(conteudo.ice);
    if (!corredor.engajado.includes(conteudo.chave)) corredor.engajado.push(conteudo.chave);
    const meu = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: 'speed', titulo: `Velocidade contra ${ice.nome}` });
    const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'SPD', valor: ice.spd });
    if (meu > dele) registrar(est, `${corredor.nome} viu o ${ice.nome} primeiro (${meu} contra ${dele}).`, 'ok');
    else {
      registrar(est, `O ${ice.nome} foi mais rápido (${dele} contra ${meu}) e ataca na hora.`, 'falha');
      await efeitoDoIce(ctx, conteudo, corredor);
    }
  }
}

// ---------------- Operações (o que o socket chama) ----------------
export const operacoes = {
  async conectar(dados, usuario) {
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, token, ponto, est, arq, actor } = ctx;
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
    est.corredores = [...est.corredores, { token: token.id, ator: actor.id, nome: token.name, img: token.texture?.src || actor.img, usuario: dono.id, no: ENTRADA, acoes: emCombate(token) ? 1 : 0, max: acoesPorRank(n.rank), engajado: [], escapou: [], rastro: null, programasNaRodada: [] }];
    registrar(est, `${token.name} conectou em ${ponto.nome || 'um ponto de acesso'}.`, 'info');
    await gravar(tile, arq, est);
    await marcarToken(token, tile, true);
    return { conectado: true };
  },

  async desconectar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    return desconectarCorredor(ctx, { inseguro: Boolean(dados.inseguro), motivo: dados.motivo || '' , usuario });
  },

  async mover(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile } = ctx;
    const destino = dados.destino;
    if (!vizinhos(arq, corredor.no).includes(destino)) throw erro('Só dá para ir a um andar vizinho.');
    const descendo = filhosDe(arq, corredor.no).includes(destino);
    if (descendo) {
      const senha = conteudosDe(arq, corredor.no).find(conteudo => conteudo.tipo === 'senha' && !est.feitos.includes(conteudo.chave));
      if (senha) throw erro(`A senha deste andar (DV ${senha.dv}) trava a descida: use Backdoor.`);
      const preso = icesAtivos(arq, est, corredor.no).find(conteudo => !corredor.escapou.includes(conteudo.chave));
      if (preso) throw erro(`O ${iceDaChave(preso.ice).nome} deste andar te segura: derrube-o (Zap ou programa) ou use Slide.`);
    }
    // Andar pela arquitetura não é Ação NET (RED p. 198).
    corredor.no = destino;
    corredor.engajado = [];
    corredor.escapou = [];
    if (destino !== ENTRADA && !est.vistos.includes(destino)) est.vistos = [...est.vistos, destino];
    registrar(est, destino === ENTRADA ? `${corredor.nome} voltou ao ponto de acesso.` : `${corredor.nome} ${descendo ? 'desceu' : 'subiu'} para o andar ${arq.nos[destino].andar}${arq.nos[destino].ramo !== 'a' ? ` (ramo ${arq.nos[destino].ramo.toUpperCase()})` : ''}: ${resumoDoAndar(arq, est, destino)}.`, 'info');
    if (icesAtivos(arq, est, destino).length) await encontrarIce(ctx, corredor, exigirNetrunner(token.actor));
    await gravar(tile, arq, est);
    return { no: destino };
  },

  async habilidade(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile } = ctx;
    const chave = dados.habilidade;
    const info = HABILIDADES[chave];
    if (!info) throw erro('Habilidade desconhecida.');
    if (chave === 'scanner') throw erro('Scanner é uma Ação Carnal, usada fora da NET para achar pontos de acesso.');
    const n = exigirNetrunner(token.actor);
    const alvo = escolherAlvo(ctx, chave, dados.alvo);
    let dvVirus = 0;
    if (chave === 'virus') {
      dvVirus = await perguntarVirus(corredor, dados.texto);
      if (!dvVirus) throw erro('O mestre não aceitou o vírus agora.');
    }
    gastarAcao(corredor, token, usuario);
    const total = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: chave, sorte: dados.sorte });
    await resolverHabilidade(ctx, { chave, info, alvo, total, n, dvVirus, texto: dados.texto || '' });
    await gravar(tile, arq, est);
    return { total };
  },

  async programa(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile } = ctx;
    const n = exigirNetrunner(token.actor);
    const programa = n.programas.find(item => item.id === dados.programa);
    if (!programa) throw erro('Este programa não está instalado no cyberdeck equipado.');
    if (dados.acao === 'ativar' || dados.acao === 'desativar') {
      const ligar = dados.acao === 'ativar';
      if (Boolean(programa.system.isRezzed) === ligar) return { ok: true };
      if (corredor.programasNaRodada.includes(programa.id) && emCombate(token) && !usuario.isGM) throw erro('Cada programa só pode ser ativado ou desativado uma vez por rodada.');
      if (ligar && (Number(programa.system.rez?.value) || 0) <= 0 && (Number(programa.system.rez?.max) || 0) > 0) throw erro(`${programa.name} está com 0 de REZ.`);
      gastarAcao(corredor, token, usuario);
      corredor.programasNaRodada = [...corredor.programasNaRodada, programa.id];
      await programa.update({ 'system.isRezzed': ligar });
      registrar(est, `${corredor.nome} ${ligar ? 'ativou' : 'desativou'} ${programa.name}.`, 'info');
      await gravar(tile, arq, est);
      return { ok: true };
    }
    if (dados.acao === 'atacar') {
      if (!programa.system.isRezzed) throw erro(`Ative ${programa.name} antes de atacar com ele.`);
      if (!/attacker/.test(programa.system.class || '')) throw erro(`${programa.name} não é um programa de ataque.`);
      const alvo = escolherAlvo(ctx, 'zap', dados.alvo);
      if (/antipersonnel/.test(programa.system.class)) throw erro(`${programa.name} é anti-pessoal: só afeta netrunners, não Black ICE.`);
      gastarAcao(corredor, token, usuario);
      const ice = iceDaChave(alvo.ice);
      const meu = await rolagens.ataqueDePrograma({ actor: token.actor, token, deck: n.deck, role: n.role, programa, sorte: dados.sorte });
      const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'DEF', valor: ice.def });
      if (meu > dele) {
        const formula = (programa.system.damage && (programa.system.damage.blackIce || programa.system.damage.standard)) || '1d6';
        const total = await rolagens.dano({ titulo: `${programa.name} contra ${ice.nome}`, formula, actor: token.actor, token });
        const rez = mudarRez(est, alvo, iceAtual(est, alvo) - total);
        registrar(est, `${programa.name} acertou o ${ice.nome} (${meu} contra ${dele}): ${total} de REZ${rez <= 0 ? ', e ele caiu' : `, fica com ${rez}`}.`, 'ok');
      } else registrar(est, `${programa.name} errou o ${ice.nome} (${meu} contra ${dele}).`, 'falha');
      await gravar(tile, arq, est);
      return { ok: true };
    }
    throw erro('Ação de programa desconhecida.');
  },

  // Comandar um nó de controle já tomado: 1 Ação NET por comando; o mestre narra o efeito.
  async comandar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile } = ctx;
    const no = conteudosDe(arq, corredor.no).find(conteudo => conteudo.tipo === 'controle' && est.feitos.includes(conteudo.chave));
    if (!no) throw erro('Não há nó de controle tomado neste andar.');
    const texto = String(dados.texto || '').trim().slice(0, 200);
    if (!texto) throw erro('Escreva o comando.');
    gastarAcao(corredor, token, usuario);
    registrar(est, `${corredor.nome} comanda o nó de controle: “${texto}”.`, 'info');
    await gravar(tile, arq, est);
    return { ok: true };
  },

  // ---------- Só o mestre ----------
  async iceAtaca(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre joga o turno do Black ICE.');
    const ctx = await contexto(dados, usuario);
    const { arq, est, corredor, token, tile } = ctx;
    const conteudo = conteudosDe(arq, corredor.no).find(item => item.chave === dados.alvo && item.tipo === 'ice');
    if (!conteudo || iceAtual(est, conteudo) <= 0) throw erro('Este Black ICE não está ativo no andar do netrunner.');
    const n = exigirNetrunner(token.actor);
    const ice = iceDaChave(conteudo.ice);
    const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'ATK', valor: ice.atk });
    const meu = await rolagens.interfaceRoll({ actor: token.actor, token, deck: n.deck, role: n.role, habilidade: 'defense', titulo: `Defesa contra ${ice.nome}` });
    if (dele > meu) {
      registrar(est, `O ${ice.nome} acertou ${corredor.nome} (${dele} contra ${meu}).`, 'falha');
      await efeitoDoIce(ctx, conteudo, corredor);
    } else registrar(est, `${corredor.nome} se defendeu do ${ice.nome} (${meu} contra ${dele}).`, 'ok');
    await gravar(tile, arq, est);
    return { ok: true };
  },

  async ajustarIce(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre ajusta o Black ICE.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { arq, est, tile } = ctx;
    const no = Object.values(arq.nos).find(item => item.conteudos.some(conteudo => conteudo.chave === dados.alvo));
    const conteudo = no && no.conteudos.find(item => item.chave === dados.alvo);
    if (!conteudo || conteudo.tipo !== 'ice') throw erro('Black ICE não encontrado.');
    const rez = mudarRez(est, conteudo, iceAtual(est, conteudo) + (Number(dados.delta) || 0));
    registrar(est, `O mestre ajustou o ${iceDaChave(conteudo.ice).nome}: REZ ${rez}.`, 'info');
    await gravar(tile, arq, est);
    return { rez };
  },

  async revelar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre revela andares.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { arq, est, tile } = ctx;
    if (dados.tudo) { est.mapa = true; registrar(est, 'O mestre revelou o mapa da arquitetura.', 'info'); }
    else if (arq.nos[dados.no] && !est.vistos.includes(dados.no)) { est.vistos = [...est.vistos, dados.no]; registrar(est, `O mestre revelou o andar ${arq.nos[dados.no].andar}.`, 'info'); }
    await gravar(tile, arq, est);
    return { ok: true };
  },

  async zerarAcoes(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre zera as Ações NET.');
    const ctx = await contexto(dados, usuario);
    ctx.corredor.acoes = 0;
    ctx.corredor.programasNaRodada = [];
    await gravar(ctx.tile, ctx.arq, ctx.est);
    return { ok: true };
  },

  async reiniciar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre reinicia a arquitetura.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, ponto, arq, est } = ctx;
    const novo = estadoNovo(ponto, arq);
    novo.corredores = est.corredores.map(corredor => ({ ...corredor, no: ENTRADA, engajado: [], escapou: [], acoes: 0, programasNaRodada: [] }));
    registrar(novo, 'O mestre reiniciou a arquitetura.', 'info');
    await gravar(tile, arq, novo);
    return { ok: true };
  }
};

// O alvo da habilidade no andar atual (senha, arquivo, nó de controle, Black ICE) ou a arquitetura inteira.
function escolherAlvo(ctx, chave, pedido) {
  const { arq, est, corredor } = ctx;
  const info = HABILIDADES[chave];
  const aqui = conteudosDe(arq, corredor.no);
  if (info.alvo === 'arquitetura') return null;
  if (info.alvo === 'fundo') {
    if (!ehFundo(arq, corredor.no)) throw erro('Virus só no andar mais fundo da arquitetura.');
    return null;
  }
  const tipo = { senha: 'senha', arquivo: 'arquivo', controle: 'controle', ice: 'ice' }[info.alvo];
  const candidatos = aqui.filter(conteudo => conteudo.tipo === tipo && (tipo === 'ice' ? iceAtual(est, conteudo) > 0 : !est.feitos.includes(conteudo.chave)));
  const alvo = candidatos.find(conteudo => conteudo.chave === pedido) || candidatos[0];
  if (!alvo) throw erro({ senha: 'Não há senha trancada neste andar.', arquivo: 'Não há arquivo por identificar neste andar.', controle: 'Não há nó de controle livre neste andar.', ice: 'Não há Black ICE ativo neste andar.' }[tipo]);
  return alvo;
}

async function resolverHabilidade(ctx, { chave, info, alvo, total, dvVirus, texto }) {
  const { arq, est, corredor, token } = ctx;
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
      registrar(est, ok ? `${info.nome} (${total} contra DV ${alvo.dv}): ${nome} ${resultado}${alvo.descricao && chave !== 'backdoor' ? `: ${alvo.descricao}` : ''}.` : `${info.nome} (${total} contra DV ${alvo.dv}): ${nome} não passou ${oQue}.`, ok ? 'ok' : 'falha');
      return;
    }
    case 'zap': {
      const ice = iceDaChave(alvo.ice);
      const dele = await rolagens.rolagemDoIce({ nome: ice.nome, rotulo: 'DEF', valor: ice.def });
      if (total > dele) {
        const dano = await rolagens.dano({ titulo: `Zap contra ${ice.nome}`, formula: '1d6', actor: token.actor, token });
        const rez = mudarRez(est, alvo, iceAtual(est, alvo) - dano);
        registrar(est, `Zap acertou o ${ice.nome} (${total} contra ${dele}): ${dano} de REZ${rez <= 0 ? ', e ele caiu' : `, fica com ${rez}`}.`, 'ok');
      } else registrar(est, `Zap errou o ${ice.nome} (${total} contra ${dele}).`, 'falha');
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
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const pergunta = `<p><b>${esc(corredor.nome)}</b> quer deixar um vírus:</p><blockquote>${esc(texto || '(sem descrição)')}</blockquote><div class="form-group"><label>DV do vírus</label><input type="number" name="dv" value="10" min="2" max="30"></div><p class="hint">Exemplos (RED p. 200): mudar o ícone de um Black ICE DV6; desativar um Black ICE ou um nó de controle DV10; apagar todo o Black ICE DV12.</p>`;
  if (!DialogV2) return 10;
  const dv = await DialogV2.prompt({ window: { title: 'Vírus na NET' }, content: pergunta, ok: { label: 'Rolar', callback: (event, button) => Number(button.form.elements.dv.value) || 10 }, rejectClose: false });
  return dv || 0;
}

const resumoDoAndar = (arq, est, id) => {
  const conteudos = conteudosDe(arq, id);
  if (!conteudos.length) return 'vazio';
  return conteudos.map(conteudo => (conteudo.tipo === 'ice' ? iceDaChave(conteudo.ice).nome : `${NOME_DO_TIPO[conteudo.tipo]}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}`)).join(', ');
};

// Desconectar: segura (1 Ação NET) ou insegura (o Black ICE encontrado e ativo ataca de graça).
// Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198), se o ponto estiver configurado assim.
export async function desconectarCorredor(ctx, { inseguro = false, motivo = '', usuario = game.user } = {}) {
  const { arq, est, corredor, token, tile, ponto } = ctx;
  if (!inseguro && !usuario.isGM) gastarAcao(corredor, token, usuario);
  if (inseguro) {
    registrar(est, `${corredor.nome} desconectou de forma insegura${motivo ? ` (${motivo})` : ''}.`, 'falha');
    const ativos = corredor.engajado.map(chave => conteudosDe(arq, corredor.no).find(conteudo => conteudo.chave === chave)).filter(conteudo => conteudo && iceAtual(est, conteudo) > 0);
    for (const conteudo of ativos) await efeitoDoIce(ctx, conteudo, corredor);
  } else registrar(est, `${corredor.nome} desconectou.`, 'info');
  est.corredores = est.corredores.filter(item => item.token !== corredor.token);
  if (!est.corredores.length && ponto.reiniciar !== false) {
    est.ices = [];
    est.feitos = est.feitos.filter(chave => {
      const no = arq.nos[chave.split('.')[0]];
      const conteudo = no && no.conteudos.find(item => item.chave === chave);
      return conteudo && conteudo.tipo === 'arquivo';
    });
    registrar(est, 'Ninguém na NET: a arquitetura reiniciou as defesas (Black ICE de volta, senhas e nós trancados).', 'info');
  }
  await gravar(tile, arq, est);
  if (token) await marcarToken(token, tile, false);
  return { desconectado: true };
}

// Para os ganchos do mestre (token saiu do alcance, token apagado, turno do combate).
export async function contextoDoToken(token) {
  const conexao = conexaoDoToken(token);
  if (!conexao) return null;
  try { return await contexto({ tile: conexao.tile, token: token.id }, game.user); } catch { return null; }
}
export { gravar, registrar, contexto };

// Token apagado com a conexão aberta: o corredor sai do estado (o token já não existe para tirar o efeito).
export async function removerCorredorApagado(tileUuid, tokenId) {
  const tile = await fromUuid(tileUuid);
  const ponto = pontoDoTile(tile);
  const atual = estadoDoTile(tile);
  if (!tile || !ponto || !atual) return;
  const est = foundry.utils.deepClone(atual);
  const corredor = est.corredores.find(item => item.token === tokenId);
  if (!corredor) return;
  est.corredores = est.corredores.filter(item => item.token !== tokenId);
  registrar(est, `${corredor.nome} sumiu da cena e caiu da NET.`, 'falha');
  await gravar(tile, await arquiteturaDoPonto(ponto), est);
}
