// Cyberware de 2077: o do Mission Kit (Kit p. 35–37) e o do suplemento de fã (p. 27–30), a neuralware de netrunning
// (p. 13) e Berserk e Sandevistan (p. 24–26) do suplemento.
import { KIT, SUPPLEMENT, coreDoc, folderDoc, humanityLoss, itemFrom, para, parseEb, sourceNote, stripTags } from './lib.mjs';
import { wiki } from './wiki.mjs';

const installs = { Loja: 'mall', Clínica: 'clinic', Hospital: 'hospital' };
const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };

// Categoria da wiki → [tipo no sistema, molde do livro-base, é base (abre slots)?]
const categories = [
  [/^Neuroport \(base\)/, 'neuralWare', 'Neural Link', true],
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
// As do Kit: Gorilla Arm e Mantis Blade são de qualidade excelente (+1 no ataque).
const weapons = {
  'Mantis Blade': ['Wolvers', { weaponType: 'heavyMelee', damage: '3d6', rof: 2, weaponSkill: 'Melee Weapon', attackmod: 1, concealable: { concealable: true, isConcealed: false } }],
  Monowire: ['Rippers', { weaponType: 'heavyMelee', damage: '3d6', rof: 2, weaponSkill: 'Melee Weapon', concealable: { concealable: true, isConcealed: false } }],
  'Gorilla Arm': ['Big Knucks', { weaponType: 'heavyMelee', damage: '3d6', rof: 2, weaponSkill: 'Melee Weapon', attackmod: 1 }],
  'Projectile Launch System': ['Popup Grenade Launcher', { weaponType: 'rocketLauncher', damage: '8d6', rof: 1, weaponSkill: 'Heavy Weapons', dvTable: 'DV Rocket Launcher', ammoVariety: ['rocket', 'grenade'], magazine: { value: 0, max: 1, ammoData: null }, concealable: { concealable: true, isConcealed: false } }]
};
// Grupo da wiki → pasta, página do suplemento de fã e página do Kit.
const kitPages = { neuroport: 36, neural: 35, limbs: 36 };
// O que o armas2077.mjs procura no ator: a conexão da arma Smart e o Ballistic Coprocessor.
const markers = { Neuroport: { conexaoSmart: true, neuroport: true }, 'Smart Link': { conexaoSmart: true, smartLink: true }, 'Ballistic Coprocessor': { ballisticCoprocessor: true }, 'Feedback Circuit': { feedbackCircuit: true } };
const groups = { neuroport: ['Neuroport', 36], fashionware: ['Fashionware', 27], neural: ['Neuralware', 27], optics: ['Cyberópticos', 28], internal: ['Cyberware interno', 28], external: ['Cyberware externo e placas', 29], limbs: ['Cybermembros', 30] };

function slotsFrom(text, fallback) {
  const match = text.match(/(\d|um|uma|dois|duas|três) slots? (?:de opção|de placa)/i);
  return match ? (numberWords[match[1].toLowerCase()] ?? Number(match[1])) : fallback;
}

function convert(raw, group, folder) {
  const [, type, templateName, foundational] = categories.find(([pattern]) => pattern.test(raw.category));
  const [weaponTemplate, weaponStats] = weapons[raw.name] || [];
  const text = stripTags(raw.text);
  const kit = raw.origem === 'kit';
  const page = kit ? kitPages[group] || 36 : groups[group][1];
  const size = foundational ? 0 : /ocupa dois slots/i.test(text) ? 2 : 1;
  return itemFrom(coreDoc('core_cyberware', weaponTemplate || templateName), {
    seed: `cyberware:${raw.name}`, name: raw.name, folder,
    system: {
      type, isFoundational: foundational, isWeapon: Boolean(weaponStats), ...(weaponStats || {}),
      installLocation: installs[raw.install] || 'clinic', size,
      humanityLoss: humanityLoss(raw.humanity), price: { market: parseEb(raw.cost) ?? 0 },
      ...(foundational ? { installedItems: { allowed: true, allowedTypes: ['itemUpgrade', 'cyberware'], slots: slotsFrom(text, 2) } } : {}),
      source: { book: kit ? KIT : SUPPLEMENT, page },
      description: { value: `<p><b>${raw.category}</b> · instalação: ${raw.install} · Humanidade ${raw.humanity} · ${raw.cost} · ${kit ? 'Mission Kit' : 'suplemento de fã'}</p>${para(raw.text)}${para(raw.tip, 'Na mesa')}${sourceNote(kit ? 'Cyberpunk Edgerunners Mission Kit' : 'Suplemento de fã Cyberpunk 2077', page)}` }
    },
    flags: { grupo: group, origem: kit ? 'kit' : 'fa', ...(markers[raw.name] || {}) }
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
