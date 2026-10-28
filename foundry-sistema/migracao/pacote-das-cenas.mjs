// Pacote das cenas: leva as cenas de um mundo do Foundry 12 (com paredes, luzes, tiles, sons, notas e regiões), os
// diários e as playlists para um módulo "Arquivo da mesa", que o Foundry 14 importa de uma vez, como uma Aventura. Os
// arquivos que elas usam (mapas, vídeos, músicas, retratos dos tokens) vão junto, dentro do módulo, e os caminhos passam a
// apontar para lá: nada depende do sistema CORE, dos módulos antigos nem da pasta do mundo antigo.
// Fica de fora o que só existe com o sistema CORE: atores, itens (as arquiteturas da NET são itens), combates e macros
// (usam o cpr-2077). Os tokens das cenas ficam sem ator, com a posição e a imagem: ponha os atores novos por cima.
// Só lê o mundo: os bancos são copiados para uma pasta temporária antes de abrir. Usa a ferramenta oficial do Foundry
// (@foundryvtt/foundryvtt-cli, pelo npx), como o build dos compêndios.
// Uso: node foundry-sistema/migracao/pacote-das-cenas.mjs --data <pasta Data do Foundry 12> --mundo <id> --saida <pasta>
//   no servidor: --data /srv/foundry/data/Data --mundo edgerunners-storys --saida /srv/backups/pacote-das-cenas
// Depois: copie a pasta do módulo para Data/modules do Foundry 14, ligue o módulo no mundo novo e, no compêndio
// "Arquivo da mesa", importe a Aventura. Não desinstale o módulo depois: os arquivos das cenas moram nele.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULO = 'arquivo-da-mesa';
const COLECOES = ['scenes', 'journal', 'playlists', 'folders'];
// Para onde vão os arquivos dentro do módulo: o que estava na pasta de um sistema, de um módulo ou do mundo antigo ganha
// uma pasta com o nome dele; o que estava solto na pasta Data fica na raiz de arquivos/.
const prefixos = mundo => [['systems/', ''], ['modules/', ''], [`worlds/${mundo}/`, 'mundo/']];

function argumentos(lista) {
  const args = {};
  for (let i = 0; i < lista.length; i++) if (lista[i].startsWith('--')) args[lista[i].slice(2)] = lista[i + 1];
  for (const nome of ['data', 'mundo', 'saida']) if (!args[nome]) throw new Error(`Falta --${nome}. Uso: node pacote-das-cenas.mjs --data <pasta Data> --mundo <id> --saida <pasta>`);
  return { data: path.resolve(args.data), mundo: args.mundo, saida: path.resolve(args.saida) };
}

// A ferramenta oficial pelo npx. No Windows o npx é um .cmd: roda pelo shell, com aspas nos caminhos com espaço.
function fvtt(args) {
  const entreAspas = args.map(arg => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg));
  execSync(['npx', '--yes', '@foundryvtt/foundryvtt-cli@1.1.0', ...entreAspas].join(' '), { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

const lerJson = pasta => (fs.existsSync(pasta) ? fs.readdirSync(pasta).filter(nome => nome.endsWith('.json')).map(nome => JSON.parse(fs.readFileSync(path.join(pasta, nome), 'utf8'))) : []);
// Sem as chaves do banco (_key), que são da ferramenta e não do documento.
function semChaves(valor) {
  if (Array.isArray(valor)) return valor.map(semChaves);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).filter(([chave]) => chave !== '_key').map(([chave, v]) => [chave, semChaves(v)]));
  return valor;
}
const decodificar = texto => { try { return decodeURIComponent(texto); } catch { return texto; } };

export function gerarPacote({ data, mundo, saida }) {
  const pastaDoMundo = path.join(data, 'worlds', mundo);
  const manifesto = JSON.parse(fs.readFileSync(path.join(pastaDoMundo, 'world.json'), 'utf8'));
  const modulo = path.join(saida, MODULO);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pacote-das-cenas-'));
  try {
    // 1. Os bancos do mundo, copiados e lidos pela ferramenta oficial (cada documento com os embutidos dentro).
    const docs = {};
    for (const colecao of COLECOES) {
      const banco = path.join(pastaDoMundo, 'data', colecao);
      if (!fs.existsSync(banco)) { docs[colecao] = []; continue; }
      fs.cpSync(banco, path.join(tmp, 'bancos', colecao), { recursive: true, filter: origem => path.basename(origem) !== 'LOCK' });
      fvtt(['package', 'unpack', '-n', colecao, '--in', path.join(tmp, 'bancos'), '--out', path.join(tmp, 'json', colecao), '--type', 'World', '--id', mundo]);
      docs[colecao] = lerJson(path.join(tmp, 'json', colecao)).map(semChaves);
    }

    // 2. Os arquivos: todo texto que é o caminho de um arquivo da pasta Data (ou um src/href dentro de um HTML) vai para
    // o módulo, e o caminho muda. Os ícones do próprio Foundry (icons/...) e os endereços da internet ficam como estão.
    const copiar = new Map();
    const faltando = new Set();
    const cache = new Map();
    const novoCaminho = original => {
      if (cache.has(original)) return cache.get(original);
      let resposta = null;
      const limpo = String(original).split(/[?#]/)[0].replace(/^\/+/, '');
      // Com cara de arquivo: termina numa extensão com letra (o "12.343" de uma versão não é arquivo).
      if (limpo && !/^(https?:|data:|blob:)/.test(limpo) && /\.[a-z][a-z0-9]{1,4}$/i.test(limpo)) {
        const arquivo = path.join(data, decodificar(limpo));
        if (fs.existsSync(arquivo) && fs.statSync(arquivo).isFile()) {
          const [de, para] = prefixos(mundo).find(([prefixo]) => limpo.startsWith(prefixo)) ?? ['', ''];
          const destino = `${para}${limpo.slice(de.length)}`;
          copiar.set(arquivo, path.join(modulo, 'arquivos', decodificar(destino)));
          resposta = `modules/${MODULO}/arquivos/${destino}`;
        } else if (/^(systems|modules|worlds)\//.test(limpo) || !limpo.includes('/')) faltando.add(limpo);
      }
      cache.set(original, resposta);
      return resposta;
    };
    const reescrever = valor => {
      if (typeof valor === 'string') {
        const direto = novoCaminho(valor);
        if (direto) return direto;
        return /(?:src|href)=/.test(valor) ? valor.replace(/((?:src|href)=["'])([^"']+)(["'])/g, (tudo, antes, src, depois) => `${antes}${novoCaminho(src) ?? src}${depois}`) : valor;
      }
      if (Array.isArray(valor)) return valor.map(reescrever);
      if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, reescrever(v)]));
      return valor;
    };

    // 3. Os tokens ficam sem ator: os atores do CORE não existem no sistema novo. A barra e o delta eram do ator.
    let tokens = 0;
    for (const cena of docs.scenes) {
      for (const token of cena.tokens || []) {
        tokens += 1;
        Object.assign(token, { actorId: null, actorLink: false });
        delete token.delta;
        for (const barra of ['bar1', 'bar2']) if (token[barra]) token[barra].attribute = null;
      }
    }
    // Só as pastas das cenas, dos diários e das playlists que entram (e as pastas-mãe delas).
    const usadas = new Set([...docs.scenes, ...docs.journal, ...docs.playlists].map(doc => doc.folder).filter(Boolean));
    const porId = new Map(docs.folders.map(pasta => [pasta._id, pasta]));
    for (const id of [...usadas]) for (let pai = porId.get(id)?.folder; pai && !usadas.has(pai); pai = porId.get(pai)?.folder) usadas.add(pai);
    const pastas = docs.folders.filter(pasta => usadas.has(pasta._id) && ['Scene', 'JournalEntry', 'Playlist'].includes(pasta.type));

    const [scenes, journal, playlists, folders] = [docs.scenes, docs.journal, docs.playlists, pastas].map(reescrever);
    const capa = manifesto.background ? novoCaminho(manifesto.background) : null;

    // 4. A Aventura, com o id derivado do mundo (gerar de novo dá o mesmo id).
    const _id = Array.from(crypto.createHash('sha256').update(`${MODULO}:${mundo}`).digest().subarray(0, 16), byte => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[byte % 62]).join('');
    const quando = new Date().toLocaleDateString('pt-BR');
    const aventura = {
      _id, _key: `!adventures!${_id}`, name: `Arquivo: ${manifesto.title}`, img: capa, sort: 0, flags: {},
      caption: `As cenas, os diários e as playlists do mundo ${manifesto.title} (Foundry ${manifesto.coreVersion}, ${manifesto.system} ${manifesto.systemVersion}), arquivados em ${quando}.`,
      description: '<p>Importar traz as cenas (com paredes, luzes, tiles, sons e notas), os diários e as playlists, com as pastas e os mesmos ids (as notas e as playlists das cenas continuam ligadas).</p>'
        + '<p>Os tokens vêm sem ator: os atores do Cyberpunk RED - CORE não existem no sistema novo. A posição e a imagem ficam; ponha os atores novos por cima.</p>'
        + '<p>Ficaram de fora: atores, itens (as arquiteturas da NET), combates e macros. Estão no backup completo do Foundry 12.</p>',
      actors: [], combats: [], items: [], tables: [], macros: [], cards: [], scenes, journal, playlists, folders,
      _stats: { coreVersion: manifesto.coreVersion, systemId: null, systemVersion: null, createdTime: Date.now(), modifiedTime: Date.now(), lastModifiedBy: null }
    };

    // 5. O módulo: manifesto, compêndio, arquivos e o leia-me.
    fs.rmSync(modulo, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmp, 'aventura'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'aventura', `${_id}.json`), JSON.stringify(aventura));
    fvtt(['package', 'pack', '-n', 'arquivo', '--in', path.join(tmp, 'aventura'), '--out', path.join(modulo, 'packs'), '--type', 'Module', '--id', MODULO]);
    let bytes = 0;
    for (const [de, para] of copiar) {
      fs.mkdirSync(path.dirname(para), { recursive: true });
      fs.copyFileSync(de, para);
      bytes += fs.statSync(para).size;
    }
    const titulo = `Arquivo da mesa: ${manifesto.title}`;
    fs.writeFileSync(path.join(modulo, 'module.json'), JSON.stringify({
      id: MODULO, title: titulo, version: '1.0.0',
      description: `As cenas, os diários e as playlists do mundo ${manifesto.title} do Foundry ${manifesto.coreVersion}, com os arquivos que elas usam, para importar num mundo novo.`,
      authors: [{ name: 'Night City Fieldbook' }], compatibility: { minimum: '12', verified: '14' },
      packs: [{ name: 'arquivo', label: titulo, path: 'packs/arquivo', type: 'Adventure', ownership: { PLAYER: 'NONE', ASSISTANT: 'OWNER' } }]
    }, null, 2));
    const resumo = {
      cenas: scenes.length, tokens, diarios: journal.length, paginas: journal.reduce((soma, j) => soma + (j.pages || []).length, 0),
      playlists: playlists.length, faixas: playlists.reduce((soma, p) => soma + (p.sounds || []).length, 0), pastas: folders.length,
      arquivos: copiar.size, mb: Math.round(bytes / 1048576), faltando: [...faltando].sort()
    };
    fs.writeFileSync(path.join(modulo, 'LEIA-ME.md'), [
      `# ${titulo}`, '',
      `Gerado em ${quando} por \`foundry-sistema/migracao/pacote-das-cenas.mjs\`, a partir do mundo \`${mundo}\` (Foundry ${manifesto.coreVersion}).`, '',
      `- ${resumo.cenas} cenas (${resumo.tokens} tokens, sem ator), ${resumo.diarios} diários (${resumo.paginas} páginas), ${resumo.playlists} playlists (${resumo.faixas} faixas) e ${resumo.pastas} pastas.`,
      `- ${resumo.arquivos} arquivos (${resumo.mb} MB) em \`arquivos/\`. Os caminhos das cenas apontam para eles: não desinstale o módulo.`,
      '- De fora: atores, itens (as arquiteturas da NET), combates e macros, que dependem do Cyberpunk RED - CORE e do cpr-2077.', '',
      '## Como importar no Foundry 14', '',
      '1. Copie esta pasta para `Data/modules/` do Foundry 14.',
      '2. No mundo novo, ligue o módulo (Gerenciar módulos).',
      `3. Abra o compêndio "${titulo}" e importe a Aventura.`,
      '4. Confira as cenas: o Foundry migra os dados do 12 ao importar. O fundo do mundo (tela de entrada) se troca nas configurações do mundo.',
      ...(resumo.faltando.length ? ['', '## Arquivos que as cenas citam e não estavam na pasta Data', '', ...resumo.faltando.map(caminho => `- \`${caminho}\``)] : []),
      ''
    ].join('\n'));
    return { modulo, ...resumo };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = gerarPacote(argumentos(process.argv.slice(2)));
    console.log(`Módulo: ${r.modulo}`);
    console.log(`${r.cenas} cenas (${r.tokens} tokens sem ator), ${r.diarios} diários (${r.paginas} páginas), ${r.playlists} playlists (${r.faixas} faixas), ${r.pastas} pastas`);
    console.log(`${r.arquivos} arquivos copiados (${r.mb} MB)${r.faltando.length ? `; ${r.faltando.length} citados e não achados: ${r.faltando.join(', ')}` : ''}`);
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
}
