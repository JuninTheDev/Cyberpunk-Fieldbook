// A quebra à mão, o conserto pago e a DV da oficina (o C99; as decisões do usuário de 2026-11-26 sobre as dúvidas do C68
// ao C75): o mestre quebra a arma pela ficha (o EMP, a história); o custo do conserto sai do dinheiro do dono quando o
// conserto passa (sem o bastante, sai sem cobrar e o mestre recebe o aviso); a oficina escolhe a DV da instalação (21 de
// padrão), e a instalação usa a DV escolhida no lugar da do preço.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as Q from '../../foundry-sistema/scripts/regras-quebra.mjs';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';
import * as O from '../../foundry-sistema/scripts/regras-oficina.mjs';
import { DIFICULDADES } from '../../foundry-sistema/scripts/regras-pedido-teste.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

test('C99: a quebra à mão tem o estado da regra e o motivo curto', () => {
  assert.deepEqual(Q.quebraAMao('quebrada', '  O   EMP do Netrunner  '), { estado: 'quebrada', motivo: 'O EMP do Netrunner' });
  assert.deepEqual(Q.quebraAMao('reliquia'), { estado: 'reliquia', motivo: '' });
  assert.equal(Q.quebraAMao('quebrada', 'x'.repeat(200)).motivo.length, 120);
  assert.deepEqual(Q.quebraAMao('perdida', 'x'), { erro: 'o estado é a quebrada ou a relíquia' });
  assert.deepEqual(Q.quebraAMao(undefined), { erro: 'o estado é a quebrada ou a relíquia' });
});

test('C99: o conserto cobra do dono só com o bastante, e o saldo nunca fica negativo', () => {
  // A pistola de 100eb (Premium): o conserto custa 50eb (uma categoria abaixo).
  const custo = Q.consertoDaArma(100).custo;
  assert.equal(custo, 50);
  assert.deepEqual(Q.cobrancaDoConserto({ custo, saldo: 50, nome: 'Vex' }), { cobra: true, valor: 50, motivo: '' });
  assert.deepEqual(Q.cobrancaDoConserto({ custo, saldo: 49, nome: 'Vex' }), { cobra: false, valor: 50, motivo: 'Vex tem só 49eb (o conserto custa 50eb)' });
  assert.deepEqual(Q.cobrancaDoConserto({ custo: 0, saldo: 10 }), { cobra: false, valor: 0, motivo: 'o conserto não custa nada' });
  assert.deepEqual(Q.cobrancaDoConserto({ custo: 20.7, saldo: 100 }), { cobra: true, valor: 20, motivo: '' });
  assert.deepEqual(Q.cobrancaDoConserto({ custo: 'abc', saldo: 100 }), { cobra: false, valor: 0, motivo: 'o conserto não custa nada' });
});

test('C99: a ficha da arma tem o "Quebrar" do mestre, e o conserto leva o "Cobrar" até o fim do teste', () => {
  const quebra = ler('foundry-sistema/scripts/quebra.mjs');
  assert.match(quebra, /export const API = \{ \.\.\.R, marcarPelaFalha, desfazerPeloCartao, quebrar, abrirQuebrar, consertar, /);
  // O teste do Tech leva o "Cobrar" na ação do pedido, e o resultado passa para o conserto.
  assert.match(quebra, /acao: \{ tipo: TIPO, arma: arma\.uuid, cobrar: Boolean\(cobrar\) \}/);
  assert.match(quebra, /await consertar\(arma, \{ por: linha\.nome, cobrar: Boolean\(dados\.acao\.cobrar\) \}\)/);
  // A caixa vem marcada só quando o dono tem o bastante (sem ele, o mestre escolhe cobrar e recebe o aviso).
  assert.match(quebra, /name="cobrar"\$\{Number\(dono\.system\.dinheiro\) >= conserto\.custo \? ' checked' : ''\}>/);
  assert.match(quebra, /if \(cobranca\?\.cobra\) await dono\.mudarComExtrato\('dinheiro', \{ acao: 'subtrair', valor: cobranca\.valor, /);
  const ficha = ler('foundry-sistema/scripts/ficha-item.mjs');
  assert.match(ficha, /podeQuebrar: tipo === 'arma' && game\.user\.isGM && Boolean\(item\.actor\) && !item\.estadoDaQuebra,/);
  assert.match(ler('foundry-sistema/templates/item.hbs'), /\{\{else if podeQuebrar\}\}[\s\S]{0,200}data-action="quebrarArma"/);
});

test('C99: a oficina escolhe a DV da instalação na escala da wiki (21 de padrão), e a instalação usa a escolhida', () => {
  assert.equal(O.DV_DA_INSTALACAO, 21);
  for (const { dv } of DIFICULDADES) assert.equal(O.dvDaOficina(dv), dv);
  assert.equal(O.dvDaOficina('15'), 15);
  assert.equal(O.dvDaOficina(undefined), 21);
  assert.equal(O.dvDaOficina(16), 21);
  assert.equal(O.modDoFormulario({ nome: 'Kiroshi', tamanho: 1, dv: '13', efeitos: [] }).dv, 13);
  assert.equal(O.modDoFormulario({ nome: 'Kiroshi', tamanho: 1, efeitos: [] }).dv, 21);
  const { mod } = O.modDoFormulario({ nome: 'Kiroshi', tamanho: 1, efeitos: [] });
  assert.deepEqual(M.instalacaoDaMod(mod, 0, 13), { dv: 13, categoria: 'a da oficina do mestre', tempo: '1 hora', teste: { tipo: 'role', id: 'upgrade', pericia: 'weaponstech' } });
  // Sem a DV da oficina, a do preço (o C72).
  assert.equal(M.instalacaoDaMod(mod, 100).dv, 17);
  assert.equal(M.instalacaoDaMod(mod, 100, null).dv, 17);
  assert.equal(M.instalacaoDaMod({ ...mod, tipo: 'defeito' }, 0, 13), null);
  // A janela guarda a DV no formulário (a flag "oficina"), e a instalação a lê dali.
  assert.match(ler('foundry-sistema/scripts/oficina.mjs'), /classe: f\.classe\.value, dv: f\.dv\.value, /);
  assert.match(ler('foundry-sistema/scripts/instalacao-mod.mjs'), /const oficina = item\.getFlag\(SISTEMA, 'oficina'\); return oficina \? dvDaOficina\(oficina\.dv\) : null;/);
});
