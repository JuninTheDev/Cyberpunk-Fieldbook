// Avisos de envio e pedidos da wiki: foundry-2077/scripts/wiki.mjs, sendKey/avisosDaWiki/registerWikiWatch.
// A entrega dos pedidos continua em wiki.mjs, mesmo com estes avisos desligados.
import { SISTEMA } from './config.mjs';

// api-personagens.js, summary/foundryState e a rota foundry: estadoFoundry pode ser o estado do vínculo do 12.
// Para o 14, só espera um envio novo depois da sincronização e com resultado diferente. Sem hash legado, usa a
// versão que foi enviada, não a atual (a wiki sobe a versão também ao trocar de passo do criador).
export function estadoDeEnvioDaWiki(personagem) {
  if (personagem?.publico || !personagem?.envio?.quando) return '';
  const vinculo = personagem.foundry14;
  if (!vinculo?.importado || vinculo.removido) return 'enviado';
  const envio = personagem.envio;
  if (!(Date.parse(envio.quando) > Date.parse(vinculo.sincronizado || vinculo.importado))) return '';
  const mudou = envio.resultadoHash && vinculo.resultadoHash
    ? envio.resultadoHash !== vinculo.resultadoHash
    : Number(envio.versao) > Number(vinculo.versao);
  return mudou ? 'avisado' : '';
}

export const chaveDeEnvioDaWiki = personagem => `${personagem.id}:${personagem.envio?.quando || ''}`;
const chaveDoPedido = ({ wikiId, pedido }) => `pedido:${wikiId}:${pedido.id}:${pedido.erro || ''}`;
export const chaveDosAvisosDaWiki = mundo => `${SISTEMA}.wiki-avisos:${mundo}`;

// Como no módulo da mesa, a janela mostra todas as esperas; só os envios e erros ainda não vistos geram o aviso novo.
export function selecionarAvisosDaWiki({ personagens = [], pedidos = [] } = {}, vistos = []) {
  const waiting = personagens.filter(personagem => estadoDeEnvioDaWiki(personagem));
  const esperando = pedidos.filter(({ pedido }) => pedido.status === 'pendente' || (pedido.status === 'aprovado' && pedido.erro));
  return {
    waiting, pedidos: esperando,
    novos: waiting.filter(personagem => !vistos.includes(chaveDeEnvioDaWiki(personagem))),
    pedidosNovos: esperando.filter(pedido => !vistos.includes(chaveDoPedido(pedido))),
    chaves: [...waiting.map(chaveDeEnvioDaWiki), ...esperando.map(chaveDoPedido)]
  };
}

export function lerAvisosVistos(armazenamento, chave) {
  try {
    const vistos = JSON.parse(armazenamento?.getItem(chave) || '[]');
    return Array.isArray(vistos) ? vistos.filter(valor => typeof valor === 'string') : [];
  } catch { return []; }
}

export function gravarAvisosVistos(armazenamento, chave, chaves) {
  try { armazenamento?.setItem(chave, JSON.stringify([...new Set([...lerAvisosVistos(armazenamento, chave), ...chaves])].slice(-300))); }
  catch { /* navegador sem localStorage */ }
}

let listarPersonagens;
let abrirJanela;
let avisouErro = false;
let rodada = Promise.resolve();
const mestreAtivo = () => game.user?.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id);
const armazenamentoDoNavegador = () => { try { return globalThis.localStorage; } catch { return null; } };

async function conferirAvisos({ manual }) {
  if (!game.user?.isGM || (!manual && (!mestreAtivo() || !game.settings.get(SISTEMA, 'wikiAvisos')))) return null;
  if (!listarPersonagens) return null;
  try {
    const dados = await listarPersonagens();
    if (dados.papel && dados.papel !== 'mestre') throw new Error('Entre na wiki como mestre, neste navegador, para ver os avisos.');
    if (!game.user?.isGM || (!manual && (!mestreAtivo() || !game.settings.get(SISTEMA, 'wikiAvisos')))) return null;
    avisouErro = false;
    const armazenamento = armazenamentoDoNavegador();
    const chave = chaveDosAvisosDaWiki(game.world.id);
    const { waiting, pedidos, novos, pedidosNovos, chaves } = selecionarAvisosDaWiki(dados, lerAvisosVistos(armazenamento, chave));
    if (manual && !waiting.length && !pedidos.length) { ui.notifications.info('Nada esperando na wiki.'); return null; }
    if (!manual && !novos.length && !pedidosNovos.length) return null;
    await abrirJanela?.({ waiting, pedidos });
    gravarAvisosVistos(armazenamento, chave, chaves);
    if (novos.length) ui.notifications.info(`Wiki: ${novos.map(personagem => personagem.nome || 'Sem nome').join(', ')} ${novos.length > 1 ? 'foram enviados' : 'foi enviado'} para você.`);
    if (pedidosNovos.length) ui.notifications.info(`Wiki: ${pedidosNovos.length > 1 ? `${pedidosNovos.length} pedidos da loja esperando você` : `${pedidosNovos[0].nome} fez um pedido na loja`}.`);
    return { waiting, pedidos };
  } catch (erro) {
    if (manual) ui.notifications.warn(`Avisos da wiki: ${erro.message}`);
    else if (!avisouErro) { avisouErro = true; console.debug(`${SISTEMA} | avisos da wiki:`, erro.message); }
    return null;
  }
}

// Manual: ignora a configuração e os vistos, como avisosDaWiki do módulo da mesa. Serializar evita dois avisos do
// mesmo envio quando a consulta automática ainda espera a wiki e o mestre pede a consulta manual.
export function avisosDaWiki({ manual = false } = {}) {
  const proxima = rodada.then(() => conferirAvisos({ manual }));
  rodada = proxima.catch(() => null);
  return proxima;
}

export function registrarAvisosDaWiki({ listar, abrir }) {
  listarPersonagens = listar;
  abrirJanela = abrir;
  game.settings.register(SISTEMA, 'wikiAvisos', {
    name: 'Avisos da wiki',
    hint: 'Para o mestre: ao entrar e a cada minuto, confere se algum jogador enviou um personagem pela wiki e avisa (uma vez por envio).',
    scope: 'client', config: true, type: Boolean, default: true
  });
  Hooks.once('ready', () => {
    if (!game.user.isGM) return;
    const tentar = () => avisosDaWiki();
    setTimeout(tentar, 3000);
    setInterval(tentar, 60000);
  });
}
