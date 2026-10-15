// Abre o Microsoft Edge sem janela e controla a página pelo protocolo do DevTools.
// O perfil do Edge fica numa pasta temporária fora do OneDrive e é apagado no fim.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Fecha o Edge e apaga o perfil. No Windows, o msedge.exe lançado passa o navegador para outro processo e sai: matar o
// processo lançado não fecha nada, o navegador e os filhos dele (o renderizador, a GPU) seguram o perfil, que não se
// apaga, e continuam gravando nele (no ciclo 58, 49 perfis e 427 processos de rodadas anteriores encheram o disco). Por
// isso: o Browser.close pelo protocolo (o próprio Edge fecha os processos dele); depois, no Windows, o que ainda tiver
// este perfil na linha de comando; e o perfil tentado de novo enquanto o Edge solta os arquivos.
async function encerrar(proc, perfil, porta) {
  try {
    const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json();
    await new Promise(resolve => {
      const ws = new WebSocket(webSocketDebuggerUrl);
      const fim = setTimeout(resolve, 3000);
      const pronto = () => { clearTimeout(fim); resolve(); };
      ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      ws.onclose = pronto;
      ws.onerror = pronto;
    });
  } catch { /* o Edge já tinha fechado */ }
  proc.kill();
  if (process.platform === 'win32') {
    const filtro = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${path.basename(perfil)}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', filtro], { stdio: 'ignore' });
  }
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    try { fs.rmSync(perfil, { recursive: true, force: true }); return; } catch { /* o Edge ainda segura arquivos */ }
  }
  console.warn(`O perfil do Edge ficou em ${perfil}: apague à mão.`);
}

async function abrirEdge({ porta, saida, prefixo = '', largura = 1400, altura = 1000 }) {
  const edge = candidates.find(file => fs.existsSync(file));
  if (!edge) throw new Error('Microsoft Edge não encontrado.');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-testes-edge-'));
  const proc = spawn(edge, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, `--window-size=${largura},${altura}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json(); } catch { await sleep(250); }
  }
  if (!targets) { await encerrar(proc, perfil, porta); throw new Error('O Edge não abriu a porta de depuração.'); }
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
      // 403 da área do mestre é esperado nos testes da visão dos jogadores, e 409 no teste de conflito do criador;
      // os testes conferem essas respostas à parte.
      if (status >= 400 && status !== 403 && status !== 409 && !url.endsWith('favicon.ico')) erros.push(`http ${status} ${url}`);
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
  // Captura de tela é só para conferência visual: se o Edge sem janela demorar a desenhar o quadro, desiste em 10 s.
  const shot = async nome => {
    if (!saida) return;
    await send('Page.bringToFront');
    const response = await Promise.race([send('Page.captureScreenshot', { format: 'png' }), sleep(10000).then(() => null)]);
    if (response?.result?.data) fs.writeFileSync(path.join(saida, `${prefixo}${nome}.png`), Buffer.from(response.result.data, 'base64'));
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
    await encerrar(proc, perfil, porta);
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
