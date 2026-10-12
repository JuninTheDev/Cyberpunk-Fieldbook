// Utilitários do build: IDs estáveis, documentos do sistema usados como molde e montagem de documentos.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cacheDir, moduleId } from './paths.mjs';

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// ID de 16 caracteres derivado do texto: o mesmo item recebe o mesmo ID a cada build (links e fichas não quebram).
export function makeId(seed) {
  const bytes = crypto.createHash('sha256').update(`${moduleId}:${seed}`).digest();
  return Array.from(bytes.subarray(0, 16), byte => ID_CHARS[byte % ID_CHARS.length]).join('');
}

export const slug = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const clone = value => structuredClone(value);

// "1.000eb", "100eb (o par)", "1.000eb ou 5.000eb" → primeiro valor em eb.
export function parseEb(text) {
  const match = String(text).replace(/\.(?=\d{3})/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

// Perda de Humanidade: o suplemento dá o valor fixo; a rolagem segue a equivalência do RED (2d6 ≈ 7, 4d6 ≈ 14).
export function humanityLoss(text) {
  const value = parseInt(String(text), 10) || 0;
  const roll = { 0: '0', 2: '1d6/2', 3: '1d6', 7: '2d6', 14: '4d6', 21: '6d6' }[value] ?? `${Math.max(1, Math.round(value / 3.5))}d6`;
  return { static: value, roll };
}

// ---------------- Compêndios do sistema extraídos em .cache/core ----------------
const coreCache = new Map();
export function corePack(pack) {
  if (!coreCache.has(pack)) {
    const dir = path.join(cacheDir, 'core', pack);
    if (!fs.existsSync(dir)) throw new Error(`Falta ${dir}. Rode antes: node build/extract-core.mjs`);
    coreCache.set(pack, fs.readdirSync(dir).map(file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))));
  }
  return coreCache.get(pack);
}
export function coreDoc(pack, name) {
  const doc = corePack(pack).find(item => item.name === name);
  if (!doc) throw new Error(`Documento "${name}" não encontrado em ${pack}`);
  return clone(doc);
}
export const coreImg = (pack, name) => corePack(pack).find(item => item.name === name)?.img;

export const systemVersion = () => JSON.parse(fs.readFileSync(path.join(cacheDir, 'core', 'versao.json'), 'utf8')).version;
const docStats = () => ({ coreVersion: '12.343', systemId: 'cyberpunk-red-core', systemVersion: systemVersion(), createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null });

// ---------------- Documentos ----------------
// Efeito ativo no formato do sistema: cada modificador tem a categoria (combat, skill, stat...) e,
// se for situacional, aparece como opção na janela de rolagem em vez de somar sempre.
// changes: [{ key, value, mode = 2 (somar), category, situational = false, onByDefault = false }]
export function effectDoc({ seed, name, img, changes, disabled = false, description = '' }) {
  const cats = {};
  const situational = {};
  changes.forEach((change, index) => {
    cats[index] = change.category;
    situational[index] = { isSituational: Boolean(change.situational), onByDefault: Boolean(change.onByDefault) };
  });
  return {
    _id: makeId(`efeito:${seed}`), name, img, description, disabled, transfer: true, type: 'base', system: {},
    changes: changes.map(({ key, value, mode = 2 }) => ({ key, mode, priority: null, value: String(value) })),
    duration: { combat: null, rounds: null, seconds: null, startRound: null, startTime: null, startTurn: null, turns: null },
    flags: { 'cyberpunk-red-core': { changes: { cats, situational } } },
    origin: null, statuses: [], tint: '#ffffff', sort: 0, _stats: docStats()
  };
}

// Chaves (_key) dos efeitos de um item: item do compêndio ou item dentro de um ator.
export function keyEffects(item, actorId = null) {
  item.effects = (item.effects || []).map(effect => ({
    ...effect,
    _key: actorId ? `!actors.items.effects!${actorId}.${item._id}.${effect._id}` : `!items.effects!${item._id}.${effect._id}`
  }));
  return item;
}

// Item a partir de um molde do sistema: mantém todos os campos e troca só o que foi passado.
// Os efeitos do molde não vêm junto; os do item são passados em effects (já montados com effectDoc).
export function itemFrom(template, { seed, name, img, system = {}, flags = {}, folder = null, effects = [], key = id => `!items!${id}` }) {
  const _id = makeId(seed || name);
  return keyEffects({
    _id, _key: key(_id), name, type: template.type, img: img || template.img,
    system: foundryMerge(clone(template.system), system),
    effects, folder, sort: 0, ownership: { default: 0 },
    flags: { [moduleId]: flags }, _stats: docStats()
  });
}

// Pasta dentro de um compêndio.
export function folderDoc(type, name, sort = 0, parent = null) {
  const _id = makeId(`pasta:${type}:${name}`);
  return { _id, _key: `!folders!${_id}`, name, type, folder: parent, sorting: 'a', sort, color: null, description: '', flags: {}, _stats: docStats() };
}

export function actorDoc({ seed, name, type, img, system, items, flags = {}, folder = null, token = {} }) {
  const _id = makeId(seed || name);
  return {
    _id, _key: `!actors!${_id}`, name, type, img, system,
    items: items.map(item => keyEffects({ ...item, _key: `!actors.items!${_id}.${item._id}`, folder: null }, _id)),
    effects: [], folder, sort: 0, ownership: { default: 0 }, flags: { [moduleId]: flags },
    prototypeToken: { name, actorLink: false, disposition: -1, displayName: 20, displayBars: 20, bar1: { attribute: 'derivedStats.hp' }, texture: { src: img }, ...token },
    _stats: docStats()
  };
}

export function journalDoc({ seed, name, pages, folder = null }) {
  const _id = makeId(seed || name);
  return {
    _id, _key: `!journal!${_id}`, name, folder, sort: 0, ownership: { default: 0 }, flags: {}, _stats: docStats(),
    pages: pages.map((page, index) => {
      const pageId = makeId(`${seed || name}:pagina:${page.name}`);
      return {
        _id: pageId, _key: `!journal.pages!${_id}.${pageId}`, name: page.name, type: 'text', sort: (index + 1) * 100000,
        title: { show: true, level: 1 }, text: { format: 1, content: page.html }, src: null, system: {},
        ownership: { default: -1 }, flags: {}, _stats: docStats()
      };
    })
  };
}

export function macroDoc({ seed, name, img, command }) {
  const _id = makeId(seed || name);
  return { _id, _key: `!macros!${_id}`, name, type: 'script', img, command, scope: 'global', author: null, folder: null, sort: 0, ownership: { default: 0 }, flags: {}, _stats: docStats() };
}

// Mescla objetos simples (como foundry.utils.mergeObject): arrays e valores são substituídos.
export function foundryMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) foundryMerge(target[key], value);
    else target[key] = value;
  }
  return target;
}

// ---------------- Descrições ----------------
export const stripTags = html => String(html ?? '').replace(/<[^>]+>/g, '');
export const para = (html, label) => html ? `<p>${label ? `<b>${label}:</b> ` : ''}${html}</p>` : '';
export const sourceNote = (book, page) => `<p><i>${book}${page ? `, p. ${page}` : ''}.</i></p>`;
export const SUPPLEMENT = 'Cyberpunk 2077 (suplemento)';
export const KIT = 'Cyberpunk Edgerunners Mission Kit';
