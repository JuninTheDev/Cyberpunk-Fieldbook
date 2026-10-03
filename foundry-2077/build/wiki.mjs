// Lê os dados da wiki (os mesmos arquivos que a página carrega), sem copiar nada à mão.
import { createRequire } from 'node:module';
import path from 'node:path';
import { wikiDir } from './paths.mjs';

const require = createRequire(import.meta.url);
globalThis.window = globalThis.window || {};
for (const file of ['system-catalog.js', 'system-rules.js', 'system-net.js', 'system-2077.js', 'mestre-npcs.js']) require(path.join(wikiDir, file));

export const wiki = {
  weapons: window.system2077.data.weapons,
  cyberware: window.system2077.data.cyberware,
  net: window.systemNet.data,
  catalog: window.systemCatalog,
  skills: window.systemRules.data.skills,
  npcs: window.npcStatBlocks.data,
  pages: { ...window.systemRules.pages, ...window.systemNet.pages, ...window.system2077.pages, ...window.npcStatBlocks.pages }
};
