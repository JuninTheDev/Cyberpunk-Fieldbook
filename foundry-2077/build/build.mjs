// Gera o módulo cpr-2077 a partir da wiki e grava direto na pasta de módulos do Foundry.
// Uso (com o mundo fechado): node build/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { buildWeapons } from './armas.mjs';
import { packPack } from './cli.mjs';
import { buildCyberware } from './cyberware.mjs';
import { buildJournals } from './diarios.mjs';
import { applyEffects, effectItemNames } from './efeitos.mjs';
import { corePack, macroDoc, slug } from './lib.mjs';
import { buildNet } from './net.mjs';
import { buildNpcs, checkNpcSkills } from './npcs.mjs';
import { buildArchitectures } from './arquiteturas.mjs';
import { buildCatalog } from './loja.mjs';
import { buildRoles } from './roles.mjs';
import { cacheDir, moduleDir, sourceDir, systemDir } from './paths.mjs';
import { buildVehicles } from './veiculos.mjs';

if (!fs.existsSync(path.join(cacheDir, 'core', 'versao.json'))) {
  console.error('Rode antes: node build/extract-core.mjs');
  process.exit(1);
}

// ---------------- Documentos ----------------
// Os efeitos entram antes de os NPCs copiarem as armas de 2077.
const withEffects = docs => docs.map(doc => doc._key.startsWith('!items!') ? applyEffects(doc) : doc);
const weapons = withEffects(buildWeapons());
const macros = [
  ['Ricochete', 'icons/svg/explosion.svg', 'ricochete'],
  ['Carregar arma Tech', 'icons/svg/lightning.svg', 'carregarTech']
].map(([name, img, fn]) => macroDoc({ seed: `macro:${fn}`, name, img, command: `// Selecione o token do personagem antes de rodar.\ngame.modules.get('cpr-2077')?.api?.${fn}();` }));

const packs = {
  'armas-2077': weapons,
  'cyberware-2077': withEffects(buildCyberware()),
  // As arquiteturas da campanha entram no compêndio de netrunning (o NET Architect lista os itens netarch dele).
  'netrunning-2077': [...withEffects(buildNet()), ...buildArchitectures()],
  'veiculos-2077': buildVehicles(),
  'npcs-2077': buildNpcs(weapons),
  'roles-2077': buildRoles(),
  'regras-2077': buildJournals(),
  'macros-2077': macros
};

// ---------------- Conferências ----------------
// Valores aceitos pelo sistema, lidos do próprio config.js dele.
const config = fs.readFileSync(path.join(systemDir, 'modules', 'system', 'config.js'), 'utf8');
const keysOf = name => new Set([...(config.match(new RegExp(`CPR\\.${name} = \\{([\\s\\S]*?)\\};`)) || [, ''])[1].matchAll(/^\s*"?(\w+)"?:/gm)].map(match => match[1]));
const allowed = {
  weaponType: keysOf('weaponTypes'), cyberwareType: keysOf('cyberwareTypes'), install: keysOf('cyberwareInstallList'),
  quality: keysOf('itemQuality'), ammo: keysOf('ammoVarieties'), usage: keysOf('effectUses'),
  effectCategories: keysOf('activeEffectCategories'),
  // Todas as chaves de efeito do sistema: "bonuses.x" e "system.stats.x.value" dentro de CPR.activeEffectKeys.
  effectKeys: new Set([...(config.match(/CPR\.activeEffectKeys = \{([\s\S]*?)\n\};/) || [, ''])[1].matchAll(/"((?:bonuses|system)\.[\w.]+)"/g)].map(match => match[1]))
};
const skillNames = new Set(corePack('internal_skills').map(skill => skill.name));
const dvTables = new Set(corePack('internal_dv-tables').map(table => table.name));
const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };

for (const [pack, docs] of Object.entries(packs)) {
  const ids = new Set();
  for (const doc of docs) {
    check(!ids.has(doc._id), `${pack}: ID repetido ${doc._id} (${doc.name})`);
    ids.add(doc._id);
    const items = doc._key.startsWith('!items!') ? [doc] : doc._key.startsWith('!actors!') ? doc.items : [];
    for (const item of items) {
      const s = item.system;
      const where = `${pack} › ${doc.name}${item === doc ? '' : ` › ${item.name}`}`;
      if (item.type === 'weapon' || (item.type === 'cyberware' && s.isWeapon)) {
        check(allowed.weaponType.has(s.weaponType), `${where}: weaponType ${s.weaponType}`);
        check(skillNames.has(s.weaponSkill), `${where}: perícia ${s.weaponSkill}`);
        check(!s.dvTable || dvTables.has(s.dvTable), `${where}: tabela de DV ${s.dvTable}`);
        check(/^\d+d6$/.test(s.damage), `${where}: dano ${s.damage}`);
        check((s.ammoVariety || []).every(variety => allowed.ammo.has(variety)), `${where}: munição ${s.ammoVariety}`);
      }
      if (item.type === 'cyberware') {
        check(allowed.cyberwareType.has(s.type), `${where}: tipo de cyberware ${s.type}`);
        check(allowed.install.has(s.installLocation), `${where}: instalação ${s.installLocation}`);
      }
      if ('quality' in s) check(allowed.quality.has(s.quality), `${where}: qualidade ${s.quality}`);
      if ('price' in s) check(Number.isFinite(s.price.market), `${where}: preço ${s.price.market}`);
      // Efeitos: chave e categoria existentes no sistema, uso válido e _key de cada efeito.
      if (item.effects?.length) check(allowed.usage.has(s.usage), `${where}: uso ${s.usage}`);
      for (const effect of item.effects || []) {
        check(effect._key?.endsWith(`${item._id}.${effect._id}`), `${where} › ${effect.name}: _key ${effect._key}`);
        effect.changes.forEach((change, index) => {
          const cat = effect.flags['cyberpunk-red-core'].changes.cats[index];
          check(allowed.effectKeys.has(change.key), `${where} › ${effect.name}: chave ${change.key}`);
          check(allowed.effectCategories.has(cat), `${where} › ${effect.name}: categoria ${cat}`);
        });
      }
    }
  }
}
// Todo item da tabela de efeitos tem de existir num compêndio (pega nome digitado errado).
const itemNames = new Set(Object.values(packs).flat().map(doc => doc.name));
for (const name of effectItemNames()) check(itemNames.has(name), `efeitos: não existe item "${name}"`);
problems.push(...checkNpcSkills(packs['npcs-2077']));
if (problems.length) {
  console.error(`Build interrompido: ${problems.length} problema(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

// ---------------- Escrita ----------------
const srcRoot = path.join(cacheDir, 'src');
fs.rmSync(srcRoot, { recursive: true, force: true });
fs.mkdirSync(moduleDir, { recursive: true });
const packsDir = path.join(moduleDir, 'packs');
for (const [pack, docs] of Object.entries(packs)) {
  const dir = path.join(srcRoot, pack);
  fs.mkdirSync(dir, { recursive: true });
  for (const doc of docs) fs.writeFileSync(path.join(dir, `${slug(doc.name).slice(0, 60)}_${doc._id}.json`), JSON.stringify(doc, null, 2));
  try {
    packPack(pack, dir, packsDir);
  } catch (error) {
    const locked = /lock|LOCK|busy|EBUSY|EPERM/.test(`${error.stderr || ''}${error.message}`);
    console.error(locked ? `O compêndio ${pack} está aberto no Foundry. Feche o mundo que usa o módulo e rode o build de novo.` : `Falha ao compilar ${pack}:\n${error.stderr || error.message}`);
    process.exit(1);
  }
}

// Arquivos do módulo (os compêndios já estão em packs/).
for (const folder of ['scripts', 'styles']) {
  fs.rmSync(path.join(moduleDir, folder), { recursive: true, force: true });
  fs.cpSync(path.join(sourceDir, folder), path.join(moduleDir, folder), { recursive: true });
}
fs.copyFileSync(path.join(sourceDir, 'module.json'), path.join(moduleDir, 'module.json'));
fs.copyFileSync(path.join(sourceDir, 'README.md'), path.join(moduleDir, 'README.md'));

const count = docs => docs.filter(doc => !doc._key.startsWith('!folders!')).length;
console.log(`Módulo gravado em ${moduleDir}`);
for (const [pack, docs] of Object.entries(packs)) console.log(`  ${pack.padEnd(16)} ${count(docs)} documentos`);

// Catálogo da loja da wiki, com os mesmos itens de 2077 dos compêndios.
const catalog = buildCatalog({ weapons: packs['armas-2077'], cyberware: packs['cyberware-2077'], net: packs['netrunning-2077'] });
console.log(`Catálogo da loja: ${catalog.total} itens em ${catalog.file}`);
