// O C104: os testes mais rápidos, sem perder o que conferem. O G1 com o node --check de vários arquivos ao mesmo tempo
// (o tests/portoes.js), o SO_PASSOS do relatório (só os passos pedidos; a rodada não vale como portão) e as janelas que
// fecham sem a animação nos navegadores do G4 (o Edge sem janela não solta o transitionend, e cada janela fechada
// esperava o 1 s inteiro do Foundry). Sem navegador nem Foundry. Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const exigir = createRequire(import.meta.url);
const { Relatorio, codigoDeSaida } = exigir('../lib/relatorio.js');
const { checarSintaxe, arquivosDoG1 } = exigir('../portoes.js');
const { FECHAR_SEM_ANIMACAO } = exigir('../lib/foundry14.js');
const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

test('C104: o G1 em paralelo acha cada arquivo com erro de sintaxe, e só eles', async t => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'c104-g1-'));
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const arquivos = Array.from({ length: 40 }, (_, i) => path.join(pasta, `a${i}.mjs`));
  arquivos.forEach((arquivo, i) => fs.writeFileSync(arquivo, i % 13 === 5 ? 'export const x = ;\n' : `export const x${i} = ${i};\n`));
  fs.writeFileSync(path.join(pasta, 'b.js'), 'const y = (;\n');
  const ruins = await checarSintaxe([...arquivos, path.join(pasta, 'b.js')]);
  assert.deepEqual(ruins.map(f => path.basename(f)), ['a18.mjs', 'a31.mjs', 'a5.mjs', 'b.js']);
  assert.deepEqual(await checarSintaxe(arquivos.filter((_, i) => i % 13 !== 5)), []);
  // A lista do G1 é a de antes: o sistema, os testes de regra e as bibliotecas.
  const lista = arquivosDoG1().map(f => path.relative(process.cwd(), f).split(path.sep).join('/'));
  for (const f of ['foundry-sistema/scripts/documentos.mjs', 'tests/sistema/g4-rapido.test.mjs', 'tests/lib/foundry14.js', 'tests/cenarios/v14.js']) assert.ok(lista.includes(f), f);
  assert.match(ler('tests/portoes.js'), /execFile\(process\.execPath, \['--check', arquivo\]/);
});

test('C104: o SO_PASSOS roda só os passos pedidos; os outros ficam pulados (a rodada sai com 2, não vale como portão)', async () => {
  const r = new Relatorio({ soPassos: '^(C55|C26)' });
  const rodados = [];
  for (const nome of ['C55: o supressivo', 'C17: o inventário', 'c26: as chaves']) await r.passo(nome, async () => { rodados.push(nome); return [true]; });
  assert.deepEqual(rodados, ['C55: o supressivo', 'c26: as chaves']);
  assert.deepEqual(r.itens.map(i => [i.nome, Boolean(i.pulado), i.detalhe]), [['C55: o supressivo', false, ''], ['C17: o inventário', true, 'fora do SO_PASSOS'], ['c26: as chaves', false, '']]);
  assert.equal(codigoDeSaida({ falhas: 0, pulados: r.itens.filter(i => i.pulado).length }), 2);
  // Sem o SO_PASSOS, todos rodam.
  const todos = new Relatorio({ soPassos: '' });
  await todos.passo('qualquer', async () => [true]);
  assert.equal(todos.itens[0].pulado, undefined);
});

test('C104: nos navegadores do G4, a janela fecha sem a animação por padrão; quem pede a animação ainda a tem; uma vez só', () => {
  const chamadas = [];
  class ApplicationV2 { close(opcoes) { chamadas.push(opcoes); return 'fechou'; } }
  class Ficha extends ApplicationV2 { close(opcoes) { return super.close(opcoes); } }
  const foundry = { applications: { api: { ApplicationV2 } } };
  const rodar = () => new Function('foundry', `return ${FECHAR_SEM_ANIMACAO}`)(foundry);
  assert.equal(rodar(), true);
  const embrulhado = ApplicationV2.prototype.close;
  assert.equal(rodar(), true);
  assert.equal(ApplicationV2.prototype.close, embrulhado, 'a segunda página pronta não embrulha de novo');
  assert.equal(new Ficha().close(), 'fechou');
  new Ficha().close({ animate: true, force: true });
  new ApplicationV2().close({ force: true });
  assert.deepEqual(chamadas, [{ animate: false }, { animate: true, force: true }, { animate: false, force: true }]);
  // Vale a cada página que fica pronta: a entrada e o recarregar passam pelo esperarJogo.
  assert.match(ler('tests/lib/foundry14.js'), /game\.ready\)'\)\.catch\(\(\) => false\)\) \{ await edge\.evaluate\(FECHAR_SEM_ANIMACAO\); return; \}/);
});
