// As modificações de armas (o C66): as contas do regras-modificacoes.mjs, com as decisões do usuário de 2026-11-23 como
// fonte (o ROADMAP, "As modificações de armas": a regra da casa, os slots próprios, a modificação permanente e o teto).
// A lista das modificações e a página da wiki vêm no C68; as daqui são as da proposta aprovada, para testar as contas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';

const roadmap = fs.readFileSync(new URL('../../foundry-sistema/ROADMAP.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');

const mira = {
  versao: 1, id: 'mira-medio-alcance', nome: 'Mira de médio alcance', tipo: 'tatica', tamanho: 1, encaixe: { aDistancia: true },
  efeitos: [{ rotulo: 'tiro único ou mirado de 13 a 50 m', grupo: 'mira', quando: { todos: [{ modo: ['tiro'] }, { metros: { min: 13, max: 50 } }] }, entao: [{ alvo: 'ataque', valor: 1 }] }]
};
const compensador = {
  versao: 1, id: 'compensador', nome: 'Compensador', tipo: 'tatica', tamanho: 1, encaixe: { aDistancia: true },
  efeitos: [{ rotulo: 'autofogo', quando: { modo: ['autofogo'] }, entao: [{ alvo: 'ataque', valor: 1 }] }, { rotulo: 'não se esconde', entao: [{ alvo: 'ocultavel', valor: false }] }]
};
const cano = {
  versao: 1, id: 'cano-alta-pressao', nome: 'Cano de alta pressão', tipo: 'tatica', tamanho: 1, encaixe: { aDistancia: true },
  efeitos: [{ rotulo: 'contra cobertura e objetos', quando: { alvo: ['cobertura', 'objeto'] }, entao: [{ alvo: 'dano', valor: '1d6' }] }]
};
const lanterna = { versao: 1, id: 'lanterna-tatica', nome: 'Lanterna tática', tipo: 'tatica', tamanho: 1, efeitos: [{ rotulo: 'no escuro', quando: { manual: 'no escuro' }, ligadoPorPadrao: false, entao: [{ alvo: 'ataque', valor: 1 }] }] };
const gatilho = { versao: 1, id: 'gatilho-sensivel', nome: 'Gatilho sensível', tipo: 'defeito', tamanho: 0, efeitos: [{ rotulo: 'emperra no 1 e no 2', entao: [{ alvo: 'emperraAte', valor: 2 }] }] };
const descalibrada = { versao: 1, id: 'mira-descalibrada', nome: 'Mira descalibrada para estranhos', tipo: 'defeito', tamanho: 0, efeitos: [{ rotulo: 'na mão de quem não é o dono', quando: { dono: false }, entao: [{ alvo: 'ataque', valor: -2 }] }] };
const torta = { versao: 1, id: 'coronha-torta', nome: 'Coronha torta', tipo: 'defeito', tamanho: 0, efeitos: [{ rotulo: 'sempre', entao: [{ alvo: 'ataque', valor: -1 }] }] };
const grife = { versao: 1, id: 'acabamento-de-grife', nome: 'Acabamento de grife', tipo: 'sabor', tamanho: 1, efeitos: [] };
const pente = { versao: 1, id: 'pente-extra', nome: 'Pente extra', tipo: 'tatica', tamanho: 1, efeitos: [{ rotulo: 'mais balas', entao: [{ alvo: 'pente', valor: 2 }] }] };

const rifle = { aDistancia: true, slots: 3, qualidade: 'standard', tipo: 'assaultRifle' };
const faca = { aDistancia: false, slots: 0, qualidade: 'excellent', tipo: 'lightMelee' };
const exotica = { aDistancia: true, slots: 1, qualidade: 'standard', tipo: 'medPistol' };
const ruim = { ...rifle, qualidade: 'poor' };

test('a regra da casa do usuário (o ROADMAP) e os números: os slots, o +1 numa situação e o teto de +3', () => {
  for (const trecho of ['é regra da casa, declarada na wiki e ligada à Invention Expertise do Tech', 'os acessórios do livro não mudam',
    'slots próprios de modificação (2 em toda arma, a branca também; 1 na exótica e na ruim; um defeito, sorteado, dá +1, até 3)',
    'a modificação é permanente (só o Tech tira, e tirar destrói)', 'nenhuma dá bônus fixo no ataque, no máximo uma de ataque por arma (+1 numa situação) e a arma soma até +3 por rolagem',
    'as marcas de história só contam história']) assert.ok(roadmap.includes(trecho), trecho);
  assert.deepEqual(M.SLOTS, { normal: 2, reduzido: 1, porDefeito: 1, maximo: 3, defeitos: 1 });
  assert.deepEqual([M.BONUS_DE_ATAQUE, M.TETO_DA_ARMA], [1, 3]);
  // 2 no rifle e na faca; 1 na exótica e na ruim; o defeito dá +1, até 3, e um só conta.
  assert.deepEqual([rifle, faca, exotica, ruim].map(arma => M.slotsDeModificacao(arma)), [2, 2, 1, 1]);
  assert.deepEqual([M.slotsDeModificacao(rifle, 1), M.slotsDeModificacao(rifle, 2), M.slotsDeModificacao(exotica, 1), M.slotsDeModificacao(ruim, 1), M.slotsDeModificacao(exotica, 2)], [3, 3, 2, 2, 2]);
  assert.equal(M.slotsDeModificacao(), 2);
});

test('a modificação válida e as recusas: o bônus fixo, o +2, o dano contra gente, o defeito que ocupa slot', () => {
  for (const mod of [mira, compensador, cano, lanterna, gatilho, descalibrada, torta, grife, pente]) assert.equal(M.validarMod(mod), '', mod.id);
  const com = (base, mudanca) => ({ ...base, ...mudanca });
  const efeito = (mudanca) => com(mira, { efeitos: [{ ...mira.efeitos[0], ...mudanca }] });
  assert.match(M.validarMod(efeito({ quando: undefined })), /precisa de uma situação \(nenhuma modificação dá bônus fixo\)/);
  assert.match(M.validarMod(efeito({ entao: [{ alvo: 'ataque', valor: 2 }] })), /o ataque vai de −4 a \+1/);
  assert.match(M.validarMod(com(cano, { efeitos: [{ ...cano.efeitos[0], quando: { alvo: ['pessoa', 'cobertura'] } }] })), /nunca vale contra gente/);
  assert.match(M.validarMod(com(cano, { efeitos: [{ ...cano.efeitos[0], quando: { modo: ['tiro'] } }] })), /nunca vale contra gente/);
  assert.match(M.validarMod(com(cano, { efeitos: [{ ...cano.efeitos[0], entao: [{ alvo: 'dano', valor: '3' }] }] })), /é um dado/);
  assert.match(M.validarMod(com(gatilho, { tamanho: 1 })), /o defeito não ocupa slot/);
  assert.match(M.validarMod(efeito({ quando: { escuro: true } })), /a condição "escuro" não existe/);
  assert.match(M.validarMod(efeito({ quando: { modo: ['tiro'], metros: { min: 13 } } })), /cada condição diz uma coisa só/);
  assert.match(M.validarMod(efeito({ quando: { metros: { min: 50, max: 13 } } })), /"metros" é \{ min, max \}/);
  assert.match(M.validarMod(efeito({ quando: { alvo: ['drone'] } })), /o alvo é pessoa, veiculo, objeto, cobertura/);
  assert.match(M.validarMod(com(pente, { efeitos: [{ ...pente.efeitos[0], quando: { modo: ['tiro'] } }] })), /pente muda a arma sempre/);
  assert.match(M.validarMod(com(gatilho, { efeitos: [{ rotulo: 'x', entao: [{ alvo: 'emperraAte', valor: 4 }] }] })), /emperra até o 1, o 2 ou o 3/);
  assert.match(M.validarMod(com(mira, { id: 'Mira!' })), /o id da modificação/);
  assert.match(M.validarMod(com(mira, { versao: 2 })), /versão/);
  assert.match(M.validarMod(com(mira, { tipo: 'lendaria' })), /o tipo é tatica, sabor, defeito/);
  assert.match(M.validarMod(com(mira, { efeitos: [{ ...mira.efeitos[0], entao: [{ alvo: 'cdt', valor: 2 }] }] })), /"cdt" não é/);
  assert.equal(M.validarMod(null), 'a modificação está vazia');
  assert.deepEqual([M.ehDeAtaque(mira), M.ehDeAtaque(descalibrada), M.ehDeAtaque(grife)], [true, false, false]);
});

test('a condição: o sim, o não e o "não sei" (null), em todos, algum e não', () => {
  const quando = mira.efeitos[0].quando;
  assert.equal(M.avaliar(quando, { modo: 'tiro', metros: 30 }), true);
  assert.equal(M.avaliar(quando, { modo: 'tiro', metros: 51 }), false);
  assert.equal(M.avaliar(quando, { modo: 'autofogo', metros: null }), false);
  assert.equal(M.avaliar(quando, { modo: 'tiro', metros: null }), null);
  assert.equal(M.avaliar({ algum: [{ modo: ['autofogo'] }, { manual: 'no escuro' }] }, { modo: 'tiro' }), null);
  assert.equal(M.avaliar({ algum: [{ modo: ['tiro'] }, { manual: 'no escuro' }] }, { modo: 'tiro' }), true);
  assert.equal(M.avaliar({ algum: [{ modo: ['autofogo'] }, { mirado: true }] }, { modo: 'tiro', mirado: false }), false);
  assert.deepEqual([M.avaliar({ nao: { dono: true } }, { dono: false }), M.avaliar({ nao: { dono: true } }, {}), M.avaliar({ nao: { aDistancia: true } }, { aDistancia: true })], [true, null, false]);
  assert.deepEqual([M.avaliar({ alvo: ['cobertura'] }, { alvo: 'cobertura' }), M.avaliar({ municao: ['ap'] }, { municao: 'basic' }), M.avaliar(undefined, {})], [true, false, true]);
  assert.equal(M.avaliar({ metros: { min: 13, max: 50 } }, { metros: 13 }), true);
  assert.equal(M.avaliar({ metros: { min: 13, max: 50 } }, { metros: 50 }), true);
});

test('onde a modificação cabe: o encaixe, a mesma duas vezes, uma de ataque, um defeito e os slots', () => {
  assert.deepEqual(M.modCabe(rifle, [], mira), { cabe: true, motivo: '' });
  assert.equal(M.modCabe(faca, [], mira).motivo, 'esta modificação só serve em arma de longo alcance');
  assert.equal(M.modCabe(rifle, [], { ...grife, id: 'guarda', encaixe: { aDistancia: false } }).motivo, 'esta modificação só serve em arma branca');
  assert.equal(M.modCabe(rifle, [], { ...grife, id: 'cano-serrado', encaixe: { tipos: ['shotgun'] } }).motivo, 'esta modificação não serve neste tipo de arma');
  assert.equal(M.modCabe(rifle, [grife], grife).motivo, 'a arma já tem esta modificação');
  assert.equal(M.modCabe(rifle, [mira], compensador).motivo, 'só cabe uma modificação de ataque por arma');
  assert.equal(M.modCabe(rifle, [gatilho], descalibrada).motivo, 'só cabe um defeito por arma');
  assert.equal(M.modCabe(rifle, [mira, grife], pente).motivo, 'não há slot de modificação livre (a arma tem 2)');
  // O defeito dá o slot que faltava; na exótica, de 1 para 2.
  assert.equal(M.modCabe(rifle, [mira, grife, gatilho], pente).cabe, true);
  assert.equal(M.modCabe(rifle, [mira, grife, pente], gatilho).cabe, true);
  assert.equal(M.modCabe(exotica, [mira], pente).motivo, 'não há slot de modificação livre (a arma tem 1)');
  assert.equal(M.modCabe(exotica, [mira, descalibrada], pente).cabe, true);
  assert.equal(M.modCabe(ruim, [mira], grife).motivo, 'não há slot de modificação livre (a arma tem 1)');
  assert.match(M.modCabe(rifle, [], { ...mira, efeitos: [{ ...mira.efeitos[0], quando: undefined }] }).motivo, /bônus fixo/);
});

test('o que entra no ataque e no dano, o que muda a arma e o teto de +3', () => {
  // A mira: ligada a 30 m no tiro, fora a 60 m e no autofogo, desligada sem a distância. O defeito sem condição é parte fixa.
  assert.deepEqual(M.efeitosDoAtaque([mira, torta], { modo: 'tiro', metros: 30 }), {
    partes: [{ rotulo: 'Coronha torta: sempre', valor: -1 }],
    situacionais: [{ id: 'mira-medio-alcance#0', rotulo: 'Mira de médio alcance: tiro único ou mirado de 13 a 50 m', valor: 1, ligado: true }]
  });
  assert.deepEqual(M.efeitosDoAtaque([mira], { modo: 'tiro', metros: 60 }), { partes: [], situacionais: [] });
  assert.deepEqual(M.efeitosDoAtaque([mira, compensador], { modo: 'autofogo', metros: 30 }).situacionais.map(s => [s.rotulo, s.ligado]), [['Compensador: autofogo', true]]);
  assert.deepEqual(M.efeitosDoAtaque([mira], { modo: 'tiro' }).situacionais.map(s => s.ligado), [false]);
  // O que só quem joga sabe: desligado (ou como a modificação diz); o defeito do estranho: fora na mão do dono.
  assert.deepEqual(M.efeitosDoAtaque([lanterna], {}).situacionais.map(s => [s.valor, s.ligado]), [[1, false]]);
  assert.deepEqual(M.efeitosDoAtaque([{ ...lanterna, efeitos: [{ ...lanterna.efeitos[0], ligadoPorPadrao: true }] }], {}).situacionais.map(s => s.ligado), [true]);
  assert.deepEqual(M.efeitosDoAtaque([descalibrada], { dono: true }), { partes: [], situacionais: [] });
  assert.deepEqual(M.efeitosDoAtaque([descalibrada], { dono: false }).situacionais.map(s => [s.valor, s.ligado]), [[-2, true]]);
  // A mesma modificação duas vezes não soma; no mesmo grupo, só o maior.
  assert.equal(M.efeitosDoAtaque([mira, mira], { modo: 'tiro', metros: 30 }).situacionais.length, 1);
  const outraMira = { ...mira, id: 'outra-mira', efeitos: [{ ...mira.efeitos[0], entao: [{ alvo: 'ataque', valor: 1 }, { alvo: 'ataque', valor: -3 }] }] };
  for (const ordem of [[outraMira, mira], [mira, outraMira]]) assert.deepEqual(M.efeitosDoAtaque(ordem, { modo: 'tiro', metros: 30 }).situacionais.map(s => s.id), ['mira-medio-alcance#0']);
  // O dano a mais: contra a cobertura, sim; contra gente, não; sem saber o alvo, desligado.
  assert.deepEqual(M.efeitosDoDano([cano, cano], { alvo: 'cobertura' }), [{ rotulo: 'Cano de alta pressão: contra cobertura e objetos', dados: '1d6', ligado: true }]);
  assert.deepEqual(M.efeitosDoDano([cano], { alvo: 'pessoa' }), []);
  assert.deepEqual(M.efeitosDoDano([cano], {}).map(d => d.ligado), [false]);
  // O que muda a arma de vez: o pente soma, o "não se esconde" ganha, o maior emperra.
  assert.deepEqual(M.derivadosDaArma([]), { pente: 0, ocultavel: null, emperraAte: null });
  assert.deepEqual(M.derivadosDaArma([pente, pente, compensador, gatilho, { ...grife, id: 'esconde', efeitos: [{ rotulo: 'se esconde', entao: [{ alvo: 'ocultavel', valor: true }] }] }]), { pente: 2, ocultavel: false, emperraAte: 2 });
  // O teto: +3 da arma passa; o +4 perde 1; as penalidades não contam.
  assert.equal(M.parteDoTeto([1, 1, 1]), null);
  assert.deepEqual(M.parteDoTeto([1, 1, 1, 1]), { rotulo: 'Teto da arma (+3)', valor: -1 });
  assert.deepEqual(M.parteDoTeto([2, 1, 1, -2, '1']), { rotulo: 'Teto da arma (+3)', valor: -2 });
  assert.equal(M.parteDoTeto([]), null);
});

test('C67: a exótica que a arma diz (as de 2077), o defeito que emperra e o efeito numa linha da ficha', () => {
  // A de 2077 com 1 slot de acessório não é exótica (a flag diz): 2 slots de modificação; a exótica, 1; sem a flag, pelos slots.
  assert.deepEqual([M.slotsDeModificacao({ ...exotica, exotica: false }), M.slotsDeModificacao({ ...rifle, exotica: true }), M.slotsDeModificacao({ ...exotica, exotica: null })], [2, 1, 1]);
  assert.equal(M.slotsDeModificacao({ ...exotica, exotica: false, qualidade: 'poor' }), 1);
  // O gatilho sensível: o 1 e o 2 emperram; o 3 e o 10, não; sem o defeito, nada.
  assert.deepEqual([1, 2, 3, 10].map(natural => M.emperraPelaMod(natural, 2)), [true, true, false, false]);
  assert.deepEqual([M.emperraPelaMod(1, null), M.emperraPelaMod(null, 2), M.emperraPelaMod(0, 2)], [false, false, false]);
  assert.deepEqual([mira, compensador, cano, gatilho, descalibrada, pente].flatMap(mod => mod.efeitos.map(M.descreverEfeito)), [
    '+1 no ataque (tiro único ou mirado de 13 a 50 m)', '+1 no ataque (autofogo)', 'a arma não se esconde (não se esconde)', '+1d6 no dano (contra cobertura e objetos)',
    'emperra no 1 e no 2 (emperra no 1 e no 2)', '−2 no ataque (na mão de quem não é o dono)', '+2 no pente (mais balas)'
  ]);
  assert.equal(M.descreverEfeito({ rotulo: 'x', entao: [{ alvo: 'emperraAte', valor: 3 }, { alvo: 'ocultavel', valor: true }] }), 'emperra no 1, no 2 e no 3, a arma se esconde (x)');
});
