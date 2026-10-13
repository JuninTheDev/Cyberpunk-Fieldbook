// Cyberware de 2077: o do Mission Kit (Kit p. 35–37), o do suplemento de fã que a mesa aprovou (p. 23 e 27–30) e os Berserk
// e Sandevistan dos anos 2070 (p. 24–26, mais caros e mais fracos que no suplemento). Todos vêm das listas da wiki.
import { KIT, SUPPLEMENT, coreDoc, folderDoc, humanityLoss, itemFrom, para, parseEb, sourceNote, stripTags } from './lib.mjs';
import { wiki } from './wiki.mjs';

const installs = { Loja: 'mall', Clínica: 'clinic', Hospital: 'hospital' };
const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };

// Categoria da wiki → [tipo no sistema, molde do livro-base, é base (abre slots)?]
const categories = [
  [/^Neuroport \(base\)/, 'neuralWare', 'Neural Link', true],
  [/^Fashionware/, 'fashionware', 'Light Tattoo', false],
  [/^Neuralware/, 'neuralWare', 'Tactile Boost', false],
  [/^Cyberware interno/, 'cyberwareInternal', 'Enhanced Antibodies', false],
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
const markers = { Neuroport: { conexaoSmart: true, neuroport: true }, 'Ballistic Coprocessor': { ballisticCoprocessor: true }, 'Feedback Circuit': { feedbackCircuit: true } };
const groups = { neuroport: ['Neuroport', 36], fashionware: ['Fashionware', 27], neural: ['Neuralware', 27], osware: ['Berserk e Sandevistan', 24], internal: ['Cyberware interno', 28], external: ['Cyberware externo', 29], limbs: ['Cybermembros', 30] };

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
  // Berserk e Sandevistan saem do molde da Sandevistan do livro-base (o ícone).
  return itemFrom(coreDoc('core_cyberware', weaponTemplate || (group === 'osware' ? 'Sandevistan' : templateName)), {
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

// A droga do Mission Kit (Kit p. 31): Immunoblockers, no molde das drogas do sistema.
const IMMUNOBLOCKERS = '<p><b>Droga do Mission Kit</b> · 100eb (Premium) a dose · não vicia</p><p><b>Efeito primário:</b> recupera 2d6 de Humanidade, sem passar da Humanidade máxima que a terapia permite. Dura um mês, mas pode acabar antes, num momento estressante (o mestre decide).</p><p><b>Efeito secundário (DV21):</b> perde a Humanidade ganha com a droga, e alucinações dão −2 em todo teste por 60 segundos (20 rodadas). Se nesse tempo não injetar 2 doses de Immunoblockers (uma Ação), perde 4d6 de Humanidade no fim dos 60 segundos (sem mexer na máxima). Abaixo de 0: ciberpsicose extrema, e o mestre pode dar +2 em todo teste até a Humanidade voltar a ser positiva.</p>';
function buildDrugs(folder) {
  return [itemFrom(coreDoc('core_drugs', 'Black Lace'), {
    seed: 'droga:immunoblockers', name: 'Immunoblockers', folder,
    system: { price: { market: 100 }, consumed: '', source: { book: KIT, page: 31 }, description: { value: IMMUNOBLOCKERS + sourceNote('Cyberpunk Edgerunners Mission Kit', 31) } },
    flags: { origem: 'kit' }
  })];
}

export function buildCyberware() {
  // Uma pasta por grupo da wiki que tem itens, na ordem dos grupos.
  const present = Object.keys(groups).filter(group => (wiki.cyberware[group] || []).length);
  const folders = Object.fromEntries(present.map((group, index) => [group, folderDoc('Item', groups[group][0], index)]));
  const drugFolder = folderDoc('Item', 'Drogas (Mission Kit)', present.length);
  const items = Object.entries(wiki.cyberware).flatMap(([group, list]) => list.map(entry => convert(entry.raw, group, folders[group]._id)));
  return [...Object.values(folders), drugFolder, ...items, ...buildDrugs(drugFolder._id)];
}
