// O C60 (a fase 2 da auditoria de 2026-11-16): o G4 que não trava e não esconde. O passo que não termina vira falha
// (o prazo do tests/lib/relatorio.js); a trava velha só sai se ainda é a que foi lida, e a espera tem teto
// (tests/lib/trava.js); os avisos do sistema de todas as páginas do navegador contam, e não só os da página de agora
// (tests/lib/foundry14.js, pelo console que o tests/lib/edge.js guarda).
// Sem navegador nem Foundry. Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const exigir = createRequire(import.meta.url);
const { Relatorio } = exigir('../lib/relatorio.js');
const { travar, soltarSeAinda } = exigir('../lib/trava.js');
const { avisosDoSistema, SISTEMA } = exigir('../lib/foundry14.js');
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-prazo-'));
test.after(() => fs.rmSync(pasta, { recursive: true, force: true }));

test('C60: o passo que não termina vira falha no prazo, e o seguinte roda', { timeout: 5000 }, async () => {
  const r = new Relatorio({ prazoMs: 50 });
  await r.passo('preso', () => new Promise(() => {}));
  await r.passo('depois', async () => [true, 'rodou']);
  assert.equal(r.itens[0].ok, false);
  assert.match(r.itens[0].detalhe, /^erro: o passo passou de 0 s sem terminar \(PASSO_MS\)$/);
  assert.deepEqual([r.itens[1].ok, r.itens[1].detalhe], [true, 'rodou']);
  // Sem prazo (0), espera o passo, como antes.
  const semPrazo = new Relatorio();
  await semPrazo.passo('lento', () => new Promise(resolver => setTimeout(() => resolver([true, 'ok']), 80)));
  assert.equal(semPrazo.itens[0].ok, true);
  // O rodar.js passa o prazo (5 minutos, ou o PASSO_MS).
  assert.match(fs.readFileSync(new URL('../../tests/rodar.js', import.meta.url), 'utf8'), /new Relatorio\(\{ prazoMs: Number\(process\.env\.PASSO_MS \?\? 300000\) \}\)/);
});

test('C60: a trava velha só sai se ainda é a que foi lida (outra sessão pode ter pego no meio)', () => {
  const a = path.join(pasta, 'trava-lida');
  fs.writeFileSync(a, '{"pid":1}');
  assert.equal(soltarSeAinda(a, '{"pid":2}'), false, 'outra sessão gravou a dela');
  assert.equal(fs.readFileSync(a, 'utf8'), '{"pid":1}');
  assert.equal(soltarSeAinda(a, '{"pid":1}'), true);
  assert.equal(fs.existsSync(a), false);
});

test('C60: a espera pela trava tem teto (um PID reaproveitado deixaria o dono morto vivo para sempre)', { timeout: 5000 }, async () => {
  const a = path.join(pasta, 'trava-viva');
  fs.writeFileSync(a, JSON.stringify({ pid: process.pid, pasta: 'outra', desde: 'agora' }));
  await assert.rejects(travar({ arquivo: a, espera: 10, teto: 50, avisar: () => {} }), /continua com outro teste depois de 0 min: confira se ele está vivo \(o pid \d+\)/);
  assert.ok(fs.existsSync(a), 'a trava do vivo fica');
});

test('C60: os avisos do sistema de todas as páginas do navegador contam, e não só os da página de agora', async () => {
  const edge = {
    evaluate: async () => [`warn: da página de agora systems/${SISTEMA}/scripts/x.mjs`],
    avisos: [
      { nivel: 'warn', texto: 'Deprecated since Version 14', pilha: `http://localhost:31014/systems/${SISTEMA}/scripts/ficha.mjs:10` },
      { nivel: 'warn', texto: 'de outro módulo', pilha: 'http://localhost:31014/modules/outro/x.js:1' },
      { nivel: 'error', texto: `quebrou em systems/${SISTEMA}/scripts/y.mjs`, pilha: '' }
    ]
  };
  assert.deepEqual(await avisosDoSistema(edge), [
    `warn: da página de agora systems/${SISTEMA}/scripts/x.mjs`, 'warn: Deprecated since Version 14', `error: quebrou em systems/${SISTEMA}/scripts/y.mjs`
  ]);
  // O edge guarda os avisos do console (o Runtime.consoleAPICalled) e os 403/409 que deixa passar.
  const fonte = fs.readFileSync(new URL('../../tests/lib/edge.js', import.meta.url), 'utf8');
  assert.match(fonte, /\['warning', 'error'\]\.includes\(message\.params\.type\)\) \{\s*avisos\.push\(/);
  assert.match(fonte, /return \{ send, evaluate, shot, ir, celular, fechar, erros, avisos, ignorados, sleep \};/);
});

test('C60: o G4 não deixa passar 403 nem 409 (a suíte da wiki continua com os dela)', () => {
  const edge = fs.readFileSync(new URL('../../tests/lib/edge.js', import.meta.url), 'utf8');
  assert.match(edge, /httpPermitido = \[403, 409\] \}\) \{/);
  assert.match(edge, /if \(status >= 400 && !httpPermitido\.includes\(status\) && !url\.endsWith\('favicon\.ico'\)\) erros\.push/);
  const v14 = fs.readFileSync(new URL('../../tests/cenarios/v14.js', import.meta.url), 'utf8');
  assert.match(v14, /const abrirEdge = opcoes => abrirEdgeDaWiki\(\{ httpPermitido: \[\], \.\.\.opcoes \}\);/);
  assert.match(v14, /module\.exports\.httpPermitido = \[\];\s*$/);
  const rodar = fs.readFileSync(new URL('../../tests/rodar.js', import.meta.url), 'utf8');
  assert.match(rodar, /\.\.\.\(cenario\.httpPermitido \? \{ httpPermitido: cenario\.httpPermitido \} : \{\}\)/);
});
