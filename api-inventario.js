// A fila do inventário da wiki para o Foundry 14 (o C111; o plano em foundry-sistema/inventario-plano/PLANO.md, 4 e 5.2).
// Carregada pelo api-personagens.js, que dá as rotas e quem é quem.
//
// O jogador (ou o mestre) mexe no inventário na wiki: mover (equipar, guardar e girar são mover), dividir e juntar pilhas.
// O servidor confere cada operação com a regra do sistema (foundry-sistema/scripts/compartilhado/regras-grade.mjs, o mesmo
// arquivo do Foundry e da página, carregado com import()), contra o estado projetado (a ficha da mesa com as pendentes por
// cima), e a guarda em personagens/inventario/<id>.json: { seq, ops }. O Foundry do mestre ouve (/api/inventario/eventos,
// SSE; sem ele, pergunta a cada 15 s em /api/inventario/pendentes), aplica com o item de verdade e confirma ou recusa, com
// o motivo. Com o Foundry fechado, a fila espera. As decididas saem depois de 24 h.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DIA = 24 * 60 * 60 * 1000;
const regrasDaGrade = path.join(__dirname, 'foundry-sistema', 'scripts', 'compartilhado', 'regras-grade.mjs');
const texto = (valor, maximo) => String(valor ?? '').slice(0, maximo);

// O pedido como a fila o guarda: só os campos do tipo dele.
function cleanRequest(input = {}) {
  const tipo = texto(input.tipo, 20);
  const pedido = { tipo, item: texto(input.item, 64) };
  const para = input.para && typeof input.para === 'object' ? input.para : null;
  if ((tipo === 'mover' || tipo === 'dividir') && para) {
    pedido.para = { lugar: texto(para.lugar, 80), x: Number.isSafeInteger(para.x) ? para.x : -1, y: Number.isSafeInteger(para.y) ? para.y : -1, girado: para.girado === true };
  }
  if (tipo === 'dividir') pedido.qtd = Number.isSafeInteger(input.qtd) ? input.qtd : 0;
  if (tipo === 'juntar') pedido.alvo = texto(input.alvo, 64);
  return pedido;
}

module.exports.createInventory = function createInventory({ charactersDir, writeJsonAtomic, lockOn, newId, isGameMaster }) {
  const dir = path.join(charactersDir, 'inventario');
  const fileOf = id => path.join(dir, `${id}.json`);
  let rules = null;
  const loadRules = () => rules || (rules = import(pathToFileURL(regrasDaGrade).href));
  const read = id => {
    try {
      const data = JSON.parse(fs.readFileSync(fileOf(id), 'utf8'));
      return { seq: Number(data.seq) || 0, ops: Array.isArray(data.ops) ? data.ops : [] };
    } catch { return { seq: 0, ops: [] }; }
  };
  const recent = (ops, now) => ops.filter(op => op.estado === 'pendente' || !(Date.parse(op.decidido) <= now - DIA));
  const pendingOf = ops => ops.filter(op => op.estado === 'pendente').sort((x, y) => x.seq - y.seq);

  // A ficha da mesa como a regra a lê: os itens com a regra (o Foundry 14 manda desde o C111), os lugares e o BODY.
  const itemsOf = mesa => (Array.isArray(mesa && mesa.itens) ? mesa.itens : [])
    .filter(linha => linha && linha.regra && typeof linha.regra === 'object')
    .map(linha => ({ ...linha.regra, id: String(linha.id ?? ''), name: String(linha.nome ?? ''), qtd: Number(linha.qtd) || 1, grade: linha.grade || null }));
  const bodyOf = mesa => Number(mesa && mesa.stats && mesa.stats.BODY) || 0;
  const onTable = doc => Boolean(doc.mesa && Number(doc.mesa.geracao) === 14 && Array.isArray(doc.mesa.lugares) && doc.mesa.lugares.length && itemsOf(doc.mesa).length);

  // As operações do personagem (as pendentes e as decididas nas últimas 24 h) e o estado projetado.
  async function view(id, doc) {
    const { seq, ops } = read(id);
    const shown = recent(ops, Date.now());
    if (!onTable(doc)) return { seq, ops: shown, projetado: null };
    const r = await loadRules();
    return { seq, ops: shown, projetado: r.projetar(itemsOf(doc.mesa), pendingOf(shown), doc.mesa.lugares, { body: bodyOf(doc.mesa) }) };
  }

  // Uma operação nova. autor: o nome de quem pediu ('mestre' para o mestre). Devolve { status, data }.
  async function add(id, doc, input, autor) {
    if (!onTable(doc)) return { status: 409, data: { erro: `${doc.nome || 'Este personagem'} ainda não está na mesa do Foundry 14: mexa no inventário depois da importação.` } };
    const r = await loadRules();
    return lockOn(fileOf(id), async () => {
      const now = Date.now();
      const data = read(id);
      const ops = recent(data.ops, now);
      const waiting = pendingOf(ops);
      if (waiting.length >= r.MAXIMO_PENDENTE) return { status: 429, data: { erro: `Já há ${waiting.length} mudanças esperando a mesa: espere o Foundry aplicar.` } };
      const lugares = doc.mesa.lugares;
      const body = bodyOf(doc.mesa);
      const estado = r.projetar(itemsOf(doc.mesa), waiting, lugares, { body });
      const op = { id: newId(), seq: data.seq + 1, autor: texto(autor, 80), quando: new Date(now).toISOString(), ...cleanRequest(input), estado: 'pendente' };
      // A pilha nova de uma divisão que ainda espera a mesa só existe na wiki: o Foundry não a conhece pelo id da operação.
      if (waiting.some(outra => outra.tipo === 'dividir' && (outra.id === op.item || outra.id === op.alvo))) return { status: 409, data: { erro: 'Espere a mesa criar a pilha nova.' } };
      const motivo = r.conferirOperacao(estado, lugares, op, { body });
      if (motivo) return { status: 409, data: { erro: motivo } };
      // base: o rev do item como a wiki o via. O Foundry compara para dizer, na recusa, que o item mudou na mesa.
      const item = estado.find(outro => outro.id === op.item);
      op.base = Number(item && item.grade && item.grade.rev) || 0;
      fs.mkdirSync(dir, { recursive: true });
      await writeJsonAtomic(fileOf(id), { seq: op.seq, ops: [...ops, op] });
      return { status: 201, data: { op } };
    });
  }

  // O Foundry aplicou ou recusou. Decidir de novo do mesmo jeito não muda nada (o Foundry confirma outra vez quando a
  // resposta se perde); a decidida não volta a esperar.
  function decide(id, opId, estado, motivo) {
    return lockOn(fileOf(id), async () => {
      const data = read(id);
      const op = data.ops.find(item => item.id === opId);
      if (!op) return { status: 404, data: { erro: 'Operação não encontrada.' } };
      if (op.estado !== 'pendente') return op.estado === estado ? { status: 200, data: { op } } : { status: 409, data: { erro: `Esta operação já foi ${op.estado}.`, op } };
      Object.assign(op, { estado, decidido: new Date().toISOString(), ...(estado === 'recusada' ? { motivo: texto(motivo, 300) || 'A mesa recusou.' } : {}) });
      await writeJsonAtomic(fileOf(id), { seq: data.seq, ops: recent(data.ops, Date.now()) });
      return { status: 200, data: { op } };
    });
  }

  // As pendentes de todos os personagens: [{ id, ops }], na ordem do seq.
  function allPending() {
    let files = [];
    try { files = fs.readdirSync(dir).filter(file => file.endsWith('.json')); } catch { return []; }
    return files.map(file => ({ id: file.slice(0, -5), ops: pendingOf(read(file.slice(0, -5)).ops) })).filter(item => item.ops.length);
  }

  // ---------------- Na hora: /api/inventario/eventos (SSE, o Foundry do mestre) ----------------
  // O aviso só diz de quem é a operação nova; o Foundry pede as pendentes. A cada 20 s, um pulso e a conferência (quem
  // saiu do modo mestre perde a conexão).
  const MAX_STREAMS = 20;
  const streams = new Set(); // { campaign, request, response }
  let pulse = null;
  function close(stream) {
    if (!streams.delete(stream)) return;
    try { stream.response.end(); } catch { /* já fechada */ }
    if (!streams.size && pulse) { clearInterval(pulse); pulse = null; }
  }
  const write = (stream, text) => { try { stream.response.write(text); } catch { close(stream); } };
  function notify(campaign, personagem) {
    for (const stream of [...streams]) if (!stream.campaign || stream.campaign === campaign) write(stream, `event: inventario\ndata: ${JSON.stringify({ personagem })}\n\n`);
  }
  function openStream(request, response, campaign, headers) {
    if (streams.size >= MAX_STREAMS) {
      response.writeHead(503, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '30' });
      return response.end('Conexões demais.');
    }
    response.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'private, no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write('retry: 3000\n\n');
    const stream = { campaign, request, response };
    streams.add(stream);
    request.on('close', () => close(stream));
    if (!pulse) {
      pulse = setInterval(() => {
        for (const item of [...streams]) {
          if (!isGameMaster(item.request)) { close(item); continue; }
          write(item, ': pulso\n\n');
        }
      }, 20000);
      if (pulse.unref) pulse.unref();
    }
  }

  return { view, add, decide, allPending, notify, openStream };
};
module.exports.cleanRequest = cleanRequest;
