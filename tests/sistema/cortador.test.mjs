// Testes de referência do cortador da folha dos tokens dinâmicos (o C45, parte 3; foundry-sistema/scripts/regras-cortador.mjs),
// sem Foundry: a disposição da folha de exemplo do usuário, as células da grade (com a faixa do rótulo), os nomes dos
// quadros (os que a janela do conjunto lê), a caixa do que não é transparente e a caixa comum, e a folha com fundo.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { caixaComum, caixaOpaca, celulasDaGrade, DISPOSICAO_PADRAO, disposicaoValida, nomeBase, quadrosDaFolha, temFundo } from '../../foundry-sistema/scripts/regras-cortador.mjs';
import { chaveDoArquivo } from '../../foundry-sistema/scripts/regras-token-dinamico.mjs';

test('Cortador: a disposição da folha de exemplo (Parado, Caminhando, Mirando e as poses; Correndo, Salto, Agachado e Levantando fora)', () => {
  assert.deepEqual(DISPOSICAO_PADRAO.linhas.map(l => l.tipo), ['parado', 'caminhando', 'mirando', 'poses']);
  assert.deepEqual(DISPOSICAO_PADRAO.linhas[3].poses, ['', '', '', '', 'ferido-leve', 'ferido-grave', 'incapacitado', 'morto']);
  const quadros = quadrosDaFolha(DISPOSICAO_PADRAO, 'Ricky Cyrus');
  assert.equal(quadros.length, 28);
  assert.deepEqual(quadros.slice(0, 3).map(q => q.arquivo), ['ricky-cyrus_parado_000.webp', 'ricky-cyrus_parado_045.webp', 'ricky-cyrus_parado_090.webp']);
  assert.deepEqual(quadros.find(q => q.linha === 2 && q.coluna === 7), { linha: 2, coluna: 7, chave: 'mirando-315', arquivo: 'ricky-cyrus_mirando_315.webp' });
  assert.deepEqual(quadros.filter(q => q.linha === 3).map(q => [q.coluna, q.chave]), [[4, 'ferido-leve'], [5, 'ferido-grave'], [6, 'incapacitado'], [7, 'morto']]);
  // Os nomes dos arquivos são os que a janela do conjunto lê (a mesma chave).
  for (const q of quadros) assert.equal(chaveDoArquivo(`tokens/x/${q.arquivo}`), q.chave, q.arquivo);
});

test('Cortador: o nome-base sem acento nem espaço; a disposição válida (colunas de 1 a 16, tipos e poses conhecidos, rótulo até 60%)', () => {
  assert.equal(nomeBase('  Ana Ção_2 '), 'ana-cao-2');
  assert.equal(nomeBase(''), 'token');
  const d = disposicaoValida({ colunas: 40, rotulo: 90, linhas: [{ tipo: 'voando' }, { tipo: 'poses', poses: ['morto', 'correndo'] }] });
  assert.equal(d.colunas, 16);
  assert.equal(d.rotulo, 60);
  assert.deepEqual(d.linhas[0], { tipo: 'ignorar' });
  assert.deepEqual(d.linhas[1].poses.slice(0, 3), ['morto', '', '']);
  assert.equal(d.linhas[1].poses.length, 16);
  assert.equal(disposicaoValida({ colunas: 0 }).colunas, 8);
  assert.equal(disposicaoValida({ rotulo: -5 }).rotulo, 0);
  // Linha de 8 direções com mais colunas que direções: as colunas a mais ficam fora; ignorar não gera nada.
  assert.equal(quadrosDaFolha({ colunas: 10, linhas: [{ tipo: 'parado' }, { tipo: 'ignorar' }] }, 'x').length, 8);
});

test('Cortador: as células da grade (a última coluna e linha até a borda) sem a faixa do rótulo', () => {
  const celulas = celulasDaGrade({ largura: 1000, altura: 400, colunas: 3, linhas: 2, rotulo: 25 });
  assert.equal(celulas.length, 6);
  assert.deepEqual(celulas[0], { linha: 0, coluna: 0, x: 0, y: 0, largura: 333, altura: 150 });
  assert.deepEqual(celulas[2], { linha: 0, coluna: 2, x: 667, y: 0, largura: 333, altura: 150 });
  assert.deepEqual(celulas[4], { linha: 1, coluna: 1, x: 333, y: 200, largura: 334, altura: 150 });
  assert.equal(celulasDaGrade({ largura: 100, altura: 100, colunas: 1, linhas: 1, rotulo: 0 })[0].altura, 100);
});

test('Cortador: a caixa do que não é transparente, a comum (com margem, dentro da célula) e a folha com fundo', () => {
  // Uma célula 6×4 com dois pixels opacos (2,1) e (4,2).
  const alfa = new Uint8Array(24);
  alfa[1 * 6 + 2] = 255;
  alfa[2 * 6 + 4] = 200;
  alfa[0] = 5; // abaixo do limiar: transparente
  assert.deepEqual(caixaOpaca(alfa, 6, 4), { x: 2, y: 1, largura: 3, altura: 2 });
  assert.equal(caixaOpaca(new Uint8Array(24), 6, 4), null);
  assert.deepEqual(caixaComum([{ x: 10, y: 20, largura: 30, altura: 40 }, null, { x: 5, y: 30, largura: 10, altura: 50 }], { largura: 100, altura: 100, margem: 2 }),
    { x: 3, y: 18, largura: 39, altura: 64 });
  // A margem não sai da célula; sem nenhuma caixa, a célula inteira.
  assert.deepEqual(caixaComum([{ x: 0, y: 0, largura: 100, altura: 100 }], { largura: 100, altura: 100 }), { x: 0, y: 0, largura: 100, altura: 100 });
  assert.deepEqual(caixaComum([null], { largura: 50, altura: 60 }), { x: 0, y: 0, largura: 50, altura: 60 });
  assert.equal(temFundo([255, 255, 255, 255]), true);
  assert.equal(temFundo([255, 0, 255, 255]), false);
  assert.equal(temFundo([]), false);
});
