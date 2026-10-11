// Converte o conteúdo do sistema oficial Cyberpunk RED - CORE (v0.92.4, GPL-3, The Project Red Team) para o formato
// deste sistema: armas, armaduras, munição e cyberware (com os efeitos), as perícias e as tabelas de DV.
// Uso: node build/conteudo.mjs
// Na primeira vez baixa os compêndios-fonte (YAML) da tag do GitLab para .cache/; o js-yaml vem da CDN (sem npm).
// Saída:
//   dados/catalogo.json  os itens, pelo mesmo id da loja da wiki ("core_weapons:assault-rifle");
//   scripts/gerado.mjs   as perícias (com os nomes em português da wiki) e as tabelas de DV.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VERSAO = 'v0.92.4';
const PROJETO = 'cyberpunk-red-team%2Ffvtt-cyberpunk-red-core';
// O que se baixa é conferido: a tag tem de ser deste commit (o arquivo do GitLab vem numa pasta com o hash dele), e o
// js-yaml, que é código e roda aqui, tem de ter este SHA-256. Qualquer diferença para o build.
const COMMIT_DA_TAG = '75b8c9d7cb76ed1ea2797a3404ce77172d424b6b';
const JS_YAML = { url: 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs', sha256: '16f210b939b359b6ec8dde581eb62c157185711dc7b719b33779c43db5c31a91' };
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(raiz, '.cache');
const pastaDaFonte = path.join(cache, `cpr-core-${VERSAO}`);
const fonte = path.join(pastaDaFonte, 'src', 'packs');
const sha256 = arquivo => crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');

// Pelo https do Node e não pelo fetch: o GitLab responde 406 aos cabeçalhos que o fetch acrescenta, e uma página de
// desafio a pedidos sem cara de navegador.
function baixar(url, destino) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, resposta => {
      if (resposta.statusCode !== 200) { resposta.resume(); reject(new Error(`${url} respondeu ${resposta.statusCode}`)); return; }
      const partes = [];
      resposta.on('data', parte => partes.push(parte)).on('end', () => { fs.writeFileSync(destino, Buffer.concat(partes)); resolve(); }).on('error', reject);
    }).on('error', reject);
  });
}

async function prepararFonte() {
  fs.mkdirSync(cache, { recursive: true });
  // Cache sem a marca do commit (de antes da conferência) ou de outro commit: baixa de novo.
  const marca = path.join(pastaDaFonte, 'COMMIT');
  if (fs.existsSync(pastaDaFonte) && (!fs.existsSync(marca) || fs.readFileSync(marca, 'utf8').trim() !== COMMIT_DA_TAG)) fs.rmSync(pastaDaFonte, { recursive: true, force: true });
  if (!fs.existsSync(fonte)) {
    const arquivo = path.join(cache, `packs-${VERSAO}.tar.gz`);
    await baixar(`https://gitlab.com/api/v4/projects/${PROJETO}/repository/archive.tar.gz?sha=${VERSAO}&path=src/packs`, arquivo);
    const tmp = fs.mkdtempSync(path.join(cache, 'extrair-'));
    try {
      // Caminhos relativos: o tar do Git Bash lê "C:\..." como endereço de outra máquina; o do Windows aceita os dois.
      execFileSync('tar', ['-xzf', path.basename(arquivo), '-C', path.basename(tmp)], { cwd: cache });
      // O arquivo vem numa pasta com o hash do commit ("fvtt-cyberpunk-red-core-v0.92.4-<commit>-src-packs"): confere e
      // guarda como cpr-core-<versão>.
      const [pasta] = fs.readdirSync(tmp);
      if (!new RegExp(`-${COMMIT_DA_TAG}(-|$)`).test(pasta)) throw new Error(`A tag ${VERSAO} do GitLab não é mais do commit ${COMMIT_DA_TAG} (veio ${pasta}). Confira a mudança antes de aceitar.`);
      fs.renameSync(path.join(tmp, pasta), pastaDaFonte);
      fs.writeFileSync(marca, COMMIT_DA_TAG);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.rmSync(arquivo, { force: true });
    }
  }
  const yamlJs = path.join(cache, 'js-yaml-4.1.0.mjs');
  if (!fs.existsSync(yamlJs)) await baixar(JS_YAML.url, yamlJs);
  if (sha256(yamlJs) !== JS_YAML.sha256) {
    fs.rmSync(yamlJs, { force: true });
    throw new Error(`O js-yaml baixado de ${JS_YAML.url} não tem o SHA-256 esperado. Nada foi executado.`);
  }
  return (await import(pathToFileURL(yamlJs).href)).default;
}

export const slug = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "Wardrobe & Style" → "wardrobeAndStyle": como o sistema oficial chama a perícia nas chaves dos efeitos. A barra vira
// "Or" na maioria ("concealOrRevealObject") e "And" em algumas ("electronicsAndSecurityTech"): valem as duas.
const camelOficial = (nome, barra = 'Or') => nome.replace(/&/g, ' And ').replace(/\//g, ` ${barra} `).split(/[^A-Za-z0-9]+/).filter(Boolean)
  .map((parte, i) => i ? parte[0].toUpperCase() + parte.slice(1).toLowerCase() : parte.toLowerCase()).join('');

// Lê um compêndio-fonte: os documentos e os embutidos (efeitos dos itens, resultados das tabelas), pela chave _key.
function lerPack(yaml, nome) {
  const pasta = path.join(fonte, nome);
  const docs = [];
  const filhos = new Map();
  for (const arquivo of fs.readdirSync(pasta).filter(f => f.endsWith('.yaml'))) {
    const doc = yaml.load(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));
    const chave = String(doc._key || '');
    const embutido = chave.match(/^!(?:items\.effects|tables\.results)!([^.]+)\./);
    if (embutido) {
      if (!filhos.has(embutido[1])) filhos.set(embutido[1], []);
      filhos.get(embutido[1]).push(doc);
    } else if (/^!(items|tables)!/.test(chave)) docs.push(doc);
  }
  return docs.map(doc => ({ ...doc, filhos: filhos.get(doc._id) || [] }));
}

const fonteDo = s => ({ livro: s.source?.book || '', pagina: Number(s.source?.page) || 0 });

// ---------------- Perícias ----------------
// A lista do sistema oficial (atributo, grupo, x2) com o nome em português da tabela de perícias da wiki.
const FAMILIAS = {
  language: { en: 'Language', atributo: 'int', dificil: false },
  'local-expert': { en: 'Local Expert', atributo: 'int', dificil: false },
  science: { en: 'Science', atributo: 'int', dificil: false },
  'martial-arts': { en: 'Martial Arts', atributo: 'dex', dificil: true },
  'play-instrument': { en: 'Play Instrument', atributo: 'tech', dificil: false }
};
const GRUPOS = {
  awarenessSkills: 'Percepção', bodySkills: 'Corpo', controlSkills: 'Controle', educationSkills: 'Educação', fightingSkills: 'Luta',
  performanceSkills: 'Performance', rangedweaponSkills: 'Armas à distância', socialSkills: 'Social', techniqueSkills: 'Técnica'
};
function nomesDaWiki() {
  const texto = fs.readFileSync(path.join(raiz, '..', 'system-rules.js'), 'utf8');
  const nomes = {};
  for (const [, pt, en, , grupo, , basica] of texto.matchAll(/\['([^']+)', '([^']+)', '(INT|REF|DEX|TECH|COOL|WILL|EMP)', '([^']+)', (true|false), (true|false)\]/g)) nomes[en] = { pt, grupo, basica: basica === 'true' };
  return nomes;
}
function converterPericias(yaml) {
  const wiki = nomesDaWiki();
  const familias = {};
  for (const [id, f] of Object.entries(FAMILIAS)) familias[id] = { ...f, nome: wiki[f.en]?.pt || f.en, grupo: wiki[f.en]?.grupo || 'Educação', basica: Boolean(wiki[f.en]?.basica) };
  const pericias = [];
  const camel = {};
  for (const doc of lerPack(yaml, 'internal/skills')) {
    const s = doc.system;
    // "Language (Streetslang)" e "Local Expert (Your Home)" são perícias de família: ficam nas famílias.
    if (/^(Language|Local Expert) \(/.test(doc.name)) continue;
    const id = slug(doc.name);
    pericias.push({ id, en: doc.name, nome: wiki[doc.name]?.pt || doc.name, atributo: s.stat, grupo: wiki[doc.name]?.grupo || GRUPOS[s.category] || s.category, dificil: s.difficulty === 'difficult', basica: Boolean(wiki[doc.name]?.basica) });
    camel[camelOficial(doc.name)] = id;
    camel[camelOficial(doc.name, 'And')] = id;
  }
  for (const [id, f] of Object.entries(FAMILIAS)) camel[camelOficial(f.en)] = id;
  pericias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const semNome = pericias.filter(p => p.nome === p.en).map(p => p.en);
  return { pericias, familias, camel, semNome };
}

// ---------------- Tabelas de DV ----------------
// "DV Assault Rifle": [[0, 6, 17], [7, 12, 16], ...] em metros; "N/A" = fora do alcance (sem faixa).
function converterTabelas(yaml) {
  const tabelas = {};
  for (const doc of lerPack(yaml, 'internal/dv-tables')) {
    const faixas = doc.filhos.map(r => [r.range[0], r.range[1], parseInt(r.text, 10)]).filter(([, , dv]) => Number.isFinite(dv)).sort((a, b) => a[0] - b[0]);
    tabelas[doc.name] = faixas;
  }
  return tabelas;
}

// ---------------- Efeitos ----------------
// Chaves do sistema oficial → campos deste sistema. As situacionais (só valem em certas rolagens) ficam de fora por
// enquanto: aplicar sempre seria errado. O relatório lista o que ficou de fora.
const MODOS = { 0: 'custom', 1: 'multiply', 2: 'add', 3: 'downgrade', 4: 'upgrade', 5: 'override' };
const BONUS_DIRETOS = {
  initiative: 'iniciativa', aimedShot: 'tiroMirado', singleShot: 'tiroUnico', hands: 'maos', hasPainSuppression: 'supressaoDeDor',
  // Das lesões: −2 em todas as ações (Concussão, Lesão Cerebral), no corpo a corpo (Músculo Rompido) e nos tiros (Olho).
  allActions: 'todasAcoes', melee: 'corpoACorpo', ranged: 'distancia'
};
function chaveNova(chave, camel) {
  let m = chave.match(/^system\.stats\.([a-z]+)\.value$/);
  if (m) return `system.atributos.${m[1]}.valor`;
  m = chave.match(/^bonuses\.([A-Za-z]+)$/);
  if (m && BONUS_DIRETOS[m[1]]) return `system.bonus.${BONUS_DIRETOS[m[1]]}`;
  if (m && camel[m[1]]) return `system.bonus.pericias.${camel[m[1]]}`;
  return null;
}
function converterEfeitos(doc, camel, foraDoMapa) {
  return doc.filhos.map(efeito => {
    const situacional = efeito.flags?.['cyberpunk-red-core']?.changes?.situational || {};
    const changes = [];
    (efeito.changes || []).forEach((c, i) => {
      const chave = chaveNova(c.key, camel);
      if (!chave || situacional[i]?.isSituational) { foraDoMapa.push(`${doc.name}: ${c.key}${situacional[i]?.isSituational ? ' (situacional)' : ''}`); return; }
      const valor = chave.endsWith('supressaoDeDor') ? 'true' : String(c.value);
      changes.push({ key: chave, type: MODOS[c.mode] || 'add', value: valor, phase: 'initial', priority: null });
    });
    return { name: efeito.name, img: 'icons/svg/upgrade.svg', type: 'base', system: { changes }, disabled: Boolean(efeito.disabled), transfer: true, description: efeito.description || '' };
  }).filter(efeito => efeito.system.changes.length);
}

// ---------------- Itens ----------------
function arma(doc, s) {
  return {
    name: doc.name, type: 'arma', img: s.isRanged ? 'icons/svg/target.svg' : 'icons/svg/sword.svg',
    system: {
      descricao: s.description?.value || '', tipo: s.weaponType || '', pericia: slug(s.weaponSkill || ''), dano: s.damage || '1d6', cdt: Number(s.rof) || 1,
      pente: { value: 0, max: Number(s.magazine?.max) || 0 }, municoes: s.ammoVariety || [], aDistancia: Boolean(s.isRanged), maos: Number(s.handsReq) || 1,
      autofogo: Number(s.fireModes?.autoFire) || 0, supressivo: Boolean(s.fireModes?.suppressiveFire), bonusAtaque: Number(s.attackmod) || 0,
      qualidade: s.quality || 'standard', ocultavel: Boolean(s.concealable?.concealable), tabelaDV: s.dvTable || '',
      ignorarArmadura: Number(s.ignoreArmorPercent) || 0, ignorarAbaixo: Number(s.ignoreBelowSP) || 0, equipada: false,
      preco: Number(s.price?.market) || 0, fonte: fonteDo(s)
    }
  };
}
function armadura(doc, s) {
  const local = (sim, l) => sim ? { value: Math.max(0, (Number(l?.sp) || 0) - (Number(l?.ablation) || 0)), max: Number(l?.sp) || 0 } : { value: 0, max: 0 };
  return {
    name: doc.name, type: 'armadura', img: 'icons/svg/shield.svg',
    system: {
      descricao: s.description?.value || '', sp: { cabeca: local(s.isHeadLocation, s.headLocation), corpo: local(s.isBodyLocation, s.bodyLocation) },
      penalidade: Number(s.penalty) || 0, escudo: Boolean(s.isShield), pvEscudo: { value: Number(s.shieldHitPoints?.value) || 0, max: Number(s.shieldHitPoints?.max) || 0 },
      equipada: false, preco: Number(s.price?.market) || 0, fonte: fonteDo(s)
    }
  };
}
function municao(doc, s) {
  return {
    name: doc.name, type: 'municao', img: 'icons/svg/barrel.svg',
    system: { descricao: s.description?.value || '', tipo: s.variety || '', efeito: s.type || 'basic', quantidade: Number(s.amount) || 0, ablacao: Number(s.ablationValue ?? 1), preco: Number(s.price?.market) || 0, fonte: fonteDo(s) }
  };
}
function cyberware(doc, s) {
  return {
    name: doc.name, type: 'cyberware', img: 'icons/svg/clockwork.svg',
    system: {
      descricao: s.description?.value || '', tipo: s.type || '', fundacional: Boolean(s.isFoundational), tamanho: Number(s.size) || 0,
      perdaHumanidade: { formula: s.humanityLoss?.roll || '0', media: Number(s.humanityLoss?.static) || 0, sofrida: 0 },
      local: s.installLocation || 'mall', instalado: false, preco: Number(s.price?.market) || 0, fonte: fonteDo(s)
    }
  };
}
// Lesão crítica: local, se aumenta a penalidade de base do Death Save, e as DVs do paliativo e do tratamento (0 = não
// serve aquela perícia).
function lesao(doc, s) {
  return {
    name: doc.name, type: 'lesao', img: 'icons/svg/blood.svg',
    system: {
      descricao: s.description?.value || '', local: s.location === 'head' ? 'cabeca' : 'corpo', aumentaDeathSave: Boolean(s.deathSaveIncrease),
      paliativo: { primeirosSocorros: Number(s.quickFix?.dvFirstAid) || 0, paramedico: Number(s.quickFix?.dvParamedic) || 0 },
      tratamento: { paramedico: Number(s.treatment?.dvParamedic) || 0, cirurgia: Number(s.treatment?.dvSurgery) || 0 },
      fonte: fonteDo(s)
    }
  };
}
const CONVERSORES = {
  'core/weapons': arma, 'core/armor': armadura, 'core/ammo': municao, 'core/cyberware': cyberware,
  'core/critical-injuries-body': lesao, 'core/critical-injuries-head': lesao
};

// Tabelas de Lesão Crítica (2d6): faixas [mín, máx, id do item no catálogo], uma do corpo e uma da cabeça.
function converterLesoes(yaml) {
  const tabelas = {};
  for (const doc of lerPack(yaml, 'internal/critical-injury-tables')) {
    const local = /head/i.test(doc.name) ? 'cabeca' : 'corpo';
    const pack = local === 'cabeca' ? 'core_critical-injuries-head' : 'core_critical-injuries-body';
    tabelas[local] = doc.filhos.map(r => [r.range[0], r.range[1], `${pack}:${slug(r.text)}`]).sort((a, b) => a[0] - b[0]);
  }
  return tabelas;
}

// As tabelas de lesão em português da wiki (critBody e critHead em system-rules.js), pelo resultado do 2d6:
// [2d6, nome, efeito, paliativo, tratamento].
function lesoesDaWiki() {
  const texto = fs.readFileSync(path.join(raiz, '..', 'system-rules.js'), 'utf8');
  const tabela = nome => {
    const bloco = texto.match(new RegExp(`const ${nome} = \\[([\\s\\S]*?)\\n  \\];`))?.[1] || '';
    return Object.fromEntries([...bloco.matchAll(/\[(\d+), '([^']+)', '([^']+)', '([^']+)', '([^']+)'\]/g)].map(([, n, ...resto]) => [Number(n), resto]));
  };
  return { corpo: tabela('critBody'), cabeca: tabela('critHead') };
}

// Nome e descrição em português nos itens de lesão (o id do catálogo continua o do nome em inglês).
function traduzirLesoes(itens, tabelas) {
  const wiki = lesoesDaWiki();
  for (const [local, faixas] of Object.entries(tabelas)) {
    for (const [min, , id] of faixas) {
      const linha = wiki[local][min];
      const item = itens[id];
      if (!linha || !item) continue;
      const [nome, efeito, paliativo, tratamento] = linha;
      item.flags['cpr-fieldbook'].nomeOriginal = item.name;
      item.name = nome;
      item.system.descricao = `<p>${efeito}</p><p><b>Paliativo:</b> ${paliativo}. <b>Tratamento:</b> ${tratamento}.</p>`;
    }
  }
}

async function main() {
  const yaml = await prepararFonte();
  const { pericias, familias, camel, semNome } = converterPericias(yaml);
  const tabelas = converterTabelas(yaml);
  const lesoes = converterLesoes(yaml);
  const itens = {};
  const foraDoMapa = [];
  const contagem = {};
  for (const [pack, converter] of Object.entries(CONVERSORES)) {
    const curto = `core_${pack.split('/')[1]}`;
    for (const doc of lerPack(yaml, pack)) {
      const item = converter(doc, doc.system || {});
      item.effects = converterEfeitos(doc, camel, foraDoMapa);
      item.flags = { 'cpr-fieldbook': { catalogo: `${curto}:${slug(doc.name)}`, origem: { sistema: 'cyberpunk-red-core', versao: VERSAO, id: doc._id } } };
      itens[`${curto}:${slug(doc.name)}`] = item;
      contagem[curto] = (contagem[curto] || 0) + 1;
    }
  }
  traduzirLesoes(itens, lesoes);
  fs.mkdirSync(path.join(raiz, 'dados'), { recursive: true });
  const catalogo = { fonte: `Cyberpunk RED - CORE ${VERSAO} (GPL-3, The Project Red Team), convertido por build/conteudo.mjs`, itens };
  fs.writeFileSync(path.join(raiz, 'dados', 'catalogo.json'), JSON.stringify(catalogo));
  const gerado = [
    `// Gerado por build/conteudo.mjs a partir do Cyberpunk RED - CORE ${VERSAO} (GPL-3) e da tabela de perícias da wiki.`,
    '// Não edite à mão: rode o build de novo.',
    `export const PERICIAS = ${JSON.stringify(pericias)};`,
    `export const FAMILIAS = ${JSON.stringify(familias)};`,
    `export const TABELAS_DV = ${JSON.stringify(tabelas)};`,
    `export const TABELAS_LESAO = ${JSON.stringify(lesoes)};`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(raiz, 'scripts', 'gerado.mjs'), gerado);

  const semItem = Object.values(lesoes).flat().filter(([, , id]) => !itens[id]).map(([, , id]) => id);
  console.log(`Itens: ${Object.entries(contagem).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  console.log(`Perícias: ${pericias.length} (+${Object.keys(familias).length} famílias) · tabelas de DV: ${Object.keys(tabelas).length} · tabelas de lesão: ${Object.keys(lesoes).join(', ')}`);
  if (semItem.length) console.log(`Resultados de lesão sem item no catálogo: ${semItem.join(', ')}`);
  if (semNome.length) console.log(`Perícias sem nome em português na wiki: ${semNome.join(', ')}`);
  if (foraDoMapa.length) console.log(`Mudanças de efeito que ficaram de fora (${foraDoMapa.length}):\n  ${foraDoMapa.join('\n  ')}`);
}

main().catch(error => { console.error(error.message); process.exit(1); });
