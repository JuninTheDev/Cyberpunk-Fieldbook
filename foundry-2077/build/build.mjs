// Gera o módulo cpr-2077 a partir da wiki e grava direto na pasta de módulos do Foundry.
// Uso (com o mundo fechado): node build/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { buildWeapons } from './armas.mjs';
import { packPack } from './cli.mjs';
import { buildCyberware } from './cyberware.mjs';
import { buildJournals } from './diarios.mjs';
import { corePack, macroDoc, slug } from './lib.mjs';
import { buildNet } from './net.mjs';
import { buildNpcs, checkNpcSkills } from './npcs.mjs';
import { cacheDir, moduleDir, sourceDir, systemDir } from './paths.mjs';
import { buildVehicles } from './veiculos.mjs';

if (!fs.existsSync(path.join(cacheDir, 'core', 'versao.json'))) {
  console.error('Rode antes: node build/extract-core.mjs');
  process.exit(1);
}

// ---------------- Documentos ----------------
const weapons = buildWeapons();
const macros = [
  ['Ataque Smart', 'icons/svg/target.svg', 'ataqueSmart'],
  ['Ricochete', 'icons/svg/explosion.svg', 'ricochete'],
  ['Carga Tech', 'icons/svg/lightning.svg', 'cargaTech']
].map(([name, img, fn]) => macroDoc({ seed: `macro:${fn}`, name, img, command: `// Selecione o token do personagem antes de rodar.\ngame.modules.get('cpr-2077')?.api?.${fn}();` }));

const packs = {
  'armas-2077': weapons,
  'cyberware-2077': buildCyberware(),
  'netrunning-2077': buildNet(),
  'veiculos-2077': buildVehicles(),
  'npcs-2077': buildNpcs(weapons),
  'regras-2077': buildJournals(),
  'macros-2077': macros
};

// ---------------- Conferências ----------------
// Valores aceitos pelo sistema, lidos do próprio config.js dele.
const config = fs.readFileSync(path.join(systemDir, 'modules', 'system', 'config.js'), 'utf8');
const keysOf = name => new Set([...(config.match(new RegExp(`CPR\\.${name} = \\{([\\s\\S]*?)\\};`)) || [, ''])[1].matchAll(/^\s*"?(\w+)"?:/gm)].map(match => match[1]));
const allowed = {
  weaponType: keysOf('weaponTypes'), cyberwareType: keysOf('cyberwareTypes'), install: keysOf('cyberwareInstallList'),
  quality: keysOf('itemQuality'), ammo: keysOf('ammoVarieties')
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
    }
  }
}
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
    const locked = /lock|LOCK|busy|EBUSY/.test(`${error.stderr || ''}${error.message}`);
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
