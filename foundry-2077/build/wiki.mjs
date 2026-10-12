// Lê os dados da wiki (os mesmos arquivos que a página carrega), sem copiar nada à mão.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { wikiDir } from './paths.mjs';

const require = createRequire(import.meta.url);
globalThis.window = globalThis.window || {};
for (const file of ['system-catalog.js', 'system-rules.js', 'system-net.js', 'system-2077.js', 'system-blackchrome.js', 'mestre-npcs.js']) require(path.join(wikiDir, file));

export const wiki = {
  weapons: window.system2077.data.weapons,
  cyberware: window.system2077.data.cyberware,
  net: window.systemNet.data,
  catalog: window.systemCatalog,
  blackChrome: window.systemBlackChrome.data,
  skills: window.systemRules.data.skills,
  npcs: window.npcStatBlocks.data,
  // A base da campanha (documentos/morana/base-da-campanha.md): quem é cada pessoa do elenco, para a ficha do ator.
  base: require(path.join(wikiDir, 'campanha-base.js')).ler(fs.readFileSync(path.join(wikiDir, 'documentos', 'morana', 'base-da-campanha.md'), 'utf8')),
  campanhaBase: require(path.join(wikiDir, 'campanha-base.js')),
  pages: { ...window.systemRules.pages, ...window.systemNet.pages, ...window.system2077.pages, ...window.npcStatBlocks.pages }
};
