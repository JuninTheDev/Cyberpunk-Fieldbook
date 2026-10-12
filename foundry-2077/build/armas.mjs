// Armas de 2077 (Mission Kit p. 31–35 e suplemento de fã p. 32–50), os três Rebuilds e a munição Smart melhorada do Kit.
import { KIT, SUPPLEMENT, coreDoc, coreImg, folderDoc, itemFrom, para, parseEb, sourceNote } from './lib.mjs';
import { wiki } from './wiki.mjs';

// Grupo da wiki → pasta do compêndio e página do suplemento de fã (as do Kit trazem a página nas regras).
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
const ORIGENS = { kit: 'Mission Kit', fa: 'suplemento de fã' };

// As regras de Power, Smart e Tech (Mission Kit p. 31–32), como o módulo as aplica.
export const classRules = {
  power: '<b>Power</b> (Mission Kit): a lesão crítica causa 5 de dano bônus a mais (10 em vez de 5). Tem o modo <b>Ricochete</b> no menu de ataque (e na macro "Ricochete"): −4 no ataque para acertar um alvo atrás de cobertura ou fora da linha de visão; num tiro mirado, vale só a penalidade do mirado. O alcance é a distância até o alvo.',
  smart: '<b>Smart</b> (Mission Kit): +1 nos ataques à distância, e só dispara conectada pelo Personal Link (o Interface Plug do Neuroport) ou pelo Subdermal Grip. Com a munição Smart melhorada, ignora escuridão, fumaça e neblina, e errar a DV por 5 ou menos dá uma segunda chance com 14 + 1d10.',
  tech: '<b>Tech</b> (Mission Kit): a mira vê o contorno dos alvos através de cobertura fina. <b>Carregar</b> (na ficha, no Painel Tático e na macro "Carregar arma Tech") gasta a Ação de Movimento e dura até disparar ou 20 rodadas; carregada, o próximo ataque é de CDT 1, atravessa cobertura fina e ignora metade do SP do alvo, e a cobertura não perde HP.'
};

// Armas que o livro só descreve em texto: dano e DV do autofogo seguem a Tsunami Arms Helix do livro-base.
const autofireOnly = new Set(['Constitutional Arms M2067 Defender', 'Militech Mk.31 HMG']);

// As regras próprias de cada arma (system-2077.js), como flags do item: o armas2077.mjs lê estas e nada mais.
const REGRAS = ['balas', 'danoComMenos', 'minimoDeBalas', 'danoFixo', 'danoMirado', 'exigeBody', 'lesao', 'lesaoSemCromo', 'cargaSemMovimento',
  'cargaAteFimDoTurno', 'balasNaCarga', 'cdtNaCarga', 'cargaGrossa', 'ferrolho', 'soCartucho', 'soSmartMelhorada', 'doisAlvos', 'doisCanos'];

function convert(raw, group) {
  const kind = raw.kind.toLowerCase();
  const [, weaponType, templateName] = weaponTypes.find(([pattern]) => pattern.test(kind));
  const classe = /smart/i.test(raw.kind) ? 'smart' : /tech/i.test(raw.kind) ? 'tech' : 'power';
  const exotic = /exótic/.test(kind);
  const kit = raw.origem === 'kit';
  const regras = raw.regras || {};
  const quality = qualities[raw.quality] || 'standard';
  const features = raw.features && raw.features !== '—' ? raw.features : '';
  const skillLabel = raw.skill.split(' (')[0];
  const weaponSkill = autofireOnly.has(raw.name) ? 'Autofire' : skills[skillLabel];
  if (!weaponSkill) throw new Error(`Perícia desconhecida em ${raw.name}: ${raw.skill}`);

  const damage = autofireOnly.has(raw.name) ? '2d6' : (String(raw.damage).match(/\d+d6/) || ['3d6'])[0];
  const magazine = parseInt(raw.magazine, 10) || 0;
  const slugsAndShells = /balote/.test(`${raw.magazine} ${raw.damage}`) || (weaponType === 'shotgun' && /um por cano/.test(raw.magazine));
  const ammoVariety = regras.soCartucho || /cartucho/.test(raw.magazine) ? ['shotgunShell'] : slugsAndShells ? ['shotgunSlug', 'shotgunShell']
    : /pistola média/.test(raw.magazine) ? ['medPistol'] : /pistola pesada/.test(raw.magazine) ? (weaponType === 'vHeavyPistol' ? ['vHeavyPistol'] : ['heavyPistol'])
      : /pistola muito pesada/.test(raw.magazine) ? ['vHeavyPistol'] : /rifle/.test(raw.magazine) ? ['rifle'] : defaultAmmo[weaponType];
  const autoFire = autofireOnly.has(raw.name) ? 4 : Number((features.match(/autofogo \((\d)\)/i) || [])[1] || 0);
  const slotMatch = `${raw.text} ${features}`.match(/(\d|um|uma|dois|duas|três) slots? de acessório/i);
  // Arma exótica já vem com a classe e não tem slot; uma arma comum com Rebuild tem 3 slots, e o Rebuild ocupa 2.
  const slots = /sem acessórios/i.test(features) ? 0 : slotMatch ? (numberWords[slotMatch[1].toLowerCase()] ?? Number(slotMatch[1])) : exotic ? 0 : 1;
  const qualitySuffix = { excellent: ' (Excellent)', poor: ' (Poor)' }[quality] || '';
  const [, fanPage] = groups[group];
  const page = kit ? regras.pagina || 32 : fanPage;
  const bookNotes = [
    raw.skill.includes('(') ? `Perícia no livro: ${raw.skill}.` : '',
    !kit && (/\//.test(raw.damage) || /ver texto/.test(raw.damage) || raw.damage === '—') ? `Dano no livro: ${raw.damage}.` : '',
    !kit && /\//.test(raw.magazine) ? `Pente no livro: ${raw.magazine}.` : '',
    /\(/.test(String(raw.hands)) ? `Mãos: ${raw.hands}.` : '',
    raw.cost === 'ver nota' ? 'Preço: a tabela do livro repete o da Defender.' : ''
  ].filter(Boolean).join(' ');
  const flags = { classe, exotica: exotic, origem: kit ? 'kit' : 'fa', grupo: group };
  for (const chave of REGRAS) if (regras[chave] !== undefined) flags[chave] = regras[chave];
  // A Dian: coronha retrátil, −1 recolhida.
  if (/coronha recolhida/i.test(`${raw.text} ${raw.tip || ''}`)) flags.coronhaRetratil = true;

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
      source: { book: kit ? KIT : SUPPLEMENT, page },
      description: {
        value: `<p><b>${raw.kind}</b> · qualidade ${raw.quality} · ${ORIGENS[flags.origem]}</p>${para(raw.text)}${para(features, 'Recursos')}<p>${classRules[classe]}</p>${bookNotes ? para(bookNotes, 'No livro') : ''}${para(raw.tip, 'Na mesa')}${sourceNote(kit ? 'Cyberpunk Edgerunners Mission Kit' : 'Suplemento de fã Cyberpunk 2077', page)}`
      }
    },
    flags
  });
}

// Os Rebuilds (Kit p. 31–32): acessórios de 2 slots que dão a classe à arma. O armas2077.mjs lê a flag "rebuild".
const rebuilds = [
  ['Power Rebuild', 'power', 'A arma é reforçada para aguentar o esforço extremo, com mais precisão: vira uma arma <b>Power</b>. Serve em qualquer arma de longo alcance que não seja exótica.'],
  ['Smart Rebuild', 'smart', 'O miolo da arma é refeito com a mira Smart, que usa as balas girojato melhoradas: vira uma arma <b>Smart</b>. Serve em qualquer arma de longo alcance que não seja exótica, mas não numa arma com Smartgun Link.'],
  ['Tech Rebuild', 'tech', 'A arma é refeita com módulos de lançamento eletromagnético: vira uma arma <b>Tech</b>. Serve em qualquer arma de longo alcance que não seja exótica, menos lança-granadas e lança-foguetes.']
];

// Munição Smart melhorada (Kit p. 32): 50eb por 10 balas, balotes, cartuchos ou flechas; 500eb por granada ou foguete.
const smartAmmo = [
  ['Medium Pistol (Smart)', 'pistola média'], ['Heavy Pistol (Smart)', 'pistola pesada'], ['Very Heavy Pistol (Smart)', 'pistola muito pesada'],
  ['Rifle (Smart)', 'rifle'], ['Shotgun Slug (Smart)', 'balote'], ['Shotgun Shell (Basic)', 'cartucho'], ['Arrow (Smart)', 'flecha'],
  ['Grenade (Armor-Piercing)', 'granada'], ['Rocket (Smart)', 'foguete']
];
const SMART_AMMO_RULE = 'Só funciona em arma <b>Smart</b> (não numa arma com Smartgun Link). Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra coisa que atrapalhe a visão. Se o ataque à distância errar a DV por <b>5 ou menos</b>, você tenta de novo na hora com <b>14 + 1d10</b> (dá para somar Sorte) contra a mesma DV, com as penalidades do primeiro tiro.';

export function buildWeapons() {
  const folders = Object.values(groups).map(([name], index) => folderDoc('Item', name, index));
  const rebuildFolder = folderDoc('Item', 'Rebuilds (Mission Kit)', folders.length);
  const ammoFolder = folderDoc('Item', 'Munição Smart melhorada (Mission Kit)', folders.length + 1);
  const items = Object.entries(wiki.weapons).flatMap(([group, list]) => list.map(entry => {
    const item = convert(entry.raw, group);
    item.folder = folders[Object.keys(groups).indexOf(group)]._id;
    return item;
  }));
  const upgrades = rebuilds.map(([name, classe, text]) => {
    const template = coreDoc('core_upgrades', 'Smartgun Link');
    const modifiers = Object.fromEntries(Object.entries(template.system.modifiers).map(([chave, valor]) => [chave, chave === 'secondaryWeapon' ? valor : { ...valor, value: null }]));
    return itemFrom(template, {
      seed: `rebuild:${classe}`, name, folder: rebuildFolder._id,
      system: {
        modifiers, size: 2, price: { market: 1000 }, installLocation: 'mall', isElectronic: classe !== 'power',
        source: { book: KIT, page: 31 },
        description: { value: `<p><b>Rebuild</b> · 2 slots · 1.000eb (Muito Caro) · 1 hora para instalar ou tirar · só um por arma</p>${para(text)}<p>${classRules[classe]}</p><p>Numa arma exótica, o Rebuild entra num slot só, se a arma tiver um livre.</p>${sourceNote('Cyberpunk Edgerunners Mission Kit', 31)}` }
      },
      flags: { rebuild: classe }
    });
  });
  const ammo = smartAmmo.map(([template, caliber]) => {
    const explosive = ['granada', 'foguete'].includes(caliber);
    return itemFrom(coreDoc('core_ammo', template), {
      seed: `municao:smart-melhorada:${caliber}`, name: `Smart melhorada (${caliber})`, folder: ammoFolder._id,
      system: {
        type: 'smart', ablationValue: 1, amount: explosive ? 1 : 10, price: { market: explosive ? 500 : 50 },
        source: { book: KIT, page: 32 },
        description: { value: `<p><b>Munição Smart melhorada</b> de ${caliber} · ${explosive ? '500eb (Caro) cada' : '50eb (Oneroso) por 10'}</p><p>${SMART_AMMO_RULE}</p>${sourceNote('Cyberpunk Edgerunners Mission Kit', 32)}` }
      },
      flags: { smartMelhorada: true }
    });
  });
  return [...folders, rebuildFolder, ammoFolder, ...items, ...upgrades, ...ammo];
}
