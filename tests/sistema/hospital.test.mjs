// Testes de referência da conta do hospital (o C41, parte 4; foundry-sistema/scripts/regras-hospital.mjs), sem Foundry: o
// custo pela maior DV da visita e o leito (a wiki, "Hospital, Trauma Team e instalação", p. 223–226), e o Trauma Team da
// ficha (os planos da criação da wiki): o Executivo inclui a cirurgia, o Prata a cobra.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { contaDoHospital, custoDaVisita, CUSTO_DO_LEITO, planoDoTraumaTeam } from '../../foundry-sistema/scripts/regras-hospital.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

test('Hospital (wiki, p. 223–226): os custos pela maior DV e o leito são os da tabela da wiki', () => {
  const regras = ler('system-rules.js');
  assert.ok(regras.includes("[['DV10', '50eb'], ['DV13', '100eb'], ['DV15', '500eb'], ['DV17 ou mais', '1.000eb']]"));
  assert.deepEqual([10, 13, 15, 17].map(custoDaVisita), [50, 100, 500, 1000]);
  assert.ok(regras.includes(`Leito: ${CUSTO_DO_LEITO}eb por noite.`));
  // Entre as linhas, vale a de baixo; acima de 17, a de 17; abaixo de 10, nada.
  assert.deepEqual([9, 11, 12, 14, 16, 20, 0, -3, '15'].map(custoDaVisita), [0, 50, 50, 100, 500, 1000, 0, 0, 500]);
});

test('Hospital: a conta soma a visita e o leito; o Executivo inclui a visita (o leito, não); o Prata e sem plano pagam tudo', () => {
  assert.deepEqual(contaDoHospital({ dv: 15, noites: 2, plano: 'nenhum' }),
    { dv: 15, noites: 2, plano: 'nenhum', doLivro: 500, incluida: false, visita: 500, leito: 200, total: 700 });
  assert.equal(contaDoHospital({ dv: 15, noites: 2, plano: 'prata' }).total, 700);
  assert.deepEqual(contaDoHospital({ dv: 17, noites: 3, plano: 'executivo' }),
    { dv: 17, noites: 3, plano: 'executivo', doLivro: 1000, incluida: true, visita: 0, leito: 300, total: 300 });
  // Sem visita, o Executivo não marca nada como incluído.
  assert.equal(contaDoHospital({ dv: 0, noites: 1, plano: 'executivo' }).incluida, false);
  assert.equal(contaDoHospital({ dv: 0, noites: 0 }).total, 0);
  assert.equal(contaDoHospital({ dv: 13, noites: 365 }).total, 36600);
  // Recusas: noites fora de 0 a 365 ou não inteiras, plano inválido.
  for (const noites of [-1, 366, 1.5, NaN]) assert.equal(contaDoHospital({ dv: 10, noites }).erro, 'Noites no leito: de 0 a 365.');
  assert.equal(contaDoHospital({ dv: 10, noites: 0, plano: 'ouro' }).erro, 'Escolha o plano do Trauma Team.');
});

test('Hospital: o plano do Trauma Team pela ficha (o nome que a wiki dá; sem ele, o custo mensal)', () => {
  const criacao = ler('system-criacao.js');
  for (const [id, nome, custo] of [['prata', 'Trauma Team Prata', 500], ['executivo', 'Trauma Team Executivo', 1000]]) {
    assert.ok(criacao.includes(`{ id: '${id}', nome: '${nome}', custo: ${custo},`), nome);
    assert.equal(planoDoTraumaTeam({ descricao: nome, custo }), id);
  }
  assert.equal(planoDoTraumaTeam({ descricao: 'Trauma Team Executivo', custo: 0 }), 'executivo');
  assert.equal(planoDoTraumaTeam({ descricao: 'Silver', custo: 0 }), 'prata');
  assert.equal(planoDoTraumaTeam({ descricao: '', custo: 1000 }), 'executivo');
  assert.equal(planoDoTraumaTeam({ descricao: '', custo: 500 }), 'prata');
  assert.equal(planoDoTraumaTeam({ descricao: '', custo: 0 }), 'nenhum');
  assert.equal(planoDoTraumaTeam(undefined), 'nenhum');
});
