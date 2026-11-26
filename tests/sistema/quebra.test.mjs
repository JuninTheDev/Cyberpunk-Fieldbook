// O risco da arma (o C73): o regras-quebra.mjs e a modificação instável, com as decisões do usuário de 2026-11-25 (a quebra
// automática pela falha; o conserto pelo teste do Tech, TECH + Tecnologia de Armas contra a DV do preço, com o custo de uma
// categoria abaixo; o reforjar passa o nome, a frase, a história e uma modificação, e os contadores zeram; a instável faz
// a falha crítica valer como a da arma ruim), a regra das falhas da arma (regras.FALHAS_DA_ARMA, o CORE 0.92.4) e a página
// da regra na wiki (system-modificacoes.js, "O risco").
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as Q from '../../foundry-sistema/scripts/regras-quebra.mjs';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';
import * as O from '../../foundry-sistema/scripts/regras-oficina.mjs';
import { FALHAS_DA_ARMA, falhaDaArma } from '../../foundry-sistema/scripts/regras.mjs';
import { contadores } from '../../foundry-sistema/scripts/regras-identidade.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const contexto = { window: {} };
vm.runInNewContext(ler('system-modificacoes.js'), contexto);
const pagina = Object.values(contexto.window.systemModificacoes.pages).map(p => p.html).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

test('C73: a falha que quebra (a Quebra e a Quebra sem conserto, do CORE) e os estados', () => {
  assert.deepEqual(Object.keys(FALHAS_DA_ARMA), ['jammed', 'destroyed', 'destroyedBeyondRepair', 'coinToss']);
  assert.deepEqual(Object.keys(FALHAS_DA_ARMA).map(Q.estadoDaFalha), [null, 'quebrada', 'reliquia', null]);
  assert.equal(Q.estadoDaFalha('nao-existe'), null);
  assert.deepEqual(Object.keys(Q.ESTADOS), ['quebrada', 'reliquia']);
  assert.equal(Q.estadoValido('quebrada'), 'quebrada');
  assert.equal(Q.estadoValido('toString'), null);
  assert.equal(Q.estadoValido(undefined), null);
});

test('C73: o conserto pelo preço (a DV, a categoria e o custo de uma categoria abaixo) e o teste do Tech', () => {
  // As categorias do RED (p. 385).
  assert.deepEqual(Q.CATEGORIAS.map(c => c.eb), [10, 20, 50, 100, 500, 1000, 5000, 10000]);
  const linha = eb => { const c = Q.consertoDaArma(eb); return `${c.dv}/${c.categoria}/${c.custo}`; };
  assert.deepEqual([0, 10, 20, 50, 99, 100, 500, 999, 1000, 5000, 20000].map(linha), [
    '13/Barato/10', '13/Barato/10', '13/Cotidiano/10', '13/Oneroso/20', '13/Oneroso/20', '17/Premium/50', '21/Caro/100', '21/Caro/100', '24/Muito Caro/500', '24/Luxo/1000', '24/Super Luxo/5000'
  ]);
  assert.deepEqual(Q.consertoDaArma(100).teste, { tipo: 'pericia', id: 'weaponstech' });
  // O teste é uma cópia: mexer nele não muda a regra.
  Q.consertoDaArma(100).teste.id = 'handgun';
  assert.equal(Q.TESTE_DO_CONSERTO.id, 'weaponstech');
});

test('C73: o reforjar passa o nome, a frase, a aparência e quem fez; os contadores zeram e o diário guarda a linha', () => {
  const data = '2026-11-25T12:00:00.000Z';
  const velha = {
    estado: 'reliquia', reforjada: null, tipo: 'vHeavyPistol', modelo: 'Very Heavy Pistol',
    identidade: { apelido: 'Velha Senhora', frase: 'Nunca falhou.', aparencia: 'Cromada', feitaPor: 'Ripper', dono: { id: 'a1', nome: 'Vex' },
      eventos: [{ tipo: 'abate', data, alvo: 'X', chave: 'k1' }, { tipo: 'critico', data, alvo: 'X', chave: 'k1' }], avisados: [5], antes: { abates: 7 } }
  };
  const nova = { estado: null, tipo: 'vHeavyPistol', identidade: { dono: { id: 'a1', nome: 'Vex' }, eventos: [{ tipo: 'origem', data, texto: 'Veio da loja' }, { tipo: 'sessao', data }] } };
  const { identidade, erro } = Q.reforjar(velha, nova, { data });
  assert.equal(erro, undefined);
  assert.deepEqual([identidade.apelido, identidade.frase, identidade.aparencia, identidade.feitaPor, identidade.dono.nome], ['Velha Senhora', 'Nunca falhou.', 'Cromada', 'Ripper', 'Vex']);
  assert.deepEqual(identidade.eventos.map(e => e.tipo), ['origem', 'marco']);
  assert.equal(identidade.eventos[1].texto, 'Reforjada da Velha Senhora · Very Heavy Pistol');
  assert.deepEqual(contadores(identidade), { abates: 0, criticos: 0, sessoes: 0, primeiroSangue: null });
  assert.deepEqual(identidade.avisados, []);
  // As recusas, com o motivo.
  const recusa = (v, n) => Q.reforjar({ ...velha, ...v }, { ...nova, ...n }, { data }).erro;
  assert.match(recusa({ estado: 'quebrada' }, {}), /só a relíquia/);
  assert.match(recusa({ reforjada: { em: 'x' } }, {}), /já foi reforjada/);
  assert.match(recusa({}, { estado: 'quebrada' }), /a arma nova está quebrada/);
  assert.match(recusa({}, { tipo: 'heavyPistol' }), /do mesmo tipo/);
  assert.match(recusa({}, { identidade: { apelido: 'Outra' } }), /já tem um nome próprio \(Outra\)/);
  assert.match(recusa({ identidade: { apelido: '' } }, {}), /não tem um nome próprio/);
});

test('C73: a modificação instável (sempre, sem situação) e a falha da arma ruim que ela empresta', () => {
  const instavel = { versao: 1, id: 'x-instavel', nome: 'Cano instável', tipo: 'tatica', tamanho: 1, efeitos: [{ rotulo: 'instável', entao: [{ alvo: 'instavel', valor: true }] }] };
  assert.equal(M.validarMod(instavel), '');
  assert.match(M.validarMod({ ...instavel, efeitos: [{ rotulo: 'instável', entao: [{ alvo: 'instavel', valor: false }] }] }), /a instável é sempre sim/);
  assert.match(M.validarMod({ ...instavel, efeitos: [{ rotulo: 'instável', quando: { modo: ['tiro'] }, entao: [{ alvo: 'instavel', valor: true }] }] }), /sem situação/);
  assert.equal(M.derivadosDaArma([instavel]).instavel, true);
  assert.equal(M.derivadosDaArma([]).instavel, false);
  assert.equal(M.descreverEfeito(instavel.efeitos[0]), 'na falha crítica, a arma falha como a de qualidade ruim (instável)');
  // A falha da arma ruim: na instável, a arma (de qualquer qualidade) falha como a ruim (o combate/modos.mjs passa a ruim).
  assert.deepEqual(falhaDaArma({ qualidade: 'poor', efeito: 'destroyed', critico: 'falha' }), { efeito: 'destroyed', texto: FALHAS_DA_ARMA.destroyed.texto });
  assert.equal(falhaDaArma({ qualidade: 'standard', efeito: 'destroyed', critico: 'falha' }), null);
  // A oficina do mestre monta a instável pelo menu.
  const feito = O.modDoFormulario({ nome: 'Cano instável', tipo: 'tatica', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'instavel' }] }, 'oficina:cano-instavel-x');
  assert.equal(feito.erro, undefined);
  assert.deepEqual(feito.mod.efeitos, [{ rotulo: 'instável', entao: [{ alvo: 'instavel', valor: true }] }]);
});

test('C73: a página da regra diz o risco (a quebra, o conserto, a relíquia, o reforjar e a instável)', () => {
  assert.match(pagina, /A falha crítica da arma ruim \(ou da que tem uma modificação instável\) pode quebrá-la: a Quebra a deixa quebrada, e a Quebra sem conserto a torna uma relíquia\. Quebrada, ela não ataca, e o que está nela para\./);
  assert.match(pagina, /O conserto é do Tech: TECH \+ Tecnologia de Armas \+ 1d10 contra a DV do preço da arma \(13 até o Oneroso, 17 no Premium, 21 no Caro, 24 do Muito Caro para cima\), e custa o preço de uma categoria abaixo\. Na falha, ela continua quebrada\./);
  assert.match(pagina, /A relíquia não se usa mais, e a história dela fica\. Ela se reforja: o nome, a frase, a linha "Reforjada da …" e uma modificação \(se couber\) passam para uma arma nova do mesmo tipo, e os contadores voltam a zero\./);
  assert.match(pagina, /A modificação instável \(da oficina do mestre\) faz a falha crítica valer como a da arma ruim, mesmo numa arma boa/);
});
