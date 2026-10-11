// Instala o sistema Cyberpunk RED — Fieldbook na pasta de sistemas do Foundry 14: copia o manifesto, os scripts, os
// templates, o estilo, a tradução, os ícones, os dados e os compêndios. Os compêndios (packs/, fora do git) são gerados
// de novo quando o catálogo ou o build deles mudam (precisa do npx na primeira vez).
// Uso: node instalar.mjs   (FOUNDRY_DATA=... troca a pasta Data do Foundry; só instala se ela for de um Foundry 14)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fonte = path.dirname(fileURLToPath(import.meta.url));
const manifesto = JSON.parse(fs.readFileSync(path.join(fonte, 'system.json'), 'utf8'));
const data = process.env.FOUNDRY_DATA || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'FoundryVTT', 'Data');
const destino = path.join(data, 'systems', manifesto.id);

// Só instala num Foundry 14: o sistema não roda no 12, e a mesa real (no servidor) é Foundry 12. A versão sai do log do
// próprio Foundry ao lado da pasta Data ("Foundry Virtual Tabletop - Version 14 Build 369"), do log mais recente. Uma
// pasta que nunca abriu um Foundry não tem log: aí vale FOUNDRY_VERSAO=14 (o teste usa, porque cria a pasta).
function versaoDaPasta(pastaData) {
  const logs = path.join(pastaData, '..', 'Logs');
  if (!fs.existsSync(logs)) return null;
  const arquivos = fs.readdirSync(logs).filter(nome => nome.endsWith('.log')).map(nome => path.join(logs, nome))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const arquivo of arquivos) {
    const versoes = [...fs.readFileSync(arquivo, 'utf8').matchAll(/Foundry Virtual Tabletop - Version (\d+) Build \d+/g)];
    if (versoes.length) return Number(versoes.at(-1)[1]);
  }
  return null;
}
const geracao = Number(process.env.FOUNDRY_VERSAO) || versaoDaPasta(data);
if (geracao !== 14) {
  console.error(geracao
    ? `A pasta ${data} é de um Foundry ${geracao}: este sistema é só para o Foundry 14. Nada foi instalado.`
    : `Não sei a versão do Foundry de ${data} (não achei o log dele). Se for um Foundry 14, rode de novo com FOUNDRY_VERSAO=14. Nada foi instalado.`);
  process.exit(1);
}

const mudou = arquivo => fs.statSync(path.join(fonte, arquivo)).mtimeMs;
const marca = path.join(fonte, 'packs', '.gerado');
if (!fs.existsSync(marca) || fs.statSync(marca).mtimeMs < Math.max(mudou('dados/catalogo.json'), mudou('build/compendios.mjs'), mudou('system.json'))) {
  const { gerar } = await import('./build/compendios.mjs');
  console.log(`Compêndios: ${Object.entries(gerar()).map(([nome, n]) => `${nome} ${n}`).join(' · ')}`);
}

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });
for (const item of ['system.json', 'README.md', 'scripts', 'templates', 'styles', 'lang', 'icones', 'dados', 'packs']) {
  if (fs.existsSync(path.join(fonte, item))) fs.cpSync(path.join(fonte, item), path.join(destino, item), { recursive: true, filter: origem => path.basename(origem) !== '.gerado' });
}
console.log(`${manifesto.title} ${manifesto.version} instalado em ${destino}`);
