// NetWire: a IA que rascunha as mensagens dentro do jogo. Carregado pelo api-netwire.js. Nada chega aos jogadores por
// aqui: o que volta vira rascunho na Caixa do mestre. Dois provedores, cada um com a sua chave, escolhidos no seletor
// de modelo da Caixa (só aparecem os modelos do provedor que tem chave):
//   Claude → a API de Mensagens da Anthropic;
//   Gemini → a API Interactions do Google (a generateContent virou "Legacy" lá).
//
// Configuração (no /etc/fieldbook.env do servidor, passada pelo server.js):
//   ANTHROPIC_API_KEY  → liga os modelos do Claude;
//   GEMINI_API_KEY     → liga os modelos do Gemini (sem nenhuma das duas, a IA fica desligada e a Caixa funciona à mão);
//   ANTHROPIC_BASE_URL, GEMINI_BASE_URL → opcionais: outro endereço (um proxy; nos testes, uma API falsa);
//   NETWIRE_MODELO     → o modelo padrão (um dos MODELS abaixo; sem ele, o mais barato do provedor ligado);
//   NETWIRE_IA_LIMITE  → quantos pedidos por dia, por campanha (padrão 30).
// O texto do sistema é genérico (o repositório é público): o que é da campanha vem dos arquivos de dados e dos
// documentos do mestre, escolhidos por ele a cada pedido.
const fs = require('fs');
const path = require('path');

const ANTHROPIC_URL = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2026-10-21';
const GEMINI_URL = 'https://generativelanguage.googleapis.com';
// Preços em US$ por milhão de tokens (entrada, saída, leitura do cache). Claude: o Haiku 5.5 cobra mais acima de 100
// mil tokens de entrada, e a escrita no cache custa 1,25× a entrada. Gemini: a saída inclui o raciocínio; o cache é o
// automático (sem armazenamento pago); "desde" é o preço novo a partir daquela data (o Google anunciou os aumentos).
const MODELS = {
  'claude-haiku-5-5': { provedor: 'anthropic', nome: 'Claude · Rápido (Haiku 5.5)', entrada: 0.10, saida: 0.50, cache: 0.01, acima: { limite: 100000, entrada: 0.50, saida: 2.50 }, fallbacks: false },
  'claude-sonnet-5-5': { provedor: 'anthropic', nome: 'Claude · Equilibrado (Sonnet 5.5)', entrada: 2, saida: 10, cache: 0.20, fallbacks: true },
  'claude-opus-5-5': { provedor: 'anthropic', nome: 'Claude · O mais capaz (Opus 5.5)', entrada: 4, saida: 20, cache: 0.20, fallbacks: true },
  'gemini-3.5-flash-lite': { provedor: 'gemini', nome: 'Gemini · Rápido (3.5 Flash-Lite)', entrada: 0.30, saida: 2.50, cache: 0.03 },
  'gemini-3.8-flash': { provedor: 'gemini', nome: 'Gemini · Equilibrado (3.8 Flash)', entrada: 0.75, saida: 3.75, cache: 0.075, desde: { data: '2027-01-01', entrada: 1.50, saida: 7.50, cache: 0.15 } },
  'gemini-4-argon': { provedor: 'gemini', nome: 'Gemini · O mais capaz (4 Argon)', entrada: 2, saida: 10, cache: 0.10, desde: { data: '2026-12-01', entrada: 4, saida: 20, cache: 0.20 } }
};
const CHEAPEST = { anthropic: 'claude-haiku-5-5', gemini: 'gemini-3.5-flash-lite' };
const PROVIDER_NAME = { anthropic: 'da Anthropic', gemini: 'do Google' };
const KEY_NAME = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };
// Um teto para o contexto: acima disso, o mestre desmarca uma parte (nada é cortado em silêncio).
const MAX_CONTEXT_CHARS = 600000;

const SYSTEM = `Você é o roteirista de apoio de uma mesa de Cyberpunk RED em Night City, 2077. Você escreve mensagens dentro do jogo: o que os contatos (NPCs) mandam para o celular dos personagens e os boletins dos canais da cidade. O mestre lê, corrige e decide se entrega aos jogadores.

Como escrever:
- Português do Brasil, com o jeito de falar de Night City. Gírias do RED com moderação (choom, eddies, cromo, gonk, preem), quando combinarem com quem fala.
- Escreva na voz de quem fala, como uma mensagem de celular ou um post de canal: curta (uma a quatro frases), sem narração, sem descrever a cena, sem aspas em volta.
- Use só os fatos que estão no contexto. Não invente acontecimentos, nomes, valores ou lugares importantes. Quando faltar um detalhe, deixe vago na mensagem e sugira o detalhe na nota para o mestre.
- Nunca entregue aos jogadores o que o contexto marca como segredo, nota do mestre ou o que os personagens ainda não sabem. O NPC pode insinuar, mentir ou esconder, se combinar com ele.
- Na nota para o mestre, diga em uma ou duas frases a intenção da mensagem, o que ela puxa na trama e qualquer suposição que você fez.
- Quando pedirem mais de uma opção, faça opções de fato diferentes (tom, o que revela, o que pede).`;

const SCHEMA = {
  type: 'object',
  properties: {
    mensagens: {
      type: 'array',
      items: {
        type: 'object',
        properties: { autor: { type: 'string' }, texto: { type: 'string' }, nota_para_o_mestre: { type: 'string' } },
        required: ['autor', 'texto', 'nota_para_o_mestre'],
        additionalProperties: false
      }
    }
  },
  required: ['mensagens'],
  additionalProperties: false
};
// O Gemini aceita um pedaço do JSON Schema: sem o additionalProperties (a resposta é conferida aqui de qualquer jeito).
const withoutExtras = schema => JSON.parse(JSON.stringify(schema, (key, value) => (key === 'additionalProperties' ? undefined : value)));

const fail = (status, erro) => Object.assign(new Error(erro), { status });

// ia: { chave, url, gemini: { chave, url }, modelo, fetch } (do server.js). docsDir: a pasta documentos/ do projeto.
function createDrafter({ ia = {}, docsDir = '', campaigns }) {
  const call = ia.fetch || (typeof fetch === 'function' ? fetch : null);
  const providers = {
    anthropic: { key: String(ia.chave || ''), base: String(ia.url || ANTHROPIC_URL).replace(/\/+$/, '') },
    gemini: { key: String((ia.gemini && ia.gemini.chave) || ''), base: String((ia.gemini && ia.gemini.url) || GEMINI_URL).replace(/\/+$/, '') }
  };
  const on = provider => Boolean(call && providers[provider].key);
  const enabled = on('anthropic') || on('gemini');
  const available = () => Object.entries(MODELS).filter(([, item]) => on(item.provedor));
  const defaultModel = MODELS[ia.modelo] && on(MODELS[ia.modelo].provedor) ? ia.modelo
    : on('anthropic') ? CHEAPEST.anthropic : on('gemini') ? CHEAPEST.gemini : CHEAPEST.anthropic;

  // ---------------- O contexto ----------------
  const readDoc = (campaign, file) => { try { return fs.readFileSync(path.join(docsDir, campaign, file), 'utf8'); } catch { return ''; } };
  // O que o mestre marcou: a base, o estado (relógios, situação, segredos, notas) e o diário. O publicado (o que os
  // jogadores já sabem) vai sempre: é pequeno e é o que separa o sabido do segredo.
  function contextOf(campaign, wanted = {}) {
    const parts = [];
    const published = campaigns.readPublish(campaign).publicado || {};
    parts.push(`## O que os jogadores já sabem (publicado pelo mestre)\n${JSON.stringify({ resumo: published.resumo || '', pessoas: published.npcs || [], lugares: published.lugares || [], sessoes: (published.sessoes || []).map(item => ({ titulo: item.titulo, texto: item.texto })) }, null, 1)}`);
    if (wanted.base !== false) {
      const base = readDoc(campaign, 'base-da-campanha.md');
      if (base) parts.push(`## Base da campanha (do mestre: pessoas, facções, lugares, peças, relógios e segredos)\n${base}`);
    }
    if (wanted.estado !== false) {
      const { atualizado: _atualizado, paginas: _paginas, ...table } = campaigns.readTable(campaign) || {};
      if (Object.keys(table).length) parts.push(`## Estado da campanha agora (do mestre; segredos e notas são só dele)\n${JSON.stringify(table, null, 1)}`);
    }
    if (wanted.diario !== false) {
      const diary = readDoc(campaign, 'diario-da-campanha.md');
      if (diary) parts.push(`## Diário das sessões (do mestre)\n${diary}`);
    }
    return parts.join('\n\n');
  }

  // ---------------- O custo ----------------
  // tokens: { entrada (sem o que veio do cache), cacheEscrito, cacheLido, saida }, iguais para os dois provedores.
  function costOf(model, tokens, today = new Date().toISOString().slice(0, 10)) {
    const base = MODELS[model] || MODELS[CHEAPEST.anthropic];
    const price = base.desde && today >= base.desde.data ? { ...base, ...base.desde } : base;
    const { entrada = 0, cacheEscrito = 0, cacheLido = 0, saida = 0 } = tokens;
    const high = price.acima && entrada + cacheEscrito + cacheLido > price.acima.limite;
    const inRate = high ? price.acima.entrada : price.entrada;
    const outRate = high ? price.acima.saida : price.saida;
    const dollars = (entrada * inRate + cacheEscrito * inRate * 1.25 + cacheLido * price.cache + saida * outRate) / 1e6;
    return { entrada, cacheEscrito, cacheLido, saida, custo: Math.round(dollars * 1e6) / 1e6 };
  }

  // ---------------- Os dois provedores ----------------
  // Cada um devolve { modelo, texto, tokens, parada: 'ok' | 'recusa' | 'cortada' }, ou lança o erro já em português.
  async function post(provider, url, headers, body) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 120000);
    let response;
    let data;
    try {
      response = await call(url, { method: 'POST', headers, body: JSON.stringify(body), signal: abort.signal });
      data = await response.json().catch(() => ({}));
    } catch (error) {
      throw fail(502, error.name === 'AbortError' ? 'A IA demorou demais. Tente de novo.' : `Sem conexão com a API ${PROVIDER_NAME[provider]}.`);
    } finally { clearTimeout(timer); }
    if (!response.ok) {
      const message = (data && data.error && data.error.message) || `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) throw fail(502, `A chave da IA (${KEY_NAME[provider]}) foi recusada.`);
      if (response.status === 429 || response.status === 529 || response.status >= 500) throw fail(503, `A API ${PROVIDER_NAME[provider]} está ocupada agora (${response.status}). Tente de novo em instantes.`);
      throw fail(502, `A IA não aceitou o pedido: ${message}`);
    }
    return data;
  }

  async function askClaude(model, context, user) {
    const fallbacks = MODELS[model].fallbacks;
    const data = await post('anthropic', `${providers.anthropic.base}/v1/messages`,
      { 'content-type': 'application/json', 'x-api-key': providers.anthropic.key, 'anthropic-version': ANTHROPIC_VERSION, ...(fallbacks ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) },
      {
        model,
        max_tokens: 16000,
        // Mensagens curtas: pouco raciocínio basta (e custa menos).
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        // As instruções e o contexto da campanha ficam no cache (o pedido e a conversa vêm depois do ponto de cache).
        system: [{ type: 'text', text: SYSTEM }, { type: 'text', text: `# O contexto da campanha\n\n${context}`, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
        // Uma recusa de segurança troca de modelo no próprio pedido (onde existe a troca: Sonnet e Opus).
        ...(fallbacks ? { fallbacks: 'default' } : {})
      });
    const usage = data.usage || {};
    return {
      modelo: data.model || model,
      texto: (data.content || []).filter(block => block.type === 'text').map(block => block.text).join(''),
      tokens: { entrada: Number(usage.input_tokens) || 0, cacheEscrito: Number(usage.cache_creation_input_tokens) || 0, cacheLido: Number(usage.cache_read_input_tokens) || 0, saida: Number(usage.output_tokens) || 0 },
      parada: data.stop_reason === 'refusal' ? 'recusa' : data.stop_reason === 'max_tokens' ? 'cortada' : 'ok'
    };
  }

  async function askGemini(model, context, user) {
    const data = await post('gemini', `${providers.gemini.base}/v1beta/interactions`,
      { 'content-type': 'application/json', 'x-goog-api-key': providers.gemini.key },
      {
        model,
        // As instruções e o contexto ficam no começo de todo pedido: é o pedaço que o cache automático do Gemini aproveita.
        system_instruction: `${SYSTEM}\n\n# O contexto da campanha\n\n${context}`,
        input: user,
        generation_config: { thinking_level: 'low', max_output_tokens: 16000 },
        response_format: { type: 'text', mime_type: 'application/json', schema: withoutExtras(SCHEMA) },
        // O Google guarda cada pedido por 55 dias por padrão: o contexto da campanha não fica lá.
        store: false
      });
    const usage = data.usage || {};
    const cached = Number(usage.total_cached_tokens) || 0;
    // A resposta final é o passo "model_output"; o texto, os itens "text" dele.
    const text = (Array.isArray(data.steps) ? data.steps : []).filter(step => step && step.type === 'model_output')
      .flatMap(step => (Array.isArray(step.content) ? step.content : [])).filter(item => item && item.type === 'text').map(item => item.text || '').join('');
    const blocked = data.status === 'failed' && (data.errors || []).some(error => /safety|block|prohibited|recitation/i.test(`${error.code || ''} ${error.message || ''}`));
    if (data.status === 'failed' && !blocked) throw Object.assign(fail(502, `A IA não terminou o pedido: ${((data.errors || [])[0] || {}).message || 'falhou'}.`), { uso: costOf(model, { entrada: 0, saida: 0 }) });
    return {
      modelo: data.model || model,
      texto: text,
      tokens: { entrada: Math.max(0, (Number(usage.total_input_tokens) || 0) - cached), cacheEscrito: 0, cacheLido: cached, saida: (Number(usage.total_output_tokens) || 0) + (Number(usage.total_thought_tokens) || 0) },
      parada: blocked ? 'recusa' : data.status === 'incomplete' ? 'cortada' : 'ok'
    };
  }

  // ---------------- O pedido ----------------
  // channel: o canal; messages: a conversa dele (as mais velhas primeiro); request: { tipo: 'resposta' | 'nova',
  // instrucao, quantidade (1–3), modelo, autor, contexto: { base, estado, diario } }.
  async function draft({ campaign, channel, messages, request }) {
    if (!enabled) throw fail(503, 'A IA está desligada: falta a ANTHROPIC_API_KEY ou a GEMINI_API_KEY no servidor.');
    const model = MODELS[request.modelo] && on(MODELS[request.modelo].provedor) ? request.modelo : defaultModel;
    const count = Math.max(1, Math.min(3, Number(request.quantidade) || 1));
    const context = contextOf(campaign, request.contexto || {});
    if (context.length > MAX_CONTEXT_CHARS) throw fail(413, 'O contexto ficou grande demais. Desmarque o diário ou a base e tente de novo.');
    const speaker = String(request.autor || '').trim() || (channel.contato && channel.contato.nome) || channel.nome;
    const where = channel.tipo === 'direto'
      ? `Conversa direta de ${channel.contato.nome || channel.nome}${channel.contato.descricao ? ` (${channel.contato.descricao})` : ''} com os personagens.`
      : `Canal da cidade #${channel.nome}${channel.contato.descricao ? ` (${channel.contato.descricao})` : ''}: posts de quem anda por ali.`;
    const history = messages.slice(-30).map(item => `[${item.autor.tipo === 'jogador' ? `${item.autor.nome} (personagem de jogador)` : item.autor.nome}] ${item.texto}`).join('\n');
    const lastPlayer = [...messages].reverse().find(item => item.autor.tipo === 'jogador');
    const task = request.tipo === 'resposta' && lastPlayer
      ? `Escreva ${count === 1 ? 'a próxima mensagem' : `${count} opções diferentes para a próxima mensagem`} de ${speaker}, respondendo ao que ${lastPlayer.autor.nome} disse por último.`
      : `Escreva ${count === 1 ? 'uma mensagem nova' : `${count} opções diferentes de mensagem nova`} de ${speaker} neste canal.`;
    const instruction = String(request.instrucao || '').trim().slice(0, 2000);
    const user = `${where}\nQuem fala: ${speaker}.\n\nA conversa até agora (a mais velha primeiro):\n${history || '(nenhuma mensagem ainda)'}\n\n${instruction ? `O que o mestre quer: ${instruction}\n\n` : ''}${task} Em "autor", ponha ${speaker}.`;
    const answer = MODELS[model].provedor === 'gemini' ? await askGemini(model, context, user) : await askClaude(model, context, user);
    const usage = costOf(MODELS[answer.modelo] ? answer.modelo : model, answer.tokens);
    if (answer.parada === 'recusa') throw Object.assign(fail(422, 'A IA recusou este pedido. Reescreva o que você quer, ou escreva à mão.'), { uso: usage });
    if (answer.parada === 'cortada') throw Object.assign(fail(502, 'A resposta da IA veio cortada. Tente de novo.'), { uso: usage });
    let parsed;
    try { parsed = JSON.parse(answer.texto); } catch { throw Object.assign(fail(502, 'A resposta da IA veio num formato inesperado. Tente de novo.'), { uso: usage }); }
    const drafts = (Array.isArray(parsed && parsed.mensagens) ? parsed.mensagens : []).slice(0, count)
      .map(item => ({ autor: String((item && item.autor) || speaker).slice(0, 60), texto: String((item && item.texto) || '').trim(), nota: String((item && item.nota_para_o_mestre) || '').trim() }))
      .filter(item => item.texto);
    if (!drafts.length) throw Object.assign(fail(502, 'A IA não escreveu nenhuma mensagem. Tente de novo.'), { uso: usage });
    return { rascunhos: drafts, uso: { modelo: answer.modelo, ...usage } };
  }

  return {
    enabled,
    draft,
    defaultModel,
    models: () => available().map(([id, item]) => ({ id, nome: item.nome })),
    costOf
  };
}

module.exports = { createDrafter, MODELS };
