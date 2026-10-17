// Navegador opcional: usa somente servidor, perfil e processos criados por este teste.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { criarServidorIsolado } = require('./servidor-isolado');
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function comNavegadorIsolado(t, verificar) {
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(arquivo => fs.existsSync(arquivo));
  if (!edge) { t.skip('Microsoft Edge não está instalado.'); return; }
  const wiki = criarServidorIsolado(t);
  const servidor = http.createServer(wiki.atender);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'fieldbook-cyber-ui-'));
  let processo, browser, pagina;
  const pendentes = new Map();
  let sequencia = 0, registroEdge = '';
  const erros = [];
  try {
    await new Promise((resolve, reject) => { servidor.once('error', reject); servidor.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${servidor.address().port}`;
    processo = spawn(edge, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--window-size=1440,1100', '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
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
      if (mensagem.id && pendentes.has(mensagem.id)) {
        const { resolve, reject, prazo } = pendentes.get(mensagem.id);
        clearTimeout(prazo); pendentes.delete(mensagem.id);
        if (mensagem.error) reject(new Error(mensagem.error.message)); else resolve(mensagem.result);
      }
      if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails.exception?.description || mensagem.params.exceptionDetails.text);
    };
    pagina.onclose = evento => {
      for (const { reject, prazo } of pendentes.values()) {
        clearTimeout(prazo); reject(new Error(`Edge fechou (${evento.code}). ${registroEdge}`));
      }
      pendentes.clear();
    };
    const comando = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequencia;
      const prazo = setTimeout(() => { pendentes.delete(id); reject(new Error(`DevTools não respondeu a ${method}. ${registroEdge}`)); }, 10000);
      pendentes.set(id, { resolve, reject, prazo });
      pagina.send(JSON.stringify({ id, method, params }));
    });
    const avaliar = async expression => {
      const resposta = await comando('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (resposta.exceptionDetails) throw new Error(resposta.exceptionDetails.exception?.description || resposta.exceptionDetails.text);
      return resposta.result.value;
    };
    const ate = async expression => {
      for (let i = 0; i < 80; i++) {
        if (await avaliar(expression).catch(() => false)) return;
        await esperar(100);
      }
      throw new Error(`A página não chegou ao estado esperado: ${expression}`);
    };
    const captura = async (nome, seletor) => {
      const clip = await avaliar(`(() => { const r=document.querySelector(${JSON.stringify(seletor)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()`);
      const png = await comando('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
      const saida = path.resolve(__dirname, '../.saida');
      fs.mkdirSync(saida, { recursive: true });
      const arquivo = path.join(saida, `${nome}.png`);
      fs.writeFileSync(arquivo, Buffer.from(png.data, 'base64'));
      return arquivo;
    };
    await comando('Runtime.enable'); await comando('Network.enable');
    await comando('Network.setBlockedURLs', { urls: ['https://*'] });
    await comando('Page.enable');
    await comando('Emulation.setFocusEmulationEnabled', { enabled: true });
    await comando('Page.bringToFront');
    await comando('Page.navigate', { url: base });
    await ate('!!window.wikiApp');
    await avaliar(`fetch('/api/mestre/entrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:${JSON.stringify(wiki.senha)}})}).then(r=>r.json())`);
    await comando('Page.navigate', { url: `${base}/index.html#personagens` });
    await ate('!!window.wikiApp && !!window.characterCreator && !!window.characterCyberware');
    await verificar({ wiki, base, comando, avaliar, ate, captura, esperar });
    assert.deepEqual(erros, [], 'A página não deve lançar erros de JavaScript.');
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
    browser?.close(); processo?.kill();
    servidor.closeAllConnections();
    await new Promise(resolve => servidor.close(resolve));
    assert.equal(path.dirname(perfil), path.resolve(os.tmpdir()));
    assert.match(path.basename(perfil), /^fieldbook-cyber-ui-/);
    for (let i = 0; ; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); break; }
      catch (erro) { if (i >= 15) throw erro; await esperar(200); }
    }
  }
}
module.exports = { comNavegadorIsolado };
