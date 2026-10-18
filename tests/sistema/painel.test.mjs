// Testes das contas do Painel Tático dentro do sistema (o C25; foundry-sistema/scripts/painel/logica.mjs), sem Foundry:
// os mesmos casos do teste do módulo painel-tatico da mesa do Foundry 12 (tests/cenarios/painel.js), com as fontes daqui,
// e o estado de ferimento do sistema nos estados do retrato.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import * as L from '../../foundry-sistema/scripts/painel/logica.mjs';
import { estadoDeFerimento } from '../../foundry-sistema/scripts/regras.mjs';

test('Painel Tático: a imagem de cada estado (a do estado mais leve quando falta), o efeito automático e o morto', () => {
  const imagens = { notWounded: 'ok.png', seriouslyWounded: 'grave.png', dead: 'morto.png' };
  assert.equal(L.imagemDoEstado(imagens, 'notWounded', 'ator.png').src, 'ok.png');
  assert.equal(L.imagemDoEstado(imagens, 'lightlyWounded', 'ator.png').src, 'ok.png', 'levemente usa a base');
  assert.equal(L.imagemDoEstado(imagens, 'mortallyWounded', 'ator.png').src, 'grave.png', 'mortal usa a grave');
  assert.equal(L.imagemDoEstado(imagens, 'dead', 'ator.png').propria, true);
  assert.equal(L.imagemDoEstado({}, 'seriouslyWounded', 'ator.png').src, 'ator.png', 'sem imagens: a do ator');
  assert.equal(L.efeitoDoRetrato({ estado: 'seriouslyWounded', propria: true }), '');
  assert.equal(L.efeitoDoRetrato({ estado: 'mortallyWounded', propria: false }), 'mortallyWounded');
  assert.equal(L.efeitoDoRetrato({ estado: 'dead', propria: true, modo: 'sempre' }), 'dead');
  assert.equal(L.efeitoDoRetrato({ estado: 'dead', propria: false, modo: 'nunca' }), '');
  assert.equal(L.estadoDoRetrato({ estado: 'seriouslyWounded', morto: true }), 'dead', 'derrotado é morto');
  assert.equal(L.estadoDoRetrato({ estado: 'invalidState' }), 'notWounded');
  assert.equal(L.modoDoRetrato(L.normalizarRetrato({})), 'moldura');
  assert.equal(L.modoDoRetrato(L.normalizarRetrato({ imagens: { dead: 'x.png' } })), 'livre');
  assert.equal(L.normalizarRetrato({ escala: 999 }).escala, 250);
});

test('Painel Tático: o estado de ferimento do sistema (regras.estadoDeFerimento, RED p. 186) nos estados do retrato', () => {
  const estado = (hp, max) => L.estadoDoRetrato({ estado: L.ESTADO_DO_FERIMENTO[estadoDeFerimento(hp, max).chave] });
  assert.deepEqual([[40, 40], [39, 40], [20, 40], [19, 40], [0, 40]].map(([hp, max]) => estado(hp, max)), ['notWounded', 'lightlyWounded', 'lightlyWounded', 'seriouslyWounded', 'mortallyWounded']);
  // Cada estado do sistema tem o seu, e os quatro são diferentes (o quinto, Morto, vem do derrotado).
  assert.deepEqual(Object.keys(L.ESTADO_DO_FERIMENTO).sort(), ['grave', 'ileso', 'leve', 'mortal']);
  assert.equal(new Set(Object.values(L.ESTADO_DO_FERIMENTO)).size, 4);
  assert.ok(Object.values(L.ESTADO_DO_FERIMENTO).every(e => L.ESTADOS.includes(e) && e !== 'dead'));
});

test('Painel Tático: estilo sempre válido, tema, código PT1 de ida e volta (sem a posição) e os botões de HP', () => {
  const e = L.normalizarEstilo({ acento: '#FF0000', escala: 999, secoes: ['armas', 'xx'], ocultos: ['sorte', 'nada'], posicao: 'livre', x: 40, y: 30, fonte: 'comic' });
  const codigo = L.codigoDoEstilo(e);
  const lido = L.lerCodigo(codigo, { posicao: 'base' });
  assert.equal(e.acento, '#ff0000');
  assert.equal(e.escala, 160);
  assert.equal(e.secoes.join(), 'armas,vitais,atributos,acoes');
  assert.equal(e.ocultos.join(), 'sorte');
  // As fontes do tema da ficha; a do CORE (a Tektur do Foundry 12) ou outra que não existe volta para a Rajdhani.
  assert.equal(e.fonte, 'rajdhani');
  assert.equal(L.normalizarEstilo({ fonte: 'tektur' }).fonte, 'rajdhani');
  assert.deepEqual(Object.keys(L.FONTES), ['rajdhani', 'shareTech', 'modesto', 'signika']);
  assert.equal(`${e.posicao} ${e.x} ${e.y}`, 'livre 40 30');
  assert.ok(codigo.startsWith('PT1:'));
  assert.equal(lido.acento, '#ff0000');
  assert.equal(lido.posicao, 'base');
  assert.throws(() => L.lerCodigo('PT1:isso-nao-e-um-codigo'), /não é válido/);
  assert.equal(L.aplicarTema(e, 'arasaka').acento, L.TEMAS.arasaka.acento);
  assert.equal(L.passosDeHp('-10, -1 +1 +10 0 abc 500').join(), '-10,-1,1,10');
  assert.equal(L.passosDeHp('').join(), '-5,-1,1,5');
  assert.equal(L.variaveisDoEstilo(e)['--pt-acento-rgb'], '255, 0, 0');
  assert.ok(L.classesDoEstilo(e).includes('pt-posicao-livre'));
  assert.deepEqual(L.dentroDaTela({ x: 5000, y: -50, largura: 800, altura: 150, telaL: 1400, telaA: 900 }), { x: 1340, y: 0 });
  // O estilo sem a posição (o código e o padrão da mesa).
  assert.deepEqual(Object.keys(L.semPosicao(e)).filter(chave => ['posicao', 'x', 'y', 'base'].includes(chave)), []);
});
