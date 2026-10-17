// Testes da trava dos testes com navegador (tests/lib/trava.js): um G4 por vez neste PC, para as sessões que dividem o
// Foundry 14 de teste. Sem Foundry e sem a trava de verdade: cada teste usa um arquivo numa pasta temporária.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const { travar } = createRequire(import.meta.url)('../lib/trava.js');
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'trava-'));
test.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
const arquivo = nome => path.join(pasta, nome);
const dono = a => JSON.parse(fs.readFileSync(a, 'utf8'));
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
const calado = () => {};
// Os testes que esperam a trava têm prazo: a trava que nunca solta falha o teste em vez de parar o G3.
const PRAZO = { timeout: 5000 };

test('sem ninguém, pega a trava na hora, com o processo, a pasta e a hora; soltar apaga', async () => {
  const a = arquivo('livre');
  const soltar = await travar({ arquivo: a, espera: 10, avisar: calado });
  assert.equal(dono(a).pid, process.pid);
  assert.ok(dono(a).pasta && dono(a).desde);
  soltar();
  assert.equal(fs.existsSync(a), false);
});

test('com a trava de um processo vivo, espera ela sair (e avisa uma vez, com a pasta do outro)', PRAZO, async () => {
  const a = arquivo('ocupada');
  fs.writeFileSync(a, JSON.stringify({ pid: process.ppid, pasta: 'a outra sessão', desde: 'agora' }));
  const avisos = [];
  let pegou = false;
  const vez = travar({ arquivo: a, espera: 10, avisar: texto => avisos.push(texto) }).then(soltar => { pegou = true; return soltar; });
  await pausa(150);
  assert.equal(pegou, false);
  assert.equal(dono(a).pid, process.ppid);
  fs.rmSync(a);
  const soltar = await vez;
  assert.equal(dono(a).pid, process.pid);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /a outra sessão/);
  soltar();
});

test('a trava de um processo que já não existe (um teste interrompido) vale como solta', PRAZO, async () => {
  const a = arquivo('morta');
  const { pid } = spawnSync(process.execPath, ['-e', '']);
  fs.writeFileSync(a, JSON.stringify({ pid, pasta: 'o teste interrompido', desde: 'antes' }));
  const avisos = [];
  const soltar = await travar({ arquivo: a, espera: 10, avisar: texto => avisos.push(texto) });
  assert.equal(dono(a).pid, process.pid);
  assert.deepEqual(avisos, []);
  soltar();
});

test('a trava ilegível espera (pode estar sendo escrita); a de mais de um minuto vale como solta', PRAZO, async () => {
  const a = arquivo('ilegivel');
  fs.writeFileSync(a, '');
  let pegou = false;
  const vez = travar({ arquivo: a, espera: 10, avisar: calado }).then(soltar => { pegou = true; return soltar; });
  await pausa(150);
  assert.equal(pegou, false);
  const antes = new Date(Date.now() - 120000);
  fs.utimesSync(a, antes, antes);
  const soltar = await vez;
  assert.equal(dono(a).pid, process.pid);
  soltar();
});

test('soltar não apaga a trava que já é de outro', async () => {
  const a = arquivo('de-outro');
  const soltar = await travar({ arquivo: a, espera: 10, avisar: calado });
  fs.writeFileSync(a, JSON.stringify({ pid: process.ppid, pasta: 'outra', desde: 'agora' }));
  soltar();
  assert.equal(dono(a).pid, process.ppid);
});
