// O pedido de teste do mestre (o C65): as contas do regras-pedido-teste.mjs, com a wiki como fonte (system-rules.js: o
// teste básico supera a DV, o empate não passa; a escala de DV de 9 a 29).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as R from '../../foundry-sistema/scripts/regras-pedido-teste.mjs';

const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');

test('a escala de DV do pedido é a da página da wiki (DV e nome), e o teste precisa superar a DV', () => {
  const tabela = wiki.slice(wiki.indexOf('const dvScale'), wiki.indexOf("], 'dense');", wiki.indexOf('const dvScale')));
  const linhas = [...tabela.matchAll(/\['(\d+)', '([^']+)', '[^']*'\]/g)].map(([, dv, nome]) => ({ dv: Number(dv), nome }));
  assert.equal(linhas.length, 7);
  assert.deepEqual(R.DIFICULDADES, linhas);
  assert.match(wiki, /Precisa <b>superar<\/b> a DV/);
  assert.deepEqual([R.passou(16, 15), R.passou(15, 15), R.passou(14, 15), R.passou(30, null), R.passou(null, 15)], [true, false, false, null, null]);
  assert.deepEqual([R.nomeDaDv(17), R.nomeDaDv(16)], ['Profissional', '']);
  assert.deepEqual([R.dvValida('15'), R.dvValida(''), R.dvValida(null), R.dvValida(0), R.dvValida(100), R.dvValida('13.7')], [15, null, null, null, null, 13]);
});

test('o /teste: a perícia (português, inglês ou id), a família com o tipo como foi escrito, o STAT e a DV no fim', () => {
  const ler = R.lerComandoTeste;
  assert.equal(ler('/red 1d10'), null);
  assert.equal(ler('teste percepção'), null);
  assert.deepEqual(ler('/teste'), { teste: null, dv: null });
  assert.deepEqual(ler('/teste 15'), { teste: null, dv: 15 });
  assert.deepEqual(ler('/teste percepção 15'), { teste: { tipo: 'pericia', id: 'perception' }, dv: 15 });
  // O nome mais longo ganha: a Percepção Humana não é a Percepção.
  assert.deepEqual(ler('/teste Percepção Humana dv17'), { teste: { tipo: 'pericia', id: 'human-perception' }, dv: 17 });
  assert.deepEqual(ler('/teste stealth'), { teste: { tipo: 'pericia', id: 'stealth' }, dv: null });
  assert.deepEqual(ler('/TESTE resistir tortura/drogas 13'), { teste: { tipo: 'pericia', id: 'resist-torture-drugs' }, dv: 13 });
  assert.deepEqual(ler('/teste cool 13'), { teste: { tipo: 'atributo', chave: 'cool' }, dv: 13 });
  assert.deepEqual(ler('/teste Especialista Local Watson 15'), { teste: { tipo: 'familia', familia: 'local-expert', tipoDaFamilia: 'Watson' }, dv: 15 });
  assert.deepEqual(ler('/teste linguagem japonês'), { teste: { tipo: 'familia', familia: 'language', tipoDaFamilia: 'japonês' }, dv: null });
  // O MOVE não é teste; um nome que não existe avisa (e a janela abre vazia, com a DV).
  assert.equal(ler('/teste move 9').teste, null);
  assert.match(ler('/teste percepçao extra 9').erro, /Não achei o teste "percepçao extra"/);
  assert.deepEqual([R.rotuloDoTeste({ tipo: 'pericia', id: 'perception' }), R.rotuloDoTeste({ tipo: 'atributo', chave: 'body' }), R.rotuloDoTeste({ tipo: 'familia', familia: 'language', tipoDaFamilia: 'Japonês' }), R.rotuloDoTeste({ tipo: 'familia', familia: 'science' })],
    ['Percepção', 'BODY', 'Linguagem (Japonês)', 'Ciências']);
  assert.deepEqual([R.testeValido({ tipo: 'pericia', id: 'nada' }), R.testeValido({ tipo: 'atributo', chave: 'move' }), R.testeValido({ tipo: 'familia', familia: 'language' }), R.testeValido(null)], [false, false, true, false]);
});

test('a família no personagem: a com o nome pedido (sem acento e sem maiúscula), sem nome a de nível maior, e sem nenhuma o STAT dela', () => {
  const pericias = [
    { id: 'language-streetslang', familia: 'language', nome: 'Streetslang', nivel: 2 },
    { id: 'language-japones', familia: 'language', nome: 'Japonês', nivel: 6 },
    { id: 'local-expert-watson', familia: 'local-expert', nome: 'Watson', nivel: 4 },
    { id: 'perception', familia: '', nome: '', nivel: 5 }
  ];
  assert.equal(R.periciaDaFamilia(pericias, 'language', 'japones'), 'language-japones');
  assert.equal(R.periciaDaFamilia(pericias, 'language', 'STREETSLANG'), 'language-streetslang');
  assert.equal(R.periciaDaFamilia(pericias, 'language', ''), 'language-japones');
  assert.equal(R.periciaDaFamilia(pericias, 'language', 'Russo'), null);
  assert.equal(R.periciaDaFamilia(pericias, 'science', ''), null);
  assert.deepEqual([R.atributoDaFamilia('language'), R.atributoDaFamilia('martial-arts'), R.atributoDaFamilia('play-instrument')], ['int', 'dex', 'tech']);
});

test('quem vê o quê: o mestre tudo; em "Todos", o total de todos; no privado, só o dono; às cegas, ninguém; a DV só com "Mostrar a DV"', () => {
  const ve = (modo, mostrarDv, quem) => R.oQueVe({ modo, mostrarDv }, quem);
  assert.deepEqual(ve('cegas', false, { mestre: true }), { total: true, passou: true, dv: true });
  assert.deepEqual(ve('publico', false, {}), { total: true, passou: true, dv: false });
  assert.deepEqual(ve('publico', true, {}), { total: true, passou: true, dv: true });
  assert.deepEqual(ve('privado', false, { dono: true }), { total: true, passou: true, dv: false });
  assert.deepEqual(ve('privado', true, {}), { total: false, passou: false, dv: true });
  assert.deepEqual(ve('cegas', true, { dono: true }), { total: false, passou: false, dv: true });
  assert.deepEqual(Object.values(R.MODOS).map(m => m.mensagem), ['public', 'gm', 'blind']);
});

test('as linhas: o primeiro resultado vale, o resumo conta quem rolou e quem passou, e encerrar marca quem não rolou', () => {
  const linhas = ['V', 'Jackie', 'Capanga'].map(nome => ({ nome, estado: 'esperando', total: null }));
  const um = R.registrarResultado(linhas, 0, { total: 16, critico: null, mensagem: 'm1' });
  assert.deepEqual(um[0], { nome: 'V', estado: 'rolou', total: 16, critico: null, mensagem: 'm1', porMestre: false });
  assert.equal(linhas[0].estado, 'esperando', 'não muda as linhas de antes');
  assert.equal(R.registrarResultado(um, 0, { total: 3 }), null, 'a segunda rolagem da mesma linha não conta');
  assert.equal(R.registrarResultado(um, 5, { total: 3 }), null);
  assert.equal(R.registrarResultado(um, 1, { total: 'x' }), null);
  const dois = R.registrarResultado(um, 1, { total: 15, critico: 'falha', porMestre: true });
  assert.equal(dois[1].porMestre, true);
  assert.deepEqual(R.resumoDoPedido(dois, 15), { total: 3, rolaram: 2, faltam: 1, passaram: 1, maior: 16 });
  assert.deepEqual(R.resumoDoPedido(dois, null), { total: 3, rolaram: 2, faltam: 1, passaram: null, maior: 16 });
  assert.deepEqual(R.resumoDoPedido(linhas, 15), { total: 3, rolaram: 0, faltam: 3, passaram: 0, maior: null });
  const fim = R.encerrar(dois);
  assert.deepEqual(fim.map(l => l.estado), ['rolou', 'rolou', 'naoRolou']);
  assert.equal(R.registrarResultado(fim, 2, { total: 20 }), null, 'depois de encerrar, não registra');
});
