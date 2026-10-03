// Abre o Microsoft Edge sem janela e controla a página pelo protocolo do DevTools.
// O perfil do Edge fica numa pasta temporária fora do OneDrive e é apagado no fim.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function abrirEdge({ porta, saida, prefixo = '', largura = 1400, altura = 1000 }) {
  const edge = candidates.find(file => fs.existsSync(file));
  if (!edge) throw new Error('Microsoft Edge não encontrado.');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-testes-edge-'));
  const proc = spawn(edge, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, `--window-size=${largura},${altura}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json(); } catch { await sleep(250); }
  }
  if (!targets) { proc.kill(); throw new Error('O Edge não abriu a porta de depuração.'); }
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let id = 0;
  const pending = {};
  const erros = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending[message.id]) { pending[message.id](message); delete pending[message.id]; }
    if (message.method === 'Runtime.exceptionThrown') erros.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') erros.push(`console: ${message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ')}`);
    if (message.method === 'Network.responseReceived') {
      const { status, url } = message.params.response;
      // 403 da área do mestre é esperado nos testes da visão dos jogadores; os testes conferem isso à parte.
      if (status >= 400 && status !== 403 && !url.endsWith('favicon.ico')) erros.push(`http ${status} ${url}`);
    }
  };
  const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending[i] = resolve; ws.send(JSON.stringify({ id: i, method, params })); });

  // Avalia uma expressão na página. Um erro de JS vira exceção aqui (e a checagem falha com a mensagem).
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const details = response.result?.exceptionDetails;
    if (details) throw new Error(details.exception?.description?.split('\n')[0] || details.text);
    return response.result?.result?.value;
  };
  const shot = async nome => {
    if (!saida) return;
    const response = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(saida, `${prefixo}${nome}.png`), Buffer.from(response.result.data, 'base64'));
  };
  // Abre um endereço e espera a wiki montar a primeira página (e pré-carregar os documentos .md).
  const ir = async (url, espera = 1500) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      await sleep(200);
      try { if (await evaluate('!!(window.wikiApp && document.querySelector("#content h2"))')) break; } catch { /* página ainda carregando */ }
    }
    await sleep(espera);
  };
  const celular = async ligado => {
    if (ligado) await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
    else await send('Emulation.clearDeviceMetricsOverride');
  };
  const fechar = async () => {
    try { ws.close(); } catch { /* já fechado */ }
    proc.kill();
    await sleep(500);
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* o Edge às vezes segura arquivos por um instante */ }
  };

  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  // Sem janela, a aba às vezes fica "oculta" e o navegador pausa a rolagem suave e o requestAnimationFrame.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.bringToFront');
  return { send, evaluate, shot, ir, celular, fechar, erros, sleep };
}

module.exports = { abrirEdge, sleep };
