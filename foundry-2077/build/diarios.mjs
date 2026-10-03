// Regras de 2077 em diários: as páginas da wiki, uma página de diário por seção.
import fs from 'node:fs';
import path from 'node:path';
import { journalDoc } from './lib.mjs';
import { sourceDir } from './paths.mjs';
import { wiki } from './wiki.mjs';

// [página da wiki, seções a incluir (null = todas)]
const journals = [
  ['weapons2077', null], ['cyberware2077', null], ['net2077', null], ['quickhacks', null], ['os2077', null],
  ['supplement2077', null], ['economy', null],
  // Das fichas de NPC, só o que não cita a campanha: o resto está no compêndio de NPCs.
  ['npcs', ['Como usar', 'Trauma Team']],
  ['roles2077', null]
];

// Botões de navegação da wiki não fazem sentido no Foundry.
const cleanHtml = html => html
  .replace(/<button class="action"[^>]*>[\s\S]*?<\/button>/g, '')
  .replace(/<p>\s*<\/p>/g, '')
  .replace(/<div class="roll-buttons">\s*<\/div>/g, '')
  .trim();

// Divide o HTML da página nas seções (<div class="section">). O título da seção vira o nome da página do diário.
function splitSections(html) {
  const parts = html.split(/(?=<div class="section")/);
  const intro = parts[0].startsWith('<div class="section"') ? '' : parts.shift();
  const sections = parts.map(part => {
    const title = (part.match(/data-toc="([^"]+)"/) || part.match(/<h3>([^<]+)/) || [])[1] || 'Seção';
    // O <h3> repete o nome da página; a referência de página do livro vira uma linha discreta.
    const body = part.replace(/<h3>[^<]*(?:<span class="ref">([^<]*)<\/span>)?<\/h3>/, (match, ref) => ref ? `<p class="cpr2077-ref">${ref}</p>` : '');
    return { name: title.trim(), html: body };
  });
  return { intro, sections };
}

const wrap = html => `<div class="cpr2077">${cleanHtml(html)}</div>`;

export function buildJournals() {
  const guide = fs.readFileSync(path.join(sourceDir, 'data', 'leia-primeiro.html'), 'utf8');
  const docs = [journalDoc({ seed: 'diario:leia-primeiro', name: '00 · Leia primeiro: o módulo 2077', pages: [{ name: 'Como usar o módulo', html: wrap(guide) }] })];
  journals.forEach(([id, only], index) => {
    const page = wiki.pages[id];
    const { intro, sections } = splitSections(page.html);
    const chosen = only ? sections.filter(section => only.includes(section.name)) : sections;
    const pages = [
      { name: 'Visão geral', html: wrap(`<p class="cpr2077-lede">${page.lede}</p>${only ? '' : intro}`) },
      ...chosen.map(section => ({ name: section.name, html: wrap(section.html) }))
    ];
    docs.push(journalDoc({ seed: `diario:${id}`, name: `${String(index + 1).padStart(2, '0')} · ${page.title}`, pages }));
  });
  return docs;
}
