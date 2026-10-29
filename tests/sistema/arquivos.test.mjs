// Testes de referência dos arquivos do Eye-Dee (foundry-sistema/scripts/netrun/arquivos.mjs), sem Foundry: o lugar e a
// página do diário, como o arquivos.mjs do NET Architect da mesa (foundry-net-architect/scripts/arquivos.mjs), e o
// diário na vista pública do arquivo identificado.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { lerArquitetura } from '../../foundry-sistema/scripts/arquitetura.mjs';
import { diarioDe, lugarDoArquivo, paginaDoArquivo } from '../../foundry-sistema/scripts/netrun/arquivos.mjs';
import { vistaPublica } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

const arq = lerArquitetura({ nome: 'Clínica', andares: [
  { andar: 1, ramo: 'a', tipo: 'arquivo', dv: 6, nome: 'Agenda', descricao: 'Três clientes em Watson.' },
  { andar: 2, ramo: 'a', tipo: 'vazio' }, { andar: 2, ramo: 'b', tipo: 'arquivo', dv: 8 }
] });

test('o lugar do arquivo: a arquitetura e o andar; o ramo só fora do A', () => {
  assert.equal(lugarDoArquivo(arq, arq.nos['1a']), 'Clínica · andar 1');
  assert.equal(lugarDoArquivo(arq, arq.nos['2b']), 'Clínica · andar 2 (ramo B)');
});

test('a página do diário: o nome do arquivo (ou "Arquivo"), o que ele é e de onde veio, com o HTML escapado', () => {
  const corredor = { nome: 'Deck <b>' };
  const ponto = { nome: 'Terminal & cia' };
  const pagina = paginaDoArquivo({ conteudo: arq.nos['1a'].conteudos[0], corredor, lugar: 'Clínica · andar 1', ponto, quando: '17/10/2026 02:00' });
  assert.equal(pagina.name, 'Agenda');
  assert.equal(pagina.type, 'text');
  assert.equal(pagina.text.content, '<p>Três clientes em Watson.</p><hr><p><i>Copiado por Deck &lt;b&gt; em Clínica · andar 1 (DV 6), pelo ponto de acesso Terminal &amp; cia, em 17/10/2026 02:00.</i></p>');
  // Sem nome nem descrição; o DV que falta vira "—".
  const semNada = paginaDoArquivo({ conteudo: { ...arq.nos['2b'].conteudos[0], dv: null }, corredor: { nome: 'Deck' }, lugar: 'Clínica · andar 2 (ramo B)', ponto: {}, quando: 'agora' });
  assert.equal(semNada.name, 'Arquivo');
  assert.equal(semNada.text.content, '<p>Arquivo sem descrição.</p><hr><p><i>Copiado por Deck em Clínica · andar 2 (ramo B) (DV —), pelo ponto de acesso , em agora.</i></p>');
});

test('o diário de cada arquivo copiado, e a vista pública com ele só no arquivo identificado', () => {
  const est = { vistos: ['1a', '2a', '2b'], feitos: ['1a.0'], ices: [], fora: [], corredores: [], arquivos: [{ chave: '1a.0', uuid: 'JournalEntry.abc', nome: 'Arquivo: Clínica · andar 1' }] };
  assert.equal(diarioDe(est, '1a.0'), 'JournalEntry.abc');
  assert.equal(diarioDe(est, '2b.0'), '');
  assert.equal(diarioDe({}, '1a.0'), '');
  const vista = Object.fromEntries(vistaPublica(arq, est).map(no => [no.id, no]));
  assert.equal(vista['1a'].conteudos[0].diario, 'JournalEntry.abc');
  // O arquivo por identificar não diz nada (nem o diário de um registro que sobrou).
  assert.equal('diario' in vista['2b'].conteudos[0], false);
  assert.equal('diario' in vistaPublica(arq, { ...est, feitos: [] })[0].conteudos[0], false);
});
