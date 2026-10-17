// Testes de referência do Jack In no Neuroport (foundry-sistema/scripts/regras.mjs: alcanceDoJackIn e percebeuOJackIn; e
// a parede que barra a visão, netrun/regras-da-net.mjs), sem Foundry. A wiki ("Quickhacks no Neuroport", Kit p. 16–17 e
// 26–27, e "Do que o netrunner precisa").
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  acoesNetNaRodada, alcanceDoJackIn, bloqueioDoAlvo, DV_DO_PASSWALL, EFEITOS_DE_QUICKHACK, expulsou, fazOQuickhack, JACK_IN, JACK_OUT_INSEGURO, jaFezOQuickhack, passouOPasswall,
  passouOQuickhack, passwallsDoAlvo, percebeuOJackIn, sabeDoJackIn, semAcaoNet
} from '../../foundry-sistema/scripts/regras.mjs';
import { barra, paredeNoMeio } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');

test('o Jack In pela wiki: Interface + 1d10 contra a WILL + 1d10 do alvo; falhando, entra, mas o alvo percebe; o empate é do alvo', () => {
  assert.ok(wiki.includes('<b>Jack In:</b> entra no Neuroport de um alvo à vista, no alcance: Interface + 1d10 contra WILL + 1d10 do alvo. Falhando, você entra assim mesmo, mas o alvo percebe.'));
  assert.equal(percebeuOJackIn(11, 7), false);
  assert.equal(percebeuOJackIn(7, 7), true);
  assert.equal(percebeuOJackIn(6, 9), true);
  assert.equal(percebeuOJackIn('12', '11'), false);
});

test('a expulsão pela wiki: quem percebeu rola WILL + Concentração + 1d10 contra a Interface + 1d10 do netrunner; o empate é do netrunner (o defensor); o alvo netrunner sempre sabe do Jack In', () => {
  assert.ok(wiki.includes('<b>Expulsar:</b> o alvo que percebe (um quickhack que deu certo alerta, menos o Lure) tenta te expulsar com uma Ação: WILL + Concentração + 1d10 contra a sua Interface + 1d10. Outro netrunner sempre sabe quando entraram no Neuroport dele.'));
  assert.ok(wiki.includes('Teste contra outra pessoa: empate = <b>defensor vence'));
  assert.equal(expulsou(12, 11), true);
  assert.equal(expulsou(11, 11), false);
  assert.equal(expulsou(8, 13), false);
  assert.equal(expulsou('14', '9'), true);
  assert.deepEqual([0, 1, 4, '2', undefined].map(sabeDoJackIn), [false, true, true, true, false]);
});

test('as Ações NET fora da arquitetura (cada Neuroport é uma; em combate, as do Rank por rodada) e o Jack Out inseguro (60 minutos sem entrar de novo naquele alvo)', () => {
  assert.ok(wiki.includes('Cada Neuroport é uma Ação NET, e dá para ficar ligado em quantos quiser.'));
  assert.ok(wiki.includes('Você fica ligado até ser expulso, sair do alcance, fazer o Jack Out ou o alvo morrer. Desligado de qualquer jeito que não o Jack Out, é um <b>Jack Out inseguro</b>, com as consequências de sempre, e você só entra de novo nesse alvo em 60 minutos.'));
  const agora = { combate: 'c1', rodada: 3 };
  assert.equal(acoesNetNaRodada({ combate: 'c1', rodada: 3, usadas: 2 }, agora), 2);
  assert.equal(acoesNetNaRodada({ combate: 'c1', rodada: 2, usadas: 2 }, agora), 0);
  assert.equal(acoesNetNaRodada({ combate: 'c0', rodada: 3, usadas: 2 }, agora), 0);
  assert.equal(acoesNetNaRodada(null, agora), 0);
  assert.equal(acoesNetNaRodada({ combate: 'c1', rodada: 3, usadas: 2 }, null), 0);
  assert.equal(semAcaoNet({ combate: 'c1', rodada: 3, usadas: 1 }, agora, 2), false);
  assert.equal(semAcaoNet({ combate: 'c1', rodada: 3, usadas: 2 }, agora, 2), true);
  assert.equal(semAcaoNet({ combate: 'c1', rodada: 2, usadas: 2 }, agora, 2), false);
  // Fora de combate, não contam.
  assert.equal(semAcaoNet({ combate: 'c1', rodada: 3, usadas: 9 }, null, 2), false);
  assert.deepEqual(JACK_OUT_INSEGURO, { segundos: 3600 });
  const bloqueios = [{ alvo: 'A', ate: 4600 }, { alvo: 'B', ate: 900 }];
  assert.equal(bloqueioDoAlvo(bloqueios, 'A', 1000)?.ate, 4600);
  assert.equal(bloqueioDoAlvo(bloqueios, 'A', 4600), null);
  assert.equal(bloqueioDoAlvo(bloqueios, 'B', 1000), null);
  assert.equal(bloqueioDoAlvo(bloqueios, 'C', 0), null);
  assert.equal(bloqueioDoAlvo(undefined, 'A', 0), null);
});

test('o alcance do Jack In com o deck externo: 6 m, 8 m com o Range Upgrade', () => {
  assert.ok(wiki.includes('<b>Deck externo:</b> a até <b>6 m</b> do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade).'));
  assert.deepEqual(JACK_IN, { alcance: 6, rangeUpgrade: 2 });
  assert.equal(alcanceDoJackIn(), 6);
  assert.equal(alcanceDoJackIn({ rangeUpgrade: true }), 8);
});

test('"à vista": a parede que barra a visão para o Jack In; a janela (barra o movimento, não a visão) deixa', () => {
  const janela = { c: [50, -50, 50, 50], move: 20, sight: 0, door: 0, ds: 0 };
  const muro = { ...janela, sight: 20 };
  const de = { x: 0, y: 0 };
  const para = { x: 100, y: 0 };
  assert.equal(barra(janela, 'sight'), false);
  assert.equal(barra(janela), true);
  assert.equal(paredeNoMeio([janela], de, para, 'sight'), false);
  assert.equal(paredeNoMeio([janela], de, para), true);
  assert.equal(paredeNoMeio([muro], de, para, 'sight'), true);
  // A porta aberta deixa ver.
  assert.equal(paredeNoMeio([{ ...muro, door: 1, ds: 1 }], de, para, 'sight'), false);
});

test('os Passwalls do Self-ICE (wiki: o Breach e o Self-ICE): um por Self-ICE, até 3; a DV de todos é 6, 8 ou 10; passa quem tira mais que a DV', () => {
  assert.ok(wiki.includes('<b>Breach:</b> passa um <b>Passwall</b> (um por Self-ICE do alvo), Interface contra a DV dele: 6 com um Self-ICE, 8 com dois, 10 com três.'));
  const wiki2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(wiki2077.includes('Cada instalação (até 3) põe um <b>Passwall</b> no seu Neuroport: quem tenta hackear você gasta uma Ação NET para passar por cada um (Breach). A DV de todos os Passwalls sobe com o número de Self-ICE: <b>DV6</b> com um, <b>DV8</b> com dois e <b>DV10</b> com três.'));
  assert.deepEqual(DV_DO_PASSWALL, { 1: 6, 2: 8, 3: 10 });
  assert.deepEqual([0, 1, 2, 3, 4, -1, '2'].map(passwallsDoAlvo), [
    { quantos: 0, dv: null }, { quantos: 1, dv: 6 }, { quantos: 2, dv: 8 }, { quantos: 3, dv: 10 }, { quantos: 3, dv: 10 }, { quantos: 0, dv: null }, { quantos: 2, dv: 8 }
  ]);
  assert.equal(passouOPasswall(8, 8), false);
  assert.equal(passouOPasswall(9, 8), true);
  assert.equal(passouOPasswall('7', 6), true);
});

test('o quickhack pela wiki: os do Rank do netrunner para baixo, contra a DV dele; um por alvo por rodada de combate (errado ou certo); fora de combate, sem a vez', () => {
  assert.ok(wiki.includes('<b>Quickhack:</b> depois de passar todos os Passwalls, Interface contra a DV do quickhack. <b>Um quickhack por alvo por turno</b>: errou o Puppet, não dá para tentar o Overheat no mesmo alvo nesse turno.'));
  assert.ok(wiki.includes('O Rank dá os níveis: DV6 no Rank 1, DV8 no 2, DV10 no 3 e DV12 no 4.'));
  assert.deepEqual([[4, 4], [3, 4], [1, 1], [10, 2], [0, 1], [4, 0]].map(([meu, dele]) => fazOQuickhack(meu, dele)), [true, false, true, true, false, false]);
  assert.equal(passouOQuickhack(10, 10), false);
  assert.equal(passouOQuickhack(11, 10), true);
  const agora = { combate: 'c1', rodada: 2 };
  assert.equal(jaFezOQuickhack({ combate: 'c1', rodada: 2 }, agora), true);
  assert.equal(jaFezOQuickhack({ combate: 'c1', rodada: 1 }, agora), false);
  assert.equal(jaFezOQuickhack({ combate: 'c0', rodada: 2 }, agora), false);
  assert.equal(jaFezOQuickhack(undefined, agora), false);
  assert.equal(jaFezOQuickhack(null, null), false);
  assert.equal(jaFezOQuickhack({ combate: null, rodada: null }, null), false);
});

test('os quickhacks no catálogo: os 16 da wiki (11 do Kit e 5 do suplemento), cada um com a DV e o Rank do cartão; não alertam o Lure e os que o cartão diz que não', () => {
  const contexto = { window: {} };
  for (const arquivo of ['system-catalog.js', 'system-rules.js', 'system-net.js']) vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  const cartoes = [...contexto.window.systemNet.data.quickhacks.kit, ...contexto.window.systemNet.data.quickhacks.fa];
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;
  const quickhacks = Object.values(catalogo).filter(item => item.system?.classe === 'quickhack');
  assert.equal(cartoes.length, 16);
  assert.equal(quickhacks.length, 16);
  for (const cartao of cartoes) {
    const item = quickhacks.find(q => q.name === cartao.name);
    assert.ok(item, cartao.name);
    assert.deepEqual([item.flags['cpr-fieldbook'].quickhack.dv, item.flags['cpr-fieldbook'].quickhack.rank], [cartao.raw.dv, cartao.raw.rank], cartao.name);
  }
  assert.deepEqual(quickhacks.filter(q => !q.flags['cpr-fieldbook'].quickhack.alerta).map(q => q.name).sort(), ['Lure', 'Memory Wipe', 'Request Backup']);
  // O nível pelo Rank: DV6 no Rank 1, DV8 no 2, DV10 no 3, DV12 no 4.
  for (const q of quickhacks) assert.equal(q.flags['cpr-fieldbook'].quickhack.dv, { 1: 6, 2: 8, 3: 10, 4: 12 }[q.flags['cpr-fieldbook'].quickhack.rank], q.name);
});

test('os efeitos que o sistema aplica, pelos cartões da wiki: o dano do Synapse Burnout, o fogo do Overheat, o MOVE do Impair Movement e do Slow, e o System Reset (60 segundos são 20 rodadas)', () => {
  const contexto = { window: {} };
  for (const arquivo of ['system-catalog.js', 'system-rules.js', 'system-net.js']) vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  const texto = nome => contexto.window.systemNet.data.quickhacks.kit.find(cartao => cartao.name === nome)?.text;
  assert.equal(texto('Synapse Burnout'), '<b>3d6 de dano direto no HP</b> do alvo. Passa pela armadura sem ablar.');
  assert.equal(texto('Overheat'), 'O alvo pega fogo: sofre <b>4 de dano direto no HP</b> no fim de cada turno dele, até apagar o fogo. O dano passa pela armadura sem ablar. Apagar é uma Ação (CDT 1), e só no turno do alvo.');
  assert.equal(texto('Impair Movement'), 'O MOVE do alvo cai <b>1</b> por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação de Movimento.');
  assert.equal(texto('Slow'), 'O MOVE do alvo cai <b>1d6</b> por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação de Movimento.');
  assert.equal(texto('System Reset'), 'O alvo cai <b>inconsciente</b> por 60 segundos (20 rodadas), ou até sofrer dano, e fica caído (Prone).');
  assert.deepEqual(EFEITOS_DE_QUICKHACK, {
    'synapse-burnout': { dano: '3d6' },
    overheat: { fogo: 4 },
    'impair-movement': { move: '1', rodadas: 20 },
    slow: { move: '1d6', rodadas: 20 },
    'system-reset': { inconsciente: true, caido: true, ateDano: true, rodadas: 20 }
  });
  // Cada um é um quickhack do catálogo (o id que o sistema procura).
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;
  for (const id of Object.keys(EFEITOS_DE_QUICKHACK)) assert.equal(catalogo[`netrunning-2077:${id}`]?.system?.classe, 'quickhack', id);
});
