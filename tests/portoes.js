// Os portões do sistema numa ordem só, com a lista dos arquivos num lugar só (a fase 2 da auditoria de 2026-11-16): o G1
// (a sintaxe), o G2 (o lint) e o G3 (as regras); com --g4, o G4 (o Foundry 14); com --servidor, o teste dos scripts do
// servidor (quando um servidor/*.sh muda). O AGENTS.md e o QUALITY_GATES apontam para cá.
// Uso: node tests/portoes.js [--g4] [--servidor]
// Neste PC, o G4 usa o Foundry 14 e o Node 24 da pasta descartável (%LOCALAPPDATA%\FieldbookTeste\foundry14-app e
// node24\node.exe), quando o FOUNDRY14_APP não vem de fora. Sai com 1 se algum portão falhou, e com 2 se o G4 pulou a
// parte do Foundry (o C54: não vale como portão).
const { spawnSync, execFile } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const pedidos = new Set(process.argv.slice(2));
const relativo = arquivo => path.relative(raiz, arquivo).replace(/\\/g, '/');

// Os arquivos do G1 e do G2: o sistema (sem o .cache/ e o packs/), os testes de regra, as bibliotecas e o cenário do G4.
function mjsDe(pasta) {
  const achados = [];
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) { if (!['.cache', 'packs', 'node_modules'].includes(item.name)) achados.push(...mjsDe(caminho)); } else if (item.name.endsWith('.mjs')) achados.push(caminho);
  }
  return achados;
}
const bibliotecas = () => [
  ...['tests/lib/foundry14.js', 'tests/lib/trava.js', 'tests/lib/relatorio.js', 'tests/lib/foundry.js', 'tests/lib/edge.js', 'tests/rodar.js', 'tests/cenarios/v14.js'].map(f => path.join(raiz, f)),
  ...fs.readdirSync(path.join(raiz, 'tests', 'lib')).filter(f => /^c(34|41)-.*\.js$/.test(f)).map(f => path.join(raiz, 'tests', 'lib', f))
].filter(f => fs.existsSync(f));
const arquivosDoG1 = () => [...mjsDe(path.join(raiz, 'foundry-sistema')), ...mjsDe(path.join(raiz, 'tests', 'sistema')), ...bibliotecas()];

const resultados = [];
async function portao(nome, fn) {
  const inicio = Date.now();
  const { ok, detalhe, codigo = ok ? 0 : 1 } = await fn();
  resultados.push({ nome, ok, codigo, detalhe, s: Math.round((Date.now() - inicio) / 1000) });
  console.log(`${ok ? '✓' : codigo === 2 ? '–' : '✗'} ${nome} (${Math.round((Date.now() - inicio) / 1000)} s): ${detalhe}`);
}
const rodar = (comando, args, opcoes = {}) => spawnSync(comando, args, { cwd: raiz, encoding: 'utf8', ...opcoes });
const ultimas = (texto, n = 6) => String(texto || '').trim().split('\n').slice(-n).join(' | ');

// O node --check de cada arquivo, vários ao mesmo tempo (um por núcleo): o mesmo teste, sem esperar um de cada vez (o C104).
function checarSintaxe(arquivos) {
  const fila = [...arquivos];
  const ruins = [];
  const trabalhador = () => new Promise(fim => {
    const proximo = () => {
      const arquivo = fila.shift();
      if (!arquivo) return fim();
      execFile(process.execPath, ['--check', arquivo], { cwd: raiz }, erro => { if (erro) ruins.push(arquivo); proximo(); });
    };
    proximo();
  });
  const juntos = Math.max(1, Math.min(os.availableParallelism?.() ?? os.cpus().length, 16));
  return Promise.all(Array.from({ length: juntos }, trabalhador)).then(() => ruins.sort());
}
module.exports = { checarSintaxe, arquivosDoG1 };

// Os portões rodam só pela linha de comando (o teste do G3 importa o checarSintaxe).
if (require.main === module) (async () => {
await portao('G1, sintaxe', async () => {
  const arquivos = arquivosDoG1();
  const ruins = (await checarSintaxe(arquivos)).map(relativo);
  return { ok: !ruins.length, detalhe: ruins.length ? `com erro: ${ruins.join(', ')}` : `${arquivos.length} arquivos` };
});
await portao('G2, lint', () => {
  const alvos = ['foundry-sistema', 'tests/sistema', ...bibliotecas().map(relativo)];
  const r = rodar('npx', ['--yes', 'eslint@10.12.0', ...alvos], { shell: process.platform === 'win32' });
  return { ok: r.status === 0, detalhe: r.status === 0 ? 'sem erros' : ultimas(r.stdout + r.stderr) };
});
await portao('G3, regras', () => {
  const r = rodar(process.execPath, ['--test', 'tests/sistema/*.test.mjs']);
  const conta = chave => (String(r.stdout).match(new RegExp(`ℹ ${chave} (\\d+)`)) || [])[1];
  return { ok: r.status === 0, detalhe: `${conta('pass') ?? '?'}/${conta('tests') ?? '?'}${r.status === 0 ? '' : `: ${ultimas(r.stdout, 4)}`}` };
});
if (pedidos.has('--servidor')) {
  await portao('Servidor', () => {
    const r = rodar(process.execPath, ['--test', 'tests/isolados/servidor-sistema.test.js']);
    const pulados = Number((String(r.stdout).match(/ℹ skipped (\d+)/) || [])[1] || 0);
    // Sem o bash, o teste pula: aqui, quando foi pedido, pular não vale.
    return { ok: r.status === 0 && !pulados, codigo: r.status === 0 && pulados ? 2 : undefined, detalhe: pulados ? `${pulados} pulado(s): falta o Git Bash` : ultimas(r.stdout, 3) };
  });
}
if (pedidos.has('--g4')) {
  await portao('G4, Foundry 14', () => {
    const descartavel = path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste');
    const env = { ...process.env };
    if (!env.FOUNDRY14_APP && fs.existsSync(path.join(descartavel, 'foundry14-app'))) env.FOUNDRY14_APP = path.join(descartavel, 'foundry14-app');
    const node24 = path.join(descartavel, 'node24', process.platform === 'win32' ? 'node.exe' : 'bin/node');
    const r = rodar(fs.existsSync(node24) ? node24 : process.execPath, ['tests/rodar.js', 'v14'], { env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    const linha = (String(r.stdout).match(/^[✓✗–] v14 \([^)]*\)/m) || [''])[0];
    return { ok: r.status === 0, codigo: r.status, detalhe: `${linha}${r.status === 0 ? '' : ` | ${ultimas(r.stdout, 4)}`}` };
  });
}

const falhou = resultados.some(r => !r.ok && r.codigo !== 2);
const pulou = resultados.some(r => r.codigo === 2);
console.log(falhou ? '\nAlgum portão falhou.' : pulou ? '\nOs portões rodados passaram, mas houve parte pulada: não vale como portão.' : '\nOs portões passaram.');
process.exit(falhou ? 1 : pulou ? 2 : 0);
})().catch(erro => { console.error(erro); process.exit(1); });
