// As modificações de armas (o C66): as contas do regras-modificacoes.mjs, com as decisões do usuário de 2026-11-23 como
// fonte (o ROADMAP, "As modificações de armas": a regra da casa, os slots próprios, a modificação permanente e o teto).
// A lista das modificações e a página da wiki vêm no C68; as daqui são as da proposta aprovada, para testar as contas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';
import { CATEGORIA_DAS_MODS, modsNaLoja } from '../../loja-do-14.mjs';

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
  assert.deepEqual(M.derivadosDaArma([]), { pente: 0, ocultavel: null, emperraAte: null, instavel: false });
  assert.deepEqual(M.derivadosDaArma([pente, pente, compensador, gatilho, { ...grife, id: 'esconde', efeitos: [{ rotulo: 'se esconde', entao: [{ alvo: 'ocultavel', valor: true }] }] }]), { pente: 2, ocultavel: false, emperraAte: 2, instavel: false });
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

// O C68: a lista da wiki (system-modificacoes.js, a fonte única) é a proposta que o usuário aprovou em 2026-11-23 ("Aprovo":
// as 26), e o catálogo do 14 e a loja batem com ela.
const lerDaRaiz = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const daWiki = (arquivo, chave) => {
  const contexto = { window: {} };
  vm.runInNewContext(lerDaRaiz(arquivo), contexto);
  return JSON.parse(JSON.stringify(contexto.window[chave], (_, valor) => (typeof valor === 'function' ? undefined : valor)));
};

test('C68: as 26 modificações da wiki (a proposta aprovada), cada uma válida, com o preço da categoria e onde ela serve', () => {
  const contexto = { window: {} };
  vm.runInNewContext(lerDaRaiz('system-modificacoes.js'), contexto);
  const wiki = contexto.window.systemModificacoes;
  const mods = JSON.parse(JSON.stringify(wiki.data.mods));
  assert.equal(mods.length, 26);
  assert.match(roadmap, /A lista inicial das modificações foi aprovada pelo usuário em 2026-11-23/, 'o ROADMAP guarda a aprovação da lista');
  const porGrupo = grupo => mods.filter(mod => mod.grupo === grupo).map(mod => mod.nome);
  assert.deepEqual(porGrupo('situacional'), ['Mira holográfica', 'Mira de médio alcance', 'Compensador', 'Bipé', 'Cano de alta pressão', 'Lanterna tática', 'Defletor de ricochete', 'Guarda de punho']);
  assert.deepEqual(porGrupo('geral'), ['Correia de retenção', 'Pente de troca rápida', 'Supressor', 'Cabo balanceado', 'Carga silenciosa', 'Trava biométrica', 'Cano de troca']);
  assert.deepEqual(porGrupo('sabor'), ['Coronha oca', 'Acabamento de grife', 'Marca de gangue ou de lenda', 'Nome gravado', 'Afinação pessoal']);
  assert.deepEqual(porGrupo('defeito'), ['Gatilho sensível', 'Mira descalibrada para estranhos', 'Coice brutal', 'Superaquece', 'Barulhenta e chamativa', 'Cano serrado']);
  assert.equal(new Set(mods.map(mod => mod.id)).size, 26);
  for (const mod of mods) {
    const regra = JSON.parse(JSON.stringify(wiki.regra(mod)));
    assert.equal(M.validarMod(regra), '', mod.nome);
    if (mod.grupo === 'defeito') { assert.equal(mod.eb, 0, mod.nome); assert.equal(regra.tamanho, 0, mod.nome); continue; }
    assert.equal(regra.tamanho, 1, mod.nome);
    assert.ok([50, 100, 500].includes(mod.eb), `${mod.nome}: ${mod.eb}eb`);
  }
  const preco = Object.fromEntries(mods.map(mod => [mod.id, mod.eb]));
  assert.deepEqual([preco['mira-holografica'], preco['compensador'], preco['lanterna-tatica'], preco['supressor'], preco['nome-gravado'], preco['acabamento-de-grife']], [100, 500, 50, 500, 50, 100]);
  // As de ataque: só +1, numa situação (a mira, o compensador, o bipé); os defeitos que tiram.
  const deAtaque = mods.filter(mod => M.ehDeAtaque(wiki.regra(mod))).map(mod => mod.id);
  assert.deepEqual(deAtaque, ['mira-holografica', 'mira-medio-alcance', 'compensador', 'bipe']);
  const contexto12 = { modo: 'tiro', metros: 10 };
  const holo = M.efeitosDoAtaque([JSON.parse(JSON.stringify(wiki.regra(mods[0])))], contexto12);
  assert.deepEqual(holo.situacionais.map(s => [s.valor, s.ligado]), [[1, true]]);
  assert.deepEqual(M.efeitosDoAtaque([JSON.parse(JSON.stringify(wiki.regra(mods[0])))], { modo: 'tiro', metros: 13 }).situacionais, []);
  const serrado = JSON.parse(JSON.stringify(wiki.regra(mods.find(mod => mod.id === 'cano-serrado'))));
  assert.deepEqual(M.derivadosDaArma([serrado]), { pente: 0, ocultavel: true, emperraAte: null, instavel: false });
  assert.deepEqual(M.efeitosDoAtaque([serrado], { modo: 'cartucho', metros: 30 }).situacionais.map(s => s.valor), [-2]);
  // Onde serve: a classe do Kit (o defletor só na Power, a carga silenciosa só na Tech), o tipo (o cano serrado na espingarda).
  const regraDe = id => JSON.parse(JSON.stringify(wiki.regra(mods.find(mod => mod.id === id))));
  assert.deepEqual(M.modCabe({ ...rifle, classe: null }, [], regraDe('defletor-de-ricochete')), { cabe: false, motivo: 'esta modificação só serve em arma Power' });
  assert.equal(M.modCabe({ ...rifle, classe: 'power' }, [], regraDe('defletor-de-ricochete')).cabe, true);
  assert.equal(M.modCabe({ ...rifle, classe: 'power' }, [], regraDe('carga-silenciosa')).motivo, 'esta modificação só serve em arma Tech');
  assert.equal(M.modCabe({ ...rifle, tipo: 'shotgun' }, [], regraDe('cano-serrado')).cabe, true);
  assert.equal(M.modCabe(rifle, [], regraDe('cano-serrado')).cabe, false);
  assert.equal(M.validarMod({ ...regraDe('carga-silenciosa'), encaixe: { classe: 'laser' } }), 'o encaixe é { aDistancia, tipos, classe }');
  assert.deepEqual(['defletor-de-ricochete', 'carga-silenciosa', 'cano-serrado', 'cabo-balanceado', 'guarda-de-punho'].map(id => wiki.serveEm(mods.find(mod => mod.id === id))),
    ['arma Power', 'arma Tech', 'espingarda', 'branca leve ou branca média', 'arma branca']);
  // A página: a regra da casa declarada, a Invention Expertise, a tabela de 1d6 dos defeitos e o botão do sorteio.
  const html = wiki.pages.modsArmas.html.replace(/\s+/g, ' ');
  assert.match(html, /Regra da casa\.<\/b> Isto não está no RED nem no Mission Kit/);
  assert.match(html, /Invention Expertise/);
  assert.match(html, /<b>sorteado<\/b>, nunca escolhido/);
  assert.match(html, /<b>6<\/b><\/td><td>Cano serrado/);
  assert.match(html, /data-mods-defeito/);
  assert.match(html, /só conta história/);
});

test('C68: o catálogo do 14 e a loja da wiki com as modificações (os defeitos no catálogo, fora da loja), e a página no menu', () => {
  const wiki = daWiki('system-modificacoes.js', 'systemModificacoes');
  const contexto = { window: {} };
  vm.runInNewContext(lerDaRaiz('system-modificacoes.js'), contexto);
  const regra = mod => JSON.parse(JSON.stringify(contexto.window.systemModificacoes.regra(mod)));
  const catalogo = JSON.parse(lerDaRaiz('foundry-sistema/dados/catalogo.json')).itens;
  for (const mod of wiki.data.mods) {
    const item = catalogo[`mods-armas:${mod.id}`];
    assert.ok(item, mod.nome);
    assert.equal(item.type, 'upgrade');
    assert.equal(item.name, mod.nome);
    assert.equal(item.system.alvo, 'arma');
    assert.equal(item.system.preco, mod.eb);
    assert.deepEqual(item.flags['cpr-fieldbook'].mod, regra(mod));
    assert.match(item.system.descricao, /Permanente: não sai da arma/);
  }
  assert.equal(Object.keys(catalogo).filter(id => id.startsWith('mods-armas:')).length, 26);
  const loja = daWiki('loja-catalogo.js', 'shopCatalog');
  const daLoja = loja.itens.filter(item => item.cat === CATEGORIA_DAS_MODS.id);
  assert.equal(daLoja.length, 20);
  assert.ok(loja.categorias.some(categoria => categoria.id === 'modificacoes' && categoria.nome === 'Modificações de arma'));
  assert.ok(daLoja.every(item => item.preco === catalogo[item.id].system.preco && !item.acessorio && item.modificacao.tamanho === 1));
  assert.equal(daLoja.find(item => item.id === 'mods-armas:cano-serrado'), undefined, 'o defeito não se vende');
  assert.equal(daLoja.find(item => item.id === 'mods-armas:supressor').resumo, '1 slot de modificação · arma de longo alcance');
  // O loja-do-14 refaz a categoria e os itens: rodar de novo não duplica.
  const outra = structuredClone(loja);
  assert.equal(modsNaLoja(outra, { itens: catalogo }, contexto.window.systemModificacoes), 20);
  assert.equal(outra.itens.length, loja.itens.length);
  assert.equal(outra.categorias.filter(categoria => categoria.id === 'modificacoes').length, 1);
  // A página na wiki: o script nas duas wikis, a página no menu e no conteúdo, e o arquivo guardado na instalação.
  for (const pagina of ['index.html', 'jogadores.html']) assert.match(lerDaRaiz(pagina), /<script src="system-modificacoes\.js"><\/script>/, pagina);
  const app = lerDaRaiz('wiki-app.js');
  assert.match(app, /\{ id: 'modsArmas', label: 'Modificações de armas', icon: 'MA' \}/);
  assert.match(app, /\(window\.systemModificacoes \|\| \{\}\)\.pages/);
  assert.match(lerDaRaiz('arquivos-publicos.js'), /'\/system-modificacoes\.js'/);
});

test('instalar uma modificação exige Role Tech ou mestre', () => {
  assert.equal(M.podeInstalarModificacao({ roles: ['Solo'] }), false);
  assert.equal(M.podeInstalarModificacao({ roles: ['TECH'] }), true);
  assert.equal(M.podeInstalarModificacao({ roles: ['Solo', 'Técnico'] }), true);
  assert.equal(M.podeInstalarModificacao({ mestre: true, roles: [] }), true);
});
