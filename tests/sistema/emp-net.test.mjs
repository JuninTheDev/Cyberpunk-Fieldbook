import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { passwallsPassados } from '../../foundry-sistema/scripts/regras.mjs';
import { faltasPara, netrunnerDo, PORTA_DO_DECK } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

const item = (id, type, system, inoperante = false) => ({ id, type, system, inoperante });

test('EMP no Self-ICE: ao voltar, a ligação direta continua ignorando todos os Passwalls; a sem fio mantém só os passados', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes('Ligado direto, você ganha <b>uma Ação NET a mais</b> por turno e passa direto por todos os <b>Passwalls</b> (o Black ICE, não).'));
  const direta = { direta: true, passados: 0 }, semFio = { passados: 1 };
  assert.deepEqual([0, 1, 2, 3].map(quantos => passwallsPassados(direta, quantos)), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3].map(quantos => passwallsPassados(semFio, quantos)), [0, 1, 1, 1]);
  assert.equal(passwallsPassados({ direta: false, passados: 0 }, 1), 0);
  assert.equal(passwallsPassados(null, 2), 0);
  assert.deepEqual(direta, { direta: true, passados: 0 });
  assert.deepEqual(semFio, { passados: 1 });
});
const montar = () => ({ system: { rankDeInterface: 4 }, items: [
  item('deck', 'cyberdeck', { uso: 'equipado' }),
  { ...item('alcance', 'upgrade', { instaladoEm: 'deck' }), name: 'Range Upgrade' },
  { ...item('isolamento', 'upgrade', { instaladoEm: 'deck' }), name: 'Insulated Wiring' },
  { ...item('barreira', 'upgrade', { instaladoEm: 'deck' }), name: 'KRASH Barrier' },
  item('sword', 'programa', { instaladoEm: 'deck', ativo: true }),
  item('armor', 'programa', { instaladoEm: 'deck', ativo: true })
] });
const resumo = ator => {
  const n = netrunnerDo(ator);
  return { deck: n.deck?.id ?? null, programas: n.programas.map(p => p.id), rank: n.rank, rangeUpgrade: n.rangeUpgrade, isolado: n.isolado, krash: n.krash };
};

// Wiki, system-catalog.js, EMP (p. 345): eletrônicos atingidos param por um minuto; a instalação e o uso permanecem.
test('EMP na NET: o cyberdeck inoperante deixa de oferecer os programas e o hardware sem perder o estado original', () => {
  const ator = montar();
  const operante = { deck: 'deck', programas: ['sword', 'armor'], rank: 4, rangeUpgrade: true, isolado: true, krash: true };
  assert.deepEqual(resumo(ator), operante);
  ator.items[0].inoperante = true;
  assert.deepEqual(resumo(ator), { deck: null, programas: [], rank: 4, rangeUpgrade: false, isolado: false, krash: false });
  assert.deepEqual(faltasPara({}, ator), ['um cyberdeck equipado']);
  assert.equal(ator.items[0].system.uso, 'equipado');
  assert.equal(ator.items.find(i => i.id === 'sword').system.ativo, true);
  ator.items[0].inoperante = false;
  assert.deepEqual(resumo(ator), operante);
});

test('EMP na NET: só o programa e o hardware inoperantes saem da oferta do deck operante', () => {
  const ator = montar();
  for (const id of ['alcance', 'isolamento', 'barreira', 'sword']) ator.items.find(i => i.id === id).inoperante = true;
  assert.deepEqual(resumo(ator), { deck: 'deck', programas: ['armor'], rank: 4, rangeUpgrade: false, isolado: false, krash: false });
  assert.deepEqual(faltasPara({}, ator), []);
});

test('EMP na NET: o deck encaixado na porta preserva a conexão física e o uso ao parar e ao voltar; o deck externo não depende da porta', () => {
  const ator = montar(), deck = ator.items.find(i => i.id === 'deck');
  const porta = { ...item('porta', 'cyberware', { instalado: true }), flags: { 'cpr-fieldbook': { catalogo: PORTA_DO_DECK } } };
  deck.flags = { 'cpr-fieldbook': { naPorta: true } };
  ator.items.push(porta);
  const encaixado = { deck: 'deck', programas: ['sword', 'armor'], rank: 4, rangeUpgrade: false, isolado: false, krash: false };
  assert.deepEqual(resumo(ator), encaixado);
  assert.equal(netrunnerDo(ator).naPorta, true);
  // O documento calcula a herança da porta (G4); a regra pura recebe o deck inoperante e mantém as flags.
  porta.inoperante = true;
  deck.inoperante = true;
  assert.deepEqual(resumo(ator), { deck: null, programas: [], rank: 4, rangeUpgrade: false, isolado: false, krash: false });
  assert.equal(netrunnerDo(ator).naPorta, false);
  assert.equal(deck.flags['cpr-fieldbook'].naPorta, true);
  assert.equal(deck.system.uso, 'equipado');
  assert.equal(porta.system.instalado, true);
  porta.inoperante = false;
  deck.inoperante = false;
  assert.deepEqual(resumo(ator), encaixado);
  assert.equal(netrunnerDo(ator).naPorta, true);
  porta.inoperante = true;
  deck.flags['cpr-fieldbook'].naPorta = false;
  assert.deepEqual(resumo(ator), { deck: 'deck', programas: ['sword', 'armor'], rank: 4, rangeUpgrade: true, isolado: true, krash: true });
  assert.equal(netrunnerDo(ator).naPorta, false);
});
