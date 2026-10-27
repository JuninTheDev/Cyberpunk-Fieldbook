// NetWire: as mensagens dentro do jogo (canais da cidade e conversas com NPCs). Carregado pelo api-personagens.js, que
// já sabe quem é quem e em que campanha cada um joga.
//
// Por campanha, em campanhas/<id>/netwire.json (entra no backup diário):
//   canais    → [{ id, nome, tipo: 'feed' | 'direto', contato: { nome, descricao }, aceitaResposta, para: [contas] }]
//               "para" vazio: todos os jogadores da campanha; com contas, só elas (a conversa de um NPC com um jogador);
//   mensagens → [{ id, canal, autor: { tipo: 'npc' | 'mestre' | 'jogador', nome, conta? }, texto, quando, criada,
//                  estado: 'rascunho' | 'agendada' | 'entregue', origem: 'mestre' | 'ia' | 'jogador', nota }].
// Dois canais vêm de fora, prontos: #handouts (as Notícias e handouts publicadas da campanha) e #n54-news (as Notícias
// de Night City, de todas as campanhas). Eles só se leem.
//
// O jogador recebe só o que é dele: os canais em que está, as mensagens entregues (a agendada aparece sozinha quando
// chega a hora: a conta é feita na leitura, sem relógio no servidor), sem nota, sem origem, sem as contas dos outros.
// Ele responde nos canais que aceitam resposta; a resposta chega ao mestre, que responde como o NPC.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createDrafter } = require('./api-netwire-ia');

const MAX_CHANNELS = 60;
const MAX_MESSAGES = 2000;
const MAX_TEXT_GM = 4000;
const MAX_TEXT_PLAYER = 1000;
// O arquivo anexo (um handout): um documento inteiro cabe.
const MAX_ATTACHMENT = 20000;
// O jogador manda no máximo 12 mensagens a cada 10 minutos (por conta).
const PLAYER_LIMIT = { count: 12, ms: 10 * 60 * 1000 };
const STATES = ['rascunho', 'agendada', 'entregue'];
const ORIGINS = ['mestre', 'ia'];
const VIRTUAL = {
  handouts: { id: 'handouts', nome: 'handouts', tipo: 'feed', virtual: true, contato: { nome: 'Handouts', descricao: 'Boletins, mensagens e documentos que o grupo recebeu.' } },
  n54: { id: 'n54-news', nome: 'n54-news', tipo: 'feed', virtual: true, contato: { nome: 'N54 News', descricao: 'O que a cidade inteira está comentando.' } }
};
const newId = () => crypto.randomBytes(6).toString('hex');
const text = (value, max) => String(value ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const isIso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const fail = (status, erro) => ({ status, data: { erro } });

// ia: { chave, modelo, limite, fetch } (do server.js); docsDir: os documentos do mestre (para o contexto da IA).
function createNetwire({ dataDir, campaigns, writeJsonAtomic, lockOn, ia = {}, docsDir = '' }) {
  const fileOf = id => path.join(dataDir, 'campanhas', id, 'netwire.json');
  const drafter = createDrafter({ ia, docsDir, campaigns });
  const dailyLimit = Math.max(1, Number(ia.limite) || 30);
  function read(id) {
    try {
      const data = JSON.parse(fs.readFileSync(fileOf(id), 'utf8'));
      return { canais: Array.isArray(data.canais) ? data.canais : [], mensagens: Array.isArray(data.mensagens) ? data.mensagens : [], ia: data.ia && typeof data.ia === 'object' ? data.ia : {}, atualizado: data.atualizado || null };
    } catch { return { canais: [], mensagens: [], ia: {}, atualizado: null }; }
  }
  // O uso da IA de hoje (dia no fuso do servidor) e os últimos pedidos, com o custo estimado de cada um.
  const today = () => new Date().toLocaleDateString('sv-SE');
  const usageToday = data => (data.ia && data.ia.dia === today() ? { pedidos: data.ia.pedidos || 0, custo: data.ia.custo || 0 } : { pedidos: 0, custo: 0 });
  function recordUsage(data, uso) {
    const now = usageToday(data);
    data.ia = { dia: today(), pedidos: now.pedidos + 1, custo: Math.round((now.custo + (uso ? uso.custo : 0)) * 1e6) / 1e6, registro: [...((data.ia && data.ia.registro) || []), ...(uso ? [{ quando: new Date().toISOString(), ...uso }] : [])].slice(-50) };
  }
  // Toda mudança passa pela fila do arquivo: relê, muda e grava sem esperar nada no meio.
  // change(dados) muda; { status, data } desiste; o que devolver vai na resposta.
  function update(id, change) {
    return lockOn(fileOf(id), async () => {
      const data = read(id);
      const result = change(data);
      if (result && result.status) return result;
      data.mensagens = data.mensagens.slice(-MAX_MESSAGES);
      data.atualizado = new Date().toISOString();
      fs.mkdirSync(path.dirname(fileOf(id)), { recursive: true });
      await writeJsonAtomic(fileOf(id), data);
      notify(id);
      return { status: 200, data: { ok: true, atualizado: data.atualizado, ...(result || {}) } };
    });
  }

  // ---------------- Na hora: /api/netwire/eventos (SSE) ----------------
  // Cada aba aberta fica ouvindo a campanha dela. O aviso só diz "mudou" (com a hora): quem ouve pede de novo o
  // api/netwire, e o servidor filtra como sempre (o aviso não leva mensagem nenhuma). A cada 20 s, um pulso com a hora
  // da última mudança (a agendada que chegou aparece por ele) e a conferência de quem ouve (saiu da conta, ou não joga
  // mais na campanha: a conexão fecha).
  const MAX_STREAMS = 300;
  const streams = new Set(); // { campaign, response, request, wanted, account }
  let pulse = null;
  const write = (stream, event, payload) => { try { stream.response.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`); } catch { close(stream); } };
  function close(stream) {
    if (!streams.delete(stream)) return;
    try { stream.response.end(); } catch { /* já fechada */ }
    if (!streams.size && pulse) { clearInterval(pulse); pulse = null; }
  }
  function notify(id) {
    const at = updated(id);
    for (const stream of streams) if (stream.campaign === id) write(stream, 'netwire', { atualizado: at });
  }
  function openStream({ request, response, campaign, identity, wanted, who, chosenCampaign }) {
    const account = identity.conta ? identity.conta.id : 'mestre';
    if (streams.size >= MAX_STREAMS || [...streams].filter(item => item.account === account).length >= 6) {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '30' });
      return response.end('Conexões demais.');
    }
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'private, no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write('retry: 3000\n\n');
    const stream = { campaign, response, request, wanted, account, who, chosenCampaign };
    streams.add(stream);
    write(stream, 'netwire', { atualizado: updated(campaign) });
    request.on('close', () => close(stream));
    if (!pulse) {
      pulse = setInterval(() => {
        for (const item of [...streams]) {
          const now = item.who(item.request);
          if (now.papel === 'visitante' || item.chosenCampaign(now, item.wanted) !== item.campaign) { close(item); continue; }
          write(item, 'netwire', { atualizado: updated(item.campaign) });
        }
      }, 20000);
      if (pulse.unref) pulse.unref();
    }
  }

  // ---------------- Quem vê o quê ----------------
  const now = () => new Date().toISOString();
  const delivered = (message, at = now()) => message.estado === 'entregue' || (message.estado === 'agendada' && isIso(message.quando) && message.quando <= at);
  const memberOf = (channel, accountId) => !Array.isArray(channel.para) || !channel.para.length || channel.para.includes(accountId);
  // Quando a leitura muda: a última gravação ou a última agendada que já chegou (o "novidade" dos jogadores).
  function updated(id) {
    const data = read(id);
    const at = now();
    const due = data.mensagens.filter(message => message.estado === 'agendada' && delivered(message, at)).map(message => message.quando);
    return [data.atualizado, ...due].filter(Boolean).sort().pop() || null;
  }
  // Os dois canais prontos, montados do Publicar e das Notícias de Night City (as mais novas primeiro lá; aqui, na
  // ordem da conversa, as mais velhas em cima).
  function virtualMessages(id) {
    const fromNews = (items, canal, autor) => items.slice().reverse().map((item, index) => ({ id: `${canal}-${item.id || index}`, canal, autor: { tipo: 'npc', nome: autor }, titulo: String(item.titulo || ''), texto: String(item.texto || ''), data: String(item.data || ''), quando: null }));
    return [...fromNews(campaigns.readPublish(id).publicado.noticias || [], VIRTUAL.handouts.id, 'Handouts'), ...fromNews(campaigns.readNews().publicado || [], VIRTUAL.n54.id, 'N54 News')];
  }
  function playerView(id, identity) {
    const data = read(id);
    const me = identity.conta.id;
    const at = now();
    const channels = data.canais.filter(channel => memberOf(channel, me));
    const ids = new Set(channels.map(channel => channel.id));
    const messages = data.mensagens.filter(message => ids.has(message.canal) && delivered(message, at)).map(message => ({
      id: message.id, canal: message.canal, texto: message.texto,
      ...(message.anexo ? { anexo: { titulo: message.anexo.titulo, texto: message.anexo.texto } } : {}),
      quando: message.estado === 'agendada' ? message.quando : message.quando || message.criada,
      autor: { tipo: message.autor.tipo === 'jogador' ? 'jogador' : 'npc', nome: message.autor.nome, ...(message.autor.conta === me ? { minha: true } : {}) }
    }));
    return {
      canais: [VIRTUAL.handouts, VIRTUAL.n54, ...channels.map(({ id: channelId, nome, tipo, contato, aceitaResposta }) => ({ id: channelId, nome, tipo, contato, aceitaResposta: Boolean(aceitaResposta) }))],
      mensagens: [...virtualMessages(id), ...messages],
      atualizado: updated(id)
    };
  }
  function gmView(id) {
    const data = read(id);
    const at = now();
    // Conversa esperando o mestre: a última mensagem entregue dela é de um jogador.
    const waiting = data.canais.filter(channel => {
      const last = data.mensagens.filter(message => message.canal === channel.id && delivered(message, at)).pop();
      return last && last.autor.tipo === 'jogador';
    }).map(channel => channel.id);
    return {
      canais: [VIRTUAL.handouts, VIRTUAL.n54, ...data.canais],
      mensagens: [...virtualMessages(id), ...data.mensagens.map(message => ({ ...message, entregue: delivered(message, at) }))],
      aguardando: waiting,
      // A IA na Caixa: ligada (há chave), os modelos, o padrão e o uso de hoje.
      ia: { ligada: drafter.enabled, modelos: drafter.models(), padrao: drafter.defaultModel, limite: dailyLimit, hoje: usageToday(data), ultimos: ((data.ia && data.ia.registro) || []).slice(-5) },
      atualizado: updated(id)
    };
  }

  // ---------------- O que chega do navegador ----------------
  function cleanChannel(input, base = {}) {
    const nome = text(input.nome ?? base.nome, 40).replace(/^#+/, '');
    if (!nome) return null;
    const contato = input.contato || base.contato || {};
    return {
      id: base.id || newId(),
      nome,
      tipo: (input.tipo ?? base.tipo) === 'direto' ? 'direto' : 'feed',
      contato: { nome: text(contato.nome, 60), descricao: text(contato.descricao, 300) },
      aceitaResposta: Boolean(input.aceitaResposta ?? base.aceitaResposta),
      para: [...new Set((Array.isArray(input.para) ? input.para : base.para || []).map(String).filter(item => /^[\w-]{1,40}$/.test(item)))].slice(0, 20)
    };
  }
  // O arquivo anexo (um handout, por exemplo): título e texto em Markdown, que a mensagem mostra formatado.
  function cleanAttachment(value, base) {
    if (value === null) return null;
    if (!value || typeof value !== 'object') return base || null;
    const anexo = { titulo: text(value.titulo, 120), texto: text(value.texto, MAX_ATTACHMENT) };
    return anexo.texto ? anexo : null;
  }
  function cleanMessage(input, channel, base = {}) {
    const texto = text(input.texto ?? base.texto, MAX_TEXT_GM);
    const anexo = cleanAttachment(input.anexo, base.anexo);
    // A mensagem tem texto, um arquivo, ou os dois.
    if (!texto && !anexo) return null;
    const estado = STATES.includes(input.estado) ? input.estado : base.estado || 'rascunho';
    const quando = isIso(input.quando) ? new Date(input.quando).toISOString() : input.quando === null ? null : base.quando || null;
    const autorNome = text(input.autor && input.autor.nome, 60) || (base.autor && base.autor.nome) || channel.contato.nome || channel.nome;
    return {
      id: base.id || newId(),
      canal: channel.id,
      autor: { tipo: input.autor && input.autor.tipo === 'mestre' ? 'mestre' : 'npc', nome: autorNome },
      texto,
      ...(anexo ? { anexo } : {}),
      quando: estado === 'agendada' ? quando : estado === 'entregue' ? quando || now() : quando,
      criada: base.criada || now(),
      estado,
      origem: ORIGINS.includes(input.origem) ? input.origem : base.origem || 'mestre',
      nota: text(input.nota ?? base.nota, 500),
      // O pedido que gerou um rascunho da IA (para "Gerar de novo" e "Variação"): só o mestre vê.
      ...(base.pedido ? { pedido: base.pedido } : {})
    };
  }

  // ---------------- Rotas: /api/netwire ----------------
  const recent = new Map();
  function tooFast(accountId) {
    const at = Date.now();
    const list = (recent.get(accountId) || []).filter(time => at - time < PLAYER_LIMIT.ms);
    if (list.length >= PLAYER_LIMIT.count) { recent.set(accountId, list); return true; }
    recent.set(accountId, [...list, at]);
    return false;
  }

  // ctx: { request, response, pathname, method, identity, query, json, readJson, chosenCampaign, characterName }.
  async function route({ request, response, pathname, method, identity, query, json, readJson, chosenCampaign, characterName, who }) {
    if (identity.papel === 'visitante') return json(response, 401, { erro: 'Entre com o seu código.' });
    const gm = identity.papel === 'mestre';
    const parts = pathname.split('/').slice(3); // ['', 'api', 'netwire', ...]
    if (parts[0] === 'eventos') {
      if (method !== 'GET') return json(response, 405, { erro: 'Use GET.' });
      const campaign = chosenCampaign(identity, query.get('campanha'));
      if (!campaign) return json(response, 404, { erro: 'Campanha não encontrada.' });
      return openStream({ request, response, campaign, identity, wanted: query.get('campanha'), who, chosenCampaign });
    }
    const body = method === 'POST' || method === 'PUT' ? await readJson(request, 64 * 1024) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(response, 400, { erro: 'Envie um objeto JSON.' });
    const id = chosenCampaign(identity, query.get('campanha') || body.campanha);
    if (!id) return json(response, 404, { erro: 'Campanha não encontrada.' });
    const reply = result => json(response, result.status, result.data);

    if (!parts.length) {
      if (method !== 'GET') return json(response, 405, { erro: 'Use GET.' });
      return json(response, 200, gm ? gmView(id) : playerView(id, identity));
    }

    if (parts[0] === 'mensagens') {
      const messageId = parts[1];
      if (!messageId && method === 'POST') {
        if (!gm) {
          // O jogador responde: só num canal dele que aceita resposta.
          const texto = text(body.texto, MAX_TEXT_PLAYER);
          if (!texto) return json(response, 400, { erro: 'Escreva a mensagem.' });
          const channel = read(id).canais.find(item => item.id === body.canal);
          if (!channel || !memberOf(channel, identity.conta.id)) return json(response, 404, { erro: 'Canal não encontrado.' });
          if (!channel.aceitaResposta) return json(response, 403, { erro: 'Este canal só recebe mensagens.' });
          if (tooFast(identity.conta.id)) return json(response, 429, { erro: 'Muitas mensagens seguidas. Espere alguns minutos.' });
          const nome = (body.personagem && characterName(identity, String(body.personagem), id)) || identity.conta.nome;
          return reply(await update(id, data => {
            if (!data.canais.some(item => item.id === channel.id)) return fail(404, 'Canal não encontrado.');
            const message = { id: newId(), canal: channel.id, autor: { tipo: 'jogador', nome, conta: identity.conta.id }, texto, quando: now(), criada: now(), estado: 'entregue', origem: 'jogador', nota: '' };
            data.mensagens.push(message);
            return { mensagem: { id: message.id, canal: message.canal, texto, quando: message.quando, autor: { tipo: 'jogador', nome, minha: true } } };
          }));
        }
        return reply(await update(id, data => {
          const channel = data.canais.find(item => item.id === body.canal);
          if (!channel) return fail(404, 'Canal não encontrado.');
          const message = cleanMessage(body, channel);
          if (!message) return fail(400, 'Escreva a mensagem.');
          if (message.estado === 'agendada' && !message.quando) return fail(400, 'Diga quando entregar.');
          data.mensagens.push(message);
          return { mensagem: message };
        }));
      }
      if (!gm) return json(response, 403, { erro: 'Só o mestre.' });
      if (!messageId) return json(response, 405, { erro: 'Use POST.' });
      if (method === 'PUT') {
        return reply(await update(id, data => {
          const index = data.mensagens.findIndex(item => item.id === messageId);
          if (index < 0) return fail(404, 'Mensagem não encontrada.');
          const base = data.mensagens[index];
          if (base.origem === 'jogador') return fail(409, 'A mensagem do jogador não se edita.');
          const channel = data.canais.find(item => item.id === (body.canal || base.canal));
          if (!channel) return fail(404, 'Canal não encontrado.');
          const message = cleanMessage(body, channel, base);
          if (!message) return fail(400, 'Escreva a mensagem.');
          if (message.estado === 'agendada' && !message.quando) return fail(400, 'Diga quando entregar.');
          // Entregar agora: a hora é a de agora (não a do rascunho).
          if (body.estado === 'entregue' && base.estado !== 'entregue' && !isIso(body.quando)) message.quando = now();
          data.mensagens[index] = message;
          return { mensagem: message };
        }));
      }
      if (method === 'DELETE') {
        return reply(await update(id, data => {
          const index = data.mensagens.findIndex(item => item.id === messageId);
          if (index < 0) return fail(404, 'Mensagem não encontrada.');
          data.mensagens.splice(index, 1);
          return {};
        }));
      }
      return json(response, 405, { erro: 'Método não permitido.' });
    }

    // A IA rascunha (só o mestre): o que volta vira rascunho na Caixa, com a nota da IA e o custo; nada é entregue.
    if (parts[0] === 'rascunhar') {
      if (!gm) return json(response, 403, { erro: 'Só o mestre.' });
      if (method !== 'POST') return json(response, 405, { erro: 'Use POST.' });
      if (!drafter.enabled) return json(response, 503, { erro: 'A IA está desligada: falta a ANTHROPIC_API_KEY ou a GEMINI_API_KEY no servidor.' });
      const before = read(id);
      // A partir de um rascunho da IA (base): "regenerar" pede de novo o mesmo e troca o rascunho no lugar dele;
      // "variar" pede uma versão diferente daquele texto e guarda as duas.
      let request = body;
      let source = null;
      if (body.base) {
        source = before.mensagens.find(item => item.id === body.base);
        if (!source) return json(response, 404, { erro: 'Rascunho não encontrado.' });
        if (source.origem !== 'ia' || !source.pedido) return json(response, 409, { erro: 'Esse rascunho não veio da IA: não há pedido para refazer.' });
        if (source.estado !== 'rascunho') return json(response, 409, { erro: 'Só dá para refazer um rascunho (este já foi agendado ou entregue).' });
        const varying = body.modo === 'variar';
        request = {
          ...source.pedido, canal: source.canal, quantidade: 1,
          ...(varying ? { instrucao: `${source.pedido.instrucao ? `${source.pedido.instrucao}\n` : ''}Faça uma versão diferente desta (outro tom, outro detalhe ou outro caminho), sem repeti-la: "${source.texto}"` } : {})
        };
      }
      const channel = before.canais.find(item => item.id === request.canal);
      if (!channel) return json(response, 404, { erro: 'Canal não encontrado.' });
      if (usageToday(before).pedidos >= dailyLimit) return json(response, 429, { erro: `Chegou ao limite de ${dailyLimit} pedidos de hoje à IA nesta campanha.` });
      const at = now();
      const messages = before.mensagens.filter(item => item.canal === channel.id && delivered(item, at));
      // O que se guarda para refazer depois (sem a instrução da variação, que é desta vez só).
      const kept = source ? source.pedido : { tipo: request.tipo === 'resposta' ? 'resposta' : 'nova', instrucao: text(request.instrucao, 2000), modelo: String(request.modelo || ''), autor: text(request.autor, 60), contexto: { base: !(request.contexto && request.contexto.base === false), estado: !(request.contexto && request.contexto.estado === false), diario: !(request.contexto && request.contexto.diario === false) } };
      let result;
      try {
        result = await drafter.draft({ campaign: id, channel, messages, request });
      } catch (error) {
        // Mesmo um pedido que falhou pode ter custado (a recusa, a resposta cortada): conta no uso de hoje.
        if (error.uso) await update(id, data => { recordUsage(data, error.uso); return {}; });
        return json(response, error.status || 500, { erro: error.message });
      }
      const price = result.uso.custo < 0.01 ? 'menos de US$ 0,01' : `US$ ${result.uso.custo.toFixed(2).replace('.', ',')}`;
      return reply(await update(id, data => {
        if (!data.canais.some(item => item.id === channel.id)) return fail(404, 'Canal não encontrado.');
        recordUsage(data, result.uso);
        const created = result.rascunhos.map(item => ({
          id: newId(), canal: channel.id, autor: { tipo: 'npc', nome: item.autor || channel.contato.nome || channel.nome }, texto: item.texto.slice(0, MAX_TEXT_GM),
          quando: null, criada: now(), estado: 'rascunho', origem: 'ia', nota: text(`${item.nota ? `${item.nota} · ` : ''}IA: ${result.uso.modelo}, ${price}`, 500), pedido: kept
        }));
        const index = source && body.modo !== 'variar' ? data.mensagens.findIndex(item => item.id === source.id && item.estado === 'rascunho') : -1;
        if (index >= 0) data.mensagens.splice(index, 1, ...created);
        else data.mensagens.push(...created);
        return { mensagens: created, uso: result.uso, hoje: usageToday(data), ...(index >= 0 ? { substituiu: source.id } : {}) };
      }));
    }

    if (parts[0] === 'canais') {
      if (!gm) return json(response, 403, { erro: 'Só o mestre.' });
      const channelId = parts[1];
      if (!channelId && method === 'POST') {
        return reply(await update(id, data => {
          if (data.canais.length >= MAX_CHANNELS) return fail(400, `No máximo ${MAX_CHANNELS} canais.`);
          const channel = cleanChannel(body);
          if (!channel) return fail(400, 'Dê um nome ao canal.');
          data.canais.push(channel);
          return { canal: channel };
        }));
      }
      if (!channelId) return json(response, 405, { erro: 'Use POST.' });
      if (method === 'PUT') {
        return reply(await update(id, data => {
          const index = data.canais.findIndex(item => item.id === channelId);
          if (index < 0) return fail(404, 'Canal não encontrado.');
          const channel = cleanChannel(body, data.canais[index]);
          if (!channel) return fail(400, 'Dê um nome ao canal.');
          data.canais[index] = channel;
          return { canal: channel };
        }));
      }
      if (method === 'DELETE') {
        return reply(await update(id, data => {
          if (!data.canais.some(item => item.id === channelId)) return fail(404, 'Canal não encontrado.');
          data.canais = data.canais.filter(item => item.id !== channelId);
          data.mensagens = data.mensagens.filter(item => item.canal !== channelId);
          return {};
        }));
      }
      return json(response, 405, { erro: 'Método não permitido.' });
    }
    return json(response, 404, { erro: 'Rota não encontrada.' });
  }

  return { route, updated };
}

module.exports = { createNetwire };
