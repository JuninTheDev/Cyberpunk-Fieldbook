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
const { createAccountStores } = require('./api-contas');
const characterRoles = require('./personagem-roles');
const characterCyberware = require('./personagem-cyberware');
const characterGame = require('./personagem-jogo');
const creationRules = require('./system-criacao');

const MAX_BODY = 300 * 1024;
const MAX_PUBLISH = 2_000_000;
const MAX_PER_PLAYER = 20;
module.exports = function createCharacterApi({ dataDir, legacyDir = dataDir, docsDir = '', isGameMaster, send, writeJsonAtomic, sameSecret, foundryUrl = '', catalogFile = '', secureCookies = false }) {
  const campaigns = createCampaigns({ dataDir, legacyDir, writeJsonAtomic });
  const { sessions, preferences } = createAccountStores({ dataDir, writeJsonAtomic });
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
  // Fila por arquivo: quem muda um arquivo espera a vez, relê e grava sem esperar nada no meio. Sem isso, dois
  // pedidos ao mesmo tempo (a ficha do Foundry chegando enquanto o jogador salva) liam o mesmo arquivo e o segundo a
  // gravar apagava o que o primeiro tinha mudado.
  const queues = new Map();
  function lockOn(key, task) {
    const run = (queues.get(key) || Promise.resolve()).then(task, task);
    const tail = run.catch(() => null);
    queues.set(key, tail);
    tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
    return run;
  }
  // As contas, do mesmo jeito: change(lista) muda a lista; false = nada a gravar; { status, data } = desiste.
  const updateAccounts = change => lockOn(accountsFile, async () => {
    const accounts = readAccounts();
    const result = change(accounts);
    if (result === false || (result && result.status)) return result || {};
    await saveAccounts(result && result.accounts ? result.accounts : accounts);
    return result || {};
  });
  // Código fácil de ditar: sem 0/O, 1/I/L.
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const randomFrom = (chars, length) => Array.from(crypto.randomBytes(length), byte => chars[byte % chars.length]).join('');
  const newCode = () => `NC-${randomFrom(CODE_CHARS, 4)}-${randomFrom(CODE_CHARS, 4)}`;
  const newId = () => randomFrom('abcdefghijkmnpqrstuvwxyz23456789', 10);
  const playerCookie = request => {
    try { return decodeURIComponent(((request.headers.cookie || '').match(/(?:^|;\s*)jogador=([^;]+)/) || [])[1] || ''); }
    catch { return ''; } // Um cookie malformado vale como ausente, sem interromper a wiki.
  };
  const findAccount = code => code ? readAccounts().find(account => sameSecret(account.codigo, code)) : null;
  // O cookie do jogador: a sessão (só um identificador aleatório). Max-Age 0 apaga. No servidor (https), só vai por https.
  const sessionCookie = (token, maxAge = 31536000) => `jogador=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;
  // Tira a conta de todos os aparelhos: as sessões acabam, e o cookie antigo (com o código) deixa de valer.
  async function disconnect(accountId) {
    await updateAccounts(list => {
      const account = list.find(item => item.id === accountId);
      if (!account || account.cookieAntigo === false) return false;
      account.cookieAntigo = false;
      return {};
    });
    await sessions.removeAccount(accountId);
  }

  // campanhas: as que esta pessoa vê (o mestre, todas; o jogador, as do código dele que ainda existem).
  function who(request) {
    const existing = campaigns.list().map(item => item.id);
    if (isGameMaster(request)) return { papel: 'mestre', campanhas: existing };
    const value = playerCookie(request);
    let account = null;
    let session = null;
    if (sessions.isToken(value)) {
      session = sessions.find(value);
      account = session ? readAccounts().find(item => item.id === session.conta) || null : null;
    } else {
      // Cookie de antes das sessões (o próprio código): vale até a conta sair de todos os aparelhos ou trocar de
      // código. O /api/eu troca por uma sessão na primeira visita.
      const legacy = findAccount(value);
      account = legacy && legacy.cookieAntigo !== false ? legacy : null;
    }
    if (!account) return { papel: 'visitante', campanhas: [] };
    if (session) sessions.touch(session).catch(() => null);
    return { papel: 'jogador', conta: account, sessao: session, token: session ? value : '', cookieAntigo: !session, campanhas: account.campanhas.filter(id => existing.includes(id)) };
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
  const roleSummary = doc => {
    const mesa = characterRoles.listaMesa(doc);
    return (mesa.length ? mesa : characterRoles.lista(doc)).map(({ id, rank }) => ({ id, rank }));
  };
  const publicView = (doc, accounts) => ({ id: doc.id, nome: doc.nome || '', apelido: doc.apelido || '', role: doc.role || '', roles: roleSummary(doc), retrato: portraitOf(doc), donoNome: ownerName(accounts, doc.dono), campanha: campaignOf(doc), publico: true });
  const summary = (doc, accounts) => ({ ...publicView(doc, accounts), publico: false, dono: doc.dono, metodo: doc.metodo || '', versao: doc.versao, atualizado: doc.atualizado, foundry: linkOf(doc), foundry12: doc.foundry || null, foundry14: doc.foundry14 || null, envio: doc.envio || null, estadoFoundry: foundryState(doc), mesa: doc.mesa ? { hp: doc.mesa.hp || null, recebido: doc.mesa.recebido, geracao: Number(doc.mesa.geracao) || 12 } : null, numeros: numbersOf(doc),
    // resolvidos: o que o mestre decidiu (ou o Foundry entregou), para o botão da conta do jogador avisar.
    pedidos: { pendentes: (doc.pedidos || []).filter(item => item.status === 'pendente').length, aprovados: (doc.pedidos || []).filter(item => item.status === 'aprovado').length,
      resolvidos: (doc.pedidos || []).filter(item => ['aprovado', 'recusado', 'entregue'].includes(item.status)).slice(-10).map(item => ({ id: item.id, status: item.status, quando: item.entregue || item.decidido || item.criado, erro: Boolean(item.erro), total: item.total })) },
    // As anotações do personagem: se tem, o começo e quando mudou (o mestre vê as do grupo num quadro só).
    temAnotacoes: Boolean(doc.anotacoes && doc.anotacoes.texto), anotacoesTrecho: doc.anotacoes && doc.anotacoes.texto ? doc.anotacoes.texto.slice(0, 220) : '', anotacoesEm: (doc.anotacoes && doc.anotacoes.atualizado) || null,
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
    const { transferencias: _moves, foundry12: _f12, foundry14: _f14, ...rest } = doc;
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
  // jogo: o estado de jogo que a mesa da wiki grava (personagem-jogo.js); só ela muda, pela fila (updateCharacter).
  const SERVER_FIELDS = ['id', 'dono', 'versao', 'criado', 'atualizado', 'foundry', 'foundry12', 'foundry14', 'envio', 'retrato', 'retratoOriginal', 'retratoRecorte', 'ip', 'mesa', 'jogo', 'pedidos', 'campanha', 'transferencias', 'anotacoes', 'estadoFoundry', 'donoNome', 'publico', 'roles'];
  // O que o jogador não muda mais pela wiki depois que o personagem foi importado no Foundry.
  const LOCKED_AFTER_IMPORT = ['role', 'rankRole', 'roleSecundaria', 'especializacao', 'metodo', 'stats', 'sorteio', 'pericias', 'tipos', 'extras', 'lingua', 'casa', 'kitNet', 'quickhacks', 'escolhas', 'itens',
    'habilidades', 'oficina', 'montagem', 'moradia', 'estiloVida', 'traumaTeam', 'estiloModa'];
  function cleanCyberware(doc) {
    const items = catalog();
    const source = [...(Array.isArray(doc.itens) ? doc.itens : []), ...(Array.isArray(doc.resultado?.itens) ? doc.resultado.itens : [])];
    const rows = new Map(source.filter(entry => entry && typeof entry === 'object' && entry.uid).map(entry => [entry.uid, entry]));
    const mounts = doc.montagem && typeof doc.montagem === 'object' && !Array.isArray(doc.montagem) ? doc.montagem : {};
    for (const [uid, mount] of Object.entries(mounts)) {
      if (!mount || typeof mount !== 'object' || !Object.hasOwn(mount, 'local')) continue;
      const item = items.get(rows.get(uid)?.id);
      mount.local = characterCyberware.normalizar(mount.local, item ? item.cyber?.tipo || '' : undefined);
    }
    for (const entry of source) {
      if (!entry || typeof entry !== 'object') continue;
      const item = items.get(entry.id);
      if (Object.hasOwn(entry, 'local')) entry.local = characterCyberware.normalizar(entry.local, item?.cyber?.tipo || '');
      if (entry.local && !entry.uid) throw Object.assign(new Error('O cyberware precisa de um identificador por unidade para escolher seu local.'), { status: 400 });
    }
    const cyberRows = [...rows.values()].filter(entry => items.get(entry.id)?.cyber).map(entry => ({
      ...entry, cyber: items.get(entry.id).cyber,
      local: Object.hasOwn(mounts[entry.uid] || {}, 'local') ? mounts[entry.uid].local : entry.local || '',
      em: mounts[entry.uid]?.em ?? entry.em
    }));
    const byUid = new Map(cyberRows.map(entry => [entry.uid, entry]));
    for (const entry of cyberRows) {
      const parent = byUid.get(entry.em);
      if (parent && !entry.cyber.base) {
        if (!parent.cyber.base || parent.cyber.tipo !== entry.cyber.tipo) throw Object.assign(new Error('A base escolhida não é compatível com este cyberware.'), { status: 400 });
        entry.local = parent.local;
      }
      const output = rows.get(entry.uid);
      if (entry.local || Object.hasOwn(output, 'local')) output.local = entry.local;
    }
    characterCyberware.duplicados(cyberRows);
  }
  function cleanCharacter(input) {
    let doc = cleanValue(input && typeof input === 'object' && !Array.isArray(input) ? input : {});
    for (const field of SERVER_FIELDS) delete doc[field];
    doc.nome = String(doc.nome || '').trim().slice(0, 80);
    doc.apelido = String(doc.apelido || '').trim().slice(0, 80);
    doc = characterRoles.normalizar(doc);
    if (doc.role) {
      const roles = characterRoles.resultados(doc, creationRules);
      doc.resultado = { ...(doc.resultado && typeof doc.resultado === 'object' && !Array.isArray(doc.resultado) ? doc.resultado : {}), role: roles[0], roles };
    }
    if (doc.retratoLink && !/^https:\/\/[^\s"'<>]+$/.test(String(doc.retratoLink))) doc.retratoLink = '';
    if (doc.retratoLink) doc.retratoLink = String(doc.retratoLink).slice(0, 500);
    cleanCyberware(doc);
    return doc;
  }
  // Impressão digital da ficha que vai para o Foundry (o `resultado`, sem as pendências). Serve para saber
  // se algo mudou depois do envio ou da importação: a versão sobe até quando o jogador só troca de passo.
  // O retrato entra só quando existe (as impressões gravadas antes dele continuam valendo).
  const resultHash = doc => crypto.createHash('sha1').update(JSON.stringify({ ...(doc.resultado || {}), pendencias: undefined, ...(portraitOf(doc) ? { retrato: portraitOf(doc) } : {}) })).digest('hex').slice(0, 16);
  // Os vínculos com o Foundry: o do 12 (doc.foundry, gravado pelo módulo cpr-2077) e o do 14 (doc.foundry14, gravado pelo
  // sistema novo, que manda geracao: 14). Cada Foundry tem o seu, e um não derruba o outro. A wiki mostra um só: o do 12,
  // ou o do 14 quando o personagem só foi para ele.
  const linksOf = doc => [doc.foundry, doc.foundry14].filter(link => link && link.importado);
  const linkOf = doc => linksOf(doc)[0] || doc.foundry || null;
  // novo · enviado · enviado-mudou (mudou depois do envio) · importado · mudou (depois da importação) · avisado (mudou e foi enviado de novo)
  // · outra-mesa (importado no Foundry de outra campanha e depois mudou de campanha: o Foundry desta ainda não tem)
  function foundryState(doc) {
    const now = resultHash(doc);
    const link = linkOf(doc);
    if (link && link.importado && link.campanha && link.campanha !== campaignOf(doc)) return 'outra-mesa';
    if (link && link.importado) {
      if (!link.resultadoHash || link.resultadoHash === now) return 'importado';
      const resent = doc.envio && new Date(doc.envio.quando) > new Date(link.sincronizado || link.importado) && doc.envio.resultadoHash === now;
      return resent ? 'avisado' : 'mudou';
    }
    if (doc.envio) return doc.envio.resultadoHash === now ? 'enviado' : 'enviado-mudou';
    return 'novo';
  }
  // A ficha da mesa (ou a entrega de um pedido) que chega de um ator que não é mais o ligado ao personagem: o mundo
  // antigo aberto depois da migração para outro mundo, ou uma cópia do ator. Só os atores ligados (o da última importação
  // em cada Foundry, o 12 e o 14) gravam. Sem o ator no pedido (módulo antigo), vale como antes.
  function staleActor(doc, ator) {
    const links = linksOf(doc).filter(link => link.ator);
    if (!ator || !links.length || links.some(link => String(ator) === link.ator)) return null;
    return { status: 409, data: { erro: `${doc.nome || 'Este personagem'} está ligado a outro ator do Foundry (${links.map(link => link.nomeAtor || link.ator).join(' e ')}): este é um ator antigo.`, ator: links[0].ator } };
  }
  const importedSomewhere = doc => linksOf(doc).length > 0;
  // Em jogo: importado no Foundry ou já na mesa da wiki (doc.jogo: o token entrou numa cena). Daí em diante a criação
  // trava para o jogador, e as compras são por pedido. Quem entrega o pedido: o Foundry, se o personagem está nele;
  // senão, a própria wiki, ao aprovar.
  const inPlay = doc => importedSomewhere(doc) || Boolean(doc.jogo);
  const deliversInWiki = doc => !importedSomewhere(doc) && Boolean(doc.jogo);
  // A ficha inteira como sai: o vínculo que a wiki mostra (foundry), os dois à parte (foundry12 e foundry14) e o estado.
  const withLinks = doc => ({ ...doc,
    // Expõe o contrato novo também para arquivos antigos, sem regravar a ficha ou mudar seu hash de importação.
    ...(doc.resultado && !Array.isArray(doc.resultado.roles) ? { resultado: { ...doc.resultado, roles: doc.resultado.role ? [doc.resultado.role] : characterRoles.resultados(doc, creationRules) } } : {}),
    foundry: linkOf(doc), foundry12: doc.foundry || null, foundry14: doc.foundry14 || null, estadoFoundry: foundryState(doc) });
  // Avanço: o total gasto não pode passar do total de Pontos de Melhoria que o mestre deu.
  const ipGranted = doc => ((doc.ip && doc.ip.ganhos) || []).reduce((sum, entry) => sum + (Number(entry.qtd) || 0), 0);
  const ipSpent = doc => (Array.isArray(doc.avanco) ? doc.avanco : []).reduce((sum, entry) => sum + Math.max(0, Number(entry.custo) || 0), 0);
  // Os números do cartão da lista (HP, IP, eurodólares e o Rank): o mais recente entre a mesa da wiki e o Foundry; sem
  // os dois, os da criação (o IP é o que o mestre deu menos o que o avanço gastou). A regra é a do personagem-jogo.js.
  const numbersOf = doc => {
    const mesa = doc.mesa || null;
    const created = doc.resultado || {};
    const game = characterGame.valores(doc);
    return {
      hp: characterGame.hp(doc),
      ip: game.ip,
      eb: game.dinheiro,
      rank: (roleSummary(doc).find(role => role.id === doc.role) || {}).rank || (created.role && created.role.rank) || null,
      naMesa: Boolean((mesa && mesa.hp) || doc.jogo)
    };
  };

  // ---------------- Histórico de versões ----------------
  // Antes de uma rodada de edição, a versão de antes vai para personagens/historico/<id>/<quando>-v<versão>.json: no
  // máximo uma a cada 10 minutos (o criador salva sozinho a cada mudança) e as últimas 30. O mestre lista e restaura
  // (o jogador apagou o Lifepath sem querer, ou um bug estragou a ficha).
  const HISTORY_EVERY = 10 * 60 * 1000;
  const HISTORY_KEEP = 30;
  const historyDir = id => path.join(charactersDir, 'historico', id);
  const historyFiles = id => { try { return fs.readdirSync(historyDir(id)).filter(file => /^[\dTZ-]+-v\d+\.json$/.test(file)).sort(); } catch { return []; } };
  // O nome guarda quando (2026-10-08T14-30-05-120Z) e a versão.
  const savedAt = file => file.replace(/^(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z.*$/, '$1T$2:$3:$4.$5Z');
  function snapshot(doc, force = false) {
    const files = historyFiles(doc.id);
    const last = files[files.length - 1];
    if (!force && last && Date.now() - new Date(savedAt(last)).getTime() < HISTORY_EVERY) return;
    fs.mkdirSync(historyDir(doc.id), { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-v${doc.versao}.json`;
    fs.writeFileSync(path.join(historyDir(doc.id), name), JSON.stringify(doc));
    for (const old of [...files, name].slice(0, -HISTORY_KEEP)) fs.rmSync(path.join(historyDir(doc.id), old), { force: true });
  }
  const readHistory = (id, version) => {
    if (!/^[\dTZ-]+-v\d+$/.test(String(version || ''))) return null;
    try { return JSON.parse(fs.readFileSync(path.join(historyDir(id), `${version}.json`), 'utf8')); } catch { return null; }
  };
  // A lista para o mestre (a mais nova primeiro), com o que cada versão tem de diferente da de agora.
  const COMPARED_OUT = ['resultado', 'passo', 'pendencias'];
  function listHistory(current) {
    const now = cleanCharacter(current);
    return historyFiles(current.id).reverse().map(file => {
      const old = readHistory(current.id, file.slice(0, -5));
      if (!old) return null;
      const before = cleanCharacter(old);
      const fields = [...new Set([...Object.keys(before), ...Object.keys(now)])].filter(field => !COMPARED_OUT.includes(field) && JSON.stringify(before[field]) !== JSON.stringify(now[field]));
      return { id: file.slice(0, -5), guardada: savedAt(file), versao: old.versao, nome: old.nome || '', role: old.role || '', atualizado: old.atualizado || null, diferencas: fields.sort() };
    }).filter(Boolean);
  }

  // ---------------- Regras da loja inicial ----------------
  // O que a loja de criação esconde, em cada campanha. Os jogadores da campanha leem; só o mestre muda.
  // Campanha sem regras gravadas usa as do Protocolo Morana (a campanha nova começa com uma cópia delas).
  // blackchrome: os itens do Black Chrome, que ficam à venda por padrão (o mestre esconde pela engrenagem da Loja).
  const SHOP_TAGS = ['exotica', 'excelente', 'borgware', 'municao-rara', 'raro', 'blackchrome'];
  const DEFAULT_SHOP_RULES = { teto: 1000, esconder: SHOP_TAGS.filter(tag => tag !== 'blackchrome'), liberados: [], bloqueados: [] };
  const readShopRules = id => ({ ...DEFAULT_SHOP_RULES, ...(id ? campaigns.readShopRules(id) || campaigns.readShopRules(campaigns.first) || {} : {}) });
  const itemIds = list => (Array.isArray(list) ? list : []).map(String).filter(id => /^[a-z0-9_-]+:[a-z0-9-]+$/.test(id)).slice(0, 2000);
  const cleanShopRules = input => ({
    teto: Math.max(0, Math.min(1000000, Math.round(Number(input.teto)) || 0)),
    esconder: (Array.isArray(input.esconder) ? input.esconder : []).filter(tag => SHOP_TAGS.includes(tag)),
    liberados: itemIds(input.liberados),
    bloqueados: itemIds(input.bloqueados)
  });

  // ---------------- Retrato ----------------
  // O recorte (até 512 px) e a fonte opcional (até 1536 px) vêm reduzidos pelo navegador. Confere os bytes, não o nome.
  const portraitDir = () => path.join(charactersDir, 'retratos');
  const imageType = buffer => {
    if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
  };
  const portraitFiles = (id, original = false) => { try { return fs.readdirSync(portraitDir()).filter(file => file.startsWith(`${id}${original ? '-original' : ''}.`)); } catch { return []; } };
  const imageTypes = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  const portraitBuffer = value => Buffer.from(String(value || '').replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
  function portraitCrop(value) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)
      || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.zoom)
      || value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1 || value.zoom < 1 || value.zoom > 5) {
      throw Object.assign(new Error('Recorte inválido: x e y entre 0 e 1, zoom entre 1 e 5.'), { status: 400 });
    }
    return { x: value.x, y: value.y, zoom: value.zoom };
  }
  // Prepara os dois arquivos antes de trocar qualquer um. Uma falha na troca devolve os arquivos anteriores.
  function replacePortraitFiles(id, images) {
    fs.mkdirSync(portraitDir(), { recursive: true });
    const token = crypto.randomBytes(6).toString('hex');
    const prepared = images.map(({ nome, buffer }) => ({ nome, buffer, temp: `.${nome}-${token}.tmp` }));
    const backups = [], installed = [];
    const local = nome => path.join(portraitDir(), nome);
    try {
      for (const image of prepared) fs.writeFileSync(local(image.temp), image.buffer);
      for (const nome of [...portraitFiles(id), ...portraitFiles(id, true)]) {
        const backup = `.${nome}-${token}.bak`;
        fs.renameSync(local(nome), local(backup));
        backups.push({ nome, backup });
      }
      for (const image of prepared) {
        fs.renameSync(local(image.temp), local(image.nome));
        installed.push(image.nome);
      }
    } catch (error) {
      for (const nome of installed) fs.rmSync(local(nome), { force: true });
      for (const { nome, backup } of backups) fs.renameSync(local(backup), local(nome));
      throw error;
    } finally {
      for (const image of prepared) fs.rmSync(local(image.temp), { force: true });
    }
    for (const { backup } of backups) fs.rmSync(local(backup), { force: true });
  }

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
      // Quem ainda tem o cookie de antes das sessões (o código) ganha uma sessão aqui.
      const upgrade = identity.cookieAntigo ? { 'Set-Cookie': sessionCookie(await sessions.create(identity.conta.id, request.headers['user-agent'])) } : {};
      return json(response, 200, { papel: identity.papel, jogador: identity.conta ? { id: identity.conta.id, nome: identity.conta.nome } : null, campanhas: identity.campanhas.map(id => campaignCard(campaigns.get(id), identity)) }, upgrade);
    }
    // Preferências da conta (o jogador, ou o mestre): o que a pessoa ajusta na wiki, igual em qualquer aparelho.
    if (pathname === '/api/eu/preferencias') {
      // O visitante lê uma lista vazia (sem erro: a wiki sempre pergunta); gravar exige conta.
      if (identity.papel === 'visitante') return method === 'GET' ? json(response, 200, { dono: null, valores: {}, atualizado: null }) : json(response, 401, { erro: 'Entre com o seu código.' });
      const owner = identity.papel === 'mestre' ? 'mestre' : identity.conta.id;
      if (method === 'GET') return json(response, 200, { dono: owner, ...preferences.read(owner) });
      if (method !== 'PUT') return json(response, 405, { erro: 'Use GET ou PUT.' });
      const input = await readJson(request, 256 * 1024);
      return json(response, 200, { dono: owner, ...(await preferences.merge(owner, input.valores)) });
    }

    if (pathname === '/api/entrar' && method === 'POST') {
      if (tooManyAttempts(clientIp(request))) return json(response, 429, { erro: 'Muitas tentativas. Espere 10 minutos.' });
      const { codigo } = await readJson(request);
      const account = findAccount(String(codigo || '').trim().toUpperCase());
      if (!account) return json(response, 403, { erro: 'Código não encontrado. Confira com o mestre.' });
      attempts.delete(clientIp(request));
      const token = await sessions.create(account.id, request.headers['user-agent']);
      return json(response, 200, { jogador: { id: account.id, nome: account.nome } }, { 'Set-Cookie': sessionCookie(token) });
    }
    if (pathname === '/api/sair' && method === 'POST') {
      if (identity.token) await sessions.remove(identity.token);
      return json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
    }
    // Sair de todos os aparelhos.
    if (pathname === '/api/sair-de-todos' && method === 'POST') {
      if (identity.papel !== 'jogador') return json(response, 401, { erro: 'Entre com o seu código.' });
      await disconnect(identity.conta.id);
      return json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
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
      const existing = campaigns.list().map(item => item.id);
      const campaignList = value => [...new Set((Array.isArray(value) ? value : []).map(String))].filter(id => existing.includes(id));
      // Com o último acesso e os aparelhos com sessão de cada código.
      if (pathname === '/api/contas' && method === 'GET') return json(response, 200, { contas: readAccounts().map(account => ({ ...account, ...sessions.summary(account.id) })) });
      if (pathname === '/api/contas' && method === 'POST') {
        const input = await readJson(request);
        const clean = String(input.nome || '').trim().slice(0, 60);
        if (!clean) return json(response, 400, { erro: 'Dê um nome ao jogador.' });
        const chosen = campaignList(input.campanhas);
        const account = { id: newId(), nome: clean, codigo: newCode(), criado: new Date().toISOString(), campanhas: chosen.length ? chosen : [campaigns.first] };
        await updateAccounts(list => ({ accounts: [...list, account] }));
        return json(response, 201, { conta: account });
      }
      const [id, action] = pathname.slice('/api/contas/'.length).split('/');
      if (!readAccounts().some(item => item.id === id)) return json(response, 404, { erro: 'Conta não encontrada.' });
      const missing = { status: 404, data: { erro: 'Conta não encontrada.' } };
      // Desconectar: tira o código de todos os aparelhos (ele entra de novo com o mesmo código).
      // Novo código: o antigo deixa de valer, e todos os aparelhos saem; os personagens e as campanhas ficam.
      if (action === 'desconectar' || action === 'novo-codigo') {
        if (method !== 'POST') return json(response, 405, { erro: 'Use POST.' });
        if (action === 'novo-codigo') {
          const done = await updateAccounts(list => { const item = list.find(entry => entry.id === id); if (!item) return missing; item.codigo = newCode(); return {}; });
          if (done.status) return json(response, done.status, done.data);
        }
        await disconnect(id);
        const fresh = readAccounts().find(item => item.id === id);
        return json(response, 200, { conta: { ...fresh, ...sessions.summary(id) } });
      }
      if (action) return json(response, 404, { erro: 'Rota não encontrada.' });
      // Em que campanhas o código joga. Sem nenhuma, o certo é revogar (DELETE).
      if (method === 'PUT') {
        const input = await readJson(request);
        const chosen = campaignList(input.campanhas);
        if (!chosen.length) return json(response, 400, { erro: 'O jogador precisa estar em pelo menos uma campanha. Para tirar o acesso, revogue o código.' });
        const done = await updateAccounts(list => { const item = list.find(entry => entry.id === id); if (!item) return missing; item.campanhas = chosen; return { conta: item }; });
        if (done.status) return json(response, done.status, done.data);
        return json(response, 200, { conta: done.conta });
      }
      if (method === 'DELETE') {
        await updateAccounts(list => ({ accounts: list.filter(item => item.id !== id) }));
        await sessions.removeAccount(id);
        preferences.remove(id);
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
      // A mesa do mestre: relógios, bloco de notas e quais relógios os jogadores veem.
      if (part === 'mesa') {
        if (method === 'GET') return json(response, 200, campaigns.readTable(id));
        if (method !== 'PUT') return json(response, 405, { erro: 'Use GET ou PUT.' });
        return json(response, 200, await campaigns.writeTable(id, await readJson(request, 128 * 1024)));
      }
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
      // Os relógios que o mestre mostra (o relógio da cidade, por exemplo): mudar um deles também conta como novidade.
      const clocks = campaigns.publicClocks(id);
      const table = clocks.length ? campaigns.readTable(id).atualizado : null;
      // As próximas sessões marcadas na agenda: marcar ou mudar uma também conta como novidade.
      const agenda = campaigns.upcoming(id);
      const scheduled = campaigns.agendaUpdated(id);
      return json(response, 200, { ...view.publicado, campanha: campaignCard(campaigns.get(id), identity), nightCity: news.publicado, relogios: clocks, agenda, atualizado: [view.atualizado, news.atualizado, table, scheduled].filter(Boolean).sort().pop() || null });
    }
    // Agenda das mesas: só o mestre marca, muda e desmarca (os jogadores veem as da campanha deles em /api/visao).
    if (pathname === '/api/agenda' || pathname.startsWith('/api/agenda/')) {
      if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre.' });
      if (pathname === '/api/agenda') {
        if (method === 'GET') return json(response, 200, campaigns.agendaView());
        if (method !== 'POST') return json(response, 405, { erro: 'Use GET ou POST.' });
        const sessao = await campaigns.addSession(await readJson(request));
        return json(response, 201, { sessao, ...campaigns.agendaView() });
      }
      const sid = pathname.slice('/api/agenda/'.length);
      if (!/^[a-f0-9]{10}$/.test(sid)) return json(response, 404, { erro: 'Sessão não encontrada.' });
      if (method === 'PUT') {
        const sessao = await campaigns.updateSession(sid, await readJson(request));
        return sessao ? json(response, 200, { sessao, ...campaigns.agendaView() }) : json(response, 404, { erro: 'Sessão não encontrada.' });
      }
      if (method === 'DELETE') return (await campaigns.removeSession(sid)) ? json(response, 200, { ok: true, ...campaigns.agendaView() }) : json(response, 404, { erro: 'Sessão não encontrada.' });
      return json(response, 405, { erro: 'Use PUT ou DELETE.' });
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

      // Toda mudança num personagem passa por update(): lê o arquivo de novo logo antes de gravar e grava sem esperar
      // nada no meio, em fila por personagem. Assim, o que outro pedido gravou enquanto este chegava (a ficha do Foundry,
      // um pedido aprovado, uma anotação) não se perde. change(doc) muda o doc; devolver { status, data } desiste.
      const update = change => lockOn(fileOf(id), async () => {
        const doc = readCharacter(id);
        if (!doc) return { status: 404, data: { erro: 'Personagem não encontrado.' } };
        const result = change(doc);
        if (result && result.status) return result;
        await writeJsonAtomic(fileOf(id), result && result.doc ? result.doc : doc);
        return { doc: result && result.doc ? result.doc : doc };
      });
      const answer = (done, ok) => (done.status ? reply(done.status, done.data) : ok(done.doc));

      // Volta do Foundry: o importador grava o ator e o que já entregou. Não muda a versão (não atrapalha quem está editando).
      // campanha: a do mundo que importou (o Foundry de cada campanha manda a sua; sem ela, a do personagem agora).
      // geracao: 14 é o vínculo do Foundry 14 (doc.foundry14); sem ela, o do 12 (doc.foundry). Com removido, o Foundry
      // avisa que o ator ligado foi apagado (o vínculo fica, com a data, e a importação seguinte o troca).
      if (extra === 'foundry') {
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT.' });
        if (identity.papel !== 'mestre') return gmOnly();
        const input = cleanValue(await readJson(request));
        // O aviso de ator apagado não é importação: a campanha do mundo não importa aqui.
        if (input.removido) delete input.campanha;
        const done = await update(doc => {
          // O mundo de outra campanha (o antigo, depois de um crossover) não grava mais neste personagem.
          if (input.campanha && realId(input.campanha) !== campaignOf(doc)) return { status: 409, data: { erro: `${doc.nome || 'Este personagem'} agora é de outra campanha na wiki: importe no mundo dela.`, campanha: campaignOf(doc) } };
          const now = new Date().toISOString();
          const field = Number(input.geracao) === 14 ? 'foundry14' : 'foundry';
          const current = doc[field];
          if (input.removido) {
            if (current && current.ator === String(input.ator || '')) current.removido = now;
            return null;
          }
          const sameActor = current && current.importado && current.ator === String(input.ator || '');
          const table = campaigns.get(realId(input.campanha)) ? realId(input.campanha) : campaignOf(doc);
          const sameTable = sameActor && (current.campanha || campaignOf(doc)) === table;
          doc[field] = { ...(field === 'foundry14' ? { geracao: 14 } : {}), ator: String(input.ator || ''), nomeAtor: String(input.nomeAtor || ''), campanha: table, importado: sameTable ? current.importado : String(input.importado || now), sincronizado: now, versao: Number(input.versao) || doc.versao, entregues: Array.isArray(input.entregues) ? input.entregues.map(String) : [], resultadoHash: resultHash(doc) };
          return null;
        });
        return answer(done, doc => reply(200, { foundry: Number(input.geracao) === 14 ? doc.foundry14 : doc.foundry, estadoFoundry: foundryState(doc) }));
      }
      // Crossover: o mestre leva o personagem para outra campanha. O dono passa a jogar nela também (sem sair das
      // que já tinha). O ator do Foundry fica no mundo antigo; o estado "outra-mesa" avisa o Foundry da campanha nova.
      if (extra === 'campanha') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre muda um personagem de campanha.' });
        const target = campaigns.get(String((await readJson(request)).campanha || ''));
        if (!target) return reply(400, { erro: 'Campanha não encontrada.' });
        const done = await update(doc => {
          const from = campaignOf(doc);
          if (target.id === from) return { status: 400, data: { erro: 'O personagem já está nesta campanha.' } };
          for (const link of linksOf(doc)) if (!link.campanha) link.campanha = from;
          doc.campanha = target.id;
          doc.transferencias = [...(Array.isArray(doc.transferencias) ? doc.transferencias : []), { de: from, para: target.id, quando: new Date().toISOString() }].slice(-20);
          return null;
        });
        if (done.status) return reply(done.status, done.data);
        // O dono passa a jogar na campanha nova (sem sair das que já tinha).
        const joined = await updateAccounts(list => {
          const owner = list.find(account => account.id === done.doc.dono);
          if (!owner || owner.campanhas.includes(target.id)) return false;
          owner.campanhas.push(target.id);
          return { nome: owner.nome };
        });
        // Uma ficha mandada numa mudança anterior não vale para esta: o mundo antigo manda de novo.
        fs.rmSync(transferFile(id), { force: true });
        return reply(200, { personagem: summary(done.doc, readAccounts()), donoEntrou: joined.nome || null });
      }
      // Pedidos da campanha (com o personagem em jogo): o jogador pede itens do catálogo e o mestre aprova ou recusa.
      // Quem entrega: o Foundry do mestre (cria os itens, desconta o dinheiro e marca como entregue), se o personagem
      // está nele; senão, a wiki entrega na hora de aprovar (personagem-jogo.js). O servidor confere cada item no catálogo
      // e calcula o total; ninguém escolhe o preço. Não muda a versão do personagem.
      if (extra === 'pedidos') {
        const [, , pid, action] = pathname.slice('/api/personagens/'.length).split('/');
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        const ordersOf = doc => (Array.isArray(doc.pedidos) ? doc.pedidos : []);
        // Os erros de sempre já com o que estava no arquivo; dentro de update() confere de novo, com o arquivo relido.
        const orderBlock = doc => {
          if (!inPlay(doc)) return { status: 400, data: { erro: 'Antes de entrar em jogo, as compras são na loja inicial.' } };
          if (ordersOf(doc).filter(item => item.status === 'pendente').length >= 5) return { status: 400, data: { erro: 'Já há 5 pedidos esperando o mestre.' } };
          return null;
        };
        if (!pid) {
          if (method === 'GET') return reply(200, { pedidos: ordersOf(stored) });
          if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
          const blocked = orderBlock(stored);
          if (blocked) return reply(blocked.status, blocked.data);
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
            const local = characterCyberware.normalizar(line.local, item.cyber?.tipo || '');
            if (local && qtd !== 1) return reply(400, { erro: `Escolha o local de cada unidade de ${item.nome} em uma linha separada.` });
            itens.push({ uid: `pedido:${pedidoId}:${index}`, id: item.id, nome: item.nome, qtd, preco: item.preco, lote: item.lote || 1, foundry: item.foundry, cat: item.cat, cyber: Boolean(item.cyber), em: ref(line.em), municao: ref(line.municao), ...(local ? { local } : {}) });
          }
          if (!itens.length) return reply(400, { erro: 'O pedido está vazio.' });
          // Opções seguem a base escolhida pelo UID, inclusive quando há duas peças com o mesmo nome.
          for (const line of itens.filter(entry => entry.cyber && entry.em)) {
            const parent = itens.find(entry => entry.uid === line.em) || (stored.mesa?.itens || []).find(entry => entry.uid === line.em || `foundry:${entry.id}` === line.em);
            if (!parent && line.em.startsWith('foundry:')) return reply(400, { erro: 'A base escolhida não está mais na ficha. Atualize a loja e escolha novamente.' });
            if (!parent) continue; // Um cliente antigo pode referenciar um UID ainda ausente no snapshot.
            const cyber = items.get(line.id).cyber;
            const base = items.get(parent.id)?.cyber || parent.cyber;
            if (!base?.tipo) continue;
            if (base.tipo !== cyber.tipo || !(base.base || parent.base)) return reply(400, { erro: 'A base escolhida não é compatível com este cyberware.' });
            const local = characterCyberware.normalizar(parent.local || parent.localPlanejado, cyber.tipo);
            if (line.local && local && line.local !== local) return reply(400, { erro: 'O local da opção deve ser o mesmo da base escolhida.' });
            if (local && line.qtd !== 1) return reply(400, { erro: 'Escolha o local de cada unidade em uma linha separada.' });
            if (local) line.local = local;
          }
          characterCyberware.duplicados(itens.map(entry => ({ ...entry, cyber: items.get(entry.id)?.cyber })));
          const total = itens.reduce((sum, line) => sum + line.preco * (line.lote > 1 ? line.qtd / line.lote : line.qtd), 0);
          const pedido = { id: pedidoId, criado: new Date().toISOString(), status: 'pendente', itens, total: Math.round(total), nota: String(input.nota || '').trim().slice(0, 300), por: identity.papel };
          const done = await update(doc => {
            const late = orderBlock(doc);
            if (late) return late;
            doc.pedidos = [...ordersOf(doc), pedido].slice(-50);
            return null;
          });
          return answer(done, () => reply(201, { pedido }));
        }
        if (!ordersOf(stored).some(item => item.id === pid)) return reply(404, { erro: 'Pedido não encontrado.' });
        if (method !== 'POST' && method !== 'PUT') return reply(405, { erro: 'Use POST.' });
        if (action !== 'cancelar' && identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre.' });
        const input = action === 'cancelar' ? {} : await readJson(request).catch(() => ({}));
        const done = await update(doc => {
          const pedido = ordersOf(doc).find(item => item.id === pid);
          if (!pedido) return { status: 404, data: { erro: 'Pedido não encontrado.' } };
          // A entrega (ou o erro dela) vale só do ator ligado: o mundo antigo não entrega mais depois da migração.
          if (action === 'entregue' || action === 'erro') {
            const stale = staleActor(doc, input.ator);
            if (stale) return stale;
          }
          const now = new Date().toISOString();
          if (action === 'cancelar') {
            if (pedido.status !== 'pendente') return { status: 400, data: { erro: 'Só dá para cancelar um pedido que ainda espera o mestre.' } };
            Object.assign(pedido, { status: 'cancelado', decidido: now });
          } else if (action === 'aprovar') {
            // Aprovar de novo um aprovado que deu erro (faltou dinheiro na mesa) limpa o erro: o Foundry tenta outra vez.
            if (!(pedido.status === 'pendente' || (pedido.status === 'aprovado' && pedido.erro))) return { status: 400, data: { erro: 'Este pedido não está esperando.' } };
            Object.assign(pedido, { status: 'aprovado', decidido: now, erro: '' });
            // Na mesa da wiki, a entrega é agora: sem dinheiro, fica aprovado com o motivo (como quando o Foundry não
            // consegue), e o mestre tenta de novo depois.
            if (deliversInWiki(doc)) {
              const feito = characterGame.entrega(doc, pedido, now);
              if (feito.erro) pedido.erro = feito.erro;
              else {
                doc.jogo = characterGame.comJogo(doc, feito.mudancas, now);
                Object.assign(pedido, { status: 'entregue', entregue: now, avisos: feito.avisos, erro: '' });
              }
            }
          } else if (action === 'recusar') {
            if (!['pendente', 'aprovado'].includes(pedido.status)) return { status: 400, data: { erro: 'Este pedido já foi resolvido.' } };
            Object.assign(pedido, { status: 'recusado', decidido: now, motivo: String(input.motivo || '').trim().slice(0, 300) });
          } else if (action === 'entregue') {
            if (!['pendente', 'aprovado'].includes(pedido.status)) return { status: 400, data: { erro: 'Este pedido já foi resolvido.' } };
            Object.assign(pedido, { status: 'entregue', entregue: now, decidido: pedido.decidido || now, avisos: (Array.isArray(input.avisos) ? input.avisos : []).map(String).slice(0, 20), erro: '' });
          } else if (action === 'erro') {
            // O Foundry não conseguiu entregar (dinheiro insuficiente na mesa, por exemplo): fica aprovado, com o motivo.
            pedido.erro = String(input.erro || '').slice(0, 300);
          } else return { status: 404, data: { erro: 'Ação desconhecida.' } };
          return null;
        });
        return answer(done, doc => reply(200, { pedido: ordersOf(doc).find(item => item.id === pid) }));
      }
      // Na mesa: o estado do ator no Foundry (HP, Humanidade, dinheiro, itens…), mandado pelo módulo do Foundry do
      // mestre a cada mudança. Depois da importação o Foundry manda; a ficha da wiki mostra isto. Não muda a versão.
      if (extra === 'mesa') {
        if (method !== 'PUT') return reply(405, { erro: 'Use PUT.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre.' });
        const input = cleanValue(await readJson(request));
        const done = await update(doc => {
          // Depois de um crossover, o mundo antigo para de mandar a ficha (a da mesa nova é que vale).
          if (input.campanha && realId(input.campanha) !== campaignOf(doc)) return { status: 409, data: { erro: `${doc.nome || 'Este personagem'} agora é de outra campanha na wiki.`, campanha: campaignOf(doc) } };
          // Depois de importar de novo (num mundo novo ou noutro ator), só o ator ligado manda a ficha.
          const stale = staleActor(doc, input.ator);
          if (stale) return stale;
          delete input.campanha;
          // Clientes antigos enviam só a Role ativa. Atualize essa entrada sem apagar as outras já conhecidas
          // da mesma geração do Foundry. Não copie Roles entre o 12 e o 14 como se fossem o mesmo ator.
          if (!Array.isArray(input.roles) && doc.mesa && Array.isArray(doc.mesa.roles) && Number(input.geracao || 12) === Number(doc.mesa.geracao || 12)) {
            const roles = [...doc.mesa.roles];
            if (input.role) {
              const idRole = characterRoles.canonico(input.role.id || input.role.nome);
              const index = roles.findIndex(role => idRole ? characterRoles.canonico(role.id || role.nome) === idRole : role.nome === input.role.nome);
              if (index >= 0) roles[index] = input.role;
              else roles.push(input.role);
            }
            input.roles = roles;
          }
          doc.mesa = { ...input, recebido: new Date().toISOString() };
          return null;
        });
        return answer(done, doc => reply(200, { recebido: doc.mesa.recebido }));
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
        const now = readCharacter(id) || stored;
        if (!campaigns.get(from) || from === campaignOf(now)) return reply(400, { erro: 'Só o mundo da campanha antiga manda a ficha, depois que o personagem muda de campanha.' });
        if (!input.ator || typeof input.ator !== 'object' || input.ator.type !== 'character') return reply(400, { erro: 'Mande o ator do Foundry (actor.toObject()).' });
        fs.mkdirSync(path.dirname(transferFile(id)), { recursive: true });
        await lockOn(transferFile(id), () => writeJsonAtomic(transferFile(id), { de: from, para: campaignOf(now), quando: new Date().toISOString(), nomeAtor: String(input.ator.name || '').slice(0, 120), ator: input.ator }));
        return reply(200, { transferencia: transferInfo(id) });
      }
      // Anotações do personagem (pistas, contatos, dívidas, o que o NPC prometeu): o dono e o mestre leem e escrevem.
      // Rota própria: não muda a versão (não atrapalha quem está com o criador aberto).
      if (extra === 'anotacoes') {
        if (!canEdit(identity, stored)) return reply(403, { erro: 'Este personagem é de outro jogador.' });
        if (method === 'GET') return reply(200, { anotacoes: stored.anotacoes || null });
        if (method !== 'PUT') return reply(405, { erro: 'Use GET ou PUT.' });
        const input = await readJson(request, 64 * 1024);
        const done = await update(doc => {
          doc.anotacoes = { texto: String(input.texto || '').slice(0, 20000), atualizado: new Date().toISOString(), por: identity.papel === 'mestre' ? 'mestre' : identity.conta.nome };
          return null;
        });
        return answer(done, doc => reply(200, { anotacoes: doc.anotacoes }));
      }
      // Retrato: quem joga na campanha do personagem vê (é o rosto dele); o dono ou o mestre trocam.
      if (extra === 'retrato') {
        if (method === 'GET') {
          const original = query.get('original') === '1';
          if (original && !canEdit(identity, stored)) return reply(403, { erro: 'Só o dono ou o mestre vê a imagem original.' });
          const [file] = portraitFiles(id, original);
          if (!file) return reply(404, { erro: 'Sem retrato.' });
          const data = fs.readFileSync(path.join(portraitDir(), file));
          response.writeHead(200, { ...headers, 'Content-Type': imageTypes[path.extname(file).slice(1)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'private, max-age=60' });
          return response.end(data);
        }
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        if (method === 'POST') {
          const { imagem, original, recorte } = await readJson(request, 3 * 1024 * 1024);
          const buffer = portraitBuffer(imagem);
          const source = original === undefined || original === null ? null : portraitBuffer(original);
          if (buffer.length + (source?.length || 0) > 2 * 1024 * 1024) return reply(413, { erro: 'Imagens grandes demais (até 2 MB no total).' });
          const type = imageType(buffer);
          if (!type) return reply(400, { erro: 'Envie uma imagem PNG, JPEG ou WebP.' });
          const sourceType = source && imageType(source);
          if (source && !sourceType) return reply(400, { erro: 'A imagem original precisa ser PNG, JPEG ou WebP.' });
          const crop = portraitCrop(recorte);
          const done = await update(doc => {
            replacePortraitFiles(id, [{ nome: `${id}.${type}`, buffer }, ...(source ? [{ nome: `${id}-original.${sourceType}`, buffer: source }] : [])]);
            doc.retrato = `api/personagens/${id}/retrato?v=${Date.now()}`;
            doc.retratoOriginal = Boolean(source);
            doc.retratoRecorte = crop;
            return null;
          });
          return answer(done, doc => reply(200, { retrato: doc.retrato, retratoOriginal: doc.retratoOriginal, retratoRecorte: doc.retratoRecorte }));
        }
        if (method === 'DELETE') {
          const done = await update(doc => {
            replacePortraitFiles(id, []);
            doc.retrato = null;
            doc.retratoLink = '';
            doc.retratoOriginal = false;
            doc.retratoRecorte = null;
            return null;
          });
          return answer(done, () => reply(200, { retrato: null, retratoOriginal: false, retratoRecorte: null }));
        }
        return reply(405, { erro: 'Método não permitido.' });
      }
      // Enviar para o mestre: marca o personagem como pronto para importar. Também não muda a versão.
      if (extra === 'enviar') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
        const done = await update(doc => { doc.envio = { quando: new Date().toISOString(), versao: doc.versao, resultadoHash: resultHash(doc) }; return null; });
        return answer(done, doc => reply(200, { envio: doc.envio, estadoFoundry: foundryState(doc) }));
      }
      // Pontos de Melhoria: só o mestre dá (ou tira, com número negativo).
      if (extra === 'ip') {
        if (method !== 'POST') return reply(405, { erro: 'Use POST.' });
        if (identity.papel !== 'mestre') return reply(403, { erro: 'Só o mestre dá Pontos de Melhoria.' });
        const input = await readJson(request);
        const amount = Math.round(Number(input.qtd));
        if (!amount || Math.abs(amount) > 1000) return reply(400, { erro: 'Quantidade entre −1000 e 1000.' });
        const done = await update(doc => {
          const granted = [...((doc.ip && doc.ip.ganhos) || []), { qtd: amount, motivo: String(input.motivo || '').trim().slice(0, 200), quando: new Date().toISOString() }];
          if (granted.reduce((sum, entry) => sum + entry.qtd, 0) < ipSpent(doc)) return { status: 400, data: { erro: 'Não dá para tirar mais do que sobra: o jogador já gastou esses pontos.' } };
          doc.ip = { ganhos: granted };
          // A mesa da wiki já conta o IP (doc.jogo): soma lá também.
          const game = characterGame.jogoValido(doc);
          if (game && game.ip !== undefined && game.ip !== null) doc.jogo = characterGame.comJogo(doc, { ip: Math.max(0, (Number(game.ip) || 0) + amount) });
          doc.versao += 1; // o avanço muda o que o jogador pode fazer: quem estiver com a ficha aberta recarrega
          doc.atualizado = new Date().toISOString();
          return null;
        });
        return answer(done, doc => reply(200, { ip: doc.ip, versao: doc.versao }));
      }
      // Histórico de versões (só o mestre): as versões guardadas antes de cada rodada de edição, e Restaurar uma delas.
      // Restaurar volta o que o jogador preenche (STATs, perícias, itens, Lifepath...) e mantém o que é do servidor
      // (Foundry, mesa, pedidos, Pontos de Melhoria, retrato, anotações). A versão de agora vai para o histórico antes.
      if (extra === 'versoes') {
        if (identity.papel !== 'mestre') return gmOnly();
        const [, , vid, action] = pathname.slice('/api/personagens/'.length).split('/');
        if (!vid) return method === 'GET' ? reply(200, { versoes: listHistory(stored), atual: stored.versao }) : reply(405, { erro: 'Use GET.' });
        if (action !== 'restaurar' || method !== 'POST') return reply(404, { erro: 'Rota não encontrada.' });
        const old = readHistory(id, vid);
        if (!old) return reply(404, { erro: 'Versão não encontrada.' });
        const done = await update(doc => {
          const kept = Object.fromEntries(['foundry', 'foundry14', 'envio', 'retrato', 'retratoOriginal', 'retratoRecorte', 'ip', 'mesa', 'jogo', 'pedidos', 'transferencias', 'anotacoes'].map(field => [field, doc[field] ?? null]));
          const restored = { ...cleanCharacter(old), ...kept, id, dono: doc.dono, campanha: campaignOf(doc), versao: doc.versao + 1, criado: doc.criado, atualizado: new Date().toISOString() };
          if (ipSpent(restored) > ipGranted(restored)) return { status: 400, data: { erro: 'Essa versão gasta mais Pontos de Melhoria do que o personagem tem agora.' } };
          snapshot(doc, true);
          return { doc: restored };
        });
        return answer(done, doc => reply(200, { personagem: withLinks(doc), restaurada: old.versao }));
      }
      if (extra) return reply(404, { erro: 'Rota não encontrada.' });

      if (method === 'GET') {
        // O Foundry 14 ainda usa uma Role. O importador declara o suporte antes de ler a ficha para que
        // um cliente antigo não crie um ator descartando a segunda. A navegação da própria wiki segue normal.
        if (stored.roleSecundaria && foundryOrigins.has(request.headers.origin) && query.get('roles') !== '2') {
          return reply(409, { erro: 'Este personagem tem duas Roles. Use o módulo atualizado do Foundry 12; a importação de duas Roles no Foundry 14 ainda não está disponível.' });
        }
        const temLocais = (stored.resultado?.itens || []).some(entry => entry?.local)
          || Object.values(stored.montagem || {}).some(entry => entry?.local);
        if (temLocais && foundryOrigins.has(request.headers.origin) && query.get('locais') !== '1') {
          return reply(409, { erro: 'Este personagem tem locais de instalação de cyberware. Use o módulo atualizado do Foundry 12 para preservar os lados escolhidos; o importador do Foundry 14 ainda não oferece esse suporte.' });
        }
        return reply(200, { personagem: forViewer(identity, canEdit(identity, stored) ? { ...withLinks(stored), campanha: campaignOf(stored), donoNome: ownerName(accounts, stored.dono) } : publicView(stored, accounts)) });
      }
      if (!canEdit(identity, stored)) return reply(identity.papel === 'visitante' ? 401 : 403, { erro: 'Este personagem é de outro jogador.' });
      if (method === 'PUT') {
        const input = await readJson(request);
        const done = await update(current => {
          // Alguém salvou antes (outra aba, outro aparelho): devolve a versão atual em vez de apagar o trabalho.
          if (Number(input.versao) !== current.versao) return { status: 409, data: { erro: 'O personagem mudou em outro lugar. Recarregue para ver a versão mais nova.', personagem: forViewer(identity, withLinks(current)) } };
          const kept = Object.fromEntries(['foundry', 'foundry14', 'envio', 'retrato', 'retratoOriginal', 'retratoRecorte', 'ip', 'mesa', 'jogo', 'pedidos', 'transferencias', 'anotacoes'].map(field => [field, current[field] ?? null]));
          const doc = { ...cleanCharacter(input), ...kept, id, dono: identity.papel === 'mestre' && input.dono !== undefined ? String(input.dono) : current.dono, campanha: campaignOf(current), versao: current.versao + 1, criado: current.criado, atualizado: new Date().toISOString() };
          // Em jogo (no Foundry ou na mesa da wiki), a mesa manda: o jogador só muda nome, apelido, aparência, notas,
          // retrato e Lifepath. O resto (e o resultado, menos o Lifepath) fica como estava.
          if (inPlay(current) && identity.papel !== 'mestre') {
            for (const field of LOCKED_AFTER_IMPORT) {
              if (current[field] === undefined) delete doc[field];
              else doc[field] = current[field];
            }
            if (current.resultado) doc.resultado = { ...current.resultado, lifepath: (input.resultado && input.resultado.lifepath) || current.resultado.lifepath };
            else delete doc.resultado;
          }
          if (ipSpent(doc) > ipGranted(doc)) return { status: 400, data: { erro: 'Pontos de Melhoria insuficientes para esse avanço.' } };
          // A versão de antes vai para o histórico (uma por rodada de edição).
          snapshot(current);
          return { doc };
        });
        return answer(done, doc => reply(200, { personagem: forViewer(identity, withLinks(doc)) }));
      }
      if (method === 'DELETE') {
        await lockOn(fileOf(id), async () => {
          const trash = path.join(charactersDir, 'apagados');
          fs.mkdirSync(trash, { recursive: true });
          if (fs.existsSync(fileOf(id))) fs.renameSync(fileOf(id), path.join(trash, `${id}-${Date.now()}.json`));
        });
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
  // A mesa da wiki (Tabletop/mesa-api.js) grava no personagem pela mesma fila por arquivo (o HP da mesa, em doc.jogo):
  // change(doc) muda o documento; { status, data } desiste.
  handle.updateCharacter = (id, change) => {
    if (!validId(String(id))) return Promise.resolve({ status: 404, data: { erro: 'Personagem não encontrado.' } });
    return lockOn(fileOf(id), async () => {
      const doc = readCharacter(id);
      if (!doc) return { status: 404, data: { erro: 'Personagem não encontrado.' } };
      const result = change(doc);
      if (result && result.status) return result;
      await writeJsonAtomic(fileOf(id), doc);
      return { doc };
    });
  };
  return handle;
};
const ROUTES = /^\/api\/(eu|entrar|sair|sair-de-todos|contas|personagens|loja|campanhas|visao|night-city|agenda)(\/|$)/;
module.exports.ROUTES = ROUTES;
