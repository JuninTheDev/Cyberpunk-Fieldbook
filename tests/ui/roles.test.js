// Conferência opcional no Edge, com porta HTTP e depuração escolhidas pelo sistema e perfil próprio.
// Não entra em tests/validar.js. Uso: node --test tests/ui/roles.test.js
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

test('criador salva duas Roles e a ficha as mostra no computador e no celular', { timeout: 60000 }, async t => {
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(arquivo => fs.existsSync(arquivo));
  if (!edge) { t.skip('Microsoft Edge não está instalado.'); return; }
  const wiki = criarServidorIsolado(t);
  const servidor = http.createServer(wiki.atender);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'fieldbook-roles-ui-'));
  let processo;
  let browser;
  let pagina;
  const pendentes = new Map();
  let sequencia = 0;
  const erros = [];
  const protocolo = [];
  let registroEdge = '';
  try {
    await new Promise((resolve, reject) => { servidor.once('error', reject); servidor.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${servidor.address().port}`;
    processo = spawn(edge, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--window-size=1400,1000', '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    processo.stderr.on('data', trecho => { registroEdge = (registroEdge + trecho.toString()).slice(-1500); });
    processo.once('error', erro => erros.push(erro.message));
    const ativo = path.join(perfil, 'DevToolsActivePort');
    for (let i = 0; i < 80 && !fs.existsSync(ativo); i++) await esperar(100);
    assert.ok(fs.existsSync(ativo), `Edge não iniciou: ${erros.join('; ')}`);
    const [porta, endereco] = fs.readFileSync(ativo, 'utf8').trim().split(/\r?\n/);
    browser = new WebSocket(`ws://127.0.0.1:${porta}${endereco}`);
    await new Promise((resolve, reject) => { browser.onopen = resolve; browser.onerror = reject; });
    const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })).json();
    pagina = new WebSocket(alvo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { pagina.onopen = resolve; pagina.onerror = reject; });
    pagina.onmessage = evento => {
      const mensagem = JSON.parse(evento.data);
      protocolo.push(mensagem.id || mensagem.method || 'mensagem');
      if (mensagem.id && pendentes.has(mensagem.id)) {
        const { resolve, reject, prazo } = pendentes.get(mensagem.id);
        clearTimeout(prazo);
        pendentes.delete(mensagem.id);
        if (mensagem.error) reject(new Error(mensagem.error.message)); else resolve(mensagem.result);
      }
      if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails.exception?.description || mensagem.params.exceptionDetails.text);
    };
    pagina.onclose = evento => {
      for (const { reject, prazo } of pendentes.values()) {
        clearTimeout(prazo);
        reject(new Error(`A conexão com a página do Edge fechou (${evento.code}: ${evento.reason || 'sem motivo'}). ${registroEdge}`));
      }
      pendentes.clear();
    };
    const comando = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequencia;
      const prazo = setTimeout(() => { pendentes.delete(id); reject(new Error(`DevTools não respondeu a ${method} (socket ${pagina.readyState}; mensagens: ${protocolo.slice(-5).join(', ')}).`)); }, 10000);
      pendentes.set(id, { resolve, reject, prazo });
      pagina.send(JSON.stringify({ id, method, params }));
    });
    const avaliar = async expression => {
      const resposta = await comando('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (resposta.exceptionDetails) throw new Error(resposta.exceptionDetails.exception?.description || resposta.exceptionDetails.text);
      return resposta.result.value;
    };
    const ate = async expression => {
      for (let i = 0; i < 60; i++) {
        if (await avaliar(expression).catch(() => false)) return;
        await esperar(100);
      }
      throw new Error(`A página não chegou ao estado esperado: ${expression}`);
    };
    await comando('Runtime.enable');
    await comando('Network.enable');
    await comando('Network.setBlockedURLs', { urls: ['https://*'] });
    await comando('Page.enable');
    await comando('Emulation.setFocusEmulationEnabled', { enabled: true });
    await comando('Page.bringToFront');
    await comando('Page.navigate', { url: base });
    await ate('!!window.wikiApp');
    await avaliar(`fetch('/api/mestre/entrar', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:${JSON.stringify(wiki.senha)}})}).then(r=>r.json())`);
    await comando('Page.navigate', { url: `${base}/index.html#personagens` });
    await ate('!!window.wikiApp && !!window.characterCreator');
    const doc = await avaliar("fetch('/api/personagens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:'Teste duas Roles',role:'solo',metodo:'pacote'})}).then(r=>r.json()).then(r=>r.personagem)");
    assert.ok(doc.id);
    await avaliar(`wikiApp.openPage('criador',{section:${JSON.stringify(doc.id)}})`);
    await ate('!!document.querySelector("[data-role-secondary]")');
    await avaliar(`(() => {const s=document.querySelector('[data-role-secondary]');s.value='medtech';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await ate('!!document.querySelector("[data-role-rank=secundaria]")');
    await avaliar(`(() => {const s=document.querySelector('[data-role-rank=secundaria]');s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await avaliar(`document.querySelector('[data-role-context="medtech"] [data-hab-plus="Surgery"]').click()`);
    await ate(`document.querySelector('[data-role-context="medtech"]').textContent.includes('Pontos: 1 de 2')`);
    await ate(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem.roleSecundaria?.rank===2&&r.personagem.roleSecundaria?.habilidades?.Surgery===1)`);
    const salva = await avaliar(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem)`);
    assert.equal(salva.role, 'solo');
    assert.deepEqual(salva.resultado.roles.map(({ id, rank }) => ({ id, rank })), [{ id: 'solo', rank: 4 }, { id: 'medtech', rank: 2 }]);
    await avaliar(`wikiApp.openPage('ficha',{section:${JSON.stringify(doc.id)}})`);
    await ate('!!document.querySelector("[data-cc-sheet-body]")');
    const texto = await avaliar('document.querySelector("[data-cc-sheet-body]").textContent');
    assert.match(texto, /Solo.*Rank 4/s);
    assert.match(texto, /Medtech.*Rank 2/s);
    await comando('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
    await esperar(200);
    assert.equal(await avaliar('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'A ficha não deve criar rolagem lateral no celular.');
    assert.deepEqual(erros, []);
  } finally {
    for (const { prazo } of pendentes.values()) clearTimeout(prazo);
    pagina?.close();
    if (browser?.readyState === WebSocket.OPEN) {
      await new Promise(resolve => {
        const prazo = setTimeout(resolve, 3000);
        browser.onclose = () => { clearTimeout(prazo); resolve(); };
        browser.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      });
    }
    browser?.close();
    processo?.kill();
    servidor.closeAllConnections();
    await new Promise(resolve => servidor.close(resolve));
    assert.equal(path.dirname(perfil), path.resolve(os.tmpdir()));
    assert.match(path.basename(perfil), /^fieldbook-roles-ui-/);
    for (let i = 0; ; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); break; }
      catch (erro) { if (i >= 15) throw erro; await esperar(200); }
    }
  }
});
