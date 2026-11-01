// Testes de referência do andar do token dinâmico (o C52; pedido do usuário, 2026-11-01: "a animação dele andando é muito
// rápida [...] para que seja mais fluido e dê para ver realmente o token se movendo e trocando a animação"), sem Foundry:
// o ritmo (o Foundry 14 anima o movimento a 6 casas por segundo, client/config.mjs, CONFIG.Token.movement.defaultSpeed),
// os passos pela distância andada, o quadro de cada passo e o balanço.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BALANCO_DO_PASSO, balancoDoPasso, imagemDoAndar, imagemDoToken, modoDosPassos, PASSOS, PASSOS_POR_CASA, passoDoAndar, VELOCIDADE_DO_ANDAR, velocidadeDoAndar
} from '../../foundry-sistema/scripts/regras-token-dinamico.mjs';

const conjunto = imagens => ({ ativo: true, angulos: { inicio: 0, sentido: 'horario' }, imagens });
// A folha da Ana: o Parado nas 4 direções retas, o Caminhando a 90 e a 180, o Mirando a 270.
const ana = conjunto({
  'parado-0': 'parado-0.webp', 'parado-90': 'parado-90.webp', 'parado-180': 'parado-180.webp', 'parado-270': 'parado-270.webp',
  'caminhando-90': 'caminhando-90.webp', 'caminhando-180': 'caminhando-180.webp', 'mirando-270': 'mirando-270.webp', 'ferido-leve': 'ferido-leve.webp'
});

test('Andar: o ritmo é a metade dos 6 do Foundry por padrão, entre 1 e 12 casas por segundo', () => {
  assert.equal(VELOCIDADE_DO_ANDAR.padrao, 3);
  assert.equal(velocidadeDoAndar(undefined), 3);
  assert.equal(velocidadeDoAndar('lento'), 3);
  assert.equal(velocidadeDoAndar(0), 3);
  assert.equal(velocidadeDoAndar(-2), 3);
  assert.equal(velocidadeDoAndar(2.5), 2.5);
  assert.equal(velocidadeDoAndar(0.5), 1);
  assert.equal(velocidadeDoAndar(40), 12);
  assert.equal(velocidadeDoAndar('6'), 6);
});

test('Andar: um passo a cada meia casa andada, desde o começo do movimento', () => {
  assert.equal(PASSOS_POR_CASA, 2);
  assert.deepEqual([0, 0.25, 0.49, 0.5, 0.99, 1, 1.5, 3].map(passoDoAndar), [0, 0, 0, 1, 1, 2, 3, 6]);
  assert.equal(passoDoAndar(undefined), 0);
  assert.equal(passoDoAndar(-1), 0);
  // A soma das distâncias de cada quadro (0.1 + 0.2 + 0.2 = 0.5) não pode perder o passo por arredondamento.
  assert.equal(passoDoAndar(0.1 + 0.2 + 0.2), 1);
});

test('Andar: com os passos alternados, o Caminhando nos passos pares e o Parado da mesma direção nos ímpares', () => {
  const quadro = (casas, rotacao = 90, estado = {}, modo = 'alternar') => imagemDoAndar(ana, estado, rotacao, casas, modo)?.src;
  assert.deepEqual([0, 0.3, 0.5, 0.8, 1, 1.6].map(casas => quadro(casas)), ['caminhando-90.webp', 'caminhando-90.webp', 'parado-90.webp', 'parado-90.webp', 'caminhando-90.webp', 'parado-90.webp']);
  assert.equal(quadro(0.5, 180), 'parado-180.webp');
  // Ferido, andando: a direção manda (o Caminhando), e o passo alterna com o Parado, não com a pose de ferido.
  assert.equal(quadro(0, 90, { ferimento: 'leve' }), 'caminhando-90.webp');
  assert.equal(quadro(0.5, 90, { ferimento: 'leve' }), 'parado-90.webp');
  // Só o Caminhando: como antes do C52 (o quadro do estado andando, sem alternar).
  assert.equal(quadro(0.5, 90, {}, 'caminhando'), 'caminhando-90.webp');
  for (const casas of [0, 0.5, 1.5]) assert.deepEqual(imagemDoAndar(ana, {}, 180, casas, 'caminhando'), imagemDoToken(ana, { andando: true }, 180));
});

test('Andar: armado, o Mirando não alterna; sem o Caminhando da direção, o mais perto; sem nenhum, o Parado fica', () => {
  assert.deepEqual([0, 0.5, 1].map(casas => imagemDoAndar(ana, { armado: true }, 270, casas)?.src), ['mirando-270.webp', 'mirando-270.webp', 'mirando-270.webp']);
  // A 135 não há Caminhando: o de 90 e o de 180 estão a 45°, e o empate vai para o sentido horário, o de 180. O passo
  // ímpar é o Parado dessa direção (a do Caminhando desenhado), e não o da direção do giro.
  const a135 = imagemDoToken(ana, { andando: true }, 135);
  assert.equal(a135.src, 'caminhando-180.webp');
  assert.equal(imagemDoAndar(ana, {}, 135, 0)?.src, 'caminhando-180.webp');
  assert.equal(imagemDoAndar(ana, {}, 135, 0.5)?.src, 'parado-180.webp', 'o Parado da direção do Caminhando desenhado');
  // Só o Caminhando a 90, andando para cima (180): o passo ímpar é o Parado a 90 (o do quadro desenhado, para a figura não
  // virar de um passo para o outro), e não o Parado a 180, que é o do giro.
  const soNoventa = conjunto({ 'caminhando-90': 'caminhando-90.webp', 'parado-90': 'parado-90.webp', 'parado-180': 'parado-180.webp' });
  assert.deepEqual([0, 0.5].map(casas => imagemDoAndar(soNoventa, {}, 180, casas)?.src), ['caminhando-90.webp', 'parado-90.webp']);
  // Sem nenhum Caminhando, o andar já cai no Parado: não há o que alternar.
  const semCaminhando = conjunto({ 'parado-0': 'parado-0.webp', 'parado-90': 'parado-90.webp' });
  assert.deepEqual([0, 0.5].map(casas => imagemDoAndar(semCaminhando, {}, 90, casas)?.src), ['parado-90.webp', 'parado-90.webp']);
  // Caído ou incapacitado, a pose deles, sem alternar.
  assert.equal(imagemDoAndar(conjunto({ ...ana.imagens, incapacitado: 'incapacitado.webp' }), { ferimento: 'mortal' }, 90, 0.5)?.src, 'incapacitado.webp');
  // O Caminhando sem o Parado em nenhuma direção: fica o Caminhando.
  assert.equal(imagemDoAndar(conjunto({ 'caminhando-90': 'caminhando-90.webp' }), {}, 90, 0.5)?.src, 'caminhando-90.webp');
  assert.equal(imagemDoAndar(conjunto({}), {}, 90, 0.5), null);
});

test('Andar: os modos dos passos (o padrão alterna) e o balanço, um arco por passo, até 4% da altura', () => {
  assert.deepEqual(Object.keys(PASSOS), ['alternar', 'caminhando']);
  assert.equal(modoDosPassos('caminhando'), 'caminhando');
  assert.equal(modoDosPassos('outro'), 'alternar');
  assert.equal(modoDosPassos(undefined), 'alternar');
  assert.equal(BALANCO_DO_PASSO, 0.04);
  const perto = (a, b) => Math.abs(a - b) < 1e-9;
  // Token de 100 px: 0 no começo e no fim de cada passo (a cada meia casa), 4 px no meio dele.
  assert.ok(perto(balancoDoPasso(0, 100), 0));
  assert.ok(perto(balancoDoPasso(0.25, 100), 4));
  assert.ok(perto(balancoDoPasso(0.5, 100), 0));
  assert.ok(perto(balancoDoPasso(0.75, 100), 4));
  assert.ok(perto(balancoDoPasso(0.125, 200), 8 * Math.sin(Math.PI / 4)));
  for (let casas = 0; casas < 3; casas += 0.05) assert.ok(balancoDoPasso(casas, 100) >= 0 && balancoDoPasso(casas, 100) <= 4 + 1e-9, String(casas));
  assert.equal(balancoDoPasso(0.25, undefined), 0);
  assert.equal(balancoDoPasso(0.25, -100), 0);
});
