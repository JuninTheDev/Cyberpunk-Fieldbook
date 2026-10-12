// Netrunning de 2077: os quickhacks do Mission Kit (Kit p. 16–17) e, do suplemento de fã (p. 13–23), os quickhacks
// adaptados, cyberdecks, daemons e White ICE.
import { KIT, SUPPLEMENT, coreDoc, coreImg, folderDoc, itemFrom, para, parseEb, sourceNote } from './lib.mjs';
import { wiki } from './wiki.mjs';

const qualities = { Excelente: 'excellent', Padrão: 'standard', Ruim: 'poor' };
const stat = (card, label) => (card.stats.find(([name]) => name === label) || [])[1];
const details = card => card.stats.map(([label, value]) => `${label}: ${value}`).join(' · ');
const description = (card, category, page, kit = false) => `<p><b>${category}</b> · ${details(card)}</p>${para(card.text)}${card.extra || ''}${card.icon ? para(`<i>${card.icon}</i>`, 'Na NET') : ''}${para(card.tip, 'Na mesa')}${sourceNote(kit ? 'Cyberpunk Edgerunners Mission Kit' : 'Suplemento de fã Cyberpunk 2077', page)}`;

// Linhas da tabela de cyberdecks: [fabricante, modelo, RAM, slots, cooling, qualidade e especialidade, custo, descrição]
function convertDeck([maker, model, ram, slots, cooling, special, cost, flavor], folder) {
  const quality = qualities[special.split('.')[0]] || 'standard';
  const templateName = { excellent: 'Cyberdeck (Excellent)', poor: 'Cyberdeck (Poor)' }[quality] || 'Cyberdeck';
  return itemFrom(coreDoc('core_gear', templateName), {
    seed: `deck:${maker} ${model}`, name: `${maker} ${model}`, folder,
    system: {
      brand: maker, quality, price: { market: parseEb(cost) ?? 500 }, installLocation: 'clinic',
      installedItems: { slots: Number(slots) }, source: { book: SUPPLEMENT, page: 14 },
      description: { value: `<p><b>Cyberdeck de 2077</b> · RAM ${ram} · slots ${slots} · Cooling ${cooling} · ${cost}</p><p>${special}</p><p><i>${flavor}</i></p><p>Em 2077 o cyberdeck é um <b>sistema operacional instalado no Neural Link</b>, sem perda de Humanidade: troca-se num ripperdoc. <b>RAM</b> paga os quickhacks; o <b>Cooling</b> é quanta RAM volta por rodada. RAM e slots somam com os bônus da Interface e da neuralware.</p>${sourceNote('Suplemento Cyberpunk 2077', 14)}` }
    },
    flags: { ram: Number(ram), cooling: Number(cooling) }
  });
}

// Quickhacks e daemons viram programas "booster": o sistema não rola nada sozinho, a ficha mostra o cartão.
function convertProgram(card, { templateName, category, page, folder, system = {}, flags = {}, kit = false }) {
  const price = kit ? '0' : stat(card, 'Preço (opcional)') ?? stat(card, 'Preço') ?? stat(card, 'Custo');
  return itemFrom(coreDoc('core_programs', templateName), {
    seed: `programa:${card.name}`, name: card.name, folder,
    system: { atk: 0, def: 0, per: 0, spd: 0, damage: { standard: '0', blackIce: '0' }, price: { market: parseEb(price) ?? 100 }, source: { book: kit ? KIT : SUPPLEMENT, page }, description: { value: description(card, category, page, kit) }, ...system },
    flags
  });
}

export function buildNet() {
  const deckFolder = folderDoc('Item', 'Cyberdecks de 2077', 0);
  const hackFolder = folderDoc('Item', 'Quickhacks do Mission Kit', 1);
  const fanHackFolder = folderDoc('Item', 'Quickhacks do suplemento de fã', 4);
  const daemonFolder = folderDoc('Item', 'Daemons', 2);
  const iceFolder = folderDoc('Item', 'White ICE', 3);
  const decks = wiki.net.decks.map(row => convertDeck(row, deckFolder._id));
  // Os do Kit não se compram (todo netrunner faz os do nível dele, pelo Rank de Interface); os do fã têm preço opcional.
  const hacks = [...wiki.net.quickhacks.kit, ...wiki.net.quickhacks.fa].map(card => {
    const kit = card.raw.origem === 'kit';
    return convertProgram(card, {
      templateName: 'Eraser', category: card.tag, page: 16, folder: kit ? hackFolder._id : fanHackFolder._id, kit,
      flags: { quickhack: true, origem: card.raw.origem, dv: card.raw.dv, rank: card.raw.rank }
    });
  });
  const daemons = wiki.net.daemons.map(card => {
    const rez = Number(stat(card, 'REZ')) || 0;
    return convertProgram(card, { templateName: 'Eraser', category: card.tag, page: 21, folder: daemonFolder._id, system: { rez: { value: rez, max: rez } }, flags: { daemon: true } });
  });
  const ice = wiki.net.whiteIce.map(card => convertProgram(card, {
    templateName: 'Shield', category: card.tag, page: 22, folder: iceFolder._id,
    system: { def: Number(stat(card, 'Rating')) || 0 }, flags: { whiteIce: true, rating: Number(stat(card, 'Rating')) || 0 }
  }));
  // Ícones: o sistema não tem ícone de quickhack; usa os dos programas parecidos.
  for (const hack of hacks) hack.img = coreImg('core_programs', hack.flags['cpr-2077'].dv >= 10 ? 'Hellbolt' : 'Worm');
  return [deckFolder, hackFolder, fanHackFolder, daemonFolder, iceFolder, ...decks, ...hacks, ...daemons, ...ice];
}
