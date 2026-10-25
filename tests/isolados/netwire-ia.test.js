// A IA do NetWire (api-netwire-ia.js) com uma API falsa: o pedido que sai (modelo, cabeçalhos, formato, cache, troca de
// modelo na recusa), o que volta vira rascunho (nunca entregue), o custo, a recusa, a resposta quebrada e o limite do dia.
// Nenhum teste fala com a rede.
const assert = require('node:assert/strict');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const CHAVE = 'chave-de-teste';
// A API falsa: guarda os pedidos e responde o que o teste mandar (por padrão, duas mensagens válidas).
function apiFalsa(resposta) {
  const pedidos = [];
  const fetch = async (url, init) => {
    pedidos.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const data = typeof resposta === 'function' ? resposta(pedidos.length) : resposta;
    return { ok: (data.status || 200) < 400, status: data.status || 200, json: async () => data.body };
  };
  return { fetch, pedidos };
}
const resposta = (mensagens, extra = {}) => ({ body: { model: 'claude-haiku-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify({ mensagens }) }], usage: { input_tokens: 1000, cache_creation_input_tokens: 5000, cache_read_input_tokens: 0, output_tokens: 200 }, ...extra } });
const DUAS = resposta([
  { autor: 'Wakako Okada', texto: 'O trabalho é amanhã. Não se atrase.', nota_para_o_mestre: 'Pressiona o prazo.' },
  { autor: 'Wakako Okada', texto: 'Quanto você quer saber, choom?', nota_para_o_mestre: 'Esquiva.' },
  { autor: 'Wakako Okada', texto: 'Uma terceira que passa da conta.', nota_para_o_mestre: '' }
]);

async function preparar(t, { chave = CHAVE, api = apiFalsa(DUAS), env = {} } = {}) {
  const servidor = criarServidorIsolado(t, { env: { ...(chave ? { ANTHROPIC_API_KEY: chave } : {}), ...env }, fetch: api.fetch });
  const mestre = await servidor.entrarComoMestre();
  const conta = await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome: 'Ana' } });
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
  const ana = { cookie: servidor.cookieDe(login), conta: conta.json.conta };
  const canal = (await servidor.pedir('/api/netwire/canais?campanha=morana', { method: 'POST', cookie: mestre, body: { nome: 'wakako', tipo: 'direto', contato: { nome: 'Wakako Okada', descricao: 'Fixer de Japantown' }, aceitaResposta: true, para: [ana.conta.id] } })).json.canal;
  await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: mestre, body: { campanha: 'morana', canal: canal.id, texto: 'Tenho um trabalho.', estado: 'entregue' } });
  await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: canal.id, texto: 'Quanto paga?' } });
  const rascunhar = (body = {}, cookie = mestre) => servidor.pedir('/api/netwire/rascunhar?campanha=morana', { method: 'POST', cookie, body: { campanha: 'morana', canal: canal.id, tipo: 'resposta', instrucao: 'Ela quer pressa.', ...body } });
  return { servidor, mestre, ana, canal, api, rascunhar };
}

test('NetWire IA: sem a chave, fica desligada e a Caixa continua à mão', async t => {
  const { servidor, mestre, rascunhar, api } = await preparar(t, { chave: '' });
  const caixa = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.equal(caixa.json.ia.ligada, false);
  assert.equal((await rascunhar()).status, 503);
  assert.equal(api.pedidos.length, 0);
});

test('NetWire IA: o pedido sai com o modelo, o formato, o cache e a conversa; volta como rascunho, nunca entregue', async t => {
  const { servidor, mestre, ana, rascunhar, api } = await preparar(t);
  const pedido = await rascunhar({ quantidade: 2 });
  assert.equal(pedido.status, 200, pedido.text);
  const [saiu] = api.pedidos;
  assert.equal(saiu.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(saiu.headers['x-api-key'], CHAVE);
  assert.equal(saiu.headers['anthropic-version'], '2026-10-21');
  assert.equal(saiu.body.model, 'claude-haiku-5-5');
  assert.equal(saiu.body.output_config.format.type, 'json_schema');
  assert.equal(saiu.body.output_config.effort, 'low');
  // As instruções e o contexto ficam no cache; o pedido e a conversa vêm depois.
  assert.deepEqual(saiu.body.system[1].cache_control, { type: 'ephemeral' });
  assert.match(saiu.body.system[1].text, /O que os jogadores já sabem/);
  assert.match(saiu.body.system[1].text, /Base da campanha/);
  assert.ok(!('fallbacks' in saiu.body) && !saiu.headers['anthropic-beta'], 'o Haiku não tem a troca de modelo');
  const pedidoDoMestre = saiu.body.messages[0].content;
  assert.match(pedidoDoMestre, /Quanto paga\?/);
  assert.match(pedidoDoMestre, /Ela quer pressa\./);
  assert.match(pedidoDoMestre, /2 opções diferentes/);
  // Duas pedidas, duas guardadas (a terceira passa da conta); rascunho da IA, com a nota e o custo.
  assert.equal(pedido.json.mensagens.length, 2);
  for (const item of pedido.json.mensagens) {
    assert.equal(item.estado, 'rascunho');
    assert.equal(item.origem, 'ia');
    assert.match(item.nota, /IA: claude-haiku-5-5, menos de US\$ 0,01/);
  }
  // Custo: 1.000 de entrada (US$ 0,10/M) + 5.000 escritos no cache (1,25×) + 200 de saída (US$ 0,50/M).
  assert.equal(pedido.json.uso.custo, 0.000825);
  const caixa = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.deepEqual(caixa.json.ia.hoje, { pedidos: 1, custo: 0.000825 });
  // O jogador não vê rascunho nenhum.
  const visao = await servidor.pedir('/api/netwire', { cookie: ana.cookie });
  assert.ok(!visao.text.includes('Não se atrase'));
  // E não pede à IA.
  assert.equal((await rascunhar({}, ana.cookie)).status, 403);
});

test('NetWire IA: Sonnet e Opus vão com a troca de modelo na recusa', async t => {
  const { rascunhar, api } = await preparar(t);
  assert.equal((await rascunhar({ modelo: 'claude-sonnet-5-5' })).status, 200);
  assert.equal((await rascunhar({ modelo: 'claude-opus-5-5' })).status, 200);
  assert.equal((await rascunhar({ modelo: 'modelo-inventado' })).status, 200);
  const [sonnet, opus, inventado] = api.pedidos;
  for (const saiu of [sonnet, opus]) {
    assert.equal(saiu.body.fallbacks, 'default');
    assert.equal(saiu.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  }
  assert.equal(sonnet.body.model, 'claude-sonnet-5-5');
  assert.equal(opus.body.model, 'claude-opus-5-5');
  assert.equal(inventado.body.model, 'claude-haiku-5-5');
});

test('NetWire IA: a recusa e a resposta quebrada viram aviso (e contam no uso); o limite do dia vale', async t => {
  const api = apiFalsa(n => (n === 1 ? resposta([], { stop_reason: 'refusal' }) : n === 2 ? { body: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'não é JSON' }], usage: {} } } : n === 3 ? { status: 401, body: { error: { message: 'invalid x-api-key' } } } : DUAS));
  const { servidor, mestre, rascunhar } = await preparar(t, { api, env: { NETWIRE_IA_LIMITE: '3' } });
  assert.equal((await rascunhar()).status, 422);
  assert.equal((await rascunhar()).status, 502);
  const recusada = await rascunhar();
  assert.equal(recusada.status, 502);
  assert.match(recusada.json.erro, /chave/);
  // Recusa e resposta quebrada contaram; a chave recusada não (nada foi cobrado).
  const caixa = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.equal(caixa.json.ia.hoje.pedidos, 2);
  assert.ok(!caixa.json.mensagens.some(item => item.origem === 'ia'));
  assert.equal((await rascunhar()).status, 200);
  assert.equal((await rascunhar()).status, 429);
});

// ---------------- Gemini (API Interactions do Google) ----------------
const GEMINI = 'chave-gemini-de-teste';
const respostaGemini = (mensagens, extra = {}) => ({ body: {
  id: 'int-1', model: 'gemini-3.5-flash-lite', status: 'completed',
  steps: [{ type: 'thought', content: [] }, { type: 'model_output', content: [{ type: 'text', text: JSON.stringify({ mensagens }) }] }],
  usage: { total_input_tokens: 6000, total_cached_tokens: 5000, total_output_tokens: 200, total_thought_tokens: 100 }, ...extra
} });
const DUAS_GEMINI = respostaGemini([
  { autor: 'Wakako Okada', texto: 'Amanhã, 22h. Não se atrase.', nota_para_o_mestre: 'Marca o encontro.' },
  { autor: 'Wakako Okada', texto: 'Paga bem. Pergunte menos.', nota_para_o_mestre: 'Esquiva.' }
]);
// Responde no formato de quem foi chamado: Interactions para o Google, Mensagens para a Anthropic.
const apiDosDois = () => apiFalsa(() => null);
function porEndereco(api) {
  const pedidos = api.pedidos;
  return { pedidos, fetch: async (url, init) => { pedidos.push({ url, headers: init.headers, body: JSON.parse(init.body) }); const data = url.includes('googleapis') ? DUAS_GEMINI : DUAS; return { ok: true, status: 200, json: async () => data.body }; } };
}

test('NetWire IA (Gemini): só com a GEMINI_API_KEY, os modelos do Gemini e o pedido no formato da Interactions', async t => {
  const api = apiFalsa(DUAS_GEMINI);
  const { servidor, mestre, ana, rascunhar } = await preparar(t, { chave: '', api, env: { GEMINI_API_KEY: GEMINI } });
  const caixa = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.equal(caixa.json.ia.ligada, true);
  assert.deepEqual(caixa.json.ia.modelos.map(item => item.id), ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-argon']);
  assert.equal(caixa.json.ia.padrao, 'gemini-3.5-flash-lite');
  // Pedir um modelo do Claude sem a chave dele: vai o padrão do Gemini.
  const pedido = await rascunhar({ quantidade: 2, modelo: 'claude-opus-5-5' });
  assert.equal(pedido.status, 200, pedido.text);
  const [saiu] = api.pedidos;
  assert.equal(saiu.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(saiu.headers['x-goog-api-key'], GEMINI);
  assert.ok(!saiu.headers['x-api-key']);
  assert.equal(saiu.body.model, 'gemini-3.5-flash-lite');
  assert.equal(saiu.body.store, false);
  assert.equal(saiu.body.generation_config.thinking_level, 'low');
  assert.equal(saiu.body.response_format.mime_type, 'application/json');
  assert.ok(!JSON.stringify(saiu.body.response_format.schema).includes('additionalProperties'));
  assert.match(saiu.body.system_instruction, /roteirista de apoio/);
  assert.match(saiu.body.system_instruction, /Base da campanha/);
  assert.match(saiu.body.input, /Quanto paga\?/);
  assert.match(saiu.body.input, /Ela quer pressa\./);
  // O texto vem do passo model_output; o custo separa o que veio do cache automático e soma o raciocínio à saída:
  // 1.000 de entrada (US$ 0,30/M) + 5.000 do cache (US$ 0,03/M) + 300 de saída (US$ 2,50/M) = US$ 0,0012.
  assert.equal(pedido.json.mensagens.length, 2);
  assert.match(pedido.json.mensagens[0].texto, /22h/);
  assert.match(pedido.json.mensagens[0].nota, /IA: gemini-3\.5-flash-lite, menos de US\$ 0,01/);
  assert.equal(pedido.json.uso.custo, 0.0012);
  assert.equal(pedido.json.uso.cacheLido, 5000);
  const visao = await servidor.pedir('/api/netwire', { cookie: ana.cookie });
  assert.ok(!visao.text.includes('Não se atrase'));
});

test('NetWire IA: com as duas chaves, os seis modelos no seletor e cada um vai para a sua API', async t => {
  const api = porEndereco(apiDosDois());
  const { servidor, mestre, rascunhar } = await preparar(t, { api, env: { GEMINI_API_KEY: GEMINI } });
  const caixa = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.equal(caixa.json.ia.modelos.length, 6);
  assert.equal(caixa.json.ia.padrao, 'claude-haiku-5-5');
  assert.equal((await rascunhar({ modelo: 'gemini-4-argon' })).status, 200);
  assert.equal((await rascunhar({ modelo: 'claude-sonnet-5-5' })).status, 200);
  const [argon, sonnet] = api.pedidos;
  assert.match(argon.url, /googleapis\.com\/v1beta\/interactions$/);
  assert.equal(argon.body.model, 'gemini-4-argon');
  assert.equal(sonnet.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(sonnet.body.model, 'claude-sonnet-5-5');
});

test('NetWire IA (Gemini): bloqueio de segurança, resposta cortada e chave recusada viram aviso', async t => {
  const api = apiFalsa(n => (n === 1 ? respostaGemini([], { status: 'failed', steps: [], errors: [{ code: 'SAFETY', message: 'Blocked for safety' }] })
    : n === 2 ? respostaGemini([], { status: 'incomplete' })
      : { status: 403, body: { error: { message: 'API key not valid' } } }));
  const { rascunhar } = await preparar(t, { chave: '', api, env: { GEMINI_API_KEY: GEMINI } });
  assert.equal((await rascunhar()).status, 422);
  assert.equal((await rascunhar()).status, 502);
  const recusada = await rascunhar();
  assert.equal(recusada.status, 502);
  assert.match(recusada.json.erro, /GEMINI_API_KEY/);
});

test('NetWire IA: o preço do Gemini muda na data anunciada pelo Google', () => {
  const { createDrafter } = require('../../api-netwire-ia');
  const { costOf } = createDrafter({ ia: {}, campaigns: {} });
  assert.equal(costOf('gemini-4-argon', { entrada: 1e6 }, '2026-11-30').custo, 2);
  assert.equal(costOf('gemini-4-argon', { entrada: 1e6 }, '2026-12-01').custo, 4);
  assert.equal(costOf('gemini-3.8-flash', { saida: 1e6 }, '2026-12-31').custo, 3.75);
  assert.equal(costOf('gemini-3.8-flash', { saida: 1e6 }, '2027-01-01').custo, 7.5);
});
