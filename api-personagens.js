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
  function readJson(request, limit = MAX_BODY) {
    return new Promise((resolve, reject) => {
      if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return reject(Object.assign(new Error('Envie JSON (Content-Type: application/json).'), { status: 415 }));
      let body = '';
      request.setEncoding('utf8');
      request.on('data', chunk => {
        body += chunk;
        if (body.length > limit) { reject(Object.assign(new Error('Conteúdo grande demais.'), { status: 413 })); request.destroy(); }
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
  // Retrato: o arquivo enviado (servido por esta API) ou um link https colado pelo jogador.
  const portraitOf = doc => doc.retrato || (/^https:\/\/[^\s"'<>]+$/.test(doc.retratoLink || '') ? doc.retratoLink : '');
  // O que qualquer um vê: nome, apelido, Role e retrato. O resto só o dono e o mestre.
  const publicView = (doc, accounts) => ({ id: doc.id, nome: doc.nome || '', apelido: doc.apelido || '', role: doc.role || '', retrato: portraitOf(doc), donoNome: ownerName(accounts, doc.dono), publico: true });
  const summary = (doc, accounts) => ({ ...publicView(doc, accounts), publico: false, dono: doc.dono, metodo: doc.metodo || '', versao: doc.versao, atualizado: doc.atualizado, foundry: doc.foundry || null, envio: doc.envio || null });
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
  // Campos que o cliente não escolhe: id, dono, versão, datas, a volta do Foundry, o envio ao mestre,
  // o retrato enviado e os Pontos de Melhoria dados pelo mestre (cada um tem a sua rota).
  const SERVER_FIELDS = ['id', 'dono', 'versao', 'criado', 'atualizado', 'foundry', 'envio', 'retrato', 'ip'];
  function cleanCharacter(input) {
    const doc = cleanValue(input && typeof input === 'object' && !Array.isArray(input) ? input : {});
    for (const field of SERVER_FIELDS) delete doc[field];
    doc.nome = String(doc.nome || '').trim().slice(0, 80);
    doc.apelido = String(doc.apelido || '').trim().slice(0, 80);
    if (doc.role && !ROLES.includes(doc.role)) doc.role = '';
    if (doc.retratoLink && !/^https:\/\/[^\s"'<>]+$/.test(String(doc.retratoLink))) doc.retratoLink = '';
    if (doc.retratoLink) doc.retratoLink = String(doc.retratoLink).slice(0, 500);
    return doc;
  }
  // Avanço: o total gasto não pode passar do total de Pontos de Melhoria que o mestre deu.
  const ipGranted = doc => ((doc.ip && doc.ip.ganhos) || []).reduce((sum, entry) => sum + (Number(entry.qtd) || 0), 0);
  const ipSpent = doc => (Array.isArray(doc.avanco) ? doc.avanco : []).reduce((sum, entry) => sum + Math.max(0, Number(entry.custo) || 0), 0);

  // ---------------- Regras da loja inicial ----------------
  // O que a loja de criação esconde. Todos leem; só o mestre muda.
  const SHOP_TAGS = ['exotica', 'excelente', 'borgware', 'municao-rara', 'raro'];
  const DEFAULT_SHOP_RULES = { teto: 1000, esconder: [...SHOP_TAGS], liberados: [], bloqueados: [] };
  const shopRulesFile = path.join(dataDir, 'regras-loja.json');
  const readShopRules = () => {
    try { return { ...DEFAULT_SHOP_RULES, ...JSON.parse(fs.readFileSync(shopRulesFile, 'utf8')) }; } catch { return { ...DEFAULT_SHOP_RULES }; }
  };
  const itemIds = list => (Array.isArray(list) ? list : []).map(String).filter(id => /^[a-z0-9_-]+:[a-z0-9-]+$/.test(id)).slice(0, 2000);
  const cleanShopRules = input => ({
    teto: Math.max(0, Math.min(1000000, Math.round(Number(input.teto)) || 0)),
    esconder: (Array.isArray(input.esconder) ? input.esconder : []).filter(tag => SHOP_TAGS.includes(tag)),
    liberados: itemIds(input.liberados),
    bloqueados: itemIds(input.bloqueados)
  });

  // ---------------- Retrato ----------------
  // Imagem enviada em base64 (o navegador já reduz para 512 px). Confere os primeiros bytes, não o nome.
  const portraitDir = () => path.join(charactersDir, 'retratos');
  const imageType = buffer => {
    if (buffer.length > 8 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'png';
    if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
  };
  const portraitFiles = id => { try { return fs.readdirSync(portraitDir()).filter(file => file.startsWith(`${id}.`)); } catch { return []; } };
  const imageTypes = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

  function cors(request, response) {
    const origin = request.headers.origin;
    if (!origin || !foundryOrigins.has(origin)) return {};
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
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

    // Regras da loja inicial: todos leem, só o mestre grava.
    if (pathname === '/api/loja/regras') {
      if (method === 'GET') return json(response, 200, { regras: readShopRules(), etiquetas: SHOP_TAGS });
      if (method === 'PUT') {
        if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre muda as regras da loja.' });
        const rules = cleanShopRules(await readJson(request));
        await writeJsonAtomic(shopRulesFile, rules);
        return json(response, 200, { regras: rules });
      }
      return json(response, 405, { erro: 'Método não permitido.' });
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
      // Retrato: qualquer um vê (é o rosto do personagem); o dono ou o mestre trocam.
      if (extra === 'retrato') {
        if (method === 'GET') {
          const [file] = portraitFiles(id);
          if (!file) return reply(404, { erro: 'Sem retrato.' });
          const data = fs.readFileSync(path.join(portraitDir(), file));
          response.writeHead(200, { ...headers, 'Content-Type': imageTypes[path.extname(file).slice(1)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'private, max-age=60' });
          return response.end(data);
        }
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        if (method === 'POST') {
          const { imagem } = await readJson(request, 3 * 1024 * 1024);
          const base64 = String(imagem || '').replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64, 'base64');
          if (buffer.length > 2 * 1024 * 1024) return reply(413, { erro: 'Imagem grande demais (até 2 MB).' });
          const type = imageType(buffer);
          if (!type) return reply(400, { erro: 'Envie uma imagem PNG, JPEG ou WebP.' });
          fs.mkdirSync(portraitDir(), { recursive: true });
          for (const old of portraitFiles(id)) fs.rmSync(path.join(portraitDir(), old), { force: true });
          fs.writeFileSync(path.join(portraitDir(), `${id}.${type}`), buffer);
          stored.retrato = `api/personagens/${id}/retrato?v=${Date.now()}`;
          await writeJsonAtomic(fileOf(id), stored);
          return reply(200, { retrato: stored.retrato });
        }
        if (method === 'DELETE') {
          for (const old of portraitFiles(id)) fs.rmSync(path.join(portraitDir(), old), { force: true });
          stored.retrato = null;
          await writeJsonAtomic(fileOf(id), stored);
          return reply(200, { retrato: null });
        }
        return reply(405, { erro: 'Método não permitido.' });
      }
      // Enviar para o mestre: marca o personagem como pronto para importar. Também não muda a versão.
      if (extra === 'enviar') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        stored.envio = { quando: new Date().toISOString(), versao: stored.versao };
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { envio: stored.envio });
      }
      // Pontos de Melhoria: só o mestre dá (ou tira, com número negativo).
      if (extra === 'ip') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre dá Pontos de Melhoria.' });
        const input = await readJson(request);
        const amount = Math.round(Number(input.qtd));
        if (!amount || Math.abs(amount) > 1000) return reply(400, { erro: 'Quantidade entre −1000 e 1000.' });
        const granted = [...((stored.ip && stored.ip.ganhos) || []), { qtd: amount, motivo: String(input.motivo || '').trim().slice(0, 200), quando: new Date().toISOString() }];
        if (granted.reduce((sum, entry) => sum + entry.qtd, 0) < ipSpent(stored)) return reply(400, { erro: 'Não dá para tirar mais do que sobra: o jogador já gastou esses pontos.' });
        stored.ip = { ganhos: granted };
        stored.versao += 1; // o avanço muda o que o jogador pode fazer: quem estiver com a ficha aberta recarrega
        stored.atualizado = new Date().toISOString();
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { ip: stored.ip, versao: stored.versao });
      }
      if (extra) return reply(404, { erro: 'Rota não encontrada.' });

      if (method === 'GET') return reply(200, { personagem: canEdit(identity, stored) ? { ...stored, donoNome: ownerName(accounts, stored.dono) } : publicView(stored, accounts) });
      if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
      if (method === 'PUT') {
        const input = await readJson(request);
        // Alguém salvou antes (outra aba, outro aparelho): devolve a versão atual em vez de apagar o trabalho.
        if (Number(input.versao) !== stored.versao) return reply(409, { erro: 'O personagem mudou em outro lugar. Recarregue para ver a versão mais nova.', personagem: stored });
        const kept = Object.fromEntries(['foundry', 'envio', 'retrato', 'ip'].map(field => [field, stored[field] || null]));
        const doc = { ...cleanCharacter(input), ...kept, id, dono: identity.papel === 'mestre' && input.dono !== undefined ? String(input.dono) : stored.dono, versao: stored.versao + 1, criado: stored.criado, atualizado: new Date().toISOString() };
        if (ipSpent(doc) > ipGranted(doc)) return reply(400, { erro: 'Pontos de Melhoria insuficientes para esse avanço.' });
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
    if (!/^\/api\/(eu|entrar|sair|contas|personagens|loja)(\/|$)/.test(pathname)) return false;
    try {
      await route(request, response, pathname);
    } catch (error) {
      if (!response.headersSent) json(response, error.status || 500, { erro: error.status ? error.message : `Erro no servidor: ${error.message}` });
    }
    return true;
  };
};
