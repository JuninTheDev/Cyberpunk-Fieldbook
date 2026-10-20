// Testes da barra de macros e dos favoritos (o C20; foundry-sistema/scripts/macros.mjs), sem Foundry: os modos da macro
// da arma (os rollType do CPRMacro do CORE 0.92.4: o ataque, o dano, o mirado, o autofogo e o supressivo, e aqui os modos
// de 2077), o texto da macro (as escolhas no alto e a chamada, com o nome escapado, como o generate-item-macro do CORE),
// a janela de rolagem (o skipPrompt do CORE, com o "Rolar direto" deste navegador) e a lista curta das perícias.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { alternarNaLista, comandoDaMacro, listaCurta, modosDaMacro, perguntarNaMacro } from '../../foundry-sistema/scripts/macros.mjs';

// Roda o texto da macro com uma API falsa e devolve as chamadas (o que a macro de verdade chamaria).
async function rodar(comando) {
  const chamadas = [];
  const api = { macros: { usarArma: (...args) => chamadas.push(['usarArma', ...args]), rolarPericia: (...args) => chamadas.push(['rolarPericia', ...args]) } };
  await vm.runInNewContext(`(async () => { ${comando} })()`, { game: { system: { api } } });
  // Os objetos do vm têm outro protótipo: a comparação vai pelo JSON.
  return JSON.parse(JSON.stringify(chamadas));
}

test('macros (C20): os modos da arma, como os rollType do CORE, com os de 2077 da arma', () => {
  assert.deepEqual(modosDaMacro({}), ['ataque', 'mirado', 'dano'], 'a arma branca ou a pistola: o ataque, o mirado e o dano');
  assert.deepEqual(modosDaMacro({ autofogo: 4, supressivo: true }), ['ataque', 'mirado', 'autofogo', 'supressivo', 'dano'], 'o rifle de assalto e a submetralhadora');
  assert.deepEqual(modosDaMacro({ autofogo: 0, supressivo: true }), ['ataque', 'mirado', 'supressivo', 'dano']);
  assert.deepEqual(modosDaMacro({ modos2077: [{ modo: 'ricochete', rotulo: 'Ricochete' }, { modo: 'doisCanos', rotulo: 'Dois canos' }] }), ['ataque', 'mirado', 'ricochete', 'doisCanos', 'dano']);
});

test('macros (C20): o texto da macro da arma lista os modos dela e chama a API com o nome escapado; mudar as escolhas muda a chamada', async () => {
  const nome = 'Rifle "Malorian" \\ Mk.2';
  const comando = comandoDaMacro({ tipo: 'arma', nome, modos: modosDaMacro({ autofogo: 3, modos2077: [{ modo: 'ricochete', rotulo: 'Ricochete' }] }), modos2077: [{ modo: 'ricochete', rotulo: 'Ricochete' }] });
  assert.match(comando, /^\/\/ A janela de rolagem/);
  assert.match(comando, /const pularJanela = false;/);
  assert.match(comando, /const modo = "ataque";/);
  for (const modo of ['dano', 'mirado', 'autofogo', 'ricochete']) assert.match(comando, new RegExp(`//   "${modo}": `), `o comentário lista o modo ${modo}`);
  assert.doesNotMatch(comando, /"supressivo"/, 'sem o modo que a arma não tem');
  assert.match(comando, /"ricochete": Ricochete \(2077\)/);
  assert.deepEqual(await rodar(comando), [['usarArma', nome, { pularJanela: false, modo: 'ataque' }]]);
  const mudado = comando.replace('const pularJanela = false;', 'const pularJanela = true;').replace('const modo = "ataque";', 'const modo = "dano";');
  assert.deepEqual(await rodar(mudado), [['usarArma', nome, { pularJanela: true, modo: 'dano' }]]);
});

test('macros (C20): o texto da macro da perícia rola pelo id, sem os modos', async () => {
  const comando = comandoDaMacro({ tipo: 'pericia', pericia: 'evasion' });
  assert.doesNotMatch(comando, /const modo/);
  assert.deepEqual(await rodar(comando), [['rolarPericia', 'evasion', { pularJanela: false }]]);
});

test('macros (C20): a janela de rolagem na macro é a do clique na ficha; pularJanela rola direto', () => {
  assert.equal(perguntarNaMacro({}), true, 'como o clique: abre a janela');
  assert.equal(perguntarNaMacro({ pularJanela: true }), false);
  assert.equal(perguntarNaMacro({ rolarDireto: true }), false, 'o "Rolar direto" deste navegador inverte, como na ficha');
  assert.equal(perguntarNaMacro({ pularJanela: true, rolarDireto: true }), false);
});

test('macros (C20): a estrela põe e tira; a favorita sem nível entra na lista curta depois das com nível, pelo nome', () => {
  assert.deepEqual(alternarNaLista([], 'evasion'), ['evasion']);
  assert.deepEqual(alternarNaLista(['evasion', 'perception'], 'evasion'), ['perception']);
  const p = (id, nome, nivel, favorita = false) => ({ id, nome, nivel, favorita });
  const comNivel = [p('handgun', 'Armas Curtas', 4), p('evasion', 'Evasão', 2, true)];
  const todas = [...comNivel, p('stealth', 'Furtividade', 0, true), p('perception', 'Percepção', 0), p('athletics', 'Atletismo', 0, true)];
  assert.deepEqual(listaCurta(comNivel, todas).map(x => x.id), ['handgun', 'evasion', 'athletics', 'stealth'], 'a favorita com nível não repete; sem a estrela, a sem nível fica de fora');
});
