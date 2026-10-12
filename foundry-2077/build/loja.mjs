// Catálogo da loja da wiki (loja-catalogo.js, na raiz da wiki): os itens do sistema (RED e Black Chrome) e os de 2077 do módulo,
// com nome em português, preço, resumo e o compêndio de onde o importador do Foundry puxa cada um.
// Roda junto com o build do módulo, ou sozinho: node build/loja.mjs (não precisa fechar o Foundry).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { corePack, slug, systemVersion } from './lib.mjs';
import { sourceDir, wikiDir } from './paths.mjs';
import { wiki } from './wiki.mjs';

const names = JSON.parse(fs.readFileSync(path.join(sourceDir, 'data', 'loja-nomes.json'), 'utf8'));
const CORE = 'cyberpunk-red-core';
const strip = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const categories = [
  ['armas', 'Armas'], ['municao', 'Munição'], ['armaduras', 'Armaduras'], ['acessorios', 'Acessórios de arma'], ['equipamento', 'Equipamento'],
  ['netrunning', 'Netrunning'], ['cyberware', 'Cyberware'], ['moda', 'Moda'], ['drogas', 'Drogas']
];

// Perícias em português (página Perícias da wiki).
const skillPt = Object.fromEntries((wiki.skills || []).map(([pt, en]) => [en, pt]));
const weaponGroups = {
  medPistol: 'Pistolas', heavyPistol: 'Pistolas', vHeavyPistol: 'Pistolas', smg: 'SMGs', shotgun: 'Espingardas',
  assaultRifle: 'Rifles', sniperRifle: 'Rifles', bow: 'Arcos e bestas', grenadeLauncher: 'Armas pesadas', rocketLauncher: 'Armas pesadas',
  lightMelee: 'Armas brancas', medMelee: 'Armas brancas', heavyMelee: 'Armas brancas', vHeavyMelee: 'Armas brancas'
};
// Armas exóticas do RED (p. 347–349): não aceitam acessórios nem munição especial.
const exoticWeapons = new Set(['Air Pistol', 'Dartgun', 'Microwaver', 'Shrieker', 'Stun Gun', 'Stun Baton', 'Flamethrower', 'Kendachi Mono-Three', 'Malorian Arms 3516',
  'Rhinemetall EMG-86 Railgun', 'Tsunami Arms Helix', 'Constitutional Arms Hurricane Assault Weapon', 'Militech "Cowboy" U-56 Grenade Launcher', 'Helicopter Blades']);
const cyberGroups = {
  fashionware: 'Fashionware', neuralWare: 'Neuralware', cyberEye: 'Cyberolhos', cyberAudioSuite: 'Cyberaudio', cyberwareInternal: 'Cyberware interno',
  cyberwareExternal: 'Cyberware externo', cyberArm: 'Cyberbraços', cyberLeg: 'Cyberpernas', borgware: 'Borgware'
};
const installPt = { mall: 'shopping', clinic: 'clínica', hospital: 'hospital', none: '—' };

function weaponSummary(s) {
  const parts = [s.damage, `CDT ${s.rof}`];
  if (s.isRanged && s.magazine?.max) parts.push(`pente ${s.magazine.max}`);
  parts.push(`${s.handsReq || 1} mão${(s.handsReq || 1) > 1 ? 's' : ''}`);
  if (s.concealable?.concealable) parts.push('oculta');
  if (s.weaponSkill) parts.push(skillPt[s.weaponSkill] || s.weaponSkill);
  return parts.join(' · ');
}
function armorSummary(s) {
  const parts = [];
  if (s.isShield) parts.push(`escudo, ${s.shieldHitPoints?.max || 0} HP`);
  if (s.isBodyLocation) parts.push(`SP ${s.bodyLocation.sp} no corpo`);
  if (s.isHeadLocation) parts.push(`SP ${s.headLocation.sp} na cabeça`);
  if (s.penalty) parts.push(`−${s.penalty} em REF, DEX e MOVE`);
  return parts.join(' · ');
}
function cyberSummary(s) {
  const loss = s.humanityLoss || { static: 0, roll: '0' };
  return [`Humanidade ${loss.static}${loss.roll && loss.roll !== '0' ? ` (${loss.roll})` : ''}`, `instala: ${installPt[s.installLocation] || s.installLocation || '—'}`, s.isFoundational ? `base, ${s.installedItems?.slots || 0} slots` : `ocupa ${s.size ?? 1} slot`].join(' · ');
}

// ---------------- Dados do Foundry para montar o equipamento na wiki ----------------
// Classe do RED de cada arma (a dos acessórios "(Heavy SMG)" etc.). SMG e SMG pesada têm o mesmo tipo no
// Foundry: a pesada é a de 3d6.
const weaponClasses = { medPistol: 'Medium Pistol', heavyPistol: 'Heavy Pistol', vHeavyPistol: 'Very Heavy Pistol', shotgun: 'Shotgun', assaultRifle: 'Assault Rifle',
  sniperRifle: 'Sniper Rifle', grenadeLauncher: 'Grenade Launcher', rocketLauncher: 'Rocket Launcher', bow: 'Bow' };
const weaponClass = s => s.weaponType === 'smg' ? (s.damage === '3d6' ? 'Heavy SMG' : 'SMG') : weaponClasses[s.weaponType] || '';
const weaponData = (s, exotica) => ({ tipo: s.weaponType || '', classe: weaponClass(s), pericia: s.weaponSkill || '', dano: s.damage || '', cdt: s.rof || 1, pente: s.isRanged ? s.magazine?.max || 0 : 0,
  maos: s.handsReq || 1, distancia: Boolean(s.isRanged), oculta: Boolean(s.concealable?.concealable), municao: s.ammoVariety || [], slots: s.installedItems?.slots || 0, exotica });
const programData = s => ({ classe: s.class || '', atk: s.atk || 0, def: s.def || 0, rez: s.rez?.max || 0, tamanho: s.size ?? 1 });

// Descrições dos programas do RED em português: os cartões da página Arsenal.
const programCards = Object.fromEntries([...(wiki.pages.netArsenal?.html || '').matchAll(/<article class="entry" data-toc="([^"]+)">(.*?)<\/article>/g)]
  .map(([, name, body]) => [name, strip((body.match(/<\/div><p>(.*?)<\/p>/) || body.match(/<p>(.*?)<\/p>/) || [])[1])]));
// Descrições de cyberware em português: as linhas da página Cyberware do RED.
const cyberRows = Object.fromEntries([...(wiki.catalog?.cyberware?.html || '').matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)].map(([, name, what, note]) => [name, `${strip(what)} ${strip(note)}`.trim()]));

const entries = [];
const add = (pack, doc, item) => {
  if (!item) return;
  const short = pack.split('.').pop();
  entries.push({ id: `${short}:${slug(doc.name)}`, en: doc.name, preco: doc.system?.price?.market ?? 0, foundry: { pack, nome: doc.name }, ...item });
};

// ---------------- Itens do sistema (RED) ----------------
function coreEntries() {
  for (const doc of corePack('core_weapons')) {
    const s = doc.system;
    if (!s.price?.market) continue; // Desarmado, Artes Marciais, arremesso
    const [, base, quality] = doc.name.match(/^(.*?)(?: \((Excellent|Poor)\))?$/);
    const nome = `${names.armas[base] || base}${quality ? ` (${names.qualidade[quality]})` : ''}`;
    const exotica = exoticWeapons.has(base) || !weaponGroups[s.weaponType];
    add(`${CORE}.core_weapons`, doc, { nome, cat: 'armas', sub: exotica ? 'Exóticas' : weaponGroups[s.weaponType], resumo: weaponSummary(s), arma: weaponData(s, exotica) });
  }
  for (const doc of corePack('core_ammo')) {
    const match = doc.name.match(/^(.*?) \((.*)\)$/);
    const nome = match ? `${names.municao[match[1]] || match[1]} · ${names.tipoMunicao[match[2]] || match[2]}` : (doc.name === 'Battery Pack' ? 'Bateria (armas de choque)' : doc.name);
    const lote = doc.system.amount || 1;
    add(`${CORE}.core_ammo`, doc, { nome, cat: 'municao', sub: match ? names.municao[match[1]] || match[1] : 'Outras', lote, resumo: lote > 1 ? `Preço por ${lote}` : 'Preço por unidade', municao: { variedade: doc.system.variety || '', tipo: doc.system.type || '' } });
  }
  for (const doc of corePack('core_armor')) {
    if (!doc.system.price?.market) continue; // Skin Weave e Subdermal Armor: são cyberware
    const match = doc.name.match(/^(.*?)(?: \((Body|Head)\))?$/);
    const nome = `${names.armaduras[match[1]] || match[1]}${match[2] ? ` (${names.armaduras[match[2]]})` : ''}`;
    const a = doc.system;
    add(`${CORE}.core_armor`, doc, { nome, cat: 'armaduras', sub: a.isShield ? 'Escudos' : 'Armaduras', resumo: armorSummary(a),
      armadura: { cabeca: a.isHeadLocation ? a.headLocation?.sp || 0 : 0, corpo: a.isBodyLocation ? a.bodyLocation?.sp || 0 : 0, penalidade: a.penalty || 0, escudo: a.isShield ? a.shieldHitPoints?.max || 0 : 0 } });
  }
  for (const doc of corePack('core_upgrades')) {
    if (!['weapon', 'cyberdeck'].includes(doc.system.type)) continue; // melhorias de veículo ficam para depois
    const match = doc.name.match(/^(.*?)(?: \((.*)\))?$/);
    const nome = `${names.acessorios[match[1]] || match[1]}${match[2] ? ` (${names.armas[match[2]] || match[2]})` : ''}`;
    const size = doc.system.size ?? 1;
    // Acessório com classe no nome ("Drum Magazine (Assault Rifle)") só encaixa naquela classe de arma.
    const extra = doc.system.type === 'weapon' ? { acessorio: { tamanho: size, classe: match[2] || '' } } : { hardware: { tamanho: size } };
    add(`${CORE}.core_upgrades`, doc, { nome, cat: doc.system.type === 'weapon' ? 'acessorios' : 'netrunning', sub: doc.system.type === 'weapon' ? 'Acessórios' : 'Hardware de cyberdeck', resumo: `${size} slot${size > 1 ? 's' : ''}`, ...extra });
  }
  for (const doc of corePack('core_gear')) {
    if (!doc.system.price?.market) continue;
    const [nome, desc] = names.equipamento[doc.name] || [doc.name, ''];
    const deck = doc.type === 'cyberdeck';
    add(`${CORE}.core_gear`, doc, { nome, cat: deck ? 'netrunning' : 'equipamento', sub: deck ? 'Cyberdecks do RED' : 'Equipamento', desc, resumo: deck ? `${doc.system.installedItems?.slots || 0} slots` : '', ...(deck ? { deck: { slots: doc.system.installedItems?.slots || 0 } } : {}) });
  }
  for (const doc of corePack('core_programs')) {
    const s = doc.system;
    const stats = [s.atk ? `ATK ${s.atk}` : '', s.def ? `DEF ${s.def}` : '', s.rez?.max ? `REZ ${s.rez.max}` : ''].filter(Boolean).join(' · ');
    add(`${CORE}.core_programs`, doc, { nome: names.programas[doc.name] || doc.name, cat: 'netrunning', sub: 'Programas do RED', resumo: stats, desc: programCards[doc.name] || '', programa: programData(s) });
  }
  for (const doc of corePack('core_cyberware')) {
    if (!doc.system.price?.market) continue;
    const [nome, row] = names.cyberware[doc.name] || [doc.name, ''];
    const s = doc.system;
    add(`${CORE}.core_cyberware`, doc, {
      nome, cat: 'cyberware', sub: cyberGroups[s.type] || 'Outros', desc: cyberRows[row] || '', resumo: cyberSummary(s),
      cyber: { tipo: s.type, base: Boolean(s.isFoundational), tamanho: s.size ?? 1, slots: s.isFoundational ? s.installedItems?.slots || 0 : 0, hl: s.humanityLoss?.static || 0, rolagem: s.humanityLoss?.roll || '0', instalacao: s.installLocation || '' }
    });
  }
  for (const doc of corePack('core_clothing')) {
    const s = doc.system;
    add(`${CORE}.core_clothing`, doc, { nome: `${names.pecas[s.type] || s.type} · ${names.estilos[s.style] || s.style}`, cat: 'moda', sub: names.estilos[s.style] || s.style, moda: true, resumo: '', roupa: { tipo: s.type || '', estilo: s.style || '' } });
  }
  for (const doc of corePack('core_drugs')) {
    if (!doc.system.price?.market) continue; // farmacêuticos do Medtech
    const [nome, desc] = names.drogas[doc.name] || [doc.name, ''];
    add(`${CORE}.core_drugs`, doc, { nome, cat: 'drogas', sub: 'Drogas de rua', desc, resumo: 'Preço por dose' });
  }
}

// ---------------- Black Chrome (do sistema) ----------------
// Os compêndios Black Chrome e Black Chrome Plus do sistema, com o nome e a descrição dos cartões das páginas do
// Black Chrome na wiki (system-blackchrome.js), ligados pelo nome do item no Foundry. Veículos ficam de fora, como os do RED.
const bcCards = {};
for (const list of Object.values(wiki.blackChrome || {})) for (const item of Array.isArray(list) ? list : []) if (item && item.raw) bcCards[item.raw.en] = item.raw;
// Itens do compêndio que são versões de um cartão só: as dez Mimic Clothing, as munições sucata e de caça pequena e
// os quadros lineares internos (cyberware), que usam o cartão do quadro.
const bcCardOf = en => bcCards[en] || bcCards[en.replace(/^Implanted /, '')]
  || (/^Mimic Clothing \(/.test(en) && bcCards['Mimic Clothing (Generic Chic)'])
  || (/ \(Junk\)$/.test(en) && bcCards['Heavy Pistol (Junk)'])
  || (/ \(Small Game\)$/.test(en) && bcCards['Heavy Pistol (Small Game)']) || null;
const BC_PACKS = ['black-chrome_weapons', 'black-chrome_ammo', 'black-chrome_armor', 'black-chrome_clothing', 'black-chrome_cyberware',
  'black-chrome_gear', 'black-chrome_upgrades', 'dlc_black-chrome-plus'];
const bcVariants = { Junk: 'sucata', 'Small Game': 'caça pequena' };
const semTags = html => String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function blackChromeEntries() {
  for (const name of BC_PACKS) {
    const origem = name === 'dlc_black-chrome-plus' ? 'Black Chrome Plus' : 'Black Chrome';
    for (const doc of corePack(name)) {
      const s = doc.system;
      if (!s.price?.market) continue; // as pedras do Nomad Rocker: munição de graça
      if (/^ModFire 10X \((SMG|Rifle)\)$/.test(doc.name)) continue; // a ModFire 10X se vende no modo pistola
      const card = bcCardOf(doc.name);
      // Sem as tags (o texto dos cartões já tem espaço onde precisa: strip() deixaria um antes da vírgula).
      const desc = (card ? semTags(card.text) : strip(s.description?.value)).slice(0, 260);
      const nome = card ? card.name : doc.name;
      const pack = `${CORE}.${name}`;
      const bc = { origem, tags: ['blackchrome'] };
      if (doc.type === 'weapon') {
        const exotica = /exótic/.test(card?.tipo || '') || /\bExotic\b/.test(strip(s.description?.value));
        if (exotica) bc.tags.push('exotica');
        if (s.quality === 'excellent') bc.tags.push('excelente');
        const grupo = s.weaponType === 'thrownWeapon' ? 'Arremesso e explosivos' : weaponGroups[s.weaponType] || 'Outras';
        add(pack, doc, { nome, cat: 'armas', sub: `${grupo} (${origem})`, resumo: weaponSummary(s), desc, arma: weaponData(s, exotica), bc });
      } else if (doc.type === 'ammo') {
        const lote = s.amount || 1;
        const variante = doc.name.match(/^(.*) \((Junk|Small Game)\)$/);
        const calibre = variante ? names.municao[variante[1]] || variante[1] : s.variety === 'grenade' ? names.municao.Grenade : '';
        add(pack, doc, { nome: variante ? `${calibre} · ${bcVariants[variante[2]]}` : nome, cat: 'municao', sub: calibre || (/Fluido/.test(card?.tipo || '') ? `Fluidos da Weeping Reaver (${origem})` : `Munições especiais (${origem})`), lote,
          resumo: lote > 1 ? `Preço por ${lote}` : 'Preço por unidade', desc, municao: { variedade: s.variety || '', tipo: s.type || '' }, bc });
      } else if (doc.type === 'armor') {
        const estilo = doc.name.match(/^Mimic Clothing \((.*)\)$/);
        add(pack, doc, { nome: estilo ? `Mimic Clothing (${estilo[1]})` : nome, cat: 'armaduras', sub: `Armaduras (${origem})`, resumo: armorSummary(s), desc,
          armadura: { cabeca: s.isHeadLocation ? s.headLocation?.sp || 0 : 0, corpo: s.isBodyLocation ? s.bodyLocation?.sp || 0 : 0, penalidade: s.penalty || 0, escudo: s.isShield ? s.shieldHitPoints?.max || 0 : 0 }, bc });
      } else if (doc.type === 'clothing') {
        add(pack, doc, { nome, cat: 'moda', sub: `Moda (${origem})`, moda: true, resumo: '', desc, roupa: { tipo: s.type || '', estilo: s.style || '' }, bc });
      } else if (doc.type === 'cyberware') {
        const interno = /^Implanted /.test(doc.name);
        if (interno || s.type === 'borgware') bc.tags.push(interno ? 'raro' : 'borgware');
        const sub = /Cyberfinger/.test(doc.name) ? `Cyberdedos (${origem})` : `${cyberGroups[s.type] || 'Outros'} (${origem})`;
        add(pack, doc, { nome: interno ? `${nome} (interno)` : nome, cat: 'cyberware', sub, desc, resumo: cyberSummary(s),
          cyber: { tipo: s.type, base: Boolean(s.isFoundational), tamanho: s.size ?? 1, slots: s.isFoundational ? s.installedItems?.slots || 0 : 0, hl: s.humanityLoss?.static || 0, rolagem: s.humanityLoss?.roll || '0', instalacao: s.installLocation || '' }, bc });
      } else if (doc.type === 'itemUpgrade') { // os apps de Agente
        add(pack, doc, { nome, cat: 'equipamento', sub: `Apps de Agente (${origem})`, desc, resumo: 'App', bc });
      } else if (doc.type === 'drug') {
        add(pack, doc, { nome, cat: 'drogas', sub: `Drogas (${origem})`, desc, resumo: 'Preço por dose', bc });
      } else {
        const quadro = /Linear Frame$/.test(doc.name);
        if (quadro) bc.tags.push('raro');
        add(pack, doc, { nome: quadro ? `${nome} (externo)` : nome, cat: 'equipamento', sub: `Equipamento (${origem})`, desc, resumo: '', bc });
      }
    }
  }
}

// ---------------- Itens de 2077 (do módulo) ----------------
function moduleEntries({ weapons = [], cyberware = [], net = [] }) {
  const items = docs => docs.filter(doc => doc._key?.startsWith('!items!'));
  for (const doc of items(weapons)) {
    const desc = strip(doc.system.description?.value).slice(0, 260);
    if (doc.type === 'itemUpgrade') { // os Rebuilds do Mission Kit: acessórios de 2 slots para qualquer arma
      const size = doc.system.size ?? 1;
      add('cpr-2077.armas-2077', doc, { nome: doc.name, cat: 'acessorios', sub: 'Rebuilds (Mission Kit)', resumo: `${size} slot${size > 1 ? 's' : ''}`, desc, acessorio: { tamanho: size, classe: '' } });
      continue;
    }
    if (doc.type === 'ammo') { // munição Smart melhorada do Mission Kit: vendida em lote, como a munição do RED
      const lote = doc.system.amount || 1;
      add('cpr-2077.armas-2077', doc, { nome: doc.name, cat: 'municao', sub: 'Smart melhorada (Mission Kit)', lote, resumo: lote > 1 ? `Preço por ${lote}` : 'Preço por unidade', desc, municao: { variedade: doc.system.variety || '', tipo: doc.system.type || '' } });
      continue;
    }
    add('cpr-2077.armas-2077', doc, { nome: doc.name, cat: 'armas', sub: 'Armas de 2077', resumo: weaponSummary(doc.system), desc, arma: weaponData(doc.system, !weaponGroups[doc.system.weaponType]) });
  }
  for (const doc of items(cyberware)) {
    if (doc.type === 'drug') { // Immunoblockers, a droga do Mission Kit
      add('cpr-2077.cyberware-2077', doc, { nome: doc.name, cat: 'drogas', sub: 'Drogas do Mission Kit', desc: strip(doc.system.description?.value).slice(0, 260), resumo: 'Preço por dose' });
      continue;
    }
    const s = doc.system;
    add('cpr-2077.cyberware-2077', doc, {
      nome: doc.name, cat: 'cyberware', sub: 'Cyberware de 2077', resumo: cyberSummary(s), desc: strip(s.description?.value).slice(0, 260),
      cyber: { tipo: s.type, base: Boolean(s.isFoundational), tamanho: s.size ?? 1, slots: s.isFoundational ? s.installedItems?.slots || 0 : 0, hl: s.humanityLoss?.static || 0, rolagem: s.humanityLoss?.roll || '0', instalacao: s.installLocation || '' }
    });
  }
  for (const doc of items(net)) {
    if (doc.type === 'netarch') continue; // as arquiteturas da campanha não se compram
    // Os cyberdecks de 2077 são feitos a partir do Cyberdeck do RED (tipo cyberdeck); quickhacks e daemons são programas.
    const deck = doc.type === 'cyberdeck';
    const f = doc.flags?.['cpr-2077'] || {};
    // White ICE não se compra; os quickhacks do Mission Kit também não (todo netrunner faz os do nível dele).
    const sub = deck ? 'Cyberdecks de 2077' : f.daemon ? 'Daemons de 2077' : f.whiteIce || (f.quickhack && f.origem === 'kit') ? null : 'Quickhacks de 2077 (suplemento de fã)';
    if (!sub) continue;
    add('cpr-2077.netrunning-2077', doc, { nome: doc.name, cat: 'netrunning', sub, resumo: deck ? `RAM ${doc.flags['cpr-2077'].ram} · ${doc.system.installedItems?.slots || 0} slots` : '', desc: strip(doc.system.description?.value).slice(0, 220),
      ...(deck ? { deck: { slots: doc.system.installedItems?.slots || 0, ram: doc.flags['cpr-2077'].ram } } : { programa: programData(doc.system) }) });
  }
}

// Etiquetas do que é avançado para a criação: a loja inicial esconde as etiquetas que o mestre escolher
// (regras-loja.json), além de tudo acima do teto de preço. Os modelos de 2077 até o teto ficam à venda.
const RARE_GEAR = new Set(['Linear Frame β (Beta)', 'Linear Frame ∑ (Sigma)', 'Cryotank', 'Cryopump']);
function tagsOf(entry) {
  // Os do Black Chrome já trazem as etiquetas (blackchrome, exotica, excelente, borgware, raro).
  if (entry.bc) return [...new Set(entry.bc.tags)];
  const tags = [];
  if (entry.cat === 'armas' && entry.sub === 'Exóticas') tags.push('exotica');
  if (/^core_(weapons|gear):/.test(entry.id) && / \(Excellent\)$/.test(entry.en)) tags.push('excelente');
  if (entry.cyber && entry.cyber.tipo === 'borgware') tags.push('borgware');
  if (entry.cat === 'municao' && / \((Smart|Biotoxin|EMP|Sleep)\)$/.test(entry.en)) tags.push('municao-rara');
  if (entry.id.startsWith('core_gear:') && RARE_GEAR.has(entry.en)) tags.push('raro');
  return tags;
}

export function buildCatalog(moduleDocs) {
  entries.length = 0;
  coreEntries();
  blackChromeEntries();
  moduleEntries(moduleDocs);
  for (const entry of entries) {
    const tags = tagsOf(entry);
    if (tags.length) entry.tags = tags;
    if (entry.bc) { entry.livro = entry.bc.origem; delete entry.bc; }
  }
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Catálogo: id repetido ${entry.id}`);
    ids.add(entry.id);
  }
  // Ordem estável: categoria, grupo e nome (o arquivo só muda quando os itens mudam).
  const order = Object.fromEntries(categories.map(([id], index) => [id, index]));
  entries.sort((a, b) => order[a.cat] - order[b.cat] || a.sub.localeCompare(b.sub, 'pt') || a.nome.localeCompare(b.nome, 'pt'));
  const catalog = { sistema: systemVersion(), categorias: categories.map(([id, nome]) => ({ id, nome })), itens: entries };
  const file = path.join(wikiDir, 'loja-catalogo.js');
  fs.writeFileSync(file, `// Gerado por foundry-2077/build/loja.mjs a partir dos compêndios do Foundry. Não edite à mão.\nwindow.shopCatalog = ${JSON.stringify(catalog)};\n`);
  return { file, total: entries.length };
}

// Rodando sozinho: monta os itens de 2077 do mesmo jeito que o build.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { buildWeapons } = await import('./armas.mjs');
  const { buildCyberware } = await import('./cyberware.mjs');
  const { buildNet } = await import('./net.mjs');
  const { applyEffects } = await import('./efeitos.mjs');
  const withEffects = docs => docs.map(doc => doc._key.startsWith('!items!') ? applyEffects(doc) : doc);
  const { file, total } = buildCatalog({ weapons: withEffects(buildWeapons()), cyberware: withEffects(buildCyberware()), net: buildNet() });
  console.log(`Catálogo da loja: ${total} itens em ${file}`);
}
