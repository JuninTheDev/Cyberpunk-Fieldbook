// Testes de referência do Jack In no Neuroport (foundry-sistema/scripts/regras.mjs: alcanceDoJackIn e percebeuOJackIn; e
// a parede que barra a visão, netrun/regras-da-net.mjs), sem Foundry. A wiki ("Quickhacks no Neuroport", Kit p. 16–17 e
// 26–27, e "Do que o netrunner precisa").
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { alcanceDoJackIn, JACK_IN, percebeuOJackIn } from '../../foundry-sistema/scripts/regras.mjs';
import { barra, paredeNoMeio } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');

test('o Jack In pela wiki: Interface + 1d10 contra a WILL + 1d10 do alvo; falhando, entra, mas o alvo percebe; o empate é do alvo', () => {
  assert.ok(wiki.includes('<b>Jack In:</b> entra no Neuroport de um alvo à vista, no alcance: Interface + 1d10 contra WILL + 1d10 do alvo. Falhando, você entra assim mesmo, mas o alvo percebe.'));
  assert.equal(percebeuOJackIn(11, 7), false);
  assert.equal(percebeuOJackIn(7, 7), true);
  assert.equal(percebeuOJackIn(6, 9), true);
  assert.equal(percebeuOJackIn('12', '11'), false);
});

test('o alcance do Jack In com o deck externo: 6 m, 8 m com o Range Upgrade', () => {
  assert.ok(wiki.includes('<b>Deck externo:</b> a até <b>6 m</b> do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade).'));
  assert.deepEqual(JACK_IN, { alcance: 6, rangeUpgrade: 2 });
  assert.equal(alcanceDoJackIn(), 6);
  assert.equal(alcanceDoJackIn({ rangeUpgrade: true }), 8);
});

test('"à vista": a parede que barra a visão para o Jack In; a janela (barra o movimento, não a visão) deixa', () => {
  const janela = { c: [50, -50, 50, 50], move: 20, sight: 0, door: 0, ds: 0 };
  const muro = { ...janela, sight: 20 };
  const de = { x: 0, y: 0 };
  const para = { x: 100, y: 0 };
  assert.equal(barra(janela, 'sight'), false);
  assert.equal(barra(janela), true);
  assert.equal(paredeNoMeio([janela], de, para, 'sight'), false);
  assert.equal(paredeNoMeio([janela], de, para), true);
  assert.equal(paredeNoMeio([muro], de, para, 'sight'), true);
  // A porta aberta deixa ver.
  assert.equal(paredeNoMeio([{ ...muro, door: 1, ds: 1 }], de, para, 'sight'), false);
});
