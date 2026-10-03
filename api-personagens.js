// API dos personagens dos jogadores e dos códigos de acesso. Carregada pelo server.js.
//
// Quem é quem:
//   mestre    → este computador (ou o cookie do GM_KEY), como no resto da wiki;
//   jogador   → entrou com o código que o mestre criou (cookie "jogador");
//   visitante → qualquer outro: só vê nome, apelido e Role dos personagens.
//
// Arquivos: contas-jogadores.json (códigos; nunca vai para os jogadores nem para o git)
// e personagens/<id>.json, um por personagem. Apagar move para personagens/apagados/.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROLES = ['face', 'solo', 'netrunner', 'corpo', 'tech', 'medtech', 'media', 'lawman', 'nomad'];
const MAX_BODY = 300 * 1024;
const MAX_PER_PLAYER = 20;
// O importador do Foundry roda no navegador do mestre, em outra porta: só essas origens recebem CORS.
const foundryOrigins = new Set(['http://localhost:30000', 'http://127.0.0.1:30000', ...String(process.env.FOUNDRY_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean)]);

module.exports = function createCharacterApi({ root, isGameMaster, send, writeJsonAtomic, sameSecret }) {
  // DADOS_PERSONAGENS troca a pasta dos dados (os testes usam uma pasta temporária, longe da campanha).
  const dataDir = process.env.DADOS_PERSONAGENS ? path.resolve(process.env.DADOS_PERSONAGENS) : root;
  const accountsFile = path.join(dataDir, 'contas-jogadores.json');
  const charactersDir = path.join(dataDir, 'personagens');
  const json = (response, status, data, headers = {}) => send(response, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers });

  // ---------------- Contas ----------------
  const readAccounts = () => {
    try { return JSON.parse(fs.readFileSync(accountsFile, 'utf8')).contas || []; } catch { return []; }
  };
  const saveAccounts = accounts => writeJsonAtomic(accountsFile, { contas: accounts });
  // Código fácil de ditar: sem 0/O, 1/I/L.
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const randomFrom = (chars, length) => Array.from(crypto.randomBytes(length), byte => chars[byte % chars.length]).join('');
  const newCode = () => `NC-${randomFrom(CODE_CHARS, 4)}-${randomFrom(CODE_CHARS, 4)}`;
  const newId = () => randomFrom('abcdefghijkmnpqrstuvwxyz23456789', 10);
  const playerCookie = request => decodeURIComponent(((request.headers.cookie || '').match(/(?:^|;\s*)jogador=([^;]+)/) || [])[1] || '');
  const findAccount = code => code ? readAccounts().find(account => sameSecret(account.codigo, code)) : null;

  function who(request) {
    if (isGameMaster(request)) return { papel: 'mestre' };
    const account = findAccount(playerCookie(request));
    return account ? { papel: 'jogador', conta: account } : { papel: 'visitante' };
  }

  // Limite de tentativas de código por IP: 10 a cada 10 minutos.
  const attempts = new Map();
  const clientIp = request => String(request.headers['cf-connecting-ip'] || (request.headers['x-forwarded-for'] || '').split(',')[0] || request.socket.remoteAddress).trim();
  function tooManyAttempts(ip) {
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || now > entry.until) { attempts.set(ip, { count: 1, until: now + 10 * 60 * 1000 }); return false; }
    entry.count += 1;
    return entry.count > 10;
  }

  // ---------------- Leitura do corpo ----------------
  // Gravações exigem JSON: um formulário de outro site não consegue mandar esse tipo sem permissão (CORS).
  function readJson(request) {
    return new Promise((resolve, reject) => {
      if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return reject(Object.assign(new Error('Envie JSON (Content-Type: application/json).'), { status: 415 }));
      let body = '';
      request.setEncoding('utf8');
      request.on('data', chunk => {
        body += chunk;
        if (body.length > MAX_BODY) { reject(Object.assign(new Error('Conteúdo grande demais.'), { status: 413 })); request.destroy(); }
      });
      request.on('end', () => {
        try { resolve(JSON.parse(body || '{}')); } catch { reject(Object.assign(new Error('JSON inválido.'), { status: 400 })); }
      });
      request.on('error', reject);
    });
  }

  // ---------------- Personagens ----------------
  const fileOf = id => path.join(charactersDir, `${id}.json`);
  const validId = id => /^[a-z0-9]{6,16}$/.test(id);
  const readCharacter = id => {
    try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); } catch { return null; }
  };
  const allCharacters = () => {
    try { return fs.readdirSync(charactersDir).filter(file => file.endsWith('.json')).map(file => readCharacter(file.slice(0, -5))).filter(Boolean); } catch { return []; }
  };
  const ownerName = (accounts, id) => (accounts.find(account => account.id === id) || {}).nome || '';
  // O que qualquer um vê: nome, apelido e Role. O resto só o dono e o mestre.
  const publicView = (doc, accounts) => ({ id: doc.id, nome: doc.nome || '', apelido: doc.apelido || '', role: doc.role || '', donoNome: ownerName(accounts, doc.dono), publico: true });
  const summary = (doc, accounts) => ({ ...publicView(doc, accounts), publico: false, dono: doc.dono, metodo: doc.metodo || '', versao: doc.versao, atualizado: doc.atualizado, foundry: doc.foundry || null });
  const canEdit = (identity, doc) => identity.papel === 'mestre' || (identity.papel === 'jogador' && doc.dono === identity.conta.id);

  // Limites gerais de forma: o criador confere as regras; aqui só se evita lixo e arquivo enorme.
  function cleanValue(value, depth = 0) {
    if (depth > 8) throw new Error('Estrutura funda demais.');
    if (typeof value === 'string') return value.slice(0, 6000);
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'boolean' || value === null) return value;
    if (Array.isArray(value)) return value.slice(0, 600).map(item => cleanValue(item, depth + 1));
    if (typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 300).map(([key, item]) => [String(key).slice(0, 80), cleanValue(item, depth + 1)]));
    return null;
  }
  // Campos que o cliente não escolhe: id, dono, versão, datas e a volta do Foundry.
  const SERVER_FIELDS = ['id', 'dono', 'versao', 'criado', 'atualizado', 'foundry'];
  function cleanCharacter(input) {
    const doc = cleanValue(input && typeof input === 'object' && !Array.isArray(input) ? input : {});
    for (const field of SERVER_FIELDS) delete doc[field];
    doc.nome = String(doc.nome || '').trim().slice(0, 80);
    doc.apelido = String(doc.apelido || '').trim().slice(0, 80);
    if (doc.role && !ROLES.includes(doc.role)) doc.role = '';
    return doc;
  }

  function cors(request, response) {
    const origin = request.headers.origin;
    if (!origin || !foundryOrigins.has(origin)) return {};
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
  }

  // ---------------- Rotas ----------------
  async function route(request, response, pathname) {
    const method = request.method;
    const identity = who(request);

    if (pathname === '/api/eu' && method === 'GET') {
      return json(response, 200, { papel: identity.papel, jogador: identity.conta ? { id: identity.conta.id, nome: identity.conta.nome } : null });
    }

    if (pathname === '/api/entrar' && method === 'POST') {
      if (tooManyAttempts(clientIp(request))) return json(response, 429, { erro: 'Muitas tentativas. Espere 10 minutos.' });
      const { codigo } = await readJson(request);
      const account = findAccount(String(codigo || '').trim().toUpperCase());
      if (!account) return json(response, 403, { erro: 'Código não encontrado. Confira com o mestre.' });
      attempts.delete(clientIp(request));
      return json(response, 200, { jogador: { id: account.id, nome: account.nome } }, { 'Set-Cookie': `jogador=${encodeURIComponent(account.codigo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000` });
    }
    if (pathname === '/api/sair' && method === 'POST') {
      return json(response, 200, { ok: true }, { 'Set-Cookie': 'jogador=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });
    }

    // Códigos dos jogadores: só o mestre.
    if (pathname === '/api/contas' || pathname.startsWith('/api/contas/')) {
      if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre gerencia os códigos.' });
      const accounts = readAccounts();
      if (pathname === '/api/contas' && method === 'GET') return json(response, 200, { contas: accounts });
      if (pathname === '/api/contas' && method === 'POST') {
        const { nome } = await readJson(request);
        const clean = String(nome || '').trim().slice(0, 60);
        if (!clean) return json(response, 400, { erro: 'Dê um nome ao jogador.' });
        const account = { id: newId(), nome: clean, codigo: newCode(), criado: new Date().toISOString() };
        await saveAccounts([...accounts, account]);
        return json(response, 201, { conta: account });
      }
      const id = pathname.slice('/api/contas/'.length);
      if (method === 'DELETE' && accounts.some(account => account.id === id)) {
        await saveAccounts(accounts.filter(account => account.id !== id));
        return json(response, 200, { ok: true });
      }
      return json(response, 404, { erro: 'Conta não encontrada.' });
    }

    if (pathname === '/api/personagens' || pathname.startsWith('/api/personagens/')) {
      const headers = cors(request, response);
      if (method === 'OPTIONS') { response.writeHead(204, headers); return response.end(); }
      const accounts = readAccounts();
      const reply = (status, data) => json(response, status, data, headers);

      if (pathname === '/api/personagens') {
        if (method === 'GET') {
          const list = allCharacters().map(doc => canEdit(identity, doc) ? { ...summary(doc, accounts), meu: identity.papel === 'jogador' } : publicView(doc, accounts));
          list.sort((a, b) => Number(Boolean(b.meu)) - Number(Boolean(a.meu)) || a.nome.localeCompare(b.nome, 'pt'));
          return reply(200, { personagens: list, papel: identity.papel });
        }
        if (method === 'POST') {
          if (identity.papel === 'visitante') return reply(401, { erro: 'Entre com o seu código para criar um personagem.' });
          const input = await readJson(request);
          const dono = identity.papel === 'mestre' ? String(input.dono || '') : identity.conta.id;
          if (identity.papel === 'jogador' && allCharacters().filter(doc => doc.dono === dono).length >= MAX_PER_PLAYER) return reply(400, { erro: `Limite de ${MAX_PER_PLAYER} personagens por jogador.` });
          const now = new Date().toISOString();
          const doc = { ...cleanCharacter(input), id: newId(), dono, versao: 1, criado: now, atualizado: now, foundry: null };
          fs.mkdirSync(charactersDir, { recursive: true });
          await writeJsonAtomic(fileOf(doc.id), doc);
          return reply(201, { personagem: doc });
        }
        return reply(405, { erro: 'Método não permitido.' });
      }

      const [id, extra] = pathname.slice('/api/personagens/'.length).split('/');
      if (!validId(id)) return reply(404, { erro: 'Personagem não encontrado.' });
      const stored = readCharacter(id);
      if (!stored) return reply(404, { erro: 'Personagem não encontrado.' });

      // Volta do Foundry: o importador grava o ator e o que já entregou. Não muda a versão (não atrapalha quem está editando).
      if (extra === 'foundry') {
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre.' });
        const input = cleanValue(await readJson(request));
        stored.foundry = { ator: String(input.ator || ''), nomeAtor: String(input.nomeAtor || ''), importado: String(input.importado || new Date().toISOString()), versao: Number(input.versao) || stored.versao, entregues: Array.isArray(input.entregues) ? input.entregues.map(String) : [] };
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { foundry: stored.foundry });
      }
      if (extra) return reply(404, { erro: 'Rota não encontrada.' });

      if (method === 'GET') return reply(200, { personagem: canEdit(identity, stored) ? { ...stored, donoNome: ownerName(accounts, stored.dono) } : publicView(stored, accounts) });
      if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
      if (method === 'PUT') {
        const input = await readJson(request);
        // Alguém salvou antes (outra aba, outro aparelho): devolve a versão atual em vez de apagar o trabalho.
        if (Number(input.versao) !== stored.versao) return reply(409, { erro: 'O personagem mudou em outro lugar. Recarregue para ver a versão mais nova.', personagem: stored });
        const doc = { ...cleanCharacter(input), id, dono: identity.papel === 'mestre' && input.dono !== undefined ? String(input.dono) : stored.dono, versao: stored.versao + 1, criado: stored.criado, atualizado: new Date().toISOString(), foundry: stored.foundry || null };
        await writeJsonAtomic(fileOf(id), doc);
        return reply(200, { personagem: doc });
      }
      if (method === 'DELETE') {
        const trash = path.join(charactersDir, 'apagados');
        fs.mkdirSync(trash, { recursive: true });
        fs.renameSync(fileOf(id), path.join(trash, `${id}-${Date.now()}.json`));
        return reply(200, { ok: true });
      }
      return reply(405, { erro: 'Método não permitido.' });
    }
    return false;
  }

  // Devolve true se a rota é desta API (respondida), false para o server.js seguir.
  return async function handle(request, response, pathname) {
    if (!/^\/api\/(eu|entrar|sair|contas|personagens)(\/|$)/.test(pathname)) return false;
    try {
      await route(request, response, pathname);
    } catch (error) {
      if (!response.headersSent) json(response, error.status || 500, { erro: error.status ? error.message : `Erro no servidor: ${error.message}` });
    }
    return true;
  };
};
