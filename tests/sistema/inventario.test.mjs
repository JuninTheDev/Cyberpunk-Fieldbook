import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { tipoDeScanner, scannerPreferido, luzDoItem, efeitoDaLuz } from '../../foundry-sistema/scripts/regras-inventario.mjs';

test('C16: a wiki manda não acumular Medscanner e Techscanner; o catálogo identifica equipamentos e implantes renomeados', () => {
  const wiki = fs.readFileSync(new URL('../../system-catalog.js', import.meta.url), 'utf8');
  assert.match(wiki, /Medscanner<\/b>[^\n]+\+2[^\n]+Não acumula com outro/);
  assert.match(wiki, /Techscanner<\/b>[^\n]+\+2[^\n]+Não acumula com outro/);
  assert.equal(tipoDeScanner({ name: 'Diagnóstico', type: 'equipamento', catalogo: 'core_gear:medscanner' }), 'medscanner');
  assert.equal(tipoDeScanner({ name: 'Oficina', type: 'cyberware', catalogo: 'core_cyberware:techscanner' }), 'techscanner');
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'equipamento' }), 'medscanner');
  assert.equal(tipoDeScanner({ name: 'Techscanner', type: 'cyberware' }), 'techscanner');
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'equipamento', catalogo: 'core_gear:agent' }), null);
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'droga' }), null);
});

test('C16: só um scanner ativo de cada tipo vale; o substituto assume sem suprimir outros bônus', () => {
  const candidatos = [{ id: 'b', tipo: 'medscanner', ativo: true }, { id: 'a', tipo: 'medscanner', ativo: true }, { id: 'c', tipo: 'techscanner', ativo: true }];
  assert.equal(scannerPreferido(candidatos, 'medscanner'), 'a');
  assert.equal(scannerPreferido(candidatos, 'techscanner'), 'c');
  candidatos[1].ativo = false;
  assert.equal(scannerPreferido(candidatos, 'medscanner'), 'b');
  candidatos[0].ativo = false;
  assert.equal(scannerPreferido(candidatos, 'medscanner'), null);
});

test('C16: luz de 100 m confirmada pelo usuário; a wiki dá uma hora de uso único ao sinalizador', () => {
  const wiki = fs.readFileSync(new URL('../../system-catalog.js', import.meta.url), 'utf8');
  assert.match(wiki, /Lanterna[^\n]+Facho de 100 m; 10 horas por carga/);
  assert.match(wiki, /Sinalizador de estrada[^\n]+Ilumina 100 m por 1 hora. Uso único/);
  assert.deepEqual(luzDoItem({ name: 'Nova', type: 'equipamento', catalogo: 'core_gear:flashlight' }), { alcance: 100 });
  assert.deepEqual(luzDoItem({ name: 'Road Flare', type: 'equipamento' }), { alcance: 100, segundos: 3600, descartavel: true });
  assert.equal(luzDoItem({ name: 'Flashlight', type: 'arma' }), null);
  assert.equal(luzDoItem({ name: 'Flashlight', type: 'equipamento', catalogo: 'core_gear:agent' }), null);
  const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
  for (const id of ['flashlight', 'road-flare']) {
    const item = catalogo['core_gear:' + id], efeito = item.effects[0];
    assert.equal(item.system.ativacao, 'manual');
    assert.ok(efeito.disabled && efeito.transfer);
    assert.deepEqual(efeito.system.changes, efeitoDaLuz(item.name, 100).system.changes);
  }
});
