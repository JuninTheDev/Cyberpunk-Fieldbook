// Instala o Fluxo de Combate na pasta de módulos do Foundry: copia o manifesto, os scripts, o estilo e os ícones.
// Também tira o Evasion Workflow (cpred-evasion-workflow), que fazia o mesmo: dois módulos respondendo ao mesmo
// ataque pediriam a esquiva duas vezes. Uso: node instalar.mjs   (FOUNDRY_DATA=... troca a pasta Data do Foundry)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = path.dirname(fileURLToPath(import.meta.url));
const manifesto = JSON.parse(fs.readFileSync(path.join(fonte, 'module.json'), 'utf8'));
const data = process.env.FOUNDRY_DATA || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'FoundryVTT', 'Data');
const modulos = path.join(data, 'modules');
const destino = path.join(modulos, manifesto.id);

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });
for (const item of ['module.json', 'README.md', 'scripts', 'styles', 'icones']) {
  if (fs.existsSync(path.join(fonte, item))) fs.cpSync(path.join(fonte, item), path.join(destino, item), { recursive: true });
}
console.log(`${manifesto.title} ${manifesto.version} instalado em ${destino}`);

const antigo = path.join(modulos, 'cpred-evasion-workflow');
if (fs.existsSync(antigo)) {
  fs.rmSync(antigo, { recursive: true, force: true });
  console.log(`Evasion Workflow removido de ${antigo} (o Fluxo de Combate faz o mesmo)`);
}
