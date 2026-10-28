// Os nós de controle ligados à cena (o ligacoes.mjs do NET Architect da mesa): cada ponto de acesso diz, para cada nó de
// controle da arquitetura, que portas, luzes, sons e tokens (torretas, câmeras, drones) ele comanda. Quem toma o nó (o
// Control) usa os comandos pela janela da NET, 1 Ação NET por comando (a wiki, "Ações NET"). Assumir um token dá ao
// jogador o controle dele até desconectar. As ligações ficam no ponto de acesso (a mesma arquitetura serve para cenas
// diferentes): { controle: a chave do nó, tipo, id }.
import { FLAG_INIMIGO } from './constantes.mjs';
import { SISTEMA } from '../config.mjs';

export const TIPOS = {
  porta: { nome: 'Porta', colecao: 'walls', icone: 'fa-door-closed' },
  luz: { nome: 'Luz', colecao: 'lights', icone: 'fa-lightbulb' },
  som: { nome: 'Som', colecao: 'sounds', icone: 'fa-volume-high' },
  token: { nome: 'Token', colecao: 'tokens', icone: 'fa-robot' }
};

const ESTADOS_DA_PORTA = { 0: 'fechada', 1: 'aberta', 2: 'trancada' };
const ponto = doc => ({ x: Math.round(doc.x ?? (doc.c ? (doc.c[0] + doc.c[2]) / 2 : 0)), y: Math.round(doc.y ?? (doc.c ? (doc.c[1] + doc.c[3]) / 2 : 0)) });

// O que a cena tem para ligar, com um nome legível (porta e luz não têm nome no Foundry). Os tokens dos inimigos da NET
// (o combate na NET) ficam de fora.
export function objetosDaCena(cena) {
  const portas = cena.walls.filter(parede => parede.door > 0).map((parede, i) => ({ id: parede.id, nome: `Porta ${i + 1} (${ponto(parede).x}, ${ponto(parede).y})` }));
  const luzes = cena.lights.map((luz, i) => ({ id: luz.id, nome: `Luz ${i + 1} (${ponto(luz).x}, ${ponto(luz).y})` }));
  const sons = cena.sounds.map((som, i) => ({ id: som.id, nome: `Som ${i + 1}: ${String(som.path || '').split('/').pop() || 'sem arquivo'}` }));
  const tokens = cena.tokens.filter(token => !token.getFlag(SISTEMA, FLAG_INIMIGO)).map(token => ({ id: token.id, nome: token.name }));
  return { porta: portas, luz: luzes, som: sons, token: tokens };
}

// As ligações de um nó de controle, na ordem em que foram feitas (o índice é o mesmo na janela e no motor).
export const ligacoesDo = (pontoDeAcesso, controle) => (Array.isArray(pontoDeAcesso?.ligacoes) ? pontoDeAcesso.ligacoes : []).filter(item => item.controle === controle);

export const documentoDe = (cena, ligacao) => (TIPOS[ligacao.tipo] ? cena[TIPOS[ligacao.tipo].colecao].get(ligacao.id) : null);

export function nomeDe(cena, ligacao) {
  const achado = (objetosDaCena(cena)[ligacao.tipo] ?? []).find(item => item.id === ligacao.id);
  return achado ? achado.nome : `${TIPOS[ligacao.tipo]?.nome ?? 'Objeto'} (saiu da cena)`;
}

// Como está agora, e os comandos possíveis ([comando, rótulo]).
export function situacao(cena, ligacao, est) {
  const doc = documentoDe(cena, ligacao);
  if (!doc) return { texto: 'não está mais na cena', acoes: [] };
  switch (ligacao.tipo) {
    case 'porta': return { texto: ESTADOS_DA_PORTA[doc.ds] ?? 'fechada', acoes: [['abrir', 'Abrir'], ['fechar', 'Fechar'], ['trancar', 'Trancar']].filter(([acao]) => ({ abrir: 1, fechar: 0, trancar: 2 })[acao] !== doc.ds) };
    case 'luz':
    case 'som': return { texto: doc.hidden ? 'desligada' : 'ligada', acoes: doc.hidden ? [['ligar', 'Ligar']] : [['desligar', 'Desligar']] };
    case 'token': {
      const assumido = (est?.assumidos ?? []).some(item => item.token === doc.id);
      return { texto: assumido ? 'sob controle do netrunner' : 'com o dono de sempre', acoes: assumido ? [['devolver', 'Devolver']] : [['assumir', 'Assumir']] };
    }
    default: return { texto: '', acoes: [] };
  }
}

// O comando (no mestre ativo). Devolve o texto para o registro.
export async function acionar(cena, ligacao, acao, { est, usuarioId }) {
  const doc = documentoDe(cena, ligacao);
  if (!doc) throw new Error('Este objeto não está mais na cena.');
  const nome = nomeDe(cena, ligacao);
  switch (ligacao.tipo) {
    case 'porta': {
      const ds = { abrir: CONST.WALL_DOOR_STATES.OPEN, fechar: CONST.WALL_DOOR_STATES.CLOSED, trancar: CONST.WALL_DOOR_STATES.LOCKED }[acao];
      if (ds === undefined) throw new Error('Comando de porta desconhecido.');
      await doc.update({ ds });
      return `${nome}: ${ESTADOS_DA_PORTA[ds]}`;
    }
    case 'luz':
    case 'som': {
      if (!['ligar', 'desligar'].includes(acao)) throw new Error('Comando desconhecido.');
      await doc.update({ hidden: acao === 'desligar' });
      return `${nome}: ${acao === 'ligar' ? 'ligada' : 'desligada'}`;
    }
    case 'token': {
      const ator = doc.actor;
      if (!ator) throw new Error('O token não tem ficha para controlar.');
      if (acao === 'assumir') {
        if ((est.assumidos ?? []).some(item => item.token === doc.id)) return `${nome}: já está sob controle`;
        est.assumidos = [...(est.assumidos ?? []), { token: doc.id, usuario: usuarioId, antes: ator.ownership[usuarioId] ?? null }];
        await ator.update({ [`ownership.${usuarioId}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
        return `${nome}: sob controle do netrunner`;
      }
      if (acao === 'devolver') {
        await devolver(cena, est, item => item.token === doc.id);
        return `${nome}: devolvido`;
      }
      throw new Error('Comando de token desconhecido.');
    }
    default: throw new Error('Tipo de ligação desconhecido.');
  }
}

// Devolve os tokens assumidos (os de um netrunner que saiu, ou todos quando a arquitetura reinicia): a permissão de antes
// (sem nenhuma, a do jogador sai). A permissão vai inteira, trocada, como a janela de permissões do Foundry 14 faz (o
// "ownership.<id>" com o _del não passa na validação).
export async function devolver(cena, est, filtro = () => true) {
  const ficam = [];
  for (const item of est.assumidos ?? []) {
    if (!filtro(item)) { ficam.push(item); continue; }
    const ator = cena.tokens.get(item.token)?.actor;
    if (!ator) continue;
    const permissoes = foundry.utils.deepClone(ator.ownership);
    if (item.antes === null || item.antes === undefined) delete permissoes[item.usuario];
    else permissoes[item.usuario] = item.antes;
    await ator.update({ ownership: foundry.data.operators.ForcedReplacement.create(permissoes) });
  }
  est.assumidos = ficam;
}
