// O inventário mexido na wiki (o C111; o plano em inventario-plano/PLANO.md, 5.2 e 5.4). O jogador move, divide ou junta
// na página do personagem; o servidor da wiki confere e põe na fila (api-inventario.js). Aqui, o mestre ativo, com "Mandar
// a ficha para a wiki" ligado, aplica cada operação no ator ligado, na ordem, conferindo de novo com o item de verdade (a
// mesma regra, compartilhado/regras-grade.mjs), e confirma ou recusa com o motivo. A mesa ganha: o pedido que não cabe
// mais (o item mudou na mesa) volta para o jogador com o motivo. A volta rápida do inventário (o C110) leva o resultado.
// Ouve a wiki na hora (SSE, /api/inventario/eventos) e pergunta a cada 15 s (sem o SSE, na rede ruim; e com o mundo que
// acabou de abrir, a fila que esperou). Cada resposta fica marcada no ator (a flag inventario: o último seq e as últimas
// respostas): se a confirmação se perder, a volta seguinte confirma de novo, sem aplicar duas vezes.
import { SISTEMA } from './config.mjs';
import { conferirOperacao } from './compartilhado/regras-grade.mjs';
import { juntarNaGrade, lugaresDe, moverNaGrade } from './inventario-grade.mjs';
import { upgradesDaPilha } from './pilhas.mjs';
import { bodyDoAtor, itemNaRegra } from './regras-grade-ator.mjs';
import { atorLigado, campanhaDoMundo, enderecoDaWiki, wikiFetch } from './wiki.mjs';

const FLAG = 'inventario';
const RESPOSTAS_GUARDADAS = 50;
const PERGUNTA = 15000;
const souQuemAplica = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id) && game.settings.get(SISTEMA, 'wikiMesa');

// O ator como a regra das operações o lê: cada item com a quantidade e os upgrades da pilha.
const itensDaRegra = ator => ator.items.map(item => ({ ...itemNaRegra(item), qtd: Number(item.system.quantidade) || 1, upgrades: upgradesDaPilha(item) }));

// Aplica uma operação da wiki no ator. Devolve { ok, motivo }. O item que mudou na mesa depois que o jogador o viu (o rev
// não é o da base) ainda vale, se o pedido couber; se não, o motivo diz que ele mudou.
export async function aplicarOperacao(ator, op) {
  const item = ator.items.get(op.item);
  if (!item) return { ok: false, motivo: 'Esse item não está mais na ficha da mesa.' };
  const mudou = (Number(item.getFlag(SISTEMA, 'grade')?.rev) || 0) !== (Number(op.base) || 0);
  const recusar = motivo => ({ ok: false, motivo: mudou ? `${item.name} mudou na mesa. ${motivo}` : motivo });
  const motivo = conferirOperacao(itensDaRegra(ator), lugaresDe(ator), op, { body: bodyDoAtor(ator) });
  if (motivo) return recusar(motivo);
  if (op.tipo === 'mover') {
    const feito = await moverNaGrade(item, op.para, { avisar: false });
    return feito.ok ? feito : recusar(feito.motivo);
  }
  if (op.tipo === 'juntar') {
    const feito = await juntarNaGrade(item, ator.items.get(op.alvo), { avisar: false });
    return feito.ok ? feito : recusar(feito.motivo);
  }
  // Dividir: a pilha nova (o dividirPilha, como o CORE) vai para o quadrado pedido.
  const nova = await item.dividirPilha(op.qtd);
  if (!nova) return recusar('A pilha mudou na mesa.');
  await moverNaGrade(nova, op.para, { avisar: false });
  return { ok: true, motivo: '' };
}

// Responde uma operação: a resposta guardada (a confirmação que se perdeu) ou a de agora, e a manda para a wiki.
async function responder(ator, wikiId, op) {
  const marca = ator.getFlag(SISTEMA, FLAG) ?? {};
  const respostas = Array.isArray(marca.respostas) ? marca.respostas : [];
  let resposta = respostas.find(([id]) => id === op.id)?.[1];
  if (!resposta) {
    // Aplicada antes de a flag guardar a resposta (fora das últimas 50): já foi.
    if (op.seq <= (Number(marca.seq) || 0)) resposta = { estado: 'aplicada' };
    else {
      const feito = await aplicarOperacao(ator, op);
      resposta = feito.ok ? { estado: 'aplicada' } : { estado: 'recusada', motivo: feito.motivo };
      await ator.update({ [`flags.${SISTEMA}.${FLAG}`]: { seq: op.seq, respostas: [...respostas, [op.id, resposta]].slice(-RESPOSTAS_GUARDADAS) } });
    }
  }
  await wikiFetch(`/api/personagens/${encodeURIComponent(wikiId)}/inventario/ops/${encodeURIComponent(op.id)}/${resposta.estado}`, {
    method: 'POST', body: { ator: ator.id, ...(resposta.motivo ? { motivo: resposta.motivo } : {}) }
  });
  return resposta;
}

// Uma volta pela fila: as pendentes dos personagens da campanha deste mundo, na ordem. Os que não estão neste mundo ficam
// esperando o mundo deles. Devolve quantas respondeu.
async function umaVolta() {
  if (!souQuemAplica()) return 0;
  const campanha = await campanhaDoMundo();
  if (campanha?.erro) return 0;
  const { personagens = [] } = await wikiFetch(`/api/inventario/pendentes${campanha?.id ? `?campanha=${encodeURIComponent(campanha.id)}` : ''}`);
  let respondidas = 0;
  for (const personagem of personagens) {
    const ator = atorLigado(personagem, personagem.id);
    if (!ator) continue;
    for (const op of [...personagem.ops].sort((x, y) => x.seq - y.seq)) {
      try {
        await responder(ator, personagem.id, op);
        respondidas++;
      } catch (erro) {
        // A wiki fora do ar no meio: a próxima volta tenta de novo, com a resposta guardada.
        console.debug(`${SISTEMA} | inventário da wiki:`, erro.message);
        break;
      }
    }
  }
  return respondidas;
}

// Aplica o que está na fila (o SSE, a pergunta de 15 s, as macros e os testes). Uma volta por vez: o aviso que chega no
// meio pede outra volta no fim.
let rodando = null;
let deNovo = false;
export function aplicarDaWiki() {
  if (rodando) { deNovo = true; return rodando; }
  rodando = (async () => {
    let total = 0;
    do { deNovo = false; total += await umaVolta(); } while (deNovo);
    return total;
  })().finally(() => { rodando = null; });
  return rodando;
}

// O aviso na hora. Caiu (a wiki fora do ar, outro endereço): fecha; a pergunta seguinte abre de novo.
let ouvindo = null;
function fecharAviso() {
  ouvindo?.close();
  ouvindo = null;
}
async function ouvir() {
  const { EventSource } = globalThis;
  if (typeof EventSource !== 'function') return;
  const campanha = await campanhaDoMundo();
  if (campanha?.erro || !souQuemAplica()) return;
  const endereco = `${enderecoDaWiki()}/api/inventario/eventos${campanha?.id ? `?campanha=${encodeURIComponent(campanha.id)}` : ''}`;
  if (ouvindo?.url === endereco && ouvindo.readyState !== EventSource.CLOSED) return;
  fecharAviso();
  const fonte = new EventSource(endereco, { withCredentials: true });
  fonte.addEventListener('inventario', () => aplicarDaWiki().catch(erro => console.debug(`${SISTEMA} | inventário da wiki:`, erro.message)));
  fonte.onerror = () => { if (ouvindo === fonte) fecharAviso(); else fonte.close(); };
  ouvindo = fonte;
}

export function registrarFilaDaWiki() {
  Hooks.once('ready', () => {
    const tentar = () => {
      if (!souQuemAplica()) return fecharAviso();
      ouvir().catch(erro => console.debug(`${SISTEMA} | inventário da wiki:`, erro.message));
      aplicarDaWiki().catch(erro => console.debug(`${SISTEMA} | inventário da wiki:`, erro.message));
    };
    setTimeout(tentar, 5000);
    setInterval(tentar, PERGUNTA);
  });
}
