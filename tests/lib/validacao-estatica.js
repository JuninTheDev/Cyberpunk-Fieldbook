// Valida fontes próprias sem carregá-las: não inicia a wiki nem importa módulos do Foundry.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');

const PASTAS_IGNORADAS = new Set([
  '.git', '.cache', 'cache', 'caches', 'node_modules', 'packs', '.saida',
  'cyberpunk-red-core', 'fvtt-cyberpunk-red-core-dev', 'cyberpunk-css-main',
  'icones foundry', 'exemplos'
]);
// Dados de uso do servidor ficam fora do código-fonte, mesmo quando existem no PC.
const CAMINHOS_IGNORADOS = new Set([
  'teste.html', 'personagens', 'campanhas', 'preferencias', 'contas-jogadores.json',
  'campanhas.json', 'noticias-night-city.json', 'sessoes-jogadores.json',
  'regras-loja.json', 'servidor/servidor.local.json'
]);
const EXTENSOES = new Set(['.js', '.mjs', '.cjs', '.json', '.webmanifest', '.html', '.htm']);
const semBom = texto => texto.replace(/^\uFEFF/, '');
const erroLeitura = (arquivo, erro) => `${arquivo}: ${erro.code || erro.name || 'erro'} ao ler ${erro.syscall === 'scandir' ? 'o diretório' : 'o caminho'}`;

// Percorre o disco, incluindo novos arquivos ainda não versionados. Dirent e lstat impedem seguir links/junctions.
async function descobrirArquivos(raiz) {
  const arquivos = [];
  const erros = [];
  const base = path.resolve(raiz);
  try {
    const info = await fs.lstat(base);
    if (info.isSymbolicLink()) return { arquivos, erros: [`${base}: a raiz é um link simbólico; ela não foi percorrida`] };
    if (!info.isDirectory()) return { arquivos, erros: [`${base}: a raiz não é um diretório`] };
  } catch (erro) {
    return { arquivos, erros: [erroLeitura(base, erro)] };
  }

  async function visitar(pasta, relativo = '') {
    let entradas;
    try { entradas = await fs.readdir(pasta, { withFileTypes: true }); }
    catch (erro) { erros.push(erroLeitura(relativo || '.', erro)); return; }
    entradas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    for (const entrada of entradas) {
      const nome = relativo ? `${relativo}/${entrada.name}` : entrada.name;
      const nomeMinusculo = nome.toLowerCase();
      if (CAMINHOS_IGNORADOS.has(nomeMinusculo) || entrada.isSymbolicLink()) continue;
      if (entrada.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(entrada.name.toLowerCase())) await visitar(path.join(pasta, entrada.name), nome);
      } else if (entrada.isFile() && EXTENSOES.has(path.extname(entrada.name).toLowerCase())) arquivos.push(nome);
    }
  }
  await visitar(base);
  return { arquivos, erros };
}

function atributosHtml(texto) {
  const atributos = new Map();
  const padrao = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of texto.matchAll(padrao)) {
    const nome = match[1].toLowerCase();
    if (!atributos.has(nome)) atributos.set(nome, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return atributos;
}

const MIME_JAVASCRIPT = new Set([
  'application/ecmascript', 'application/javascript', 'application/x-ecmascript', 'application/x-javascript',
  'text/ecmascript', 'text/javascript', 'text/javascript1.0', 'text/javascript1.1', 'text/javascript1.2',
  'text/javascript1.3', 'text/javascript1.4', 'text/javascript1.5', 'text/jscript', 'text/livescript',
  'text/x-ecmascript', 'text/x-javascript'
]);

// Não é um validador de HTML: reconhece os blocos de script executáveis, preservando as linhas de origem.
// Consome elementos de texto cru e comentários para não confundir exemplos/informações com código executável.
function extrairScriptsExecutaveis(html) {
  const scripts = [];
  const tags = /<!--[\s\S]*?(?:-->|$)|<(\/?)(script|style|textarea|title|template|noscript|iframe|xmp|noembed|noframes|plaintext)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
  let template = 0;
  let match;
  while ((match = tags.exec(html))) {
    if (!match[2]) continue; // comentário
    const tag = match[2].toLowerCase();
    if (tag === 'template') { template = Math.max(0, template + (match[1] ? -1 : 1)); continue; }
    if (match[1]) continue;
    if (tag === 'plaintext') break;
    const inicio = tags.lastIndex;
    const fechamento = new RegExp(`</${tag}\\s*>`, 'gi');
    fechamento.lastIndex = inicio;
    const fim = fechamento.exec(html);
    tags.lastIndex = fim ? fechamento.lastIndex : html.length;
    if (tag !== 'script' || template) continue;
    const atributos = atributosHtml(match[3]);
    if (atributos.has('src')) continue; // O navegador ignora o conteúdo inline quando há src.
    const tipo = (atributos.get('type') || '').trim().toLowerCase();
    const linguagem = (atributos.get('language') || '').trim().toLowerCase();
    const mime = tipo.split(';')[0].trim();
    if (tipo !== 'module' && tipo && !MIME_JAVASCRIPT.has(mime)) continue;
    if (!atributos.has('type') && linguagem && !MIME_JAVASCRIPT.has(`text/${linguagem}`)) continue;
    scripts.push({
      tipo: tipo === 'module' ? 'module' : 'classic',
      codigo: html.slice(inicio, fim ? fim.index : html.length),
      linha: html.slice(0, inicio).split(/\r\n|\r|\n/).length
    });
  }
  return scripts;
}

function diagnosticoSintaxe(saida, arquivo, linhaPadrao = 1) {
  // Node/vm apresentam a localização antes do trecho e a mensagem depois. Não reproduzimos o código analisado.
  const local = String(saida).match(/:(\d+)(?::(\d+))?\s*\r?\n/);
  const mensagem = String(saida).split(/\r?\n/).find(linha => /^(?:SyntaxError|TypeError|Error):/.test(linha.trim()));
  return `${arquivo}:${local ? local[1] : linhaPadrao}${local && local[2] ? `:${local[2]}` : ''}: ${mensagem ? mensagem.trim() : 'não foi possível verificar a sintaxe com Node'}`;
}

// --check apenas compila. Não usa shell, não importa dependências e não herda preloads em NODE_OPTIONS.
async function checarComNode(argumentos, entrada, arquivo, linhaPadrao = 1) {
  const env = { ...process.env, NODE_OPTIONS: '' };
  return new Promise(resolve => {
    const filho = spawn(process.execPath, argumentos, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let saida = '';
    let concluido = false;
    const terminar = resultado => { if (!concluido) { concluido = true; clearTimeout(timer); resolve(resultado); } };
    const timer = setTimeout(() => { filho.kill(); terminar([false, `${arquivo}:${linhaPadrao}: Node excedeu 30 segundos na verificação de sintaxe`]); }, 30000);
    const receber = dados => {
      if (saida.length < 64000) saida += dados.toString();
    };
    filho.stdout.on('data', receber);
    filho.stderr.on('data', receber);
    filho.on('error', erro => terminar([false, `${arquivo}:${linhaPadrao}: não foi possível iniciar Node (${erro.code || erro.name})`]));
    filho.on('close', codigo => terminar(codigo === 0 ? [true, arquivo] : [false, diagnosticoSintaxe(saida, arquivo, linhaPadrao)]));
    filho.stdin.on('error', () => {}); // O processo pode rejeitar uma opção e fechar stdin antes da escrita.
    filho.stdin.end(entrada);
  });
}

function validarJson(texto, arquivo) {
  const conteudo = semBom(texto);
  try { JSON.parse(conteudo); return [true, arquivo]; }
  catch (erro) {
    const linhaColuna = erro.message.match(/line (\d+) column (\d+)/);
    const posicao = erro.message.match(/position (\d+)/);
    let localExpressao = null;
    // Algumas versões do V8 omitem a posição de "Unexpected token". A compilação da expressão ajuda
    // a localizar esses casos; quem decide se o documento é JSON válido continua sendo JSON.parse.
    if (!linhaColuna && !posicao && !/end of JSON/i.test(erro.message)) {
      try { new vm.Script(`(${conteudo}\n)`, { filename: arquivo }); }
      catch (erroExpressao) { localExpressao = erroExpressao.stack.match(/:(\d+)(?::(\d+))?\s*\r?\n/); }
    }
    const ateErro = conteudo.slice(0, posicao ? Number(posicao[1]) : /end of JSON/i.test(erro.message) ? conteudo.length : 0);
    const linhas = ateErro.split(/\r\n|\r|\n/);
    const linha = linhaColuna ? linhaColuna[1] : localExpressao ? localExpressao[1] : linhas.length;
    const coluna = linhaColuna ? linhaColuna[2] : localExpressao ? localExpressao[2] || 1 : linhas[linhas.length - 1].length + 1;
    return [false, `${arquivo}:${linha}:${coluna}: JSON inválido`];
  }
}

async function validarHtml(texto, arquivo) {
  const scripts = extrairScriptsExecutaveis(texto);
  const falhas = [];
  for (const script of scripts) {
    if (script.tipo === 'module') {
      const [ok, detalhe] = await checarComNode(['--check', '--input-type=module'], '\n'.repeat(script.linha - 1) + script.codigo, arquivo, script.linha);
      if (!ok) falhas.push(detalhe);
    } else {
      try { new vm.Script(script.codigo, { filename: arquivo, lineOffset: script.linha - 1 }); }
      catch (erro) { falhas.push(diagnosticoSintaxe(erro.stack, arquivo, script.linha)); }
    }
  }
  return falhas.length ? [false, falhas.join('\n')] : [true, `${arquivo}: ${scripts.length} script(s) inline executável(is)`];
}

async function validarEstatico({ raiz = path.resolve(__dirname, '../..'), r } = {}) {
  if (!r || typeof r.passo !== 'function') throw new TypeError('validarEstatico requer r.passo(nome, fn)');
  const base = path.resolve(raiz);
  const { arquivos, erros } = await descobrirArquivos(base);
  const resumo = { arquivos: arquivos.length, verificacoes: 0, falhas: 0 };
  const passo = (nome, fn) => r.passo(nome, async () => {
    const resultado = await fn();
    resumo.verificacoes++;
    if (!resultado[0]) resumo.falhas++;
    return resultado;
  });
  await passo('Descoberta de fontes próprias', () => [erros.length === 0, erros.join('\n') || `${arquivos.length} arquivo(s); sem seguir links nem ler dependências/caches/dados locais`]);
  for (const arquivo of arquivos) {
    const extensao = path.extname(arquivo).toLowerCase();
    const nome = `${['.js', '.mjs', '.cjs'].includes(extensao) ? 'Sintaxe JS' : ['.json', '.webmanifest'].includes(extensao) ? 'JSON' : 'Scripts HTML'}: ${arquivo}`;
    await passo(nome, async () => {
      const absoluto = path.join(base, arquivo);
      if (['.js', '.mjs', '.cjs'].includes(extensao)) return checarComNode(['--check', absoluto], undefined, arquivo);
      let texto;
      try { texto = await fs.readFile(absoluto, 'utf8'); }
      catch (erro) { return [false, erroLeitura(arquivo, erro)]; }
      if (['.json', '.webmanifest'].includes(extensao)) return validarJson(texto, arquivo);
      return validarHtml(texto, arquivo);
    });
  }
  return resumo;
}

module.exports = { descobrirArquivos, extrairScriptsExecutaveis, validarJson, validarEstatico };
