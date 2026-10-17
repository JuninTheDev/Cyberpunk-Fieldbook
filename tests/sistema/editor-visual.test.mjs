// Testes de referência do editor visual da arquitetura (foundry-sistema/scripts/arquitetura.mjs: lerPosicao, moverAndar
// e criarAndar), sem Foundry: o mapa da ficha faz o que o editor do NET Architect da mesa faz
// (foundry-net-architect/scripts/editor.mjs): arrastar move o andar inteiro, em cima de outro troca os dois, e o "+"
// cria o andar na célula vazia.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { criarAndar, lerPosicao, moverAndar } from '../../foundry-sistema/scripts/arquitetura.mjs';

const linha = (andar, ramo, tipo, extra = {}) => ({ andar, ramo, tipo, dv: 6, ice: '', demonio: '', ator: '', nome: '', descricao: '', ...extra });
const posicoes = andares => andares.map(l => `${l.andar}${l.ramo}:${l.tipo}`).join();
const clinica = [linha(1, 'a', 'senha'), linha(2, 'a', 'arquivo', { nome: 'Agenda' }), linha(2, 'a', 'ice', { ice: 'wisp' }), linha(3, 'b', 'controle')];

test('a posição no mapa: o andar de 1 a 18 e o ramo de A a H; o resto não vale', () => {
  assert.deepEqual(lerPosicao('3b'), { andar: 3, ramo: 'b' });
  assert.deepEqual(lerPosicao('18h'), { andar: 18, ramo: 'h' });
  for (const ruim of ['0a', '19a', '3i', '3B', 'a', '', '1.5a', null, undefined]) assert.equal(lerPosicao(ruim), null, String(ruim));
});

test('arrastar: o andar inteiro vai para a célula vazia; em cima de outro, os dois trocam', () => {
  // Para o vazio: as duas linhas do 2A vão para o 4A; as outras ficam.
  assert.equal(posicoes(moverAndar(clinica, '2a', '4a')), '1a:senha,4a:arquivo,4a:ice,3b:controle');
  // Em cima do 1A: troca (as linhas do 1A vão para o 2A).
  const trocado = moverAndar(clinica, '2a', '1a');
  assert.equal(posicoes(trocado), '2a:senha,1a:arquivo,1a:ice,3b:controle');
  // O resto da linha vai junto, e a lista de antes não muda.
  assert.equal(trocado[1].nome, 'Agenda');
  assert.equal(trocado[2].ice, 'wisp');
  assert.equal(posicoes(clinica), '1a:senha,2a:arquivo,2a:ice,3b:controle');
  // O ramo sem letra (de antes do ramo) conta como o A.
  assert.equal(posicoes(moverAndar([{ andar: 1, tipo: 'senha' }], '1a', '2c')), '2c:senha');
});

test('arrastar sem efeito: o mesmo lugar, a origem vazia ou uma posição fora da arquitetura devolvem a mesma lista', () => {
  for (const [de, para] of [['2a', '2a'], ['5a', '1a'], ['2a', '19a'], ['2a', 'x'], ['', '1a']]) assert.equal(moverAndar(clinica, de, para), clinica, `${de} → ${para}`);
});

test('o "+": a senha DV 6 na célula vazia; na ocupada ou fora da arquitetura, nada', () => {
  const criado = criarAndar(clinica, '3a');
  assert.equal(criado.length, 5);
  assert.deepEqual(criado[4], linha(3, 'a', 'senha'));
  assert.equal(criarAndar(clinica, '2a'), clinica);
  assert.equal(criarAndar(clinica, '0a'), clinica);
  assert.deepEqual(criarAndar([], '1a'), [linha(1, 'a', 'senha')]);
});
