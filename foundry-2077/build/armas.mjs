// Armas de 2077 (suplemento p. 32–50) e flechettes das armas Tech.
import { SUPPLEMENT, coreDoc, coreImg, folderDoc, itemFrom, para, parseEb, sourceNote } from './lib.mjs';
import { wiki } from './wiki.mjs';

// Grupo da wiki → pasta do compêndio e página do suplemento.
const groups = {
  pistols: ['Pistolas', 32], revolvers: ['Revólveres e pistolas muito pesadas', 35], smgs: ['Submetralhadoras', 38],
  shotguns: ['Espingardas', 40], rifles: ['Rifles de assalto', 44], machineGuns: ['Metralhadoras', 47], snipers: ['Rifles de precisão', 48]
};

// Tipo da wiki → tipo de arma do sistema e molde do livro-base.
const weaponTypes = [
  [/^pistola média/, 'medPistol', 'Medium Pistol'], [/^pistola pesada/, 'heavyPistol', 'Heavy Pistol'],
  [/^pistola muito pesada/, 'vHeavyPistol', 'Very Heavy Pistol'], [/^smg pesada/, 'heavySmg', 'Heavy SMG'], [/^smg/, 'smg', 'SMG'],
  [/^espingarda/, 'shotgun', 'Shotgun'], [/^rifle de assalto/, 'assaultRifle', 'Assault Rifle'], [/^metralhadora/, 'assaultRifle', 'Assault Rifle'],
  [/^rifle (de precisão|sniper)/, 'sniperRifle', 'Sniper Rifle']
];
const dvTables = { medPistol: 'DV Pistol', heavyPistol: 'DV Pistol', vHeavyPistol: 'DV Pistol', smg: 'DV SMG', heavySmg: 'DV SMG', shotgun: 'DV Shotgun (Slug)', assaultRifle: 'DV Assault Rifle', sniperRifle: 'DV Sniper Rifle' };
const defaultAmmo = { medPistol: ['medPistol'], heavyPistol: ['heavyPistol'], vHeavyPistol: ['vHeavyPistol'], smg: ['medPistol'], heavySmg: ['heavyPistol'], shotgun: ['shotgunShell'], assaultRifle: ['rifle'], sniperRifle: ['rifle'] };
export const skills = { 'Armas de uma Mão': 'Handgun', 'Armas de Ombro': 'Shoulder Arms', 'Armas Pesadas': 'Heavy Weapons', 'Disparo Automático': 'Autofire', 'Armas Brancas': 'Melee Weapon' };
const qualities = { padrão: 'standard', ruim: 'poor', excelente: 'excellent' };
const brands = ['Constitutional Arms', 'Darra Polytechnic', 'Budget Arms', 'Midnight Arms', 'Kang Tao', 'Militech', 'Arasaka', 'Tsunami', 'Malorian', 'Techtronika', 'Rostovic', 'Nokota'];
const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };

export const classRules = {
  power: '<b>Power:</b> tem o modo <b>Ricochete</b> no menu de ataque (e na macro "Ricochete"): acerta um alvo atrás de cobertura com um tiro único, usando a DV da tabela de autofogo; alvos com REF 8+ podem esquivar, e o dano tem um dado a menos.',
  tech: '<b>Tech:</b> tem a <b>carga Tech</b> no menu de ataque (e na macro "Carga Tech"): atravessa cobertura e abla a armadura (−2 SP, ou −4 sem cobertura); depois precisa de uma rodada para esfriar. Usa flechettes, que custam e ablam como munição perfurante.',
  smart: '<b>Smart:</b> só dispara com o cyberware <b>Smart Link</b>. O tiro único é o teste Smart, 10 + 1d10 (12 + 1d10 nos modelos de várias balas), no lugar de REF + perícia; a regra sai das descrições das armas.'
};

// Armas que o livro só descreve em texto: dano e DV do autofogo seguem a Tsunami Arms Helix do livro-base.
const autofireOnly = new Set(['Constitutional Arms M2067 Defender', 'Militech Mk.31 HMG']);

function convert(raw, group) {
  const kind = raw.kind.toLowerCase();
  const [, weaponType, templateName] = weaponTypes.find(([pattern]) => pattern.test(kind));
  const classe = /smart/i.test(raw.kind) ? 'smart' : /tech/i.test(raw.kind) ? 'tech' : 'power';
  const exotic = /exótic/.test(kind);
  const quality = qualities[raw.quality] || 'standard';
  const features = raw.features && raw.features !== '—' ? raw.features : '';
  const skillLabel = raw.skill.split(' (')[0];
  const weaponSkill = autofireOnly.has(raw.name) ? 'Autofire' : skills[skillLabel];
  if (!weaponSkill) throw new Error(`Perícia desconhecida em ${raw.name}: ${raw.skill}`);

  const damage = autofireOnly.has(raw.name) ? '2d6' : (String(raw.damage).match(/\d+d6/) || ['3d6'])[0];
  const magazine = parseInt(raw.magazine, 10) || 0;
  const ammoVariety = /cartucho/.test(raw.magazine) ? ['shotgunShell'] : /balote/.test(raw.magazine) ? ['shotgunSlug', 'shotgunShell']
    : /pistola média/.test(raw.magazine) ? ['medPistol'] : /pistola pesada/.test(raw.magazine) ? ['heavyPistol'] : /rifle/.test(raw.magazine) ? ['rifle'] : defaultAmmo[weaponType];
  const autoFire = autofireOnly.has(raw.name) ? 4 : Number((features.match(/autofogo \((\d)\)/i) || [])[1] || 0);
  const slotMatch = `${raw.text} ${features}`.match(/(\d|um|uma|dois|duas|três) slots? de acessório/i);
  const slots = /sem acessórios/i.test(features) ? 0 : slotMatch ? (numberWords[slotMatch[1].toLowerCase()] ?? Number(slotMatch[1])) : exotic ? 0 : 3;
  const qualitySuffix = { excellent: ' (Excellent)', poor: ' (Poor)' }[quality] || '';
  const [folderName, page] = groups[group];
  const bookNotes = [
    raw.skill.includes('(') ? `Perícia no livro: ${raw.skill}.` : '',
    /\//.test(raw.damage) || /ver texto/.test(raw.damage) || raw.damage === '—' ? `Dano no livro: ${raw.damage}.` : '',
    /\//.test(raw.magazine) ? `Pente no livro: ${raw.magazine}.` : '',
    /\(/.test(String(raw.hands)) ? `Mãos: ${raw.hands}.` : '',
    raw.cost === 'ver nota' ? 'Preço: a tabela do livro repete o da Defender.' : ''
  ].filter(Boolean).join(' ');

  return itemFrom(coreDoc('core_weapons', templateName), {
    seed: `arma:${raw.name}`, name: raw.name,
    img: coreImg('core_weapons', templateName + qualitySuffix),
    system: {
      weaponType, weaponSkill, damage, rof: raw.rof, handsReq: parseInt(raw.hands, 10) || 1, quality,
      // Como as armas Excellent do livro-base: +1 no ataque (RED p. 342).
      attackmod: quality === 'excellent' ? 1 : 0,
      dvTable: autofireOnly.has(raw.name) ? 'DV Assault Rifle (Autofire)' : dvTables[weaponType],
      fireModes: { autoFire, suppressiveFire: /supressivo/i.test(features) },
      magazine: { value: 0, max: magazine, ammoData: null }, ammoVariety,
      concealable: { concealable: /^sim/i.test(raw.conceal), isConcealed: false },
      installedItems: { slots }, isRanged: true, critFailEffect: 'jammed',
      brand: brands.find(brand => raw.name.startsWith(brand)) || '',
      price: { market: parseEb(raw.cost) ?? 500 },
      source: { book: SUPPLEMENT, page },
      description: {
        value: `<p><b>${raw.kind}</b> · qualidade ${raw.quality}</p>${para(raw.text)}${para(features, 'Recursos')}<p>${classRules[classe]}</p>${bookNotes ? para(bookNotes, 'No livro') : ''}${para(raw.tip, 'Na mesa')}${sourceNote('Suplemento Cyberpunk 2077', page)}`
      }
    },
    flags: {
      classe, exotica: exotic, grupo: group,
      // Smart: várias balas (12 + 1d10), a Kappa (dois alvos), a Palica (dois canos).
      smartMulti: /12 \+ 1d10/.test(`${raw.text} ${raw.tip || ''}`) && !/dois canos/i.test(`${raw.text} ${raw.tip || ''}`),
      smartDoisAlvos: classe === 'smart' && /dois alvos/i.test(`${raw.text} ${raw.tip || ''}`),
      smartDoisCanos: classe === 'smart' && /dois canos/i.test(`${raw.text} ${raw.tip || ''}`),
      // Tech: a rajada da carga (0: só tiro único).
      techModo: (features.match(/carga Tech \(([^)]+)\)/i) || [])[1] || null,
      techRajada: classe === 'tech' ? Number((features.match(/carga Tech \(rajada de (\d)\)/i) || [])[1] || 0) : 0,
      // Power: as que só disparam rajadas de três não ricocheteiam.
      semRicochete: classe === 'power' && (/só rajada de três balas/i.test(features) || weaponSkill === 'Autofire'),
      // A Dian: coronha retrátil, −1 recolhida.
      coronhaRetratil: /coronha recolhida/i.test(`${raw.text} ${raw.tip || ''}`)
    }
  });
}

// Flechettes das armas Tech: as mesmas regras e preço da munição perfurante do calibre.
const flechettes = [
  ['Medium Pistol (Armor-Piercing)', 'pistola média'], ['Heavy Pistol (Armor-Piercing)', 'pistola pesada'],
  ['Very Heavy Pistol (Armor-Piercing)', 'pistola muito pesada'], ['Rifle (Armor-Piercing)', 'rifle'], ['Shotgun Slug (Armor-Piercing)', 'espingarda']
];

export function buildWeapons() {
  const folders = Object.values(groups).map(([name], index) => folderDoc('Item', name, index));
  const ammoFolder = folderDoc('Item', 'Munição Tech (flechettes)', folders.length);
  const items = Object.entries(wiki.weapons).flatMap(([group, list]) => list.map(entry => {
    const item = convert(entry.raw, group);
    item.folder = folders[Object.keys(groups).indexOf(group)]._id;
    return item;
  }));
  const ammo = flechettes.map(([template, caliber]) => itemFrom(coreDoc('core_ammo', template), {
    seed: `municao:${template}`, name: `Flechettes Tech (${caliber})`, folder: ammoFolder._id,
    system: {
      source: { book: SUPPLEMENT, page: 31 },
      description: { value: `<p>Munição das armas <b>Tech</b> de ${caliber}. As armas Tech não aceitam pente maior e usam flechettes, que custam e ablam como a munição perfurante das armas Power (suplemento p. 31).</p>${sourceNote('Suplemento Cyberpunk 2077', 31)}` }
    },
    flags: { classe: 'tech' }
  }));
  return [...folders, ammoFolder, ...items, ...ammo];
}
