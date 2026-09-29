// Chama a ferramenta oficial do Foundry (@foundryvtt/foundryvtt-cli) pelo npx, sem node_modules no OneDrive.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CLI = '@foundryvtt/foundryvtt-cli@1';
// Com --in e --out explícitos o CLI ainda exige saber o pacote; o valor não muda os caminhos.
const packageArgs = ['--type', 'Module', '--id', 'cpr-2077'];

function fvtt(args) {
  // No Windows o npx é um .cmd: roda pelo shell. Os argumentos vão entre aspas por causa dos espaços nos caminhos.
  const quoted = args.map(arg => /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);
  execSync(['npx', '--yes', CLI, ...quoted].join(' '), { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

// Extrai um compêndio LevelDB para arquivos JSON. Copia o pacote antes: o Foundry aberto trava o original.
export function unpackPack(packDir, outDir) {
  const name = path.basename(packDir);
  const copyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cpr2077-'));
  const copy = path.join(copyRoot, name);
  fs.cpSync(packDir, copy, { recursive: true, filter: source => path.basename(source) !== 'LOCK' });
  fs.rmSync(outDir, { recursive: true, force: true });
  try {
    fvtt(['package', 'unpack', '-n', name, '--in', copyRoot, '--out', outDir, ...packageArgs]);
  } finally {
    fs.rmSync(copyRoot, { recursive: true, force: true });
  }
}

// Compila uma pasta de JSON num compêndio LevelDB.
export function packPack(name, jsonDir, packsDir) {
  fs.rmSync(path.join(packsDir, name), { recursive: true, force: true });
  fvtt(['package', 'pack', '-n', name, '--in', jsonDir, '--out', packsDir, ...packageArgs]);
}
