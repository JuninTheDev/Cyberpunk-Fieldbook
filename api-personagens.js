// API dos personagens dos jogadores, dos códigos de acesso e das campanhas. Carregada pelo server.js.
//
// Quem é quem:
//   mestre    → este computador (ou o cookie do GM_KEY), como no resto da wiki: vê todas as campanhas;
//   jogador   → entrou com o código que o mestre criou (cookie "jogador"): vê só as campanhas em que joga;
//   visitante → qualquer outro: não vê personagem nem campanha nenhuma (só as regras, que são arquivos).
// Dentro de uma campanha, cada jogador vê os próprios personagens inteiros e os dos outros resumidos (nome, apelido,
// Role e retrato). De outra campanha, nada: o servidor responde como se não existisse.
//
// Arquivos: contas-jogadores.json (códigos; nunca vai para os jogadores nem para o git), personagens/<id>.json, um
// por personagem (apagar move para personagens/apagados/), e o que api-campanhas.js guarda de cada campanha.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createCampaigns } = require('./api-campanhas');

const ROLES = ['face', 'solo', 'netrunner', 'corpo', 'tech', 'medtech', 'media', 'lawman', 'nomad'];
const MAX_BODY = 300 * 1024;
const MAX_PUBLISH = 2_000_000;
const MAX_PER_PLAYER = 20;
module.exports = function createCharacterApi({ dataDir, legacyDir = dataDir, docsDir = '', isGameMaster, send, writeJsonAtomic, sameSecret, foundryUrl = '', catalogFile = '' }) {
  const campaigns = createCampaigns({ dataDir, legacyDir, writeJsonAtomic });
  // Documentos do mestre: os .md de documentos/<id da campanha>/ no projeto (vêm pelo git, como o resto da wiki).
  // documentos/night-city/ é de todas as campanhas. O título é o primeiro "# " do arquivo.
  function documentsOf(folder) {
    let files = [];
    try { files = fs.readdirSync(path.join(docsDir, folder)).filter(file => /^[\w.-]+\.md$/i.test(file)).sort((a, b) => a.localeCompare(b, 'pt')); } catch { return []; }
    return files.map(file => {
      let head = '';
      try { head = fs.readFileSync(path.join(docsDir, folder, file), 'utf8').slice(0, 600); } catch { /* sem leitura: o nome do arquivo serve */ }
      const title = (head.match(/^﻿?#\s+(.+)$/m) || [])[1];
      return { arquivo: `documentos/${folder}/${file}`, titulo: (title || file.replace(/\.md$/i, '').replace(/[-_]+/g, ' ')).trim().slice(0, 120) };
    });
  }
  // Catálogo da loja (loja-catalogo.js, o mesmo que a wiki carrega): o servidor confere os pedidos e calcula o total.
  let catalogCache = { mtime: 0, items: new Map() };
  function catalog() {
    try {
      const mtime = fs.statSync(catalogFile).mtimeMs;
      if (mtime !== catalogCache.mtime) {
        const text = fs.readFileSync(catalogFile, 'utf8');
        const data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        catalogCache = { mtime, items: new Map(data.itens.map(item => [item.id, item])) };
      }
    } catch { /* sem catálogo: nenhum pedido passa */ }
    return catalogCache.items;
  }
  // O importador do Foundry roda no navegador do mestre, em outra origem: só essas origens recebem CORS.
  // Com credenciais: no servidor, o Foundry (mesa.dominio) manda o cookie do mestre da wiki (wiki.dominio).
  const originOf = url => { try { return new URL(url).origin; } catch { return ''; } };
  const foundryOrigins = new Set(['http://localhost:30000', 'http://127.0.0.1:30000', originOf(foundryUrl), ...String(process.env.FOUNDRY_ORIGIN || '').split(',').map(origin => origin.trim())].filter(Boolean));
  const accountsFile = path.join(dataDir, 'contas-jogadores.json');
  const charactersDir = path.join(dataDir, 'personagens');
  const json = (response, status, data, headers = {}) => send(response, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers });

  // ---------------- Contas ----------------
  // Cada código joga numa ou mais campanhas. Os de antes das campanhas são do Protocolo Morana.
  const withCampaigns = account => ({ ...account, campanhas: Array.isArray(account.campanhas) ? [...new Set(account.campanhas.map(String))] : [campaigns.first] });
  const readAccounts = () => {
    try { return (JSON.parse(fs.readFileSync(accountsFile, 'utf8')).contas || []).map(withCampaigns); } catch { return []; }
  };
  const saveAccounts = accounts => writeJsonAtomic(accountsFile, { contas: accounts });
  // Código fácil de ditar: sem 0/O, 1/I/L.
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const randomFrom = (chars, length) => Array.from(crypto.randomBytes(length), byte => chars[byte % chars.length]).join('');
  const newCode = () => `NC-${randomFrom(CODE_CHARS, 4)}-${randomFrom(CODE_CHARS, 4)}`;
  const newId = () => randomFrom('abcdefghijkmnpqrstuvwxyz23456789', 10);
  const playerCookie = request => decodeURIComponent(((request.headers.cookie || '').match(/(?:^|;\s*)jogador=([^;]+)/) || [])[1] || '');
  const findAccount = code => code ? readAccounts().find(account => sameSecret(account.codigo, code)) : null;

  // campanhas: as que esta pessoa vê (o mestre, todas; o jogador, as do código dele que ainda existem).
  function who(request) {
    const existing = campaigns.list().map(item => item.id);
    if (isGameMaster(request)) return { papel: 'mestre', campanhas: existing };
    const account = findAccount(playerCookie(request));
    return account ? { papel: 'jogador', conta: account, campanhas: account.campanhas.filter(id => existing.includes(id)) } : { papel: 'visitante', campanhas: [] };
  }
  const inCampaign = (identity, id) => identity.campanhas.includes(id);
  // Para os jogadores, cada campanha tem um id público (um pedaço de hash do id) e o "nome para os jogadores": o id e
  // o nome do mestre podem ser segredo (Morana é o vírus da campanha). O mestre usa e recebe os de verdade.
  const publicId = id => crypto.createHash('sha1').update(`fieldbook-campanha:${id}`).digest('hex').slice(0, 12);
  const idFor = (identity, id) => (identity.papel === 'mestre' || !id ? id : publicId(id));
  // O id que veio do navegador (?campanha= ou no corpo) → o de verdade. '' sem pedido; '-' se não existe.
  function realId(value) {
    const text = String(value || '');
    if (!text) return '';
    const list = campaigns.list();
    return (list.find(item => item.id === text) || list.find(item => publicId(item.id) === text) || { id: '-' }).id;
  }
  // Id, nome e cor: o que um jogador sabe de uma campanha dele. O mestre vê também o mundo do Foundry e as contagens.
  const campaignCard = (item, identity) => ({ id: idFor(identity, item.id), nome: identity.papel === 'mestre' ? item.nome : item.nomeJogadores || item.nome, cor: item.cor });
  // Campanha pedida no endereço (?campanha=): a do jogador, se ele joga nela; sem pedido, a primeira dele.
  // undefined = pediu uma que não é dele (ou não existe): a resposta é "não encontrada", nos dois casos.
  function chosenCampaign(identity, wanted) {
    const id = realId(wanted);
    if (!id) return identity.papel === 'mestre' ? campaigns.first : identity.campanhas[0] || null;
    return inCampaign(identity, id) ? id : undefined;
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
  // Crossover no Foundry: o mundo da campanha antiga manda a ficha do ator (personagens/transferencias/<id>.json) e o
  // mundo da campanha nova cria o ator igualzinho. Fica fora do arquivo do personagem (é grande e só o Foundry usa).
  const transferFile = id => path.join(charactersDir, 'transferencias', `${id}.json`);
  const transferInfo = id => { try { const { de, quando, nomeAtor } = JSON.parse(fs.readFileSync(transferFile(id), 'utf8')); return { de, quando, nomeAtor }; } catch { return null; } };
  const validId = id => /^[a-z0-9]{6,16}$/.test(id);
  const readCharacter = id => {
    try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); } catch { return null; }
  };
  const allCharacters = () => {
    try { return fs.readdirSync(charactersDir).filter(file => file.endsWith('.json')).map(file => readCharacter(file.slice(0, -5))).filter(Boolean); } catch { return []; }
  };
  const ownerName = (accounts, id) => (accounts.find(account => account.id === id) || {}).nome || '';
  // Personagem de antes das campanhas: do Protocolo Morana.
  const campaignOf = doc => doc.campanha || campaigns.first;
  // Retrato: o arquivo enviado (servido por esta API) ou um link https colado pelo jogador.
  const portraitOf = doc => doc.retrato || (/^https:\/\/[^\s"'<>]+$/.test(doc.retratoLink || '') ? doc.retratoLink : '');
  // O que os outros jogadores da campanha veem: nome, apelido, Role e retrato. O resto só o dono e o mestre.
  const publicView = (doc, accounts) => ({ id: doc.id, nome: doc.nome || '', apelido: doc.apelido || '', role: doc.role || '', retrato: portraitOf(doc), donoNome: ownerName(accounts, doc.dono), campanha: campaignOf(doc), publico: true });
  const summary = (doc, accounts) => ({ ...publicView(doc, accounts), publico: false, dono: doc.dono, metodo: doc.metodo || '', versao: doc.versao, atualizado: doc.atualizado, foundry: doc.foundry || null, envio: doc.envio || null, estadoFoundry: foundryState(doc), mesa: doc.mesa ? { hp: doc.mesa.hp || null, recebido: doc.mesa.recebido } : null,
    // resolvidos: o que o mestre decidiu (ou o Foundry entregou), para o botão da conta do jogador avisar.
    pedidos: { pendentes: (doc.pedidos || []).filter(item => item.status === 'pendente').length, aprovados: (doc.pedidos || []).filter(item => item.status === 'aprovado').length,
      resolvidos: (doc.pedidos || []).filter(item => ['aprovado', 'recusado', 'entregue'].includes(item.status)).slice(-10).map(item => ({ id: item.id, status: item.status, quando: item.entregue || item.decidido || item.criado, erro: Boolean(item.erro), total: item.total })) },
    ...(foundryState(doc) === 'outra-mesa' ? { transferencia: transferInfo(doc.id) } : {}) });
  // O que cada um pode com um personagem: 'editar' (o mestre; o dono, enquanto jogar na campanha do personagem),
  // 'ver' (os outros jogadores da mesma campanha: o resumo) ou null (nem fica sabendo que ele existe).
  function access(identity, doc) {
    if (identity.papel === 'mestre') return 'editar';
    if (identity.papel !== 'jogador' || !inCampaign(identity, campaignOf(doc))) return null;
    return doc.dono === identity.conta.id ? 'editar' : 'ver';
  }
  const canEdit = (identity, doc) => access(identity, doc) === 'editar';
  // O personagem como sai para esta pessoa: para o jogador, a campanha vai pelo id público, e o histórico de mudanças
  // de campanha fica só com o mestre.
  function forViewer(identity, doc) {
    if (identity.papel === 'mestre' || !doc) return doc;
    const { transferencias: _moves, ...rest } = doc;
    return { ...rest, ...(rest.campanha ? { campanha: idFor(identity, rest.campanha) } : {}), ...(rest.foundry && rest.foundry.campanha ? { foundry: { ...rest.foundry, campanha: idFor(identity, rest.foundry.campanha) } } : {}) };
  }

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
  // o retrato enviado e os Pontos de Melhoria dados pelo mestre (cada um tem a sua rota). Os três últimos
  // a API calcula na resposta e não vão para o arquivo.
  // A campanha (e o histórico de mudanças de campanha) só o mestre muda, pela rota /campanha.
  const SERVER_FIELDS = ['id', 'dono', 'versao', 'criado', 'atualizado', 'foundry', 'envio', 'retrato', 'ip', 'mesa', 'pedidos', 'campanha', 'transferencias', 'estadoFoundry', 'donoNome', 'publico'];
  // O que o jogador não muda mais pela wiki depois que o personagem foi importado no Foundry.
  const LOCKED_AFTER_IMPORT = ['role', 'especializacao', 'metodo', 'stats', 'sorteio', 'pericias', 'tipos', 'extras', 'lingua', 'casa', 'kitNet', 'quickhacks', 'escolhas', 'itens',
    'habilidades', 'oficina', 'montagem', 'moradia', 'estiloVida', 'traumaTeam', 'estiloModa'];
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
  // Impressão digital da ficha que vai para o Foundry (o `resultado`, sem as pendências). Serve para saber
  // se algo mudou depois do envio ou da importação: a versão sobe até quando o jogador só troca de passo.
  // O retrato entra só quando existe (as impressões gravadas antes dele continuam valendo).
  const resultHash = doc => crypto.createHash('sha1').update(JSON.stringify({ ...(doc.resultado || {}), pendencias: undefined, ...(portraitOf(doc) ? { retrato: portraitOf(doc) } : {}) })).digest('hex').slice(0, 16);
  // novo · enviado · enviado-mudou (mudou depois do envio) · importado · mudou (depois da importação) · avisado (mudou e foi enviado de novo)
  // · outra-mesa (importado no Foundry de outra campanha e depois mudou de campanha: o Foundry desta ainda não tem)
  function foundryState(doc) {
    const now = resultHash(doc);
    if (doc.foundry && doc.foundry.importado && doc.foundry.campanha && doc.foundry.campanha !== campaignOf(doc)) return 'outra-mesa';
    if (doc.foundry && doc.foundry.importado) {
      if (!doc.foundry.resultadoHash || doc.foundry.resultadoHash === now) return 'importado';
      const resent = doc.envio && new Date(doc.envio.quando) > new Date(doc.foundry.sincronizado || doc.foundry.importado) && doc.envio.resultadoHash === now;
      return resent ? 'avisado' : 'mudou';
    }
    if (doc.envio) return doc.envio.resultadoHash === now ? 'enviado' : 'enviado-mudou';
    return 'novo';
  }
  // Avanço: o total gasto não pode passar do total de Pontos de Melhoria que o mestre deu.
  const ipGranted = doc => ((doc.ip && doc.ip.ganhos) || []).reduce((sum, entry) => sum + (Number(entry.qtd) || 0), 0);
  const ipSpent = doc => (Array.isArray(doc.avanco) ? doc.avanco : []).reduce((sum, entry) => sum + Math.max(0, Number(entry.custo) || 0), 0);

  // ---------------- Regras da loja inicial ----------------
  // O que a loja de criação esconde, em cada campanha. Os jogadores da campanha leem; só o mestre muda.
  // Campanha sem regras gravadas usa as do Protocolo Morana (a campanha nova começa com uma cópia delas).
  const SHOP_TAGS = ['exotica', 'excelente', 'borgware', 'municao-rara', 'raro'];
  const DEFAULT_SHOP_RULES = { teto: 1000, esconder: [...SHOP_TAGS], liberados: [], bloqueados: [] };
  const readShopRules = id => ({ ...DEFAULT_SHOP_RULES, ...(id ? campaigns.readShopRules(id) || campaigns.readShopRules(campaigns.first) || {} : {}) });
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
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
  }

  // ---------------- Rotas ----------------
  async function route(request, response, pathname) {
    const method = request.method;
    const identity = who(request);
    const query = new URL(request.url, 'http://localhost').searchParams;

    if (pathname === '/api/eu' && method === 'GET') {
      return json(response, 200, { papel: identity.papel, jogador: identity.conta ? { id: identity.conta.id, nome: identity.conta.nome } : null, campanhas: identity.campanhas.map(id => campaignCard(campaigns.get(id), identity)) });
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

    // Regras da loja inicial (?campanha=): os jogadores da campanha leem, só o mestre grava.
    // O visitante (ainda sem código) lê o padrão, igual para qualquer campanha pedida.
    if (pathname === '/api/loja/regras') {
      const id = identity.papel === 'visitante' ? null : chosenCampaign(identity, query.get('campanha'));
      if (id === undefined) return json(response, 404, { erro: 'Campanha não encontrada.' });
      if (method === 'GET') return json(response, 200, { regras: readShopRules(id), etiquetas: SHOP_TAGS, campanha: idFor(identity, id) });
      if (method === 'PUT') {
        if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre muda as regras da loja.' });
        const rules = cleanShopRules(await readJson(request));
        await campaigns.writeShopRules(id, rules);
        return json(response, 200, { regras: rules, campanha: id });
      }
      return json(response, 405, { erro: 'Método não permitido.' });
    }

    // Códigos dos jogadores: só o mestre. Cada código joga numa ou mais campanhas (campanhas: [ids]).
    if (pathname === '/api/contas' || pathname.startsWith('/api/contas/')) {
      if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre gerencia os códigos.' });
      const accounts = readAccounts();
      const existing = campaigns.list().map(item => item.id);
      const campaignList = value => [...new Set((Array.isArray(value) ? value : []).map(String))].filter(id => existing.includes(id));
      if (pathname === '/api/contas' && method === 'GET') return json(response, 200, { contas: accounts });
      if (pathname === '/api/contas' && method === 'POST') {
        const input = await readJson(request);
        const clean = String(input.nome || '').trim().slice(0, 60);
        if (!clean) return json(response, 400, { erro: 'Dê um nome ao jogador.' });
        const chosen = campaignList(input.campanhas);
        const account = { id: newId(), nome: clean, codigo: newCode(), criado: new Date().toISOString(), campanhas: chosen.length ? chosen : [campaigns.first] };
        await saveAccounts([...accounts, account]);
        return json(response, 201, { conta: account });
      }
      const id = pathname.slice('/api/contas/'.length);
      const account = accounts.find(item => item.id === id);
      if (!account) return json(response, 404, { erro: 'Conta não encontrada.' });
      // Em que campanhas o código joga. Sem nenhuma, o certo é revogar (DELETE).
      if (method === 'PUT') {
        const input = await readJson(request);
        const chosen = campaignList(input.campanhas);
        if (!chosen.length) return json(response, 400, { erro: 'O jogador precisa estar em pelo menos uma campanha. Para tirar o acesso, revogue o código.' });
        account.campanhas = chosen;
        await saveAccounts(accounts);
        return json(response, 200, { conta: account });
      }
      if (method === 'DELETE') {
        await saveAccounts(accounts.filter(item => item.id !== id));
        return json(response, 200, { ok: true });
      }
      return json(response, 405, { erro: 'Método não permitido.' });
    }

    // ---------------- Campanhas ----------------
    // A lista: o mestre vê todas (com o mundo do Foundry e quantos personagens e jogadores cada uma tem); o jogador,
    // só as dele; o visitante, nenhuma. Criar, mudar e apagar: só o mestre.
    if (pathname === '/api/campanhas' || pathname.startsWith('/api/campanhas/')) {
      const gm = identity.papel === 'mestre';
      // O Foundry do mestre (outra origem) lê a lista para saber a campanha do mundo.
      const corsHeaders = cors(request, response);
      if (method === 'OPTIONS') { response.writeHead(204, corsHeaders); return response.end(); }
      const gmCard = item => {
        const characters = allCharacters().filter(doc => campaignOf(doc) === item.id).length;
        const players = readAccounts().filter(account => account.campanhas.includes(item.id)).length;
        return { ...item, personagens: characters, jogadores: players, documentos: documentsOf(item.id) };
      };
      if (pathname === '/api/campanhas') {
        if (method === 'GET') return json(response, 200, { campanhas: identity.campanhas.map(id => campaigns.get(id)).map(item => gm ? gmCard(item) : campaignCard(item, identity)), ...(gm ? { primeira: campaigns.first, compartilhados: documentsOf('night-city') } : {}) }, corsHeaders);
        if (method !== 'POST') return json(response, 405, { erro: 'Método não permitido.' });
        if (!gm) return json(response, 403, { erro: 'Só o mestre cria campanhas.' });
        const campaign = await campaigns.create(await readJson(request));
        // Regras próprias, começando como as do Protocolo Morana.
        await campaigns.writeShopRules(campaign.id, readShopRules(campaigns.first));
        return json(response, 201, { campanha: gmCard(campaign) });
      }
      if (!gm) return json(response, 403, { erro: 'Só o mestre.' });
      const [id, part] = pathname.slice('/api/campanhas/'.length).split('/');
      const campaign = campaigns.get(id);
      if (!campaign) return json(response, 404, { erro: 'Campanha não encontrada.' });
      // O Publicar da campanha: o mestre lê tudo (com o que está escondido) e grava. O que vai para os jogadores o
      // servidor calcula: só os itens revelados, sem as notas do mestre.
      if (part === 'publicar') {
        if (method === 'GET') { const { mestre, atualizado } = campaigns.readPublish(id); return json(response, 200, { ...mestre, atualizado }); }
        if (method !== 'POST') return json(response, 405, { erro: 'Use POST.' });
        const { mestre } = await readJson(request, MAX_PUBLISH);
        const atualizado = await campaigns.writePublish(id, mestre);
        return json(response, 200, { ok: true, atualizado });
      }
      if (part) return json(response, 404, { erro: 'Rota não encontrada.' });
      if (method === 'GET') return json(response, 200, { campanha: gmCard(campaign) });
      if (method === 'PUT') return json(response, 200, { campanha: gmCard(await campaigns.update(id, await readJson(request))) });
      if (method === 'DELETE') {
        const card = gmCard(campaign);
        if (campaigns.list().length < 2) return json(response, 400, { erro: 'Esta é a única campanha.' });
        if (card.personagens || card.jogadores) return json(response, 400, { erro: `A campanha ainda tem ${card.personagens} personagem(ns) e ${card.jogadores} jogador(es). Mova os personagens e tire os jogadores antes de apagar.` });
        await campaigns.remove(id);
        return json(response, 200, { ok: true });
      }
      return json(response, 405, { erro: 'Método não permitido.' });
    }

    // O que os jogadores de uma campanha veem (?campanha=): o que o mestre publicou nela e as Notícias de Night City.
    // De campanha que não é sua, "não encontrada"; sem código, nada.
    if (pathname === '/api/visao') {
      if (method !== 'GET') return json(response, 405, { erro: 'Use GET.' });
      if (identity.papel === 'visitante') return json(response, 401, { erro: 'Entre com o seu código para ver a campanha.' });
      const id = chosenCampaign(identity, query.get('campanha'));
      if (!id) return json(response, 404, { erro: 'Campanha não encontrada.' });
      const view = campaigns.readPublish(id);
      const news = campaigns.readNews();
      return json(response, 200, { ...view.publicado, campanha: campaignCard(campaigns.get(id), identity), nightCity: news.publicado, atualizado: [view.atualizado, news.atualizado].filter(Boolean).sort().pop() || null });
    }
    // Notícias de Night City: o mural que todas as campanhas veem. Só o mestre lê o rascunho e publica.
    if (pathname === '/api/night-city') {
      if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre.' });
      if (method === 'GET') { const { mestre, atualizado } = campaigns.readNews(); return json(response, 200, { noticias: mestre, atualizado }); }
      if (method !== 'POST') return json(response, 405, { erro: 'Use POST.' });
      const { noticias } = await readJson(request, MAX_PUBLISH);
      return json(response, 200, { ok: true, atualizado: await campaigns.writeNews(noticias) });
    }

    if (pathname === '/api/personagens' || pathname.startsWith('/api/personagens/')) {
      const headers = cors(request, response);
      if (method === 'OPTIONS') { response.writeHead(204, headers); return response.end(); }
      const accounts = readAccounts();
      const reply = (status, data) => json(response, status, data, headers);
      // Sem acesso: o visitante é chamado a entrar; o jogador de outra campanha ouve que o personagem não existe.
      const hidden = () => identity.papel === 'visitante' ? reply(401, { erro: 'Entre com o seu código.' }) : reply(404, { erro: 'Personagem não encontrado.' });

      if (pathname === '/api/personagens') {
        if (method === 'GET') {
          // ?campanha= filtra (o mestre, numa campanha; o jogador, numa das dele). Sem filtro: tudo o que pode ver.
          const wanted = realId(query.get('campanha'));
          const list = allCharacters().filter(doc => access(identity, doc) && (!wanted || campaignOf(doc) === wanted))
            .map(doc => forViewer(identity, canEdit(identity, doc) ? { ...summary(doc, accounts), meu: identity.papel === 'jogador' } : publicView(doc, accounts)));
          list.sort((a, b) => Number(Boolean(b.meu)) - Number(Boolean(a.meu)) || a.nome.localeCompare(b.nome, 'pt'));
          return reply(200, { personagens: list, papel: identity.papel });
        }
        if (method === 'POST') {
          if (identity.papel === 'visitante') return reply(401, { erro: 'Entre com o seu código para criar um personagem.' });
          const input = await readJson(request);
          // A campanha: a pedida (o jogador, só uma das dele) ou a primeira.
          const campanha = chosenCampaign(identity, input.campanha);
          if (campanha === undefined) return reply(404, { erro: 'Campanha não encontrada.' });
          if (!campanha) return reply(403, { erro: 'Você ainda não está em nenhuma campanha. Fale com o mestre.' });
          const dono = identity.papel === 'mestre' ? String(input.dono || '') : identity.conta.id;
          if (identity.papel === 'jogador' && allCharacters().filter(doc => doc.dono === dono).length >= MAX_PER_PLAYER) return reply(400, { erro: `Limite de ${MAX_PER_PLAYER} personagens por jogador.` });
          const now = new Date().toISOString();
          const doc = { ...cleanCharacter(input), id: newId(), dono, campanha, versao: 1, criado: now, atualizado: now, foundry: null };
          fs.mkdirSync(charactersDir, { recursive: true });
          await writeJsonAtomic(fileOf(doc.id), doc);
          return reply(201, { personagem: forViewer(identity, doc) });
        }
        return reply(405, { erro: 'Método não permitido.' });
      }

      const [id, extra] = pathname.slice('/api/personagens/'.length).split('/');
      if (identity.papel === 'visitante') return hidden();
      if (!validId(id)) return reply(404, { erro: 'Personagem não encontrado.' });
      const stored = readCharacter(id);
      if (!stored) return reply(404, { erro: 'Personagem não encontrado.' });
      const level = access(identity, stored);
      if (!level) return hidden();
      const gmOnly = () => reply(403, { erro: 'Só o mestre.' });

      // Volta do Foundry: o importador grava o ator e o que já entregou. Não muda a versão (não atrapalha quem está editando).
      // campanha: a do mundo que importou (o Foundry de cada campanha manda a sua; sem ela, a do personagem agora).
      if (extra === 'foundry') {
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT.' });
        if (identity.papel !== 'mestre') return gmOnly();
        const input = cleanValue(await readJson(request));
        // O mundo de outra campanha (o antigo, depois de um crossover) não grava mais neste personagem.
        if (input.campanha && realId(input.campanha) !== campaignOf(stored)) return reply(409, { erro: `${stored.nome || 'Este personagem'} agora é de outra campanha na wiki: importe no mundo dela.`, campanha: campaignOf(stored) });
        const now = new Date().toISOString();
        const sameActor = stored.foundry && stored.foundry.importado && stored.foundry.ator === String(input.ator || '');
        const table = campaigns.get(realId(input.campanha)) ? realId(input.campanha) : campaignOf(stored);
        const sameTable = sameActor && (stored.foundry.campanha || campaignOf(stored)) === table;
        stored.foundry = { ator: String(input.ator || ''), nomeAtor: String(input.nomeAtor || ''), campanha: table, importado: sameTable ? stored.foundry.importado : String(input.importado || now), sincronizado: now, versao: Number(input.versao) || stored.versao, entregues: Array.isArray(input.entregues) ? input.entregues.map(String) : [], resultadoHash: resultHash(stored) };
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { foundry: stored.foundry, estadoFoundry: foundryState(stored) });
      }
      // Crossover: o mestre leva o personagem para outra campanha. O dono passa a jogar nela também (sem sair das
      // que já tinha). O ator do Foundry fica no mundo antigo; o estado "outra-mesa" avisa o Foundry da campanha nova.
      if (extra === 'campanha') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre muda um personagem de campanha.' });
        const target = campaigns.get(String((await readJson(request)).campanha || ''));
        if (!target) return reply(400, { erro: 'Campanha não encontrada.' });
        const from = campaignOf(stored);
        if (target.id === from) return reply(400, { erro: 'O personagem já está nesta campanha.' });
        if (stored.foundry && stored.foundry.importado && !stored.foundry.campanha) stored.foundry.campanha = from;
        stored.campanha = target.id;
        stored.transferencias = [...(Array.isArray(stored.transferencias) ? stored.transferencias : []), { de: from, para: target.id, quando: new Date().toISOString() }].slice(-20);
        const owner = accounts.find(account => account.id === stored.dono);
        const joined = Boolean(owner && !owner.campanhas.includes(target.id));
        if (joined) { owner.campanhas.push(target.id); await saveAccounts(accounts); }
        // Uma ficha mandada numa mudança anterior não vale para esta: o mundo antigo manda de novo.
        fs.rmSync(transferFile(id), { force: true });
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { personagem: summary(stored, accounts), donoEntrou: joined ? owner.nome : null });
      }
      // Pedidos da campanha (depois da importação): o jogador pede itens do catálogo, o mestre aprova ou recusa, e o
      // Foundry do mestre entrega (cria os itens, desconta o dinheiro) e marca como entregue. O servidor confere cada
      // item no catálogo e calcula o total; ninguém escolhe o preço. Não muda a versão do personagem.
      if (extra === 'pedidos') {
        const pedidos = Array.isArray(stored.pedidos) ? stored.pedidos : [];
        const [, , pid, action] = pathname.slice('/api/personagens/'.length).split('/');
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        const save = async () => { stored.pedidos = pedidos.slice(-50); await writeJsonAtomic(fileOf(id), stored); };
        if (!pid) {
          if (method === 'GET') return reply(200, { pedidos });
          if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
          if (!(stored.foundry && stored.foundry.importado)) return reply(400, { erro: 'Antes do Foundry, as compras são na loja inicial.' });
          if (pedidos.filter(item => item.status === 'pendente').length >= 5) return reply(400, { erro: 'Já há 5 pedidos esperando o mestre.' });
          const input = await readJson(request);
          const lines = Array.isArray(input.itens) ? input.itens.slice(0, 30) : [];
          const items = catalog();
          const pedidoId = newId();
          const itens = [];
          for (const [index, line] of lines.entries()) {
            const item = items.get(String(line.id || ''));
            const qtd = Math.round(Number(line.qtd));
            if (!item) return reply(400, { erro: `Item que não existe no catálogo: ${String(line.id || '').slice(0, 80)}` });
            if (!(qtd >= 1 && qtd <= 1000)) return reply(400, { erro: `Quantidade inválida para ${item.nome}.` });
            // Onde instalar e qual munição: um item que já está na ficha (o uid dele) ou outra linha deste pedido ("@2").
            const ref = value => {
              const text = String(value || '');
              const inOrder = text.match(/^@(\d{1,2})$/);
              if (inOrder) return Number(inOrder[1]) < lines.length && Number(inOrder[1]) !== index ? `pedido:${pedidoId}:${inOrder[1]}` : '';
              return /^[\w:.-]{1,80}$/.test(text) ? text : '';
            };
            itens.push({ uid: `pedido:${pedidoId}:${index}`, id: item.id, nome: item.nome, qtd, preco: item.preco, lote: item.lote || 1, foundry: item.foundry, cat: item.cat, cyber: Boolean(item.cyber), em: ref(line.em), municao: ref(line.municao) });
          }
          if (!itens.length) return reply(400, { erro: 'O pedido está vazio.' });
          const total = itens.reduce((sum, line) => sum + line.preco * (line.lote > 1 ? line.qtd / line.lote : line.qtd), 0);
          const pedido = { id: pedidoId, criado: new Date().toISOString(), status: 'pendente', itens, total: Math.round(total), nota: String(input.nota || '').trim().slice(0, 300), por: identity.papel };
          pedidos.push(pedido);
          await save();
          return reply(201, { pedido });
        }
        const pedido = pedidos.find(item => item.id === pid);
        if (!pedido) return reply(404, { erro: 'Pedido não encontrado.' });
        if (method !== 'POST' && method !== 'PUT') return reply(405, { erro: 'Use POST.' });
        const now = new Date().toISOString();
        if (action === 'cancelar') {
          if (pedido.status !== 'pendente') return reply(400, { erro: 'Só dá para cancelar um pedido que ainda espera o mestre.' });
          Object.assign(pedido, { status: 'cancelado', decidido: now });
        } else {
          if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre.' });
          const input = await readJson(request).catch(() => ({}));
          if (action === 'aprovar') {
            // Aprovar de novo um aprovado que deu erro (faltou dinheiro na mesa) limpa o erro: o Foundry tenta outra vez.
            if (!(pedido.status === 'pendente' || (pedido.status === 'aprovado' && pedido.erro))) return reply(400, { erro: 'Este pedido não está esperando.' });
            Object.assign(pedido, { status: 'aprovado', decidido: now, erro: '' });
          } else if (action === 'recusar') {
            if (!['pendente', 'aprovado'].includes(pedido.status)) return reply(400, { erro: 'Este pedido já foi resolvido.' });
            Object.assign(pedido, { status: 'recusado', decidido: now, motivo: String(input.motivo || '').trim().slice(0, 300) });
          } else if (action === 'entregue') {
            if (!['pendente', 'aprovado'].includes(pedido.status)) return reply(400, { erro: 'Este pedido já foi resolvido.' });
            Object.assign(pedido, { status: 'entregue', entregue: now, decidido: pedido.decidido || now, avisos: (Array.isArray(input.avisos) ? input.avisos : []).map(String).slice(0, 20), erro: '' });
          } else if (action === 'erro') {
            // O Foundry não conseguiu entregar (dinheiro insuficiente na mesa, por exemplo): fica aprovado, com o motivo.
            pedido.erro = String(input.erro || '').slice(0, 300);
          } else return reply(404, { erro: 'Ação desconhecida.' });
        }
        await save();
        return reply(200, { pedido });
      }
      // Na mesa: o estado do ator no Foundry (HP, Humanidade, dinheiro, itens…), mandado pelo módulo do Foundry do
      // mestre a cada mudança. Depois da importação o Foundry manda; a ficha da wiki mostra isto. Não muda a versão.
      if (extra === 'mesa') {
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre.' });
        const input = cleanValue(await readJson(request));
        // Depois de um crossover, o mundo antigo para de mandar a ficha (a da mesa nova é que vale).
        if (input.campanha && realId(input.campanha) !== campaignOf(stored)) return reply(409, { erro: `${stored.nome || 'Este personagem'} agora é de outra campanha na wiki.`, campanha: campaignOf(stored) });
        delete input.campanha;
        stored.mesa = { ...input, recebido: new Date().toISOString() };
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { recebido: stored.mesa.recebido });
      }
      // A ficha do ator para o crossover: o mundo antigo manda (PUT, depois que o personagem mudou de campanha) e o mundo
      // novo lê (GET) para criar o ator como estava. Só o mestre; o que vem é o ator do Foundry inteiro (até 4 MB).
      if (extra === 'ator') {
        if (identity.papel !== 'mestre') return gmOnly();
        if (method === 'GET') {
          try { return reply(200, JSON.parse(fs.readFileSync(transferFile(id), 'utf8'))); } catch { return reply(404, { erro: 'O mundo da campanha antiga ainda não mandou a ficha deste personagem.' }); }
        }
        // O mundo novo já criou o ator: a ficha da transferência não serve mais.
        if (method === 'DELETE') { fs.rmSync(transferFile(id), { force: true }); return reply(200, { ok: true }); }
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT, GET ou DELETE.' });
        const input = await readJson(request, 4 * 1024 * 1024);
        const from = realId(input.campanha);
        if (!campaigns.get(from) || from === campaignOf(stored)) return reply(400, { erro: 'Só o mundo da campanha antiga manda a ficha, depois que o personagem muda de campanha.' });
        if (!input.ator || typeof input.ator !== 'object' || input.ator.type !== 'character') return reply(400, { erro: 'Mande o ator do Foundry (actor.toObject()).' });
        fs.mkdirSync(path.dirname(transferFile(id)), { recursive: true });
        await writeJsonAtomic(transferFile(id), { de: from, para: campaignOf(stored), quando: new Date().toISOString(), nomeAtor: String(input.ator.name || '').slice(0, 120), ator: input.ator });
        return reply(200, { transferencia: transferInfo(id) });
      }
      // Retrato: quem joga na campanha do personagem vê (é o rosto dele); o dono ou o mestre trocam.
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
        stored.envio = { quando: new Date().toISOString(), versao: stored.versao, resultadoHash: resultHash(stored) };
        await writeJsonAtomic(fileOf(id), stored);
        return reply(200, { envio: stored.envio, estadoFoundry: foundryState(stored) });
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

      if (method === 'GET') return reply(200, { personagem: forViewer(identity, canEdit(identity, stored) ? { ...stored, campanha: campaignOf(stored), donoNome: ownerName(accounts, stored.dono), estadoFoundry: foundryState(stored) } : publicView(stored, accounts)) });
      if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
      if (method === 'PUT') {
        const input = await readJson(request);
        // Alguém salvou antes (outra aba, outro aparelho): devolve a versão atual em vez de apagar o trabalho.
        if (Number(input.versao) !== stored.versao) return reply(409, { erro: 'O personagem mudou em outro lugar. Recarregue para ver a versão mais nova.', personagem: forViewer(identity, stored) });
        const kept = Object.fromEntries(['foundry', 'envio', 'retrato', 'ip', 'mesa', 'pedidos', 'transferencias'].map(field => [field, stored[field] || null]));
        const doc = { ...cleanCharacter(input), ...kept, id, dono: identity.papel === 'mestre' && input.dono !== undefined ? String(input.dono) : stored.dono, campanha: campaignOf(stored), versao: stored.versao + 1, criado: stored.criado, atualizado: new Date().toISOString() };
        // Depois de ir para o Foundry, o Foundry manda: o jogador só muda nome, apelido, aparência, notas, retrato e
        // Lifepath. O resto (e o resultado que o Foundry importa, menos o Lifepath) fica como estava.
        if (stored.foundry && stored.foundry.importado && identity.papel !== 'mestre') {
          for (const field of LOCKED_AFTER_IMPORT) doc[field] = stored[field] === undefined ? doc[field] : stored[field];
          if (stored.resultado) doc.resultado = { ...stored.resultado, lifepath: (input.resultado && input.resultado.lifepath) || stored.resultado.lifepath };
        }
        if (ipSpent(doc) > ipGranted(doc)) return reply(400, { erro: 'Pontos de Melhoria insuficientes para esse avanço.' });
        await writeJsonAtomic(fileOf(id), doc);
        return reply(200, { personagem: forViewer(identity, { ...doc, estadoFoundry: foundryState(doc) }) });
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
  async function handle(request, response, pathname) {
    if (!ROUTES.test(pathname)) return false;
    try {
      await route(request, response, pathname);
    } catch (error) {
      if (!response.headersSent) json(response, error.status || 500, { erro: error.status ? error.message : `Erro no servidor: ${error.message}` });
    }
    return true;
  }
  // O server.js usa quem é quem e a lista de campanhas para a barra da mesa (/api/estado).
  handle.who = who;
  handle.campaigns = campaigns;
  handle.campaignCard = campaignCard;
  return handle;
};
const ROUTES = /^\/api\/(eu|entrar|sair|contas|personagens|loja|campanhas|visao|night-city)(\/|$)/;
module.exports.ROUTES = ROUTES;
