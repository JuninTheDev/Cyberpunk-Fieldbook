// NPCs prontos: as 10 fichas do livro do RED (p. 412–416) e as 10 do Mission Kit (p. 118–126), como na página
// Fichas de NPC da wiki,
// variantes de facção de 2077 (data/npcs-faccoes.json) e o elenco do Protocolo Morana (as fichas da campanha da wiki).
import fs from 'node:fs';
import path from 'node:path';
import { actorDoc, clone, coreDoc, corePack, folderDoc, itemFrom, makeId, para } from './lib.mjs';
import { sourceDir } from './paths.mjs';
import { wiki } from './wiki.mjs';

const statKeys = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'move', 'body', 'emp'];
const leadingNumber = value => parseInt(String(value), 10) || 0;

// Nomes de perícia do livro que diferem dos itens do sistema.
const skillAliases = { 'Resist Torture/Drug': 'Resist Torture/Drugs', 'Melee Weapons': 'Melee Weapon', Demolition: 'Demolitions', 'Language (Native)': 'Language (English)' };
const roleAbilities = { Interface: 'Netrunner', 'Moto Family': 'Nomad', 'Combat Awareness': 'Solo', Operator: 'Fixer', Medicine: 'Medtech', Maker: 'Tech' };
const skillPacks = ['internal_skills', 'core_skills-languages', 'core_skills-local-expert', 'core_skills-science'];
const findSkill = name => skillPacks.map(pack => corePack(pack).find(skill => skill.name === name)).find(Boolean);

// Armas da ficha (nome em português) → arma do livro-base usada como molde.
const weaponTemplates = {
  'Espingarda (qualidade ruim)': 'Shotgun (Poor)', Espingarda: 'Shotgun', 'Pistola muito pesada': 'Very Heavy Pistol',
  'Pistola muito pesada (qualidade ruim)': 'Very Heavy Pistol (Poor)', 'Pistola pesada': 'Heavy Pistol', 'Pistola média': 'Medium Pistol', Besta: 'Crossbow',
  'Rifle de assalto (qualidade ruim)': 'Assault Rifle (Poor)', 'Rifle de assalto': 'Assault Rifle', 'Arma branca leve': 'Light Melee',
  'Arma branca média': 'Medium Melee', 'Arma branca pesada': 'Heavy Melee', 'Lança-chamas': 'Flamethrower',
  // Armas cibernéticas entram como armas comuns: funcionam na ficha sem a instalação de cyberware.
  Rippers: 'Medium Melee', Wolvers: 'Heavy Melee', Cybersnake: 'Very Heavy Melee', 'Lança-granadas pop-up': 'Grenade Launcher', 'SMG pesada pop-up': 'Heavy SMG'
};
const armorTemplates = {
  Kevlar: ['Kevlar® (Body)', 'Kevlar® (Head)'], Couro: ['Leathers (Body)', 'Leathers (Head)'], 'Light Armorjack': ['Light Armorjack (Body)', 'Light Armorjack (Head)'],
  'Medium Armorjack': ['Medium Armorjack (Body)', 'Medium Armorjack (Head)'], 'Heavy Armorjack': ['Heavy Armorjack (Body)', 'Heavy Armorjack (Head)'],
  'Bodyweight Suit': ['Bodyweight Suit'], 'Subdermal Armor': ['Subdermal Armor'],
  // Rex Royale (Black Chrome p. 153): Subdermal Armor só na cabeça e a Corporate Island (bc: = compêndio Black Chrome) no corpo.
  'Subdermal Armor e Corporate Island': ['Subdermal Armor', 'bc:Corporate Island'],
  // A blindagem de borg de Adam Smasher (Mission Kit): SP 18, como a Metalgear, mas sem a penalidade.
  'Blindagem de borg': ['Metalgear® (Body)', 'Metalgear® (Head)']
};
const armorOverrides = { 'Blindagem de borg': { penalty: 0 } };
// Ajustes de uma peça só: a Corporate Island de Rex foi melhorada por um Tech (SP 12).
const pieceOverrides = { 'Subdermal Armor e Corporate Island': { 'Subdermal Armor': { isBodyLocation: false }, 'bc:Corporate Island': { bodyLocation: { sp: 12, ablation: 0 } } } };
// Munição que já vem carregada em cada arma de NPC (o pente cheio e mais duas recargas).
const ammoNames = { medPistol: 'pistola média', heavyPistol: 'pistola pesada', vHeavyPistol: 'pistola muito pesada', rifle: 'rifle', shotgunShell: 'cartucho de espingarda', shotgunSlug: 'balote de espingarda', arrow: 'flecha', grenade: 'granada', rocket: 'foguete' };
const ammoTemplates = { medPistol: 'Medium Pistol (Basic)', heavyPistol: 'Heavy Pistol (Basic)', vHeavyPistol: 'Very Heavy Pistol (Basic)', rifle: 'Rifle (Basic)', shotgunShell: 'Shotgun Shell (Basic)', shotgunSlug: 'Shotgun Slug (Basic)', arrow: 'Arrow (Basic)', grenade: 'Grenade (Armor-Piercing)', rocket: 'Rocket (Armor-Piercing)' };
// Armas que o livro dá com munição especial.
const specialAmmo = { 'Lança-chamas': ['shotgunShell', 'Shotgun Shell (Incendiary)', 'incendiária'], 'Lança-granadas pop-up': ['grenade', 'Grenade (Armor-Piercing)', 'perfurante'] };

const tierFolders = { mook: 'Capangas', lieutenant: 'Tenentes', miniBoss: 'Mini-chefes', boss: 'Chefe' };
const tierLabels = { mook: 'Capanga (Mook) · conta como 1 personagem', lieutenant: 'Tenente (Lieutenant) · conta como 2', miniBoss: 'Mini-chefe (Mini Boss) · conta como 3', boss: 'Chefe (Boss) · luta final', aliado: 'Aliado' };

function embedded(actorSeed, template, name, system = {}) {
  // Os efeitos do molde vão junto (as _key são refeitas dentro do ator).
  const effects = (template.effects || []).map(({ _key, ...effect }) => clone(effect));
  const item = itemFrom(template, { seed: `${actorSeed}:${name}`, name, system, effects });
  item.flags = template.flags?.['cpr-2077'] ? { 'cpr-2077': clone(template.flags['cpr-2077']) } : {};
  return item;
}

function weaponItem(actorSeed, name, origin, skill, weapons2077, card = {}) {
  let template;
  if (origin?.startsWith('2077:')) template = weapons2077.get(origin.slice(5));
  else if (origin?.startsWith('bc:')) template = coreDoc('black-chrome_weapons', origin.slice(3));
  else template = coreDoc('core_weapons', origin ? origin.replace(/^core:/, '') : weaponTemplates[name]);
  if (!template) throw new Error(`Arma sem molde: ${name} (${origin})`);
  const system = { equipped: 'equipped', magazine: { value: template.system.magazine.max, max: template.system.magazine.max, ammoData: null } };
  if (skill) system.weaponSkill = skill;
  // Dano e CDT vêm da ficha do livro (o lança-chamas do Pyro, por exemplo, usa cartuchos de 3d6).
  if (card.damage) Object.assign(system, { damage: card.damage, rof: card.rof });
  const weapon = embedded(actorSeed, template, name, system);
  const max = template.system.magazine.max;
  if (!template.system.isRanged || !max) return [weapon];
  // Munição carregada: o ID do item de munição entra na lista de instalados da arma (formato do sistema desde a migração 33).
  const varieties = template.system.ammoVariety || [];
  const [variety, ammoTemplate, kind] = specialAmmo[name] || [varieties.includes('shotgunSlug') ? 'shotgunSlug' : varieties[0]];
  const ammoKind = kind || (variety === 'grenade' || variety === 'rocket' ? 'perfurante' : 'básica');
  const ammo = embedded(actorSeed, coreDoc('core_ammo', ammoTemplate || ammoTemplates[variety]), `Munição de ${ammoNames[variety]} (${ammoKind}) · ${name}`, { amount: max * 2 });
  weapon.system.installedItems = { ...weapon.system.installedItems, allowed: true, list: [ammo._id] };
  if (!weapon.system.installedItems.allowedTypes.includes('ammo')) weapon.system.installedItems.allowedTypes.push('ammo');
  return [weapon, ammo];
}

function buildNpc(card, { seed, name, weapons2077, variant = {}, campanha = '' }) {
  const stats = Object.fromEntries(statKeys.map((key, index) => [key, leadingNumber(card.stats[index])]));
  Object.assign(stats, variant.stats || {});
  const parsed = wiki.npcs.parseSkills(card.skills);
  const notes = [];
  const bookDiffs = [];
  const items = [];
  const skillLevels = new Map();
  const roles = [];
  for (const { en, value } of parsed) {
    if (roleAbilities[en]) { if (!variant.semRole && !(variant.zerar || []).includes(en)) roles.push([roleAbilities[en], leadingNumber(value)]); continue; }
    const skillName = skillAliases[en] || en;
    const skill = findSkill(skillName);
    if (!skill) throw new Error(`${card.name}: perícia ${en} não existe no sistema`);
    if (!value) notes.push(`${en} aparece sem número no livro (ficou em 0).`);
    // As fichas do Mission Kit já somam o Rank da Role em algumas perícias (`inclui`); no Foundry, a Role soma sozinha.
    let level = (variant.zerar || []).includes(en) || !value ? 0 : leadingNumber(value) - stats[skill.system.stat] - ((card.inclui || {})[en] || 0);
    // O livro às vezes dá uma base menor que o próprio STAT: o nível fica em 0 e a ficha avisa.
    if (level < 0) { notes.push(`O livro dá ${en} ${value}, abaixo do STAT (${stats[skill.system.stat]}); ficou em ${stats[skill.system.stat]}.`); bookDiffs.push(en); level = 0; }
    skillLevels.set(skillName, level);
  }
  // Todas as perícias do sistema entram na ficha; as que o livro não cita ficam no nível 0.
  for (const skill of corePack('internal_skills')) if (!skillLevels.has(skill.name)) skillLevels.set(skill.name, 0);
  for (const [skillName, level] of skillLevels) items.push(embedded(seed, findSkill(skillName), skillName, { level }));

  for (const [roleName, rank] of roles) items.push(embedded(seed, coreDoc('core_roles', roleName), roleName, { rank }));

  const removed = new Set(variant.tirar || []);
  // As armas das fichas do Mission Kit dizem o molde (as de 2077 vêm do compêndio, com as regras delas; as outras usam o dano da ficha).
  for (const [weaponName, damage, rof, skill, , origin] of card.weapons) {
    if (removed.has(weaponName)) continue;
    if (origin) items.push(...weaponItem(seed, weaponName, origin, skill, weapons2077, origin.startsWith('2077:') ? {} : { damage, rof }));
    else items.push(...weaponItem(seed, weaponName, null, null, weapons2077, { damage, rof }));
  }
  for (const [weaponName, origin, skill] of variant.armas || []) items.push(...weaponItem(seed, weaponName, origin, skill, weapons2077));

  // A chave mais longa que combina ("Subdermal Armor e Corporate Island" antes de "Subdermal Armor").
  const armorName = variant.armadura || Object.keys(armorTemplates).filter(key => card.armor.startsWith(key)).sort((a, b) => b.length - a.length)[0];
  // Sem armadura ("Sem armadura" na ficha): nenhuma peça.
  for (const piece of armorTemplates[armorName] || []) {
    const template = piece.startsWith('bc:') ? coreDoc('black-chrome_armor', piece.slice(3)) : coreDoc('core_armor', piece);
    items.push(embedded(seed, template, piece.replace(/^bc:/, ''), { equipped: 'equipped', ...(armorOverrides[armorName] || {}), ...((pieceOverrides[armorName] || {})[piece] || {}) }));
  }
  if (/escudo à prova de balas/.test(card.gear)) items.push(embedded(seed, coreDoc('core_armor', 'Bullet Proof Shield'), 'Escudo à prova de balas'));

  const hp = variant.hp ?? card.hp;
  const role = roles[0];
  const netRole = items.find(item => item.type === 'role' && item.name === 'Netrunner');
  const description = [
    `<p><b>${tierLabels[card.tier]}</b> · ${card.book === 'Mission Kit' ? `ficha do Cyberpunk Edgerunners Mission Kit, p. ${card.page} · REP ${card.rep}` : card.book === 'Black Chrome' ? `ficha do Black Chrome, p. ${card.page} · REP ${card.rep}` : card.page ? `ficha do livro do RED: ${card.book}, p. ${card.page}` : `ficha da campanha ${card.book}`}${variant.fonte ? ` · variante: ${variant.fonte}` : ''}</p>`,
    variant.texto ? para(variant.texto) : '',
    para(`${card.armor}. Iniciativa ${card.initiative}.`, 'Armadura'),
    para(`${card.gear}.`, 'Cyberware e equipamento'),
    card.extra || '',
    para(card.tip, 'Na mesa'),
    notes.length ? para(notes.join(' '), 'Notas') : '',
    campanha
  ].join('');
  return actorDoc({
    seed, name, type: 'mook', img: 'icons/svg/mystery-man.svg', items,
    system: {
      stats: Object.fromEntries(statKeys.map(key => [key, key === 'emp' ? { value: stats.emp, max: stats.emp } : { value: stats[key] }]).concat([['luck', { value: 0, max: 0 }]])),
      derivedStats: {
        hp: { value: hp, max: hp, transactions: [] }, humanity: { value: stats.emp * 10, max: stats.emp * 10, transactions: [] },
        seriouslyWounded: Math.ceil(hp / 2), deathSave: { basePenalty: 0, penalty: 0, value: 0 }, walk: { value: stats.move * 2 }, run: { value: stats.move * 4 }
      },
      roleInfo: { activeRole: role ? role[0] : '', activeNetRole: netRole ? netRole._id : '' },
      // A ficha de mook mostra o campo notes.
      information: { description, notes: description }
    },
    flags: { base: card.name, variante: Boolean(variant.base), diferencasDoLivro: bookDiffs }
  });
}

export function buildNpcs(weaponDocs) {
  const weapons2077 = new Map(weaponDocs.filter(doc => doc.type === 'weapon').map(doc => [doc.name, doc]));
  const cards = [...wiki.npcs.mooks, ...wiki.npcs.lieutenants, ...wiki.npcs.bosses, ...wiki.npcs.boss];
  const folders = Object.fromEntries(Object.entries(tierFolders).map(([tier, name], index) => [tier, folderDoc('Actor', name, index)]));
  const factionFolder = folderDoc('Actor', 'Facções de 2077', Object.keys(folders).length);
  const castFolder = folderDoc('Actor', 'Protocolo Morana', Object.keys(folders).length + 1);
  const kitFolder = folderDoc('Actor', 'Mission Kit', Object.keys(folders).length + 2);
  const bcFolder = folderDoc('Actor', 'Black Chrome', Object.keys(folders).length + 3);
  const book = cards.map(card => {
    const actor = buildNpc(card, { seed: `npc:${card.book}`, name: `${card.name} (${card.book})`.replace(`${card.book} (${card.book})`, card.book), weapons2077 });
    actor.folder = folders[card.tier]._id;
    return actor;
  });
  const { variantes } = JSON.parse(fs.readFileSync(path.join(sourceDir, 'data', 'npcs-faccoes.json'), 'utf8'));
  const variants = variantes.map(variant => {
    const card = cards.find(item => item.name === variant.base);
    if (!card) throw new Error(`Variante ${variant.nome}: ficha base "${variant.base}" não existe`);
    const actor = buildNpc(card, { seed: `npc:variante:${variant.nome}`, name: variant.nome, weapons2077, variant });
    actor.folder = factionFolder._id;
    return actor;
  });
  // O elenco da campanha: atores com o nome do personagem (sem o nome da ficha do livro).
  // O texto do ator vem também da base da campanha (quem é, lado, onde, a nota do mestre): o mesmo da wiki.
  const cast = (wiki.npcs.campaignCast || []).map(card => {
    const pessoa = wiki.base.pessoas.find(item => item.campos.ficha === card.name);
    const actor = buildNpc(card, { seed: `npc:campanha:${card.name}`, name: card.name, weapons2077, campanha: pessoa ? wiki.campanhaBase.paraFoundry(pessoa) : '' });
    actor.folder = castFolder._id;
    return actor;
  });
  // As fichas do Mission Kit: o nome do NPC, na pasta própria.
  const kitNpcs = (wiki.npcs.kit || []).map(card => {
    const actor = buildNpc(card, { seed: `npc:kit:${card.name}`, name: card.name, weapons2077 });
    actor.folder = kitFolder._id;
    return actor;
  });
  // As fichas do Black Chrome (os fixers dos Mercados Noturnos).
  const bcNpcs = (wiki.npcs.blackChrome || []).map(card => {
    const actor = buildNpc(card, { seed: `npc:bc:${card.name}`, name: card.name, weapons2077 });
    actor.folder = bcFolder._id;
    return actor;
  });
  return [...Object.values(folders), factionFolder, castFolder, kitFolder, bcFolder, ...book, ...variants, ...cast, ...kitNpcs, ...bcNpcs];
}

// Conferência: a base de cada perícia (STAT + nível) tem de bater com o livro.
export function checkNpcSkills(actors) {
  const problems = [];
  const cards = [...wiki.npcs.mooks, ...wiki.npcs.lieutenants, ...wiki.npcs.bosses, ...wiki.npcs.boss, ...(wiki.npcs.campaignCast || []), ...(wiki.npcs.kit || []), ...(wiki.npcs.blackChrome || [])];
  for (const actor of actors.filter(doc => doc._key.startsWith('!actors!') && !doc.flags['cpr-2077'].variante)) {
    const card = cards.find(item => item.name === actor.flags['cpr-2077'].base);
    for (const { en, value } of wiki.npcs.parseSkills(card.skills)) {
      if (roleAbilities[en] || !value || actor.flags['cpr-2077'].diferencasDoLivro.includes(en)) continue;
      const skill = actor.items.find(item => item.type === 'skill' && item.name === (skillAliases[en] || en));
      const total = actor.system.stats[skill.system.stat].value + skill.system.level + ((card.inclui || {})[en] || 0);
      if (total !== leadingNumber(value)) problems.push(`${actor.name}: ${en} dá ${total}, o livro diz ${value}`);
    }
  }
  return problems;
}
export { makeId };
