// A identidade da arma (o C69): as contas do regras-identidade.mjs, com o plano do ROADMAP ("As modificações de armas": o
// nome próprio, o diário que conta sozinho os abates, os críticos, o primeiro sangue e as sessões, os marcos, a nota do
// mestre e a volta para a wiki) e a proposta da equipe de 2026-11-23 (o nome como "Velha Senhora · Militech M-10AF"; o
// aviso do marco de abates uma vez só; o "Desfazer" sem contar duas vezes).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as R from '../../foundry-sistema/scripts/regras-identidade.mjs';

const roadmap = fs.readFileSync(new URL('../../foundry-sistema/ROADMAP.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
const DIA = '2026-11-24T22:00:00.000Z';
const golpe = (identidade, extra) => R.eventosDoGolpe(identidade, { chave: 'a1:t1', alvo: 'Gato de Watson', hpAntes: 10, hpDepois: 4, data: DIA, ...extra });

test('C69: o plano do ROADMAP e o nome próprio com o modelo', () => {
  assert.match(roadmap, /C69\. A identidade da arma no Foundry:\*\* .*nome próprio, o diário \(abates, críticos, primeiro sangue, sessões e os marcos\), a nota do mestre e a volta para a wiki/);
  assert.equal(R.nomeDeExibicao('Militech M-10AF', 'Velha Senhora'), 'Velha Senhora · Militech M-10AF');
  assert.equal(R.nomeDeExibicao('Militech M-10AF', '   '), 'Militech M-10AF');
  assert.equal(R.nomeDeExibicao('Militech M-10AF', undefined), 'Militech M-10AF');
  // O valor estranho vira o padrão, e o texto longo é cortado no limite.
  const vazia = R.normalizar(null);
  assert.deepEqual(vazia, { versao: 1, apelido: '', frase: '', aparencia: '', feitaPor: '', dono: null, eventos: [], avisados: [] });
  const longa = R.normalizar({ apelido: 'x'.repeat(90), eventos: [{ tipo: 'inventado', data: DIA }, { tipo: 'abate', data: DIA, alvo: 'A' }], avisados: [5, 7], dono: { id: '' } });
  assert.equal(longa.apelido.length, R.LIMITES.apelido);
  assert.deepEqual(longa.eventos.map(e => e.tipo), ['abate']);
  assert.deepEqual(longa.avisados, [5]);
  assert.equal(longa.dono, null);
});

test('C69: o dono (sem dono, quem carrega) e a origem pela wiki, pela loja ou à mão', () => {
  assert.equal(R.ehDono({ dono: { id: 'ator1', nome: 'V' } }, 'ator1'), true);
  assert.equal(R.ehDono({ dono: { id: 'ator1', nome: 'V' } }, 'ator2'), false);
  assert.equal(R.ehDono(undefined, 'ator2'), true);
  assert.equal(R.eventoDeOrigem({ nome: 'V', wikiUid: 'pedido:p1:0', data: DIA }).texto, 'Comprada na loja da wiki por V');
  assert.equal(R.eventoDeOrigem({ nome: 'V', wikiUid: 'u-123', data: DIA }).texto, 'Veio da wiki com V');
  assert.equal(R.eventoDeOrigem({ nome: 'V', data: DIA }).texto, 'Chegou às mãos de V');
});

test('C69: o golpe conta o primeiro sangue uma vez, o abate (de 1 HP ou mais para menos de 1) e o crítico', () => {
  assert.deepEqual(golpe({}).map(e => e.tipo), ['primeiroSangue']);
  assert.deepEqual(golpe({}, { hpAntes: 3, hpDepois: 0, critico: true }).map(e => e.tipo), ['primeiroSangue', 'abate', 'critico']);
  // Já mortalmente ferido (menos de 1) não é outro abate; o dano que a armadura segurou não é sangue.
  assert.deepEqual(golpe({}, { hpAntes: 0, hpDepois: -3 }).map(e => e.tipo), ['primeiroSangue']);
  assert.deepEqual(golpe({}, { hpAntes: 10, hpDepois: 10 }), []);
  const comSangue = { eventos: [{ tipo: 'primeiroSangue', chave: 'x', data: DIA, alvo: 'Antes' }] };
  assert.deepEqual(golpe(comSangue, { hpAntes: 1, hpDepois: 0 }).map(e => e.tipo), ['abate']);
  assert.deepEqual(golpe({}, { hpAntes: 1, hpDepois: 0 })[0], { chave: 'a1:t1', data: DIA, alvo: 'Gato de Watson', tipo: 'primeiroSangue' });
});

test('C69: os eventos não se repetem (o dano refeito, a sessão do mesmo dia), o "Desfazer" tira os do golpe e os contadores voltam', () => {
  let { identidade, marco } = R.juntarEventos({}, golpe({}, { hpAntes: 3, hpDepois: 0, critico: true }));
  assert.equal(marco, null);
  assert.deepEqual(R.contadores(identidade), { abates: 1, criticos: 1, sessoes: 0, primeiroSangue: { data: DIA, alvo: 'Gato de Watson' } });
  // O mesmo golpe de novo não soma.
  identidade = R.juntarEventos(identidade, golpe(identidade, { hpAntes: 3, hpDepois: 0, critico: true })).identidade;
  assert.equal(R.contadores(identidade).abates, 1);
  // A sessão: uma por dia.
  const sessao = R.eventoDeSessao(DIA);
  assert.equal(sessao.chave, `sessao:${R.diaDe(DIA)}`);
  identidade = R.juntarEventos(identidade, [sessao, R.eventoDeSessao(DIA)]).identidade;
  identidade = R.juntarEventos(identidade, [R.eventoDeSessao(DIA)]).identidade;
  assert.equal(R.contadores(identidade).sessoes, 1);
  identidade = R.juntarEventos(identidade, [R.eventoDeSessao('2026-12-01T22:00:00.000Z')]).identidade;
  assert.equal(R.contadores(identidade).sessoes, 2);
  // O "Desfazer": os eventos da chave saem; a sessão fica.
  const desfeita = R.tirarEventos(identidade, 'a1:t1');
  assert.deepEqual(R.contadores(desfeita), { abates: 0, criticos: 0, sessoes: 2, primeiroSangue: null });
});

test('C69: o marco de abates (5, 10, 25, 50, 100) avisa uma vez, e o salto avisa só o maior', () => {
  const abates = (inicio, quantos) => Array.from({ length: quantos }, (_, i) => ({ chave: `g${inicio + i}`, tipo: 'abate', data: DIA, alvo: `Alvo ${inicio + i}` }));
  let { identidade, marco } = R.juntarEventos({}, abates(0, 4));
  assert.equal(marco, null);
  ({ identidade, marco } = R.juntarEventos(identidade, abates(4, 1)));
  assert.equal(marco, 5);
  assert.deepEqual(identidade.avisados, [5]);
  // Desfeito e refeito: o 5 não avisa de novo.
  identidade = R.tirarEventos(identidade, 'g4');
  ({ identidade, marco } = R.juntarEventos(identidade, abates(4, 1)));
  assert.equal(marco, null);
  // De 5 para 12 de uma vez: avisa o 10.
  ({ identidade, marco } = R.juntarEventos(identidade, abates(5, 7)));
  assert.equal(marco, 10);
  assert.deepEqual(identidade.avisados, [5, 10]);
  assert.deepEqual(R.MARCOS_DE_ABATES, [5, 10, 25, 50, 100]);
});

test('C69: o diário (os mais novos primeiro), o marco à mão e o que volta para a wiki, sem a nota do mestre', () => {
  const marco = R.eventoDeMarco('  O tiro que derrubou   o Gato de Watson ', { data: DIA, por: 'Kix' });
  assert.deepEqual(marco, { chave: `marco:${DIA}`, tipo: 'marco', data: DIA, texto: 'O tiro que derrubou o Gato de Watson', por: 'Kix' });
  assert.equal(R.eventoDeMarco('   ', { data: DIA }), null);
  const origem = R.eventoDeOrigem({ nome: 'V', data: '2026-11-20T15:00:00.000Z' });
  let { identidade } = R.juntarEventos({ apelido: 'Velha Senhora', frase: 'Nunca falhou.', dono: { id: 'a', nome: 'V' } }, [origem, ...golpe({}, { hpAntes: 2, hpDepois: 0 }), marco]);
  const linhas = R.diario(identidade);
  assert.deepEqual(linhas.map(l => l.tipo), ['marco', 'abate', 'primeiroSangue', 'origem']);
  const dia = R.diaDe(DIA).split('-').reverse().join('/');
  assert.equal(linhas[0].texto, `${dia}: O tiro que derrubou o Gato de Watson (Kix)`);
  assert.equal(linhas[1].texto, `${dia}: Abate: Gato de Watson`);
  assert.equal(R.descreverEvento({ tipo: 'critico', data: DIA, alvo: 'X' }), `${dia}: Crítico em X`);
  assert.equal(R.descreverEvento({ tipo: 'sessao', data: DIA }), `${dia}: Lutou nesta sessão`);
  assert.equal(R.diario(identidade, 2).length, 2);
  const naWiki = R.paraAWiki({ ...identidade, notaDoMestre: 'Rastreada pela Arasaka' });
  assert.deepEqual(Object.keys(naWiki), ['apelido', 'frase', 'aparencia', 'feitaPor', 'dono', 'abates', 'criticos', 'sessoes', 'primeiroSangue', 'diario']);
  assert.equal(naWiki.dono, 'V');
  assert.equal(naWiki.abates, 1);
  assert.ok(!JSON.stringify(naWiki).includes('Arasaka'));
  assert.deepEqual(naWiki.diario.at(-1), { tipo: 'marco', data: DIA, texto: 'O tiro que derrubou o Gato de Watson', por: 'Kix' });
  // Só os 30 mais novos vão.
  const muitos = R.juntarEventos({}, Array.from({ length: 40 }, (_, i) => ({ chave: `s${i}`, tipo: 'marco', data: DIA, texto: `m${i}` }))).identidade;
  assert.deepEqual(R.paraAWiki(muitos).diario.map(e => e.texto).slice(0, 2), ['m10', 'm11']);
  assert.equal(R.paraAWiki(muitos).diario.length, R.NA_WIKI);
});
