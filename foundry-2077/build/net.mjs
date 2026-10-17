// Netrunning de 2077: os quickhacks (os 11 do Mission Kit, Kit p. 16–17, e os 5 do suplemento de fã que a mesa aprovou,
// p. 16–20) e os cyberdecks com marca (os modelos do suplemento de fã, p. 14–15, como cyberdecks do RED da qualidade de cada um).
import { KIT, SUPPLEMENT, coreDoc, coreImg, folderDoc, itemFrom, para, parseEb, sourceNote } from './lib.mjs';
import { wiki } from './wiki.mjs';

const qualities = { Excelente: 'excellent', Padrão: 'standard', Ruim: 'poor' };
const details = card => card.stats.map(([label, value]) => `${label}: ${value}`).join(' · ');
const description = (card, category, page, kit = false) => `<p><b>${category}</b> · ${details(card)}</p>${para(card.text)}${card.extra || ''}${para(card.tip, 'Na mesa')}${sourceNote(kit ? 'Cyberpunk Edgerunners Mission Kit' : 'Suplemento de fã Cyberpunk 2077', page)}`;

// Os decks com marca (system-net.js): { maker, model, quality, slots, cost, text }. A qualidade dá os slots e o preço do RED.
function convertDeck({ maker, model, quality, slots, cost, text }, folder) {
  const q = qualities[quality] || 'standard';
  const templateName = { excellent: 'Cyberdeck (Excellent)', poor: 'Cyberdeck (Poor)' }[q] || 'Cyberdeck';
  const deck = coreDoc('core_gear', templateName);
  return itemFrom(deck, {
    seed: `deck:${maker} ${model}`, name: `${maker} ${model}`, folder,
    system: {
      brand: maker, quality: q, price: { market: parseEb(cost) ?? deck.system.price?.market ?? 500 }, installLocation: 'clinic',
      installedItems: { slots: Number(slots) }, source: { book: SUPPLEMENT, page: 14 },
      description: { value: `<p><b>Cyberdeck com marca</b> · qualidade ${quality.toLowerCase()} · ${slots} slots · ${cost}</p><p><i>${text}</i></p><p>É um cyberdeck do RED da qualidade dele: o modelo, do suplemento de fã, é só a aparência. A RAM, o cooling e a especialidade do suplemento não valem. Todo deck também vem na versão para a Neuroport Cyberdeck Port, pelo mesmo preço, que não aceita hardware (Kit p. 37).</p>${sourceNote('Suplemento Cyberpunk 2077', 14)}` }
    },
    flags: { deckComMarca: true }
  });
}

// Quickhacks viram programas "booster" de preço 0: ninguém compra (todo netrunner faz os do nível dele, pelo Rank de
// Interface), e a ficha mostra o cartão; o sistema não rola nada sozinho.
function convertHack(card, folder) {
  const kit = card.raw.origem === 'kit';
  const page = kit ? 16 : 17;
  return itemFrom(coreDoc('core_programs', 'Eraser'), {
    seed: `programa:${card.name}`, name: card.name, folder,
    system: { atk: 0, def: 0, per: 0, spd: 0, damage: { standard: '0', blackIce: '0' }, price: { market: 0 }, source: { book: kit ? KIT : SUPPLEMENT, page }, description: { value: description(card, card.tag, page, kit) } },
    flags: { quickhack: true, origem: card.raw.origem, dv: card.raw.dv, rank: card.raw.rank }
  });
}

export function buildNet() {
  const deckFolder = folderDoc('Item', 'Cyberdecks de 2077', 0);
  const hackFolder = folderDoc('Item', 'Quickhacks do Mission Kit', 1);
  const fanHackFolder = folderDoc('Item', 'Quickhacks do suplemento de fã', 4);
  const decks = wiki.net.decks.map(deck => convertDeck(deck, deckFolder._id));
  const hacks = [...wiki.net.quickhacks.kit, ...wiki.net.quickhacks.fa].map(card => convertHack(card, card.raw.origem === 'kit' ? hackFolder._id : fanHackFolder._id));
  // Ícones: o sistema não tem ícone de quickhack; usa os dos programas parecidos.
  for (const hack of hacks) hack.img = coreImg('core_programs', hack.flags['cpr-2077'].dv >= 10 ? 'Hellbolt' : 'Worm');
  return [deckFolder, hackFolder, fanHackFolder, ...decks, ...hacks];
}
