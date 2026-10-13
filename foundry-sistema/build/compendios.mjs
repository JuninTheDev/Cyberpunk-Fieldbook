// Gera os compêndios do sistema em packs/ (fora do git) a partir de dados/catalogo.json: armas, armaduras, munição,
// cyberware, equipamento, roupas, drogas, netrunning (cyberdecks e programas), upgrades (acessórios de arma, hardware
// de deck e upgrades de veículo), veículos e lesões críticas; o conteúdo de 2077 (armas, cyberware e netrunning); dois
// personagens de exemplo prontos para o combate (um Solo e um Capanga); e as arquiteturas da NET (build/arquiteturas.mjs:
// as da campanha, do documento da wiki, e os exemplos do NET Architect).
// Compila com a ferramenta oficial do Foundry (@foundryvtt/foundryvtt-cli) pelo npx, como o build do cpr-2077.
// Uso: node build/compendios.mjs   (o instalar.mjs chama sozinho quando o catálogo ou este arquivo mudam)
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquiteturasDaCampanha, EXEMPLOS as ARQUITETURAS_DE_EXEMPLO } from './arquiteturas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifesto = JSON.parse(fs.readFileSync(path.join(raiz, 'system.json'), 'utf8'));
const SISTEMA = manifesto.id;
const packsDir = path.join(raiz, 'packs');
export const MARCA = path.join(packsDir, '.gerado');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'catalogo.json'), 'utf8')).itens;

// ID de 16 caracteres derivado do texto: o mesmo item recebe o mesmo ID a cada build (links e fichas não quebram).
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const fazerId = semente => Array.from(crypto.createHash('sha256').update(`${SISTEMA}:${semente}`).digest().subarray(0, 16), byte => LETRAS[byte % LETRAS.length]).join('');
const estatisticas = { coreVersion: manifesto.compatibility.verified, systemId: SISTEMA, systemVersion: manifesto.version };

// Um item do catálogo como documento do compêndio; dentro de um ator, com a chave de item embutido.
function documentoDeItem(id, { ator = null, mudar = null } = {}) {
  const base = catalogo[id];
  if (!base) throw new Error(`O catálogo não tem ${id}.`);
  const dados = structuredClone(base);
  if (mudar) mudar(dados);
  const _id = fazerId(`${ator ?? ''}:${id}`);
  const effects = (dados.effects || []).map((efeito, indice) => {
    const eid = fazerId(`${ator ?? ''}:${id}:efeito:${indice}`);
    return { ...efeito, _id: eid, _key: ator ? `!actors.items.effects!${ator}.${_id}.${eid}` : `!items.effects!${_id}.${eid}`, _stats: estatisticas };
  });
  return { ...dados, _id, _key: ator ? `!actors.items!${ator}.${_id}` : `!items!${_id}`, effects, folder: null, sort: 0, ownership: { default: 0 }, _stats: estatisticas };
}

// Cada compêndio de itens: a origem (o prefixo do id no catálogo, ou uma lista deles) e os tipos que entram nele. O
// conteúdo de 2077 fica nos compêndios dele: as armas com os Rebuilds e a munição Smart melhorada do Mission Kit, e o
// cyberware com a droga do Kit (Immunoblockers), como no cpr-2077. Os Black ICE da tabela da wiki (o Black ICE próprio do
// netrunner) entram no de Netrunning.
const PACKS_DE_ITENS = {
  armas: ['core_', ['arma']], armaduras: ['core_', ['armadura']], municao: ['core_', ['municao']], cyberware: ['core_', ['cyberware']],
  equipamento: ['core_', ['equipamento']], roupas: ['core_', ['roupa']], drogas: ['core_', ['droga']], netrunning: [['core_', 'black-ice:'], ['cyberdeck', 'programa']],
  upgrades: ['core_', ['upgrade']], veiculos: ['core_', ['veiculo']], lesoes: ['core_', ['lesao']],
  'armas-2077': ['armas-2077:', ['arma', 'municao', 'upgrade']], 'cyberware-2077': ['cyberware-2077:', ['cyberware', 'droga']], 'netrunning-2077': ['netrunning-2077:', ['cyberdeck', 'programa']]
};

// ---------------- Personagens de exemplo ----------------
// Armas com o pente cheio da munição da ficha (a quantidade de munição na lista é o que sobra), armaduras vestidas e
// cyberware instalado.
function personagem(nome, { atributos, pericias, role = null, humanidade = 50, itens }) {
  const _id = fazerId(`exemplo:${nome}`);
  const docs = itens.map(({ id, qtd, equipada, instalado, carregar }) => documentoDeItem(id, {
    ator: _id,
    mudar: dados => {
      if (qtd !== undefined) dados.system.quantidade = qtd;
      if (equipada) dados.system.equipada = true;
      if (instalado) Object.assign(dados.system, { instalado: true, perdaHumanidade: { ...dados.system.perdaHumanidade, sofrida: dados.system.perdaHumanidade.media } });
      if (carregar) dados.system.pente.value = dados.system.pente.max;
    }
  }));
  // Cada arma carregada aponta para a munição dela (o mesmo ator).
  itens.forEach((entrada, indice) => {
    if (!entrada.carregar) return;
    const municao = docs[itens.findIndex(outra => outra.id === entrada.carregar)];
    docs[indice].system.carregada = municao._id;
  });
  const a = atributos;
  const hp = 10 + 5 * Math.ceil((a.body + a.will) / 2);
  return {
    _id, _key: `!actors!${_id}`, name: nome, type: 'personagem', img: 'icons/svg/mystery-man.svg',
    system: {
      atributos: Object.fromEntries(Object.entries(a).map(([chave, valor]) => [chave, { valor }])),
      hp: { value: hp, max: hp }, humanidade: { value: humanidade, max: a.emp * 10 }, sorte: { value: a.luck, max: a.luck },
      pericias: Object.fromEntries(Object.entries(pericias).map(([id, nivel]) => [id, { nivel, familia: '', nome: '' }])),
      role: role ?? { nome: '', rank: 4, habilidades: {} }, dinheiro: 500, notas: '<p>Personagem de exemplo do sistema, para testar o combate.</p>'
    },
    prototypeToken: { name: nome, actorLink: true, bar1: { attribute: 'hp' }, sight: { enabled: true }, texture: { src: 'icons/svg/mystery-man.svg' } },
    items: docs, effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: {}, _stats: estatisticas
  };
}

const EXEMPLOS = [
  personagem('Solo (exemplo)', {
    atributos: { int: 6, ref: 8, dex: 7, tech: 5, cool: 7, will: 6, luck: 5, move: 6, body: 7, emp: 5 },
    pericias: { 'shoulder-arms': 6, handgun: 6, autofire: 6, 'heavy-weapons': 4, evasion: 6, athletics: 4, perception: 6, concentration: 4, 'melee-weapon': 4, brawling: 4 },
    role: { nome: 'Solo', rank: 4, habilidades: { 'Initiative Reaction': 2, 'Threat Detection': 2 } },
    humanidade: 36,
    itens: [
      { id: 'core_weapons:assault-rifle', equipada: true, carregar: 'core_ammo:rifle-basic' },
      { id: 'core_ammo:rifle-basic', qtd: 25 },
      { id: 'core_weapons:heavy-pistol', equipada: true, carregar: 'core_ammo:heavy-pistol-basic' },
      { id: 'core_ammo:heavy-pistol-basic', qtd: 16 },
      { id: 'core_armor:light-armorjack-body', equipada: true },
      { id: 'core_armor:light-armorjack-head', equipada: true },
      { id: 'core_cyberware:kerenzikov', instalado: true }
    ]
  }),
  personagem('Capanga (exemplo)', {
    atributos: { int: 4, ref: 6, dex: 6, tech: 4, cool: 5, will: 4, luck: 3, move: 5, body: 6, emp: 4 },
    pericias: { handgun: 4, 'melee-weapon': 4, evasion: 4, brawling: 4, concentration: 2, perception: 3 },
    humanidade: 40,
    itens: [
      { id: 'core_weapons:heavy-pistol', equipada: true, carregar: 'core_ammo:heavy-pistol-basic' },
      { id: 'core_ammo:heavy-pistol-basic', qtd: 8 },
      { id: 'core_weapons:heavy-melee', equipada: true },
      { id: 'core_armor:kevlar-body', equipada: true }
    ]
  })
];

// ---------------- Arquiteturas da NET ----------------
// As da campanha (do documento da wiki) e os exemplos do NET Architect, com o id de sempre pelo nome.
function documentoDeArquitetura(dados) {
  const _id = fazerId(`arquitetura:${dados.name}`);
  return { ...dados, _id, _key: `!items!${_id}`, effects: [], folder: null, sort: 0, ownership: { default: 0 }, _stats: estatisticas };
}

// ---------------- Compilar ----------------
function fvtt(args) {
  // No Windows o npx é um .cmd: roda pelo shell. Os argumentos vão entre aspas por causa dos espaços nos caminhos.
  const entreAspas = args.map(arg => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg));
  execSync(['npx', '--yes', '@foundryvtt/foundryvtt-cli@1.1.0', ...entreAspas].join(' '), { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

export function gerar() {
  const fonte = fs.mkdtempSync(path.join(os.tmpdir(), 'cpr-fieldbook-packs-'));
  const packs = Object.fromEntries(Object.entries(PACKS_DE_ITENS).map(([nome, [prefixo, tipos]]) => [nome, Object.entries(catalogo).filter(([id, item]) => [prefixo].flat().some(p => id.startsWith(p)) && tipos.includes(item.type)).map(([id]) => documentoDeItem(id))]));
  packs.exemplos = EXEMPLOS;
  packs.arquiteturas = [...arquiteturasDaCampanha(path.join(raiz, '..')), ...ARQUITETURAS_DE_EXEMPLO].map(documentoDeArquitetura);
  fs.rmSync(packsDir, { recursive: true, force: true });
  fs.mkdirSync(packsDir, { recursive: true });
  try {
    for (const [nome, docs] of Object.entries(packs)) {
      const pasta = path.join(fonte, nome);
      fs.mkdirSync(pasta, { recursive: true });
      for (const doc of docs) fs.writeFileSync(path.join(pasta, `${doc._id}.json`), JSON.stringify(doc));
      fvtt(['package', 'pack', '-n', nome, '--in', pasta, '--out', packsDir, '--type', 'System', '--id', SISTEMA]);
    }
  } finally {
    fs.rmSync(fonte, { recursive: true, force: true });
  }
  fs.writeFileSync(MARCA, new Date().toISOString());
  return Object.fromEntries(Object.entries(packs).map(([nome, docs]) => [nome, docs.length]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(Object.entries(gerar()).map(([nome, n]) => `${nome} ${n}`).join(' · '));
}
