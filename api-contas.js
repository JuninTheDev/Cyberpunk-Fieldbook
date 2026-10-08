// Sessões e preferências das contas. Carregado pelo api-personagens.js.
//
// Sessões: entrar com o código cria uma sessão, e o cookie guarda só um identificador aleatório dela (antes, o cookie
// guardava o próprio código). Assim dá para sair de todos os aparelhos, trocar o código de alguém sem refazer a conta
// e saber quando cada um entrou pela última vez. No arquivo fica o hash do identificador, nunca ele.
//   sessoes-jogadores.json → { sessoes: [{ id: sha256(token), conta, criada, visto, aparelho }] }
//
// Preferências: o que cada pessoa ajusta na wiki (páginas fixadas, grupos recolhidos, o personagem em uso, o que já
// viu...) acompanha a conta, em qualquer aparelho. Uma chave, um valor; quem grava manda só o que mudou.
//   preferencias/<id da conta ou "mestre">.json → { valores: { chave: valor }, atualizado }
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_PREFIX = 's1.';
const SEEN_EVERY = 10 * 60 * 1000; // "visto" é gravado no máximo a cada 10 minutos por sessão
const MAX_IDLE = 180 * 24 * 60 * 60 * 1000; // sessão sem uso por 6 meses acaba (o aparelho perdido não fica entrando)
const PREF_KEY = /^[\w:.-]{1,100}$/;
const PREF_MAX_KEYS = 300;
const PREF_MAX_BYTES = 200 * 1024;

function createAccountStores({ dataDir, writeJsonAtomic }) {
  const sessionsFile = path.join(dataDir, 'sessoes-jogadores.json');
  const prefsDir = path.join(dataDir, 'preferencias');
  const readFile = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
  const hash = token => crypto.createHash('sha256').update(String(token)).digest('hex');

  // ---------------- Sessões ----------------
  const readSessions = () => ((readFile(sessionsFile) || {}).sessoes || []).filter(item => item && item.id && item.conta);
  const alive = item => Date.now() - new Date(item.visto || item.criada).getTime() < MAX_IDLE;
  const saveSessions = list => writeJsonAtomic(sessionsFile, { sessoes: list });
  // Um resumo do aparelho, para o mestre ver quantos e quais (sem guardar o user-agent inteiro).
  const device = agent => {
    const text = String(agent || '');
    const system = /Android/i.test(text) ? 'Android' : /iPhone|iPad/i.test(text) ? 'iPhone/iPad' : /Windows/i.test(text) ? 'Windows' : /Mac OS/i.test(text) ? 'Mac' : /Linux/i.test(text) ? 'Linux' : 'aparelho';
    const browser = /Edg\//.test(text) ? 'Edge' : /Firefox\//.test(text) ? 'Firefox' : /Chrome\//.test(text) ? 'Chrome' : /Safari\//.test(text) ? 'Safari' : 'navegador';
    return `${system} · ${browser}`;
  };
  const sessions = {
    isToken: value => String(value || '').startsWith(TOKEN_PREFIX),
    async create(account, agent) {
      const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('base64url')}`;
      const now = new Date().toISOString();
      // Até 20 aparelhos por conta: o mais antigo sai. As vencidas saem do arquivo aqui.
      const list = readSessions().filter(alive);
      const mine = list.filter(item => item.conta === account);
      const others = list.filter(item => item.conta !== account);
      await saveSessions([...others, ...mine.slice(-19), { id: hash(token), conta: account, criada: now, visto: now, aparelho: device(agent) }]);
      return token;
    },
    find: token => (sessions.isToken(token) ? readSessions().find(item => item.id === hash(token) && alive(item)) || null : null),
    // Marca o último acesso (sem gravar a cada pedido).
    async touch(session) {
      if (!session || Date.now() - new Date(session.visto).getTime() < SEEN_EVERY) return;
      const list = readSessions();
      const item = list.find(entry => entry.id === session.id);
      if (!item) return;
      item.visto = new Date().toISOString();
      await saveSessions(list).catch(() => null);
    },
    async remove(token) { const id = hash(token); const list = readSessions(); if (list.some(item => item.id === id)) await saveSessions(list.filter(item => item.id !== id)); },
    async removeAccount(account) { const list = readSessions(); if (list.some(item => item.conta === account)) await saveSessions(list.filter(item => item.conta !== account)); },
    // Para a página de códigos do mestre: último acesso e os aparelhos de cada conta.
    summary(account) {
      const all = readSessions().filter(item => item.conta === account);
      const mine = all.filter(alive);
      const last = all.map(item => item.visto).sort().pop() || null;
      return { ultimoAcesso: last, aparelhos: mine.map(item => item.aparelho) };
    }
  };

  // ---------------- Preferências ----------------
  const prefsFile = owner => path.join(prefsDir, `${owner}.json`);
  const preferences = {
    read: owner => {
      const data = readFile(prefsFile(owner)) || {};
      return { valores: data.valores && typeof data.valores === 'object' ? data.valores : {}, atualizado: data.atualizado || null };
    },
    // Junta o que veio (valor null apaga a chave) e confere os limites.
    async merge(owner, changes) {
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw Object.assign(new Error('Mande { valores: { chave: valor } }.'), { status: 400 });
      const current = preferences.read(owner).valores;
      for (const [key, value] of Object.entries(changes)) {
        if (!PREF_KEY.test(key)) throw Object.assign(new Error(`Chave inválida: ${key.slice(0, 40)}`), { status: 400 });
        if (value === null) delete current[key]; else current[key] = value;
      }
      if (Object.keys(current).length > PREF_MAX_KEYS || JSON.stringify(current).length > PREF_MAX_BYTES) throw Object.assign(new Error('Preferências grandes demais.'), { status: 413 });
      const atualizado = new Date().toISOString();
      fs.mkdirSync(prefsDir, { recursive: true });
      await writeJsonAtomic(prefsFile(owner), { valores: current, atualizado });
      return { valores: current, atualizado };
    },
    remove: owner => fs.rmSync(prefsFile(owner), { force: true })
  };

  return { sessions, preferences };
}

module.exports = { createAccountStores };
