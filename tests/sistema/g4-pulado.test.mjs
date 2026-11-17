// O C54 (a auditoria de 2026-11-16): o G4 que pula a parte do Foundry não passa como aprovado, e a mesa do servidor que
// não responde não conta como vazia. Antes, o "node tests/rodar.js v14" sem o Foundry 14 no PC saía com "Tudo certo" e o
// código 0, e um erro de rede no /api/estado da wiki online valia como "ninguém na mesa".
// Sem navegador nem Foundry: o relatório (tests/lib/relatorio.js) e a conferência da mesa (tests/lib/foundry.js), com o
// fetch de mentira. Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const exigir = createRequire(import.meta.url);
const { Relatorio, codigoDeSaida, resumo } = exigir('../lib/relatorio.js');
const { mesaOcupada } = exigir('../lib/foundry.js');
const { Response, DOMException } = globalThis;
const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

test('C54: o passo pulado fica marcado, não é falha nem aprovação; a rodada com pulo sai com 2', async () => {
  const r = new Relatorio();
  await r.passo('um passo', async () => [true, 'feito']);
  r.pular('parte do Foundry 14', 'Foundry 14 não encontrado');
  assert.deepEqual(r.itens.map(item => [item.nome, item.ok, Boolean(item.pulado)]), [['um passo', true, false], ['parte do Foundry 14', true, true]]);
  assert.equal(r.itens[1].detalhe, 'Foundry 14 não encontrado');
  assert.equal(codigoDeSaida({ falhas: 0, pulados: 0 }), 0);
  assert.equal(codigoDeSaida({ falhas: 0, pulados: 1 }), 2, 'o pulo não vale como portão');
  assert.equal(codigoDeSaida({ falhas: 0, pulados: 1, permitirPular: true }), 0);
  assert.equal(codigoDeSaida({ falhas: 2, pulados: 1 }), 1, 'a falha vem antes do pulo');
  assert.equal(codigoDeSaida({ falhas: 1, pulados: 0, permitirPular: true }), 1);
  assert.equal(resumo({}), 'Tudo certo.');
  assert.match(resumo({ pulados: 1 }), /NÃO vale como portão.*código 2/);
  assert.doesNotMatch(resumo({ pulados: 1 }), /Tudo certo/);
  assert.match(resumo({ falhas: 3, pulados: 1 }), /^3 checagem\(ns\) falharam\. E 1 parte/);
});

test('C54: o tests/rodar.js usa o relatório comum e sai pelo código dele; o v14.js pula pelo r.pular, sem passo aprovado', () => {
  const rodar = ler('tests/rodar.js');
  assert.match(rodar, /require\('\.\/lib\/relatorio'\)/);
  assert.match(rodar, /process\.exit\(codigoDeSaida\(\{ falhas, pulados, permitirPular \}\)\)/);
  assert.doesNotMatch(rodar, /class Relatorio/);
  const v14 = ler('tests/cenarios/v14.js');
  const parteDoFoundry = v14.slice(v14.indexOf('// ---------- Foundry 14 ----------'), v14.indexOf('// ---------- Foundry 14 ----------') + 600);
  assert.match(parteDoFoundry, /if \(!foundry14\.disponivel\(\)\) \{ r\.pular\(/);
  assert.match(parteDoFoundry, /if \(ocupada\) \{ r\.pular\(/);
  assert.doesNotMatch(parteDoFoundry, /async \(\) => \[true, ''\]/);
});

test('C54: a mesa do servidor sem resposta, com erro ou com resposta que não é JSON não conta como vazia', async t => {
  const antes = { fetch: globalThis.fetch, wiki: process.env.WIKI_ONLINE };
  t.after(() => {
    globalThis.fetch = antes.fetch;
    if (antes.wiki === undefined) delete process.env.WIKI_ONLINE; else process.env.WIKI_ONLINE = antes.wiki;
  });
  process.env.WIKI_ONLINE = 'https://wiki.example/';
  const pedidos = [];
  const responder = fn => { globalThis.fetch = async (url, opcoes) => { pedidos.push(url); return fn(opcoes); }; };
  const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

  responder(() => json({ mesa: { usuarios: 0 } }));
  assert.equal(await mesaOcupada('.'), '', 'a mesa vazia libera');
  assert.equal(pedidos.at(-1), 'https://wiki.example/api/estado');
  responder(() => json({}));
  assert.equal(await mesaOcupada('.'), '', 'a wiki sem a mesa (sem Foundry ligado a ela) libera');
  responder(() => json({ mesa: { usuarios: 3 } }));
  assert.equal(await mesaOcupada('.'), '3 pessoa(s) na mesa do servidor');

  responder(() => { throw new TypeError('fetch failed'); });
  assert.match(await mesaOcupada('.'), /^não deu para saber se a mesa do servidor está vazia \(https:\/\/wiki\.example\/api\/estado: fetch failed\)$/);
  responder(() => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); });
  assert.match(await mesaOcupada('.'), /^não deu para saber.*timeout/);
  responder(() => new Response('<html>Bad gateway</html>', { status: 502 }));
  assert.match(await mesaOcupada('.'), /^não deu para saber.*HTTP 502/);
  responder(() => new Response('não é JSON', { status: 200 }));
  assert.match(await mesaOcupada('.'), /^não deu para saber/);

  delete process.env.WIKI_ONLINE;
  assert.equal(await mesaOcupada(new URL('./sem-servidor-', import.meta.url).pathname), '', 'sem o endereço da wiki online, não há mesa com quem dividir a licença');
});
