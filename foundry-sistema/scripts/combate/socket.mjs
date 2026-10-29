// Pedidos, respostas, janelas e a fila única de ataques deste cliente.

import { SISTEMA } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { textoFlutuante } from '../efeitos.mjs';
import { JanelaDeDefesa } from '../janela-defesa.mjs';
import { perguntarTeste } from '../janela-rolagem.mjs';
import { rolarResistencia, rolarInteligente } from '../municoes.mjs';
import * as R from '../regras.mjs';
import { rolarDano, testar } from '../rolagens.mjs';
import { escudoHumanoDe } from '../escudo-humano.mjs';
import { CANAL, precisaRolar, souOMestreAtivo } from './apoio.mjs';
import { resolver } from './modos.mjs';
import { iconeNeon } from '../regras-icones.mjs';

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
  inteligente: async (dados, id) => {
    const resultado = await rolarInteligente(dados, { perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) });
    janelas.delete(id);
    return resultado;
  },
  municao: async (dados, id) => {
    const resultado = await rolarResistencia(dados, { perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) });
    janelas.delete(id);
    return resultado;
  },
  defesa: (dados, id) => perguntarDefesa(dados, { id }),
  dano: (dados, id) => rolarDanoDoAtacante(dados, { id }),
  // A segunda chance da munição Smart melhorada, pela janela de rolagem (com a Sorte), menos com "Rolar direto".
  segundaChance: async ({ arma, rotulo, partes }, id) => {
    const ator = (await fromUuid(arma))?.actor;
    if (!ator) return null;
    const resultado = await rolarSegundaChance(ator, { rotulo, partes, perguntar: !config('rolarDireto'), aoAbrir: registrarJanela(id) });
    janelas.delete(id);
    return resultado && { total: resultado.total };
  },
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
  // Um sim ou não do dono (a conexão direta no Neuroport dele, neuroport.mjs): fechada, não.
  consentir: async ({ titulo, texto }) => {
    const { DialogV2 } = foundry.applications.api;
    const resposta = await DialogV2.confirm({ window: { title: titulo }, classes: [SISTEMA, 'consentir'], content: `<p>${texto}</p>`, rejectClose: false, yes: { label: 'Aceitar' }, no: { label: 'Recusar' } }).catch(() => null);
    return { aceitou: resposta === true };
  },
  deathSave: async ({ ator }, id) => {
    const resultado = await (await fromUuid(ator)).rolarDeathSave({ perguntar: config('rolagemManual') && !config('rolarDireto'), aoAbrir: registrarJanela(id), modo: 'public' });
    janelas.delete(id);
    return resultado && { total: resultado.total, passou: resultado.passou };
  }
};

// Um ataque por vez no mestre, como o Fluxo: o próximo só começa quando o anterior termina (a defesa, o dano e o
// cartão), para as janelas de reação e os pedidos não se misturarem. O "Desfazer" não entra na fila: o mestre não
// espera o ataque em curso para desfazer outro.
let fila = Promise.resolve();
export function naFila(tarefa) {
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

// No cliente de quem atacou (jogador): rola o dano, com os dados aparecendo para ele, e devolve ao mestre. A janela de
// rolagem (o modificador do mestre) abre, menos com "Rolar direto"; fechada, o mestre rola.
async function rolarDanoDoAtacante({ arma, multiplicador, formula }, { id = null } = {}) {
  const dano = await rolarDano(await fromUuid(arma), { falar: true, multiplicador, formula, perguntar: config('rolagemManual') && !config('rolarDireto'), aoAbrir: registrarJanela(id) });
  if (id) janelas.delete(id);
  return dano && { total: dano.total, critico: dano.critico, bonus: dano.bonus, formula: dano.formula };
}

// A segunda chance (regras.partesDaSegundaChance): com a janela de rolagem (perguntar), os modificadores e a Sorte;
// fechada, null. Sem a janela, a Sorte que vier (o mestre que rola por quem não respondeu passa 0) ou a preparada.
export async function rolarSegundaChance(ator, { rotulo, partes, perguntar = false, aoAbrir = null, sorte }) {
  let extras = [];
  if (perguntar) {
    const escolha = await perguntarTeste(ator, { rotulo, partes, aoAbrir });
    if (!escolha) return null;
    ({ partes: extras, sorte } = escolha);
  }
  return testar(ator, { rotulo, partes: [...partes, ...extras], sorte, dados: { ataque: true, segundaChance: true }, categoria: 'ataque' });
}

// ---------------- No cliente de quem defende ----------------
// A janela de reação (janela-defesa.mjs: sem o total do ataque, menos para o mestre, com a conta de cada escolha e o
// tempo) e a rolagem dele. O mestre a fechou (desistiu de esperar ou respondeu por ele): null. Sem resposta no tempo, ou
// fechada no X, vale a escolha padrão (a resposta diz qual dos dois).
export async function perguntarDefesa(pacote, { id = null, mestre = false } = {}) {
  // Sem arma (o agarrão), a janela mostra o rótulo da ação.
  const [arma, alvo] = await Promise.all([pacote.arma ? fromUuid(pacote.arma) : null, fromUuid(pacote.alvo)]);
  const ator = alvo.actor;
  let resposta = pacote.opcoes.length === 1 && !precisaRolar(pacote.opcoes[0]) ? { escolha: pacote.opcoes[0] } : null;
  if (!resposta) {
    // A conta de cada escolha sai do ator, aqui: a esquiva, a Concentração, a Briga (contra o agarrão) e o escudo.
    const escudo = ator.escudo;
    const humano = pacote.opcoes.includes('escudoHumano') ? await escudoHumanoDe(ator, { cena: alvo.parent }) : null;
    resposta = await JanelaDeDefesa.perguntar({
      ...pacote, mestre, arma: arma?.name ?? pacote.rotulo, tempo: mestre ? 0 : Number(config('tempo')) || 0,
      atacante: { nome: pacote.atacante, img: pacote.imgAtq || iconeNeon('personagem') }, alvo: { nome: alvo.name, img: alvo.texture?.src || ator.img },
      esquiva: R.contaDaDefesa(ator.partesDaPericia('evasion').partes), concentracao: R.contaDaDefesa(ator.partesDaPericia('concentration').partes),
      briga: R.contaDaDefesa(ator.partesDaPericia('brawling').partes), vontade: R.contaDaDefesa(ator.partesDoAtributo('will')),
      interface: R.contaDaDefesa(ator.partesDaInterface(INTERFACE_DA_DEFESA.interface[0])),
      escudo: escudo ? { nome: escudo.name, pv: escudo.system.pvEscudo.value } : null,
      escudoHumano: humano ? { nome: humano.token.name, morto: humano.morto, pv: humano.pv?.value ?? null } : null
    }, registrarJanela(id));
    if (id) janelas.delete(id);
    if (!resposta) return null;
  }
  const { escolha } = resposta;
  const comoFoi = { fechou: Boolean(resposta.fechou), semResposta: Boolean(resposta.semResposta) };
  if (!precisaRolar(escolha)) return { escolha, ...comoFoi };
  // O jogador rola na janela de rolagem (menos com "Rolar direto", ou quando valeu a escolha padrão: aí rola direto),
  // ainda dentro do prazo do pedido; pelos NPCs, o mestre rola direto.
  // mestre.mjs:pacoteDaPergunta e defesa.mjs:rolarEscolha, no Fluxo: a reação continua, sem janela de dados.
  const perguntar = !mestre && config('rolagemManual') && !config('rolarDireto') && !comoFoi.fechou && !comoFoi.semResposta;
  const resultado = await rolarDefesa(ator, alvo.name, escolha, { perguntar, aoAbrir: registrarJanela(id) });
  if (id) janelas.delete(id);
  return resultado && { ...resultado, ...comoFoi };
}

// Esquiva (DEX + Evasão + 1d10), Concentração (WILL + Concentração + 1d10), a resistência ao agarrão (DEX + Briga +
// 1d10), a Vontade contra o Jack In (WILL + 1d10, sem perícia) ou a Interface contra a expulsão (o Rank + 1d10, sem o
// bônus de programa), com as penalidades do alvo. Com a janela de rolagem (perguntar), os situacionais, os modificadores
// comuns, o do mestre e a Sorte; fechada, null.
const PERICIA_DA_DEFESA = { concentrar: ['concentration', 'Concentração'], resistir: ['brawling', 'Resistência ao agarrão'] };
const ATRIBUTO_DA_DEFESA = { vontade: ['will', 'Vontade contra o Jack In'] };
const INTERFACE_DA_DEFESA = { interface: ['expulsar', 'Interface contra a expulsão'] };
export async function rolarDefesa(ator, nome, escolha, { perguntar = false, aoAbrir = null } = {}) {
  const [pericia, titulo] = PERICIA_DA_DEFESA[escolha] ?? ATRIBUTO_DA_DEFESA[escolha] ?? INTERFACE_DA_DEFESA[escolha] ?? ['evasion', 'Esquiva'];
  const tipo = ATRIBUTO_DA_DEFESA[escolha] ? 'atributo' : INTERFACE_DA_DEFESA[escolha] ? 'interface' : 'pericia';
  const partesDe = situacionais => {
    if (tipo === 'atributo') return ator.partesDoAtributo(pericia, { situacionais });
    if (tipo === 'interface') return ator.partesDaInterface(pericia, { situacionais });
    return ator.partesDaPericia(pericia, { situacionais }).partes;
  };
  const rotulo = `${titulo} de ${nome}`;
  let partes = partesDe(null);
  let sorte;
  if (perguntar) {
    const fixas = partesDe([]);
    const situacionais = tipo === 'interface' ? ator.situacionaisDaInterface(pericia) : ator.situacionaisDoTeste(tipo === 'atributo' ? null : pericia);
    const resposta = await perguntarTeste(ator, { rotulo, partes: fixas, situacionais, aoAbrir });
    if (!resposta) return null;
    partes = [...fixas, ...resposta.partes];
    sorte = resposta.sorte;
  }
  const { total } = await testar(ator, { rotulo, partes, sorte, dados: { defesa: escolha }, categoria: 'defesa' });
  return { escolha, defesa: total };
}
