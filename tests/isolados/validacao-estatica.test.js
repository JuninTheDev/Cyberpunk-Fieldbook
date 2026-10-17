const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { descobrirArquivos, extrairScriptsExecutaveis, validarJson, validarEstatico } = require('../lib/validacao-estatica');

async function fixture(t, arquivos = {}) {
  const raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'fieldbook-estatico-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(raiz)), path.resolve(os.tmpdir()));
    assert.match(path.basename(raiz), /^fieldbook-estatico-/);
    await fs.rm(raiz, { recursive: true, force: true });
  });
  for (const [nome, texto] of Object.entries(arquivos)) {
    const destino = path.join(raiz, nome);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, texto, 'utf8');
  }
  return raiz;
}

async function analisar(raiz) {
  const passos = [];
  const resumo = await validarEstatico({ raiz, r: {
    async passo(nome, fn) { const [ok, detalhe] = await fn(); passos.push({ nome, ok, detalhe }); }
  } });
  return { resumo, passos, falhas: passos.filter(passo => !passo.ok) };
}

test('descobre fontes novas sem git e ignora dependências, caches, exemplos e dados locais', async t => {
  const ignorados = [
    'cyberpunk-red-core', 'fvtt-cyberpunk-red-core-dev', 'cyberpunk-css-main',
    'Icones Foundry', 'Exemplos', '.git', '.cache', 'cache', 'caches', 'node_modules', 'packs',
    'tests/.saida', 'futuro/node_modules', 'futuro/.cache', 'futuro/packs',
    'personagens', 'campanhas', 'preferencias'
  ];
  const arquivos = Object.fromEntries(ignorados.map(pasta => [`${pasta}/invalido.js`, 'const = ;']));
  Object.assign(arquivos, {
    'app.js': 'const x = 1;', 'novo/fonte.mjs': 'export const x = 1;',
    'tests/novo-nao-versionado.test.js': 'const x = 1;', 'config.json': '{}',
    'manifest.webmanifest': '{}', 'index.html': '<script>const x = 1;</script>',
    'novo/teste.html': '<script>const x = 1;</script>', 'texto.md': 'documento',
    'teste.html': '<script>const = ;</script>', 'servidor/servidor.local.json': 'inválido',
    'contas-jogadores.json': 'inválido', 'campanhas.json': 'inválido',
    'noticias-night-city.json': 'inválido', 'sessoes-jogadores.json': 'inválido', 'regras-loja.json': 'inválido'
  });
  const raiz = await fixture(t, arquivos);
  const descoberta = await descobrirArquivos(raiz);
  assert.deepEqual(descoberta.erros, []);
  assert.deepEqual(descoberta.arquivos.sort(), [
    'app.js', 'novo/fonte.mjs', 'tests/novo-nao-versionado.test.js', 'config.json',
    'manifest.webmanifest', 'index.html', 'novo/teste.html'
  ].sort());
});

for (const tipo of ['diretório', 'arquivo']) {
  test(`não segue links de ${tipo}`, async t => {
    const raiz = await fixture(t, { 'fonte.js': 'const x = 1;' });
    const fora = await fixture(t, { 'invalido.js': 'const = ;' });
    try {
      if (tipo === 'diretório') await fs.symlink(fora, path.join(raiz, 'link-pasta'), process.platform === 'win32' ? 'junction' : 'dir');
      else await fs.symlink(path.join(fora, 'invalido.js'), path.join(raiz, 'link-arquivo.js'), 'file');
    } catch (erro) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(erro.code)) { t.skip(`Criação de symlink indisponível: ${erro.code}`); return; }
      throw erro;
    }
    const descoberta = await descobrirArquivos(raiz);
    assert.deepEqual(descoberta.arquivos, ['fonte.js']);
    assert.deepEqual(descoberta.erros, []);
  });
}

test('extrai apenas scripts executáveis, com tipos e linhas originais', () => {
  const html = [
    '<!-- <script>inválido !</script> -->',
    '<style>/* <script>inválido !</script> */</style>',
    '<textarea><script>inválido !</script></textarea>',
    '<template><template><script>inválido !</script></template></template>',
    '<noscript><script>inválido !</script></noscript>',
    '<script type="application/json">{ inválido }</script>',
    '<script type="application/ld+json">{ inválido }</script>',
    '<script type="__bundler/manifest">{ inválido }</script>',
    '<script src="externo.js">inválido !</script>',
    '<script type="importmap">{ inválido }</script>',
    '<script language="VBScript">inválido !</script>',
    '<script data-exemplo="a > b"',
    ' type="text/javascript">const classico = 1;</script>',
    '<script type=module>export const modulo = 1;</script>',
    '<script language="JavaScript">const legado = 1;</script>'
  ].join('\n');
  const scripts = extrairScriptsExecutaveis(html);
  assert.deepEqual(scripts.map(({ tipo, linha }) => ({ tipo, linha })), [
    { tipo: 'classic', linha: 13 }, { tipo: 'module', linha: 14 }, { tipo: 'classic', linha: 15 }
  ]);
  assert.equal(scripts[0].codigo, 'const classico = 1;');
});

test('detecta JS, MJS, JSON, webmanifest e scripts inline inválidos com localização', async t => {
  const raiz = await fixture(t, {
    'erro.js': '\nconst = ;', 'erro.mjs': '\nexport const = ;',
    'erro.json': '{\n"ok": true,\n}', 'erro.webmanifest': '{\n"name":\n}',
    'classico.html': '<!doctype html>\n<html>\n<script>\nconst = ;\n</script></html>',
    'modulo.html': '<!doctype html>\n<script type="module">\nexport const = ;\n</script>'
  });
  const { resumo, falhas } = await analisar(raiz);
  assert.equal(resumo.arquivos, 6);
  assert.equal(resumo.falhas, 6);
  assert.equal(falhas.length, 6);
  for (const [arquivo, linha] of [
    ['erro.js', 2], ['erro.mjs', 2], ['erro.json', 3], ['erro.webmanifest', 3],
    ['classico.html', 4], ['modulo.html', 3]
  ]) {
    const falha = falhas.find(passo => passo.nome.endsWith(arquivo));
    assert.ok(falha, `faltou diagnóstico de ${arquivo}`);
    assert.ok(falha.detalhe.includes(`${arquivo}:${linha}:`), falha.detalhe);
  }
});

test('compila sem executar fontes, resolver imports nem avaliar scripts inline', async t => {
  const raiz = await fixture(t);
  const marcador = path.join(raiz, 'NAO-CRIAR');
  const escrever = `require('node:fs').writeFileSync(${JSON.stringify(marcador)}, 'executou');`;
  await fs.writeFile(path.join(raiz, 'codigo.js'), `${escrever}\nthrow new Error('não executar');`);
  await fs.writeFile(path.join(raiz, 'modulo.mjs'), 'import "./dependencia-inexistente.mjs";\nthrow new Error("não executar");');
  await fs.writeFile(path.join(raiz, 'pagina.html'), [
    `<script>${escrever}</script>`,
    '<script>throw new Error("não executar");</script>',
    '<script type="module">import "./dependencia-inexistente.mjs"; await Promise.reject("não executar");</script>',
    '<script type="application/json">{ inválido }</script>',
    '<script type="__bundler/template">não é JavaScript</script>'
  ].join('\n'));
  const { resumo, falhas } = await analisar(raiz);
  assert.equal(resumo.arquivos, 3);
  assert.deepEqual(falhas, []);
  await assert.rejects(fs.access(marcador), { code: 'ENOENT' });
});

test('JSON aceita BOM e aponta fim inesperado sem reproduzir valores do arquivo', () => {
  assert.equal(validarJson('\uFEFF{"ok":true}', 'bom.json')[0], true);
  const [ok, detalhe] = validarJson('{\n"segredo": "valor-privado",\n', 'truncado.json');
  assert.equal(ok, false);
  assert.match(detalhe, /^truncado\.json:3:1: JSON inválido$/);
  assert.ok(!detalhe.includes('valor-privado'));
});

test('erros de descoberta fazem o relatório falhar, mesmo sem arquivos encontrados', async t => {
  const raiz = await fixture(t);
  const { resumo, falhas } = await analisar(path.join(raiz, 'nao-existe'));
  assert.equal(resumo.arquivos, 0);
  assert.equal(resumo.falhas, 1);
  assert.equal(falhas.length, 1);
  assert.match(falhas[0].detalhe, /nao-existe.*ENOENT/);
});
