// Testes de referência do C43, parte 2 (da 0.93 do CORE, a mesa), sem Foundry: o marcador de turno (os quatro do CORE e o
// do Foundry; os SVGs são cópias sem alteração dos do CORE 0.93) e os upgrades com modificador negativo (o SDP e os
// assentos do veículo nunca abaixo de 0; o carregador troca o pente, não soma).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { caminhoDoMarcador, MARCADORES_DE_TURNO } from '../../foundry-sistema/scripts/marcador-de-turno.mjs';
import { penteComCarregador, somaDeUpgrades } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = new URL('../../', import.meta.url);

test('Marcador de turno (o "Token Marker" do CORE 0.93): as quatro escolhas do CORE, com os SVGs dele sem alteração, e o do Foundry', () => {
  const doCore = { padrao: 'default', 'sem-desenho': 'no-graphic', 'sem-sombra': 'no-shade', 'sem-centro': 'no-center' };
  for (const [id, nome] of Object.entries(doCore)) {
    assert.equal(MARCADORES_DE_TURNO[id].arquivo, `turn-marker_${nome}.svg`);
    const nosso = fs.readFileSync(new URL(`foundry-sistema/icones/marcadores/turn-marker_${nome}.svg`, raiz));
    const original = fs.readFileSync(new URL(`fvtt-cyberpunk-red-core-dev/src/icons/hud/turn-marker_${nome}.svg`, raiz));
    assert.ok(nosso.equals(original), `${nome}: cópia sem alteração`);
  }
  assert.deepEqual(Object.keys(MARCADORES_DE_TURNO), ['padrao', 'sem-desenho', 'sem-sombra', 'sem-centro', 'foundry']);
  assert.equal(caminhoDoMarcador('padrao', 'original.webp'), 'systems/cpr-fieldbook/icones/marcadores/turn-marker_default.svg');
  assert.equal(caminhoDoMarcador('sem-centro', 'original.webp'), 'systems/cpr-fieldbook/icones/marcadores/turn-marker_no-center.svg');
  // O do Foundry e uma escolha que não existe mais voltam ao original.
  assert.equal(caminhoDoMarcador('foundry', 'original.webp'), 'original.webp');
  assert.equal(caminhoDoMarcador('antigo', 'original.webp'), 'original.webp');
  // A licença das cópias.
  assert.match(fs.readFileSync(new URL('foundry-sistema/icones/marcadores/ORIGEM.md', raiz), 'utf8'), /GPL v3/);
});

test('Upgrades com modificador negativo (o CORE 0.93): o SDP e os assentos somam os positivos e os negativos, nunca abaixo de 0', () => {
  assert.equal(somaDeUpgrades(50, [10, -15]), 45);
  assert.equal(somaDeUpgrades(2, [-1]), 1);
  assert.equal(somaDeUpgrades(2, [-5]), 0);
  assert.equal(somaDeUpgrades(30, []), 30);
  assert.equal(somaDeUpgrades(30, [0, undefined, 'x']), 30);
  // O carregador não é um modificador que soma: troca o pente da arma pelo dele (o maior, com mais de um).
  assert.equal(penteComCarregador(25, [35]), 35);
  assert.equal(penteComCarregador(25, [0]), 25);
});
