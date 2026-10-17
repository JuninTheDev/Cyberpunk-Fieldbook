const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { validarDocumentos } = require('../lib/documentos-estaticos');

const projeto = path.resolve(__dirname, '..', '..');
const nomes = {
  arquivos: 'arquivos citados existem e todo documento aparece na wiki do mestre',
  secoes: 'links para seções (arquivo.md#secao) apontam para um título que existe'
};

async function conferir(raiz) {
  const passos = [];
  const dados = await validarDocumentos({ raiz, r: { async passo(nome, fn) {
    const [ok, detalhe] = await fn();
    passos.push({ nome, ok: Boolean(ok), detalhe });
  } } });
  return { passos, dados, passo: nome => passos.find(item => item.nome === nomes[nome]) };
}

function escrever(raiz, arquivo, texto) {
  const destino = path.join(raiz, arquivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, texto, 'utf8');
}

function prepararFixture(t) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'fieldbook-documentos-'));
  t.after(() => {
    assert.equal(path.dirname(raiz), path.resolve(os.tmpdir()));
    assert.ok(path.basename(raiz).startsWith('fieldbook-documentos-'));
    fs.rmSync(raiz, { recursive: true, force: true });
  });
  for (const arquivo of ['system-rules.js', 'mestre-npcs.js', 'jogadores-painel.js']) {
    fs.copyFileSync(path.join(projeto, arquivo), path.join(raiz, arquivo));
  }
  escrever(raiz, 'index.html', "'documentos/morana/handouts-da-campanha.md'");
  escrever(raiz, 'documentos/morana/handouts-da-campanha.md', '# Handouts\n\n' + Array.from({ length: 30 }, (_, i) => {
    const codigo = `H-${String(i + 1).padStart(2, '0')}`;
    return `### ${codigo} · Bilhete\n\n- **Para os jogadores:** Bilhete\n\n> Olá.\n`;
  }).join('\n'));
  return raiz;
}

function semFalhas(resultado) {
  assert.deepEqual(resultado.passos.filter(item => !item.ok), []);
}

test('documentos atuais passam nas 7 verificações sem alterar globals nem require.cache', async () => {
  const janelaAntes = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const documentoAntes = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const cacheAntes = Object.keys(require.cache).sort();
  const { passos, dados } = await conferir(projeto);
  assert.equal(passos.length, 7);
  assert.deepEqual(passos.filter(item => !item.ok), []);
  assert.equal(dados.handouts.length, 30);
  assert.ok(dados.citacoes >= 30);
  assert.equal(dados.handoutsDoc.arquivo, 'documentos/morana/handouts-da-campanha.md');
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'window'), janelaAntes);
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'document'), documentoAntes);
  assert.deepEqual(Object.keys(require.cache).sort(), cacheAntes);
});

test('arquivos com o mesmo nome mantêm as seções de cada campanha', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/notas.md', '# Notas\n\n## Alfa\n\n[Ir](notas.md#alfa)\n');
  escrever(raiz, 'documentos/beta/notas.md', '# Notas\n\n## Beta\n\n[Ir](notas.md#beta)\n');
  semFalhas(await conferir(raiz));
});

test('arquivo de outra campanha não encobre referências locais ausentes, em links ou crases', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/inicio.md', '# Início\n\n[Ir](exclusivo.md) e `exclusivo.md`.\n');
  escrever(raiz, 'documentos/beta/exclusivo.md', '# Exclusivo\n');
  const resultado = await conferir(raiz);
  assert.equal(resultado.passo('arquivos').ok, false);
  assert.match(resultado.passo('arquivos').detalhe, /documentos\/alfa\/inicio\.md:3 exclusivo\.md/);
});

test('âncora de outra campanha não valida o link para o documento local', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/inicio.md', '# Início\n\n[Ir](notas.md#beta)\n');
  escrever(raiz, 'documentos/alfa/notas.md', '# Notas\n\n## Alfa\n');
  escrever(raiz, 'documentos/beta/notas.md', '# Notas\n\n## Beta\n');
  const resultado = await conferir(raiz);
  assert.equal(resultado.passo('arquivos').ok, true);
  assert.equal(resultado.passo('secoes').ok, false);
  assert.match(resultado.passo('secoes').detalhe, /documentos\/alfa\/inicio\.md:3 notas\.md#beta/);
});

test('caminhos explícitos relativos permitem ligar campanhas dentro de documentos/', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/inicio.md', '# Início\n\n[Ir](../beta/notas.md#beta) e `../beta/notas.md`.\n');
  escrever(raiz, 'documentos/alfa/notas.md', '# Notas\n\n## Alfa\n');
  escrever(raiz, 'documentos/beta/notas.md', '# Notas\n\n## Beta\n');
  semFalhas(await conferir(raiz));
});

test('caminho explícito ausente ou fora de documentos/ não usa fallback por nome', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/inicio.md', '# Início\n\n[Ir](../ausente/notas.md#beta)\n\n[Outro](../../notas.md#beta)\n');
  escrever(raiz, 'documentos/beta/notas.md', '# Notas\n\n## Beta\n');
  escrever(raiz, 'notas.md', '# Notas\n\n## Beta\n');
  const resultado = await conferir(raiz);
  assert.equal(resultado.passo('arquivos').ok, false);
  assert.equal(resultado.passo('secoes').ok, false);
  assert.match(resultado.passo('arquivos').detalhe, /\.\.\/ausente\/notas\.md/);
  assert.match(resultado.passo('arquivos').detalhe, /\.\.\/\.\.\/notas\.md/);
});

test('campanhas podem citar documentos comuns, com prioridade para o arquivo local', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/alfa/inicio.md', '# Início\n\n[Ir](guia.md#comum)\n');
  escrever(raiz, 'documentos/night-city/guia.md', '# Guia\n\n## Comum\n');
  semFalhas(await conferir(raiz));
  escrever(raiz, 'documentos/alfa/guia.md', '# Guia\n\n## Local\n');
  const resultado = await conferir(raiz);
  assert.equal(resultado.passo('arquivos').ok, true);
  assert.equal(resultado.passo('secoes').ok, false);
});

test('documento comum só usa o fallback global quando o destino é único', async t => {
  const raiz = prepararFixture(t);
  escrever(raiz, 'documentos/night-city/inicio.md', '# Início\n\n[Ir](guia.md#campanha)\n');
  escrever(raiz, 'documentos/alfa/guia.md', '# Guia\n\n## Campanha\n');
  semFalhas(await conferir(raiz));
  escrever(raiz, 'documentos/beta/guia.md', '# Guia\n\n## Campanha\n');
  const resultado = await conferir(raiz);
  assert.equal(resultado.passo('arquivos').ok, false);
  assert.equal(resultado.passo('secoes').ok, false);
  assert.match(resultado.passo('arquivos').detalhe, /documentos\/night-city\/inicio\.md:3 guia\.md/);
});
