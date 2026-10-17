import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { falhaDaArma } from '../../foundry-sistema/scripts/regras.mjs';

// CORE 0.92.4: attackable-schema.js, config.attackableCritFailEffects e cpr-quality.hbs.
// Wiki: system-catalog.js (qualidade ruim) e system-blackchrome.js (Destruído e Destruído sem conserto).
test('Falha da arma: os quatro efeitos do CORE, em português, com o padrão emperrar', () => {
  const daFalha = efeito => falhaDaArma({ qualidade: 'poor', critico: 'falha', efeito });
  assert.deepEqual(daFalha('jammed'), { efeito: 'jammed', texto: 'A arma emperrou. Gaste uma Ação para desemperrá-la.' });
  assert.deepEqual(daFalha('destroyed'), { efeito: 'destroyed', texto: 'A arma quebrou e está sem uso, mas tem conserto.' });
  assert.deepEqual(daFalha('destroyedBeyondRepair'), { efeito: 'destroyedBeyondRepair', texto: 'A arma quebrou sem conserto e está sem uso para sempre.' });
  assert.deepEqual(daFalha('coinToss'), { efeito: 'coinToss', texto: 'Cara ou coroa: jogue uma moeda para resolver a falha da arma.' });
  assert.deepEqual(daFalha(), daFalha('jammed'));
  assert.equal(daFalha('desconhecido'), null);
});

test('Falha da arma: só qualidade ruim e falha efetiva; a Recuperação de Falhas do Solo a ignora (wiki)', () => {
  for (const qualidade of ['standard', 'excellent', '']) assert.equal(falhaDaArma({ qualidade, critico: 'falha' }), null);
  for (const critico of [null, undefined, 'sucesso']) assert.equal(falhaDaArma({ qualidade: 'poor', critico }), null);
  assert.equal(falhaDaArma({ qualidade: 'poor', critico: 'falha' }).efeito, 'jammed');
});

test('Catálogo: as armas preservam o efeito de falha; o CORE 0.92.4 traz jammed e a wiki de 2077 usa o padrão', () => {
  const { itens } = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8'));
  const armas = Object.entries(itens).filter(([, item]) => item.type === 'arma');
  assert.equal(armas.filter(([id]) => id.startsWith('core_weapons:')).length, 100);
  assert.equal(armas.filter(([id]) => id.startsWith('armas-2077:')).length, 46);
  for (const [id, item] of armas) assert.equal(item.system.falhaCritica, 'jammed', id);
});
