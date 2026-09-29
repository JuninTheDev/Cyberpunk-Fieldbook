// Cyberware de 2077 (suplemento p. 27–30), a neuralware de netrunning (p. 13) e Berserk e Sandevistan (p. 24–26).
import { SUPPLEMENT, coreDoc, folderDoc, humanityLoss, itemFrom, para, parseEb, sourceNote, stripTags } from './lib.mjs';
import { wiki } from './wiki.mjs';

const installs = { Loja: 'mall', Clínica: 'clinic', Hospital: 'hospital' };
const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };

// Categoria da wiki → [tipo no sistema, molde do livro-base, é base (abre slots)?]
const categories = [
  [/^Fashionware/, 'fashionware', 'Light Tattoo', false],
  [/^Neuralware/, 'neuralWare', 'Tactile Boost', false],
  [/^Cyberóptico \(base\)/, 'cyberEye', 'Cybereye', true],
  [/^Cyberóptico \(opção\)/, 'cyberEye', 'TeleOptics', false],
  [/^Cyberware interno/, 'cyberwareInternal', 'Enhanced Antibodies', false],
  [/placa base/, 'cyberwareExternal', 'Skin Weave', true],
  [/^Opção de placa/, 'cyberwareExternal', 'Subdermal Pocket', false],
  [/^Cyberware externo/, 'cyberwareExternal', 'Subdermal Armor', false],
  [/^Opção de cyberbraço|^Cyberbraços/, 'cyberArm', 'Grapple Hand', false],
  [/^Opção de cyberperna/, 'cyberLeg', 'Grip Foot', false]
];

// Cyberware que é arma: molde de arma cibernética do livro-base e os números da arma.
const weapons = {
  'Mantis Blades': ['Wolvers', { weaponType: 'heavyMelee', damage: '3d6', rof: 2, weaponSkill: 'Melee Weapon' }],
  Monowire: ['Rippers', { weaponType: 'medMelee', damage: '2d6', rof: 2, weaponSkill: 'Melee Weapon' }],
  'Gorilla Arms': ['Big Knucks', { weaponType: 'heavyMelee', damage: '3d6', rof: 2, weaponSkill: 'Brawling' }],
  'Projectile Launch System': ['Popup Grenade Launcher', { weaponType: 'rocketLauncher', damage: '8d6', rof: 1, weaponSkill: 'Heavy Weapons', dvTable: 'DV Rocket Launcher', ammoVariety: ['rocket'], magazine: { value: 0, max: 1, ammoData: null } }]
};
const groups = { fashionware: ['Fashionware', 27], neural: ['Neuralware', 27], optics: ['Cyberópticos', 28], internal: ['Cyberware interno', 28], external: ['Cyberware externo e placas', 29], limbs: ['Cybermembros', 30] };

function slotsFrom(text, fallback) {
  const match = text.match(/(\d|um|uma|dois|duas|três) slots? (?:de opção|de placa)/i);
  return match ? (numberWords[match[1].toLowerCase()] ?? Number(match[1])) : fallback;
}

function convert(raw, group, folder) {
  const [, type, templateName, foundational] = categories.find(([pattern]) => pattern.test(raw.category));
  const [weaponTemplate, weaponStats] = weapons[raw.name] || [];
  const text = stripTags(raw.text);
  const [, page] = groups[group];
  const size = foundational ? 0 : /ocupa dois slots/i.test(text) ? 2 : 1;
  return itemFrom(coreDoc('core_cyberware', weaponTemplate || templateName), {
    seed: `cyberware:${raw.name}`, name: raw.name, folder,
    system: {
      type, isFoundational: foundational, isWeapon: Boolean(weaponStats), ...(weaponStats || {}),
      installLocation: installs[raw.install] || 'clinic', size,
      humanityLoss: humanityLoss(raw.humanity), price: { market: parseEb(raw.cost) ?? 0 },
      ...(foundational ? { installedItems: { allowed: true, allowedTypes: ['itemUpgrade', 'cyberware'], slots: slotsFrom(text, 2) } } : {}),
      source: { book: SUPPLEMENT, page },
      description: { value: `<p><b>${raw.category}</b> · instalação: ${raw.install} · Humanidade ${raw.humanity} · ${raw.cost}</p>${para(raw.text)}${para(raw.tip, 'Na mesa')}${sourceNote('Suplemento Cyberpunk 2077', page)}` }
    },
    flags: { grupo: group, ...(raw.name === 'Smart Link' ? { smartLink: true } : {}), ...(raw.name === 'Ballistic Coprocessor' ? { ballisticCoprocessor: true } : {}) }
  });
}

// Cartões de netrunning e sistemas operacionais: { name, tag, stats: [[rótulo, valor]], text, extra, tip }
const stat = (card, label) => (card.stats.find(([name]) => name === label) || [])[1];
function convertCard(card, { templateName, page, folder, category, extraSystem = {} }) {
  const humanity = stat(card, 'Perda de Humanidade');
  const cost = stat(card, 'Custo') ?? stat(card, 'Preço');
  const details = card.stats.map(([label, value]) => `${label}: ${value}`).join(' · ');
  return itemFrom(coreDoc('core_cyberware', templateName), {
    seed: `cyberware:${card.name}`, name: card.name, folder,
    system: {
      type: 'neuralWare', isFoundational: false, isWeapon: false, size: 1, installLocation: 'clinic',
      humanityLoss: humanityLoss(humanity), price: { market: parseEb(cost) ?? 0 }, ...extraSystem,
      source: { book: SUPPLEMENT, page },
      description: { value: `<p><b>${category}</b> · ${details}</p>${para(card.text)}${card.extra || ''}${para(card.tip, 'Na mesa')}${sourceNote('Suplemento Cyberpunk 2077', page)}` }
    },
    flags: { grupo: category }
  });
}

export function buildCyberware() {
  const folders = Object.values(groups).map(([name], index) => folderDoc('Item', name, index));
  const netFolder = folderDoc('Item', 'Neuralware de netrunning', folders.length);
  const osFolder = folderDoc('Item', 'Berserk e Sandevistan', folders.length + 1);
  const items = Object.entries(wiki.cyberware).flatMap(([group, list]) => list.map(entry => convert(entry.raw, group, folders[Object.keys(groups).indexOf(group)]._id)));
  const net = wiki.net.neuralware.map(card => convertCard(card, { templateName: 'Tactile Boost', page: 13, folder: netFolder._id, category: 'Neuralware de netrunning (opção do Neural Link)' }));
  const os = [...wiki.net.berserks, ...wiki.net.sandevistans].map(card => convertCard(card, {
    templateName: 'Sandevistan', page: 24, folder: osFolder._id,
    category: `${card.tag} (instalado no Neural Link)`
  }));
  return [...folders, netFolder, osFolder, ...items, ...net, ...os];
}
