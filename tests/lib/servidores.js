// Sobe dois servidores da wiki só para os testes:
//   local (127.0.0.1:8765)       → visão do mestre, como no computador do mestre;
//   rede  (0.0.0.0:8766, GM_KEY) → acessado pelo IP da rede, como o celular de um jogador.
// Usa portas próprias, então não mexe no servidor da mesa (porta 8000).
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { sleep } = require('./edge');

const raiz = path.resolve(__dirname, '..', '..');
const SENHA_MESTRE = 'teste123';

const portaLivre = porta => new Promise(resolve => {
  const tester = net.createServer().once('error', () => resolve(false)).once('listening', () => tester.close(() => resolve(true))).listen(porta, '0.0.0.0');
});

function ipDaRede() {
  const ips = Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal);
  return ips[0]?.address || null;
}

async function subir(porta, env, pasta = raiz) {
  if (!(await portaLivre(porta))) throw new Error(`A porta ${porta} está em uso. Feche o que estiver nela e rode os testes de novo.`);
  const proc = spawn(process.execPath, ['server.js'], { cwd: pasta, env: { ...process.env, ...env, PORT: String(porta) }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    try { await fetch(`http://127.0.0.1:${porta}/`); return proc; } catch { /* ainda subindo */ }
  }
  proc.kill();
  throw new Error(`O servidor de teste não subiu na porta ${porta}.`);
}

async function subirServidores() {
  const ip = ipDaRede();
  // Contas e personagens dos testes ficam numa pasta temporária, compartilhada pelos dois servidores.
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-dados-'));
  const local = await subir(8765, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados });
  const rede = ip ? await subir(8766, { HOST: '0.0.0.0', GM_KEY: SENHA_MESTRE, DADOS_PERSONAGENS: dados }) : null;
  return {
    local: 'http://127.0.0.1:8765',
    rede: ip ? `http://${ip}:8766` : null,
    redeLocal: 'http://127.0.0.1:8766',
    senhaMestre: SENHA_MESTRE,
    raiz,
    dados,
    parar: async () => { local.kill(); if (rede) rede.kill(); await sleep(300); fs.rmSync(dados, { recursive: true, force: true }); }
  };
}

module.exports = { subirServidores, subir };
