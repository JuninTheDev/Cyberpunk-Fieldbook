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

const MAX_CHANNELS = 60;
const MAX_MESSAGES = 2000;
const MAX_TEXT_GM = 4000;
const MAX_TEXT_PLAYER = 1000;
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

function createNetwire({ dataDir, campaigns, writeJsonAtomic, lockOn }) {
  const fileOf = id => path.join(dataDir, 'campanhas', id, 'netwire.json');
  function read(id) {
    try {
      const data = JSON.parse(fs.readFileSync(fileOf(id), 'utf8'));
      return { canais: Array.isArray(data.canais) ? data.canais : [], mensagens: Array.isArray(data.mensagens) ? data.mensagens : [], atualizado: data.atualizado || null };
    } catch { return { canais: [], mensagens: [], atualizado: null }; }
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
      return { status: 200, data: { ok: true, atualizado: data.atualizado, ...(result || {}) } };
    });
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
  function cleanMessage(input, channel, base = {}) {
    const texto = text(input.texto ?? base.texto, MAX_TEXT_GM);
    if (!texto) return null;
    const estado = STATES.includes(input.estado) ? input.estado : base.estado || 'rascunho';
    const quando = isIso(input.quando) ? new Date(input.quando).toISOString() : input.quando === null ? null : base.quando || null;
    const autorNome = text(input.autor && input.autor.nome, 60) || (base.autor && base.autor.nome) || channel.contato.nome || channel.nome;
    return {
      id: base.id || newId(),
      canal: channel.id,
      autor: { tipo: input.autor && input.autor.tipo === 'mestre' ? 'mestre' : 'npc', nome: autorNome },
      texto,
      quando: estado === 'agendada' ? quando : estado === 'entregue' ? quando || now() : quando,
      criada: base.criada || now(),
      estado,
      origem: ORIGINS.includes(input.origem) ? input.origem : base.origem || 'mestre',
      nota: text(input.nota ?? base.nota, 500)
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
  async function route({ request, response, pathname, method, identity, query, json, readJson, chosenCampaign, characterName }) {
    if (identity.papel === 'visitante') return json(response, 401, { erro: 'Entre com o seu código.' });
    const gm = identity.papel === 'mestre';
    const parts = pathname.split('/').slice(3); // ['', 'api', 'netwire', ...]
    const body = method === 'POST' || method === 'PUT' ? await readJson(request, 64 * 1024) : {};
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
