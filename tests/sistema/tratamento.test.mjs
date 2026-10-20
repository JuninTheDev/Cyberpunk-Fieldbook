// Testes de referência da correção rápida e do tratamento da lesão crítica (foundry-sistema/scripts/tratamento.mjs), sem
// Foundry: as DVs das linhas da tabela da wiki ("Dano e cura", p. 187 e 223) e a regra de superar a DV (p. 128).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { opcoesDaLesao, opcaoParaParteCibernetica, penalidadeDeDeathSave, resolveDeVez, resultadoDoTratamento, tratarLesao, voltouALesao } from '../../foundry-sistema/scripts/tratamento.mjs';

// As lesões como o catálogo as traz (paliativo e tratamento; 0 = aquela perícia não serve).
const PERNA_QUEBRADA = { paliativo: { primeirosSocorros: 0, paramedico: 13 }, tratamento: { paramedico: 15, cirurgia: 13 } };
const MUSCULO_ROMPIDO = { paliativo: { primeirosSocorros: 13, paramedico: 13 }, tratamento: { paramedico: 0, cirurgia: 0 } };
const BRACO_DESMEMBRADO = { paliativo: { primeirosSocorros: 0, paramedico: 0 }, tratamento: { paramedico: 0, cirurgia: 17 } };
const lido = opcoes => opcoes.map(opcao => `${opcao.rotulo} DV${opcao.dv}`).join(', ');

test('Correção rápida e tratamento (wiki, p. 187): as perícias e as DVs de cada lesão, só as que servem', () => {
  assert.equal(lido(opcoesDaLesao(PERNA_QUEBRADA, 'correcao')), 'Paramédico DV13');
  assert.equal(lido(opcoesDaLesao(PERNA_QUEBRADA, 'tratamento')), 'Paramédico DV15, Cirurgia DV13');
  assert.equal(lido(opcoesDaLesao(MUSCULO_ROMPIDO, 'correcao')), 'Primeiros Socorros DV13, Paramédico DV13');
  assert.equal(lido(opcoesDaLesao(MUSCULO_ROMPIDO, 'tratamento')), '');
  assert.equal(lido(opcoesDaLesao(BRACO_DESMEMBRADO, 'correcao')), '');
  assert.equal(lido(opcoesDaLesao(BRACO_DESMEMBRADO, 'tratamento')), 'Cirurgia DV17');
  // A Cirurgia é a rolagem de Role do Medtech; as outras, perícias.
  assert.deepEqual(opcoesDaLesao(PERNA_QUEBRADA, 'tratamento').map(opcao => [opcao.id, Boolean(opcao.role)]), [['paramedic', false], ['cirurgia', true]]);
});

test('Correção rápida e tratamento (wiki, p. 128 e 223): precisa superar a DV; a correção tira o efeito até o fim do dia, e na lesão sem tratamento resolve de vez; o tratamento cura', () => {
  // Empatar com a DV não basta.
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 13, dv: 13, sistema: PERNA_QUEBRADA }), 'falhou');
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 14, dv: 13, sistema: PERNA_QUEBRADA }), 'corrigida');
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 14, dv: 13, sistema: MUSCULO_ROMPIDO }), 'curada');
  assert.equal(resultadoDoTratamento({ tipo: 'tratamento', total: 15, dv: 15, sistema: PERNA_QUEBRADA }), 'falhou');
  assert.equal(resultadoDoTratamento({ tipo: 'tratamento', total: 16, dv: 15, sistema: PERNA_QUEBRADA }), 'curada');
  assert.equal(resolveDeVez(MUSCULO_ROMPIDO), true);
  assert.equal(resolveDeVez(PERNA_QUEBRADA), false);
});

test('C19: Cybertecnologia nas partes cibernéticas conserva a DV escolhida e usa perícia, inclusive no lugar da Cirurgia do Medtech', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.match(wiki, /\['Cybertecnologia', 'Não estabiliza\. Faz correção rápida e tratamento de lesões em partes cibernéticas \(cyberbraço, cyberolho\.\.\.\), na mesma DV\.'\]/);
  const originais = opcoesDaLesao(PERNA_QUEBRADA, 'tratamento');
  const antes = structuredClone(originais);
  assert.deepEqual(originais.map(opcao => opcaoParaParteCibernetica(opcao, true)), [
    { chave: 'cybertecnologia', id: 'cybertech', rotulo: 'Cybertecnologia', role: false, dv: 15 },
    { chave: 'cybertecnologia', id: 'cybertech', rotulo: 'Cybertecnologia', role: false, dv: 13 }
  ]);
  assert.deepEqual(originais, antes, 'a escolha cibernética não altera as opções médicas');
  assert.deepEqual(originais.map(opcao => opcaoParaParteCibernetica(opcao)), antes);
  assert.deepEqual(originais.map(opcao => opcaoParaParteCibernetica(opcao, false)), antes);
});

test('C19: a correção de parte cibernética também usa Cybertecnologia na mesma DV, sem inventar opção onde a tabela não permite', () => {
  assert.deepEqual(opcoesDaLesao(PERNA_QUEBRADA, 'correcao').map(opcao => opcaoParaParteCibernetica(opcao, true)), [
    { chave: 'cybertecnologia', id: 'cybertech', rotulo: 'Cybertecnologia', role: false, dv: 13 }
  ]);
  assert.deepEqual(opcoesDaLesao(BRACO_DESMEMBRADO, 'correcao'), []);
  assert.deepEqual(opcoesDaLesao(MUSCULO_ROMPIDO, 'tratamento'), []);
  assert.deepEqual(opcoesDaLesao(PERNA_QUEBRADA, 'outro'), []);
});

test('C19: paliativo suspende o +1 no Death Save e Voltou o devolve, sem apagar aumentaDeathSave do item (decisão de 2026-10-20)', () => {
  const lesao = (aumentaDeathSave, corrigida) => ({ type: 'lesao', system: { aumentaDeathSave }, flags: { 'cpr-fieldbook': { corrigida } } });
  const primeira = lesao(true), segunda = lesao(true), comum = lesao(false), outro = { ...lesao(true), type: 'equipamento' };
  const itens = [primeira, segunda, comum, outro];
  assert.equal(penalidadeDeDeathSave(itens), 2);
  primeira.flags['cpr-fieldbook'].corrigida = { por: 'Medtech', efeitos: [] };
  assert.equal(penalidadeDeDeathSave(itens), 1, 'lesão com paliativo não aumenta o Death Save');
  assert.equal(primeira.system.aumentaDeathSave, true, 'a regra original permanece no item');
  delete primeira.flags['cpr-fieldbook'].corrigida;
  assert.equal(penalidadeDeDeathSave(itens), 2, 'retirada a marca do paliativo, a penalidade retorna');
  segunda.flags['cpr-fieldbook'].corrigida = { por: 'Paliativo antigo' };
  assert.equal(penalidadeDeDeathSave(itens), 1, 'a marca antiga também suspende o +1');
});

test('C19: tratamento e Voltou recusam documento ausente, tipo errado e lesão sem dono antes de abrir janela', async () => {
  for (const lesao of [undefined, null, { type: 'arma', isOwner: true }, { type: 'lesao', isOwner: false }]) {
    assert.equal(await tratarLesao(lesao, 'correcao'), null);
    assert.equal(await voltouALesao(lesao), null);
  }
  assert.equal(await tratarLesao({ type: 'lesao', isOwner: true }, 'outro'), null);
});
