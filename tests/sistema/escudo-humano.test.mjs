// C41.2: wiki, system-rules.js, Escudos e escudo humano (p. 183–184); cobertura e explosivos (p. 182–183).
// A reação substitui a esquiva, como confirmado pelo usuário. Quem é usado como escudo tem sua defesa no combate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { acertou, danoDoEscudoHumano, escolhaAutomatica, escolhaPadrao, MODOS, opcoesDeDefesa, podeInterporEscudoHumano } from '../../foundry-sistema/scripts/regras.mjs';

const DISTANCIA = ['tiro', 'autofogo', 'cartucho', 'explosivo', 'ricochete'];

test('C41.2: só os ataques à distância ativos e fora da cabeça permitem interpor o escudo humano', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes('a partir de um agarrão, Ação para usar o agarrado como escudo.'));
  assert.ok(wiki.includes('Não bloqueia corpo a corpo nem tiro mirado na cabeça'));
  assert.ok(wiki.includes('Se morrer, vira escudo com HP igual ao BODY dele.'));
  assert.deepEqual(Object.keys(MODOS).filter(modo => !['corpo', 'supressivo'].includes(modo)).sort(), [...DISTANCIA].sort());
  for (const modo of DISTANCIA) {
    for (const local of ['corpo', 'perna', 'item']) {
      assert.equal(podeInterporEscudoHumano({ modo, local, ativo: true }), true, modo + ': ' + local);
      assert.equal(podeInterporEscudoHumano({ modo, local, ativo: false }), false);
      assert.equal(podeInterporEscudoHumano({ modo, local }), false);
    }
    assert.equal(podeInterporEscudoHumano({ modo, local: 'cabeca', ativo: true }), false);
  }
  for (const modo of ['corpo', 'agarrar', 'escapar', 'supressivo', 'jackin', 'expulsar', 'rajadaTech', 'cargaTech', '', 'outro', 'toString', '__proto__', undefined, null]) {
    assert.equal(podeInterporEscudoHumano({ modo, ativo: true }), false, String(modo));
  }
  assert.equal(podeInterporEscudoHumano({ modo: 'tiro', ativo: true }), true);
  assert.equal(podeInterporEscudoHumano(), false);
});

test('C41.2: opções conservam esquiva, escudo comum e Aguentar; a disponibilidade do humano não força sua escolha', () => {
  for (const modo of DISTANCIA) {
    assert.deepEqual(opcoesDeDefesa({ modo, esquiva: true, escudo: true, escudoHumano: true }), ['esquivar', 'aguentar', 'escudo', 'escudoHumano']);
    assert.deepEqual(opcoesDeDefesa({ modo, esquiva: false, escudoHumano: true }), ['aguentar', 'escudoHumano']);
    assert.deepEqual(opcoesDeDefesa({ modo, esquiva: true }), ['esquivar', 'aguentar']);
    assert.equal(escolhaPadrao(opcoesDeDefesa({ modo, esquiva: true, escudo: true, escudoHumano: true })), 'aguentar');
  }
  assert.deepEqual(opcoesDeDefesa({ modo: 'corpo', esquiva: true, escudo: true, escudoHumano: true }), ['esquivar', 'escudo']);
  assert.deepEqual(opcoesDeDefesa({ modo: 'corpo', esquiva: false, escudoHumano: true }), ['aguentar']);
  assert.deepEqual(opcoesDeDefesa({ modo: 'supressivo', esquiva: true, escudo: true, escudoHumano: true }), ['concentrar']);
  assert.equal(escolhaPadrao(['concentrar']), 'concentrar');
});

test('C41.2: NPC automático conserva prioridade da esquiva e do escudo comum antes do humano; depois, Aguentar', () => {
  const opcoes = ['esquivar', 'aguentar', 'escudo', 'escudoHumano'];
  const argumentos = { modo: 'tiro', dv: 15, mediaEsquiva: 20 };
  assert.equal(escolhaAutomatica({ ...argumentos, opcoes }), 'esquivar');
  assert.equal(escolhaAutomatica({ ...argumentos, mediaEsquiva: 15, opcoes }), 'escudo');
  assert.equal(escolhaAutomatica({ ...argumentos, mediaEsquiva: 10, opcoes: ['aguentar', 'escudoHumano'] }), 'escudoHumano');
  assert.equal(escolhaAutomatica({ ...argumentos, mediaEsquiva: 10, opcoes: ['aguentar'] }), 'aguentar');
  for (const modo of ['explosivo', 'cartucho']) assert.equal(escolhaAutomatica({ ...argumentos, modo, mediaEsquiva: 0, opcoes }), 'esquivar');
  assert.equal(escolhaAutomatica({ ...argumentos, dv: null, mediaEsquiva: 0, opcoes }), 'esquivar');
  assert.equal(escolhaAutomatica({ ...argumentos, opcoes: ['escudoHumano'] }), 'escudoHumano');
  assert.deepEqual(opcoes, ['esquivar', 'aguentar', 'escudo', 'escudoHumano']);
});

test('C41.2: interpor humano usa a DV e os mesmos acertos de Aguentar, sem aproveitar uma defesa de esquiva', () => {
  for (const modo of DISTANCIA) for (const dv of [null, undefined, 0, 15]) for (const ataque of [0, 14, 15, 16]) {
    const argumentos = { modo, ataque, dv, defesa: 100 };
    assert.equal(acertou({ ...argumentos, escolha: 'escudoHumano' }), acertou({ ...argumentos, escolha: 'aguentar' }));
  }
  assert.equal(acertou({ modo: 'tiro', escolha: 'escudoHumano', ataque: 15, defesa: 1, dv: 15 }), false);
  assert.equal(acertou({ modo: 'tiro', escolha: 'escudoHumano', ataque: 16, defesa: 100, dv: 15 }), true);
  assert.equal(acertou({ modo: 'ricochete', escolha: 'escudoHumano', ataque: 16 }), null);
  assert.equal(acertou({ modo: 'explosivo', escolha: 'escudoHumano', ataque: 0, dv: 15 }), true);
});

test('C41.2: dano do cadáver consome só os HP que ainda tem, sem transferir a sobra de tiros nem recarregar o máximo', () => {
  const pv = { value: 6, max: 8 };
  assert.deepEqual(danoDoEscudoHumano({ dano: 4, pv }), { antes: 6, depois: 2, perdeu: 4, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 6, pv }), { antes: 6, depois: 0, perdeu: 6, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 15, pv }), { antes: 6, depois: 0, perdeu: 6, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 1, pv: { value: 0, max: 8 } }), { antes: 0, depois: 0, perdeu: 0, max: 8, passou: false });
  assert.deepEqual(pv, { value: 6, max: 8 });
});

test('C41.2: explosivo só atravessa o cadáver ao zerar os HP; a conta não reduz o dano do ataque que atravessa', () => {
  for (const [dano, esperado] of [[4, { antes: 6, depois: 2, perdeu: 4, max: 8, passou: false }],
    [6, { antes: 6, depois: 0, perdeu: 6, max: 8, passou: true }], [15, { antes: 6, depois: 0, perdeu: 6, max: 8, passou: true }]]) {
    const pedido = { dano, pv: { value: 6, max: 8 }, explosivo: true };
    assert.deepEqual(danoDoEscudoHumano(pedido), esperado);
    assert.equal(pedido.dano, dano);
  }
  assert.deepEqual(danoDoEscudoHumano({ dano: 15, pv: { value: 0, max: 8 }, explosivo: true }), { antes: 0, depois: 0, perdeu: 0, max: 8, passou: true });
});

test('C41.2: HP e perda têm limite inferior zero e não ultrapassam o máximo existente', () => {
  for (const dano of [-4, undefined, NaN, 0]) assert.deepEqual(danoDoEscudoHumano({ dano, pv: { value: 6, max: 8 } }), { antes: 6, depois: 6, perdeu: 0, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 4, pv: { value: 20, max: 8 } }), { antes: 8, depois: 4, perdeu: 4, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 4, pv: { value: -3, max: 8 } }), { antes: 0, depois: 0, perdeu: 0, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: '4', pv: { value: '6', max: '8' } }), { antes: 6, depois: 2, perdeu: 4, max: 8, passou: false });
  assert.deepEqual(danoDoEscudoHumano({ dano: 4, pv: { value: 6, max: -2 } }), { antes: 0, depois: 0, perdeu: 0, max: 0, passou: false });
});
