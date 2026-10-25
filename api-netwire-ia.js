// NetWire: a IA que rascunha as mensagens dentro do jogo (Claude, pela API de Mensagens da Anthropic). Carregado pelo
// api-netwire.js. Nada chega aos jogadores por aqui: o que volta vira rascunho na Caixa do mestre.
//
// Configuração (no /etc/fieldbook.env do servidor, passada pelo server.js):
//   ANTHROPIC_API_KEY  → sem ela, a IA fica desligada e a Caixa funciona à mão;
//   ANTHROPIC_BASE_URL → opcional: outro endereço para a API (um proxy; nos testes, uma API falsa);
//   NETWIRE_MODELO     → o modelo padrão (um dos MODELS abaixo; sem ele, o Haiku 5.5, o rápido e barato);
//   NETWIRE_IA_LIMITE  → quantos pedidos por dia, por campanha (padrão 30).
// O texto do sistema é genérico (o repositório é público): o que é da campanha vem dos arquivos de dados e dos
// documentos do mestre, escolhidos por ele a cada pedido.
const fs = require('fs');
const path = require('path');

// ANTHROPIC_BASE_URL (como nos SDKs da Anthropic) troca o endereço: um proxy, ou uma API falsa na conferência local.
const API_URL = 'https://api.anthropic.com';
const API_VERSION = '2026-10-21';
// Preços em US$ por milhão de tokens (entrada, saída, leitura do cache). O Haiku 5.5 cobra mais acima de 100 mil
// tokens de entrada. A escrita no cache custa 1,25× a entrada.
const MODELS = {
  'claude-haiku-5-5': { nome: 'Rápido (Haiku 5.5)', entrada: 0.10, saida: 0.50, cache: 0.01, acima: { limite: 100000, entrada: 0.50, saida: 2.50 }, fallbacks: false },
  'claude-sonnet-5-5': { nome: 'Equilibrado (Sonnet 5.5)', entrada: 2, saida: 10, cache: 0.20, fallbacks: true },
  'claude-opus-5-5': { nome: 'O mais capaz (Opus 5.5)', entrada: 4, saida: 20, cache: 0.20, fallbacks: true }
};
const DEFAULT_MODEL = 'claude-haiku-5-5';
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

const fail = (status, erro) => Object.assign(new Error(erro), { status });

// ia: { chave, modelo, fetch } (do server.js). docsDir: a pasta documentos/ do projeto.
function createDrafter({ ia = {}, docsDir = '', campaigns }) {
  const key = String(ia.chave || '');
  const defaultModel = MODELS[ia.modelo] ? ia.modelo : DEFAULT_MODEL;
  const call = ia.fetch || (typeof fetch === 'function' ? fetch : null);
  const enabled = Boolean(key && call);
  const endpoint = `${String(ia.url || API_URL).replace(/\/+$/, '')}/v1/messages`;

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
  function costOf(model, usage = {}) {
    const price = MODELS[model] || MODELS[DEFAULT_MODEL];
    const written = Number(usage.cache_creation_input_tokens) || 0;
    const read = Number(usage.cache_read_input_tokens) || 0;
    const input = Number(usage.input_tokens) || 0;
    const output = Number(usage.output_tokens) || 0;
    const high = price.acima && input + written + read > price.acima.limite;
    const inRate = high ? price.acima.entrada : price.entrada;
    const outRate = high ? price.acima.saida : price.saida;
    const dollars = (input * inRate + written * inRate * 1.25 + read * price.cache + output * outRate) / 1e6;
    return { entrada: input, cacheEscrito: written, cacheLido: read, saida: output, custo: Math.round(dollars * 1e6) / 1e6 };
  }

  // ---------------- O pedido ----------------
  // channel: o canal; messages: a conversa dele (as mais velhas primeiro); request: { tipo: 'resposta' | 'nova',
  // instrucao, quantidade (1–3), modelo, autor, contexto: { base, estado, diario } }.
  async function draft({ campaign, channel, messages, request }) {
    if (!enabled) throw fail(503, 'A IA está desligada: falta a ANTHROPIC_API_KEY no servidor.');
    const model = MODELS[request.modelo] ? request.modelo : defaultModel;
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
    const body = {
      model,
      max_tokens: 16000,
      // Mensagens curtas: pouco raciocínio basta (e custa menos).
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // As instruções e o contexto da campanha ficam no cache (o pedido e a conversa vêm depois do ponto de cache).
      system: [{ type: 'text', text: SYSTEM }, { type: 'text', text: `# O contexto da campanha\n\n${context}`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      // Uma recusa de segurança troca de modelo no próprio pedido (onde existe a troca: Sonnet e Opus).
      ...(MODELS[model].fallbacks ? { fallbacks: 'default' } : {})
    };
    const headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': API_VERSION, ...(MODELS[model].fallbacks ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) };
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 120000);
    let response;
    let data;
    try {
      response = await call(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: abort.signal });
      data = await response.json().catch(() => ({}));
    } catch (error) {
      throw fail(502, error.name === 'AbortError' ? 'A IA demorou demais. Tente de novo.' : 'Sem conexão com a API da Anthropic.');
    } finally { clearTimeout(timer); }
    if (!response.ok) {
      const message = (data && data.error && data.error.message) || `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) throw fail(502, 'A chave da IA (ANTHROPIC_API_KEY) foi recusada.');
      if (response.status === 429 || response.status === 529 || response.status >= 500) throw fail(503, `A API da Anthropic está ocupada agora (${response.status}). Tente de novo em instantes.`);
      throw fail(502, `A IA não aceitou o pedido: ${message}`);
    }
    const usage = costOf(data.model || model, data.usage);
    if (data.stop_reason === 'refusal') throw Object.assign(fail(422, 'A IA recusou este pedido. Reescreva o que você quer, ou escreva à mão.'), { uso: usage });
    if (data.stop_reason === 'max_tokens') throw Object.assign(fail(502, 'A resposta da IA veio cortada. Tente de novo.'), { uso: usage });
    const text = (data.content || []).filter(block => block.type === 'text').map(block => block.text).join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw Object.assign(fail(502, 'A resposta da IA veio num formato inesperado. Tente de novo.'), { uso: usage }); }
    const drafts = (Array.isArray(parsed.mensagens) ? parsed.mensagens : []).slice(0, count)
      .map(item => ({ autor: String(item.autor || speaker).slice(0, 60), texto: String(item.texto || '').trim(), nota: String(item.nota_para_o_mestre || '').trim() }))
      .filter(item => item.texto);
    if (!drafts.length) throw Object.assign(fail(502, 'A IA não escreveu nenhuma mensagem. Tente de novo.'), { uso: usage });
    return { rascunhos: drafts, uso: { modelo: data.model || model, ...usage } };
  }

  return {
    enabled,
    draft,
    defaultModel,
    models: () => Object.entries(MODELS).map(([id, item]) => ({ id, nome: item.nome })),
    costOf
  };
}

module.exports = { createDrafter, MODELS };
