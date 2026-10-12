// Extrai para .cache/core os compêndios do sistema que o build usa como referência:
// formato dos documentos, ícones, perícias, armas e armaduras dos NPCs, classes de veículo e tabelas de DV,
// e os itens do Black Chrome e do Black Chrome Plus para a loja da wiki.
// Uso: node build/extract-core.mjs
import fs from 'node:fs';
import path from 'node:path';
import { unpackPack } from './cli.mjs';
import { cacheDir, systemDir } from './paths.mjs';

const packs = [
  'core/weapons', 'core/armor', 'core/cyberware', 'core/vehicles', 'core/ammo', 'core/programs', 'core/gear',
  'core/upgrades', 'core/drugs', 'core/clothing', 'internal/skills', 'internal/dv-tables', 'internal/cyberware-core',
  'black-chrome/vehicles', 'black-chrome/weapons', 'black-chrome/ammo', 'black-chrome/armor', 'black-chrome/clothing',
  'black-chrome/cyberware', 'black-chrome/gear', 'black-chrome/upgrades', 'dlc/black-chrome-plus', 'dlc/spinning-your-wheels', 'dlc/woodchippers-garage', 'core/roles',
  'core/skills-languages', 'core/skills-local-expert', 'core/skills-science',
  'core/skills-martial-arts', 'core/skills-play-instrument'
];

if (!fs.existsSync(systemDir)) throw new Error(`Sistema não encontrado em ${systemDir}`);
const system = JSON.parse(fs.readFileSync(path.join(systemDir, 'system.json'), 'utf8'));
for (const pack of packs) {
  const out = path.join(cacheDir, 'core', pack.replace('/', '_'));
  unpackPack(path.join(systemDir, 'packs', pack), out);
  console.log(`${pack}: ${fs.readdirSync(out).length} documentos`);
}
fs.writeFileSync(path.join(cacheDir, 'core', 'versao.json'), JSON.stringify({ system: system.id, version: system.version }, null, 2));
console.log(`Sistema ${system.id} ${system.version}`);
