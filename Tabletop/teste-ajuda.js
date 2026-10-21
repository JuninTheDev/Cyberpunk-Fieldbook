// O que os testes da mesa usam: o servidor de teste de verdade (testar.js) numa porta livre, com dados temporários e
// dados rolados de propósito (a fila), os eventos ao vivo de cada pessoa e as fichas de teste.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { iniciar } = require('./testar');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function montar(t, { prazoDefesa, tituloDoYoutube } = {}) {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-teste-'));
  const fila = [];
  // random(faces) devolve de 0 a faces-1; a fila guarda a face que deve sair (1 a faces). Sem fila, sai a face do meio,
  // para nenhum teste cair num crítico sem querer.
  const random = faces => (fila.length ? fila.shift() - 1 : Math.floor(faces / 2) - 1);
  // O título do vídeo do YouTube, sem ir à internet.
  const titulo = tituloDoYoutube || (async id => `Vídeo ${id}`);
  const mesa = await iniciar({ porta: 0, dados, semente: false, silencioso: true, random, prazoDefesa, tituloDoYoutube: titulo });
  const base = mesa.url.replace('localhost', '127.0.0.1');
  t.after(async () => { await mesa.fechar(); fs.rmSync(dados, { recursive: true, force: true }); });

  async function pedir(caminho, { method = 'GET', body, cookie, type, headers = {} } = {}) {
    const response = await fetch(base + caminho, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': type || 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body)
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* sem JSON */ }
    return { status: response.status, json, text, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
  }
  const op = (tipo, corpo = {}, cookie) => pedir('/api/mesa/op', { method: 'POST', body: { tipo, ...corpo }, cookie });
  async function jogador(nome, personagem) {
    const conta = await pedir('/api/contas', { method: 'POST', body: { nome } });
    assert.equal(conta.status, 201, conta.text);
    const login = await pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
    assert.equal(login.status, 200, login.text);
    const ficha = await pedir('/api/personagens', { method: 'POST', cookie: login.cookie, body: personagem });
    assert.equal(ficha.status, 201, ficha.text);
    return { cookie: login.cookie, conta: conta.json.conta, personagem: ficha.json.personagem };
  }
  // Os eventos ao vivo de uma pessoa (o mesmo /api/mesa/eventos do navegador).
  async function ouvir(cookie, campanha = '') {
    const controle = new AbortController();
    const response = await fetch(`${base}/api/mesa/eventos${campanha ? `?campanha=${campanha}` : ''}`, { headers: cookie ? { Cookie: cookie } : {}, signal: controle.signal });
    assert.equal(response.status, 200);
    const eventos = [];
    (async () => {
      const leitor = new TextDecoder();
      let resto = '';
      try {
        for await (const pedaco of response.body) {
          resto += leitor.decode(pedaco, { stream: true });
          let fim;
          while ((fim = resto.indexOf('\n\n')) >= 0) {
            const bloco = resto.slice(0, fim);
            resto = resto.slice(fim + 2);
            const evento = (bloco.match(/^event: (.*)$/m) || [])[1];
            const data = (bloco.match(/^data: (.*)$/m) || [])[1];
            if (evento) eventos.push({ evento, data: JSON.parse(data) });
          }
        }
      } catch { /* fechado */ }
    })();
    const esperar = async (achar, ms = 3000) => {
      const limite = Date.now() + ms;
      while (Date.now() < limite) {
        const achado = eventos.find(achar);
        if (achado) return achado;
        await sleep(20);
      }
      return null;
    };
    const estado = (await esperar(item => item.evento === 'estado')).data;
    t.after(() => controle.abort());
    return { eventos, esperar, estado, limpar: () => { eventos.length = 0; } };
  }
  return { mesa, dados, fila, pedir, op, jogador, ouvir };
}

const fichaJax = { nome: 'Jax "Ferrugem" Moreno', role: 'solo', stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6 }, resultado: { stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6 }, derivados: { hp: 45 }, pericias: [{ nome: 'Handgun', stat: 'REF', nivel: 6 }, { nome: 'Evasion', stat: 'DEX', nivel: 6 }] } };
const fichaNyx = { nome: 'Iris "Nyx" Tanaka', role: 'netrunner', stats: { REF: 6, INT: 8, MOVE: 5 }, resultado: { stats: { REF: 6, INT: 8, MOVE: 5 }, derivados: { hp: 40 }, pericias: [{ nome: 'Interface', stat: 'INT', nivel: 6 }] } };

async function cenaComTokens(m, ana, bruno, extra = {}) {
  const cena = (await m.op('cena.criar', { nome: 'Beco', largura: 2000, altura: 1500, grade: { tamanho: 100 }, ...extra })).json.resultado.cena;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 250, y: 150 })).json.resultado.token;
  const capanga = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 950, y: 750 })).json.resultado.token;
  const emboscada = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 1450, y: 350, escondido: true })).json.resultado.token;
  await m.op('token.editar', { token: capanga, notas: 'Trabalha para o Sato.' });
  return { cena, jax, nyx, capanga, emboscada };
}

module.exports = { sleep, montar, fichaJax, fichaNyx, cenaComTokens };
