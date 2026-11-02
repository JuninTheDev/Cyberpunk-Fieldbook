// Testes de referência do encaixe da folha no molde (o C53; foundry-sistema/scripts/regras-encaixe.mjs), sem Foundry: o
// fundo liso que sai (o verde preso entre o braço e o corpo, a beirada sem o halo), as figuras inteiras com os pedaços perto,
// as linhas e as posições pela ordem, a escala pelo Parado, os pés na mesma linha e o meio da figura no meio do quadro, os
// avisos (o tamanho e o lado), o molde cinza e o prompt do ChatGPT.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { DISPOSICAO_PADRAO } from '../../foundry-sistema/scripts/regras-cortador.mjs';
import {
  avisosDoEncaixe, cinzaDoManequim, corDoFundo, encaixarFolha, escalaDaFolha, figurasDasManchas, manchas, meioDaFigura, moldeDaDisposicao,
  pixelsDaFigura, planoDoEncaixe, posicoesDasFiguras, promptDoChatGPT, tirarFundo
} from '../../foundry-sistema/scripts/regras-encaixe.mjs';

const VERDE = [0, 255, 0];
function imagem(largura, altura, fundo = null) {
  const pixels = new Uint8ClampedArray(largura * altura * 4);
  const pintar = (x, y, w, h, [r, g, b, a = 255]) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pixels.set([r, g, b, a], (j * largura + i) * 4);
  };
  if (fundo) pintar(0, 0, largura, altura, fundo);
  return { largura, altura, pixels, pintar, alfa: (x, y) => pixels[(y * largura + x) * 4 + 3], px: (x, y) => [...pixels.subarray((y * largura + x) * 4, (y * largura + x) * 4 + 4)] };
}

// Uma figura de pé: a cabeça 10 × 10 em cima do corpo 16 × 50 (60 de altura), com um braço 12 × 4 de um lado (a direção
// pela folha: 45, 90 e 135 para a esquerda; 225, 270 e 315 para a direita; 0 e 180 sem braço).
function dePe(img, x, y, cor, braco = null) {
  img.pintar(x + 3, y, 10, 10, cor);
  img.pintar(x, y + 10, 16, 50, cor);
  if (braco === 'esquerda') img.pintar(x - 12, y + 20, 12, 4, cor);
  if (braco === 'direita') img.pintar(x + 16, y + 20, 12, 4, cor);
}
const ladoDa = angulo => (angulo > 0 && angulo < 180 ? 'esquerda' : angulo > 180 ? 'direita' : null);

// A folha 800 × 400 (8 × 4, como a do usuário), como a IA faz: as figuras fora do lugar exato e o Parado passando da linha
// (os pés na célula de baixo, como na folha do Agente). As poses nas colunas 5 a 8.
function folhaSintetica({ fundo = null, semFigura = null, ladoTrocado = null } = {}) {
  const img = imagem(800, 400, fundo);
  const cores = [[200, 30, 30], [30, 30, 200], [200, 200, 30]];
  ['parado', 'caminhando', 'mirando'].forEach((pose, l) => {
    for (let c = 0; c < 8; c++) {
      const chave = `${pose}-${c * 45}`;
      if (chave === semFigura) continue;
      const lado = chave === ladoTrocado ? 'esquerda' : ladoDa(c * 45);
      dePe(img, c * 100 + 42 + (c % 3), [52, 125, 225][l] + (c % 2) * 2, cores[l], lado);
    }
  });
  dePe(img, 442, 325, [120, 60, 20]); // ferido leve
  img.pintar(530, 345, 30, 40, [120, 60, 21]); // ferido grave (de joelhos)
  img.pintar(620, 352, 60, 16, [120, 60, 22]); // incapacitado (deitado)
  img.pintar(720, 350, 60, 20, [120, 60, 23]); // morto
  return img;
}

test('Encaixe: o fundo liso (os cantos), o verde que sai inteiro (também o preso na figura) e a beirada sem o halo', () => {
  assert.equal(corDoFundo(imagem(10, 10).pixels, 10, 10), null);
  assert.deepEqual(corDoFundo(imagem(10, 10, VERDE).pixels, 10, 10), VERDE);
  const misturado = imagem(10, 10, VERDE);
  misturado.pintar(9, 9, 1, 1, [255, 255, 255]);
  assert.equal(corDoFundo(misturado.pixels, 10, 10), null);
  // O verde: um anel escuro com o verde preso dentro (o braço e o corpo) e um pixel meio verde na beirada.
  const verde = imagem(30, 30, VERDE);
  verde.pintar(10, 10, 10, 10, [20, 20, 20]);
  verde.pintar(13, 13, 4, 4, VERDE);
  verde.pintar(9, 15, 1, 1, [10, 137, 10]);
  assert.equal(tirarFundo(verde.pixels, 30, 30, VERDE), 30 * 30 - 100 + 16 - 1);
  assert.equal(verde.alfa(0, 0), 0);
  assert.equal(verde.alfa(14, 14), 0, 'o verde preso entre o braço e o corpo sai');
  assert.equal(verde.alfa(10, 10), 255);
  assert.deepEqual(verde.px(9, 15), [10, 10, 10, 128], 'a beirada meio verde fica meio transparente e sem o verde');
  // O fundo escuro (não é de cor viva): só o que se liga à borda sai; o escuro dentro da figura fica.
  const escuro = imagem(30, 30, [32, 32, 32]);
  escuro.pintar(10, 10, 10, 10, [200, 200, 200]);
  escuro.pintar(13, 13, 4, 4, [32, 32, 32]);
  tirarFundo(escuro.pixels, 30, 30, [32, 32, 32]);
  assert.equal(escuro.alfa(0, 0), 0);
  assert.equal(escuro.alfa(14, 14), 255);
  assert.equal(escuro.alfa(10, 10), 255);
});

test('Encaixe: as figuras são as manchas grandes, com os pedaços perto (a arma solta); a sujeira longe fica fora', () => {
  const img = imagem(100, 60);
  img.pintar(10, 10, 20, 30, [255, 0, 0]);
  img.pintar(60, 10, 20, 30, [0, 0, 255]);
  img.pintar(32, 20, 2, 2, [255, 0, 0]); // a 2 pixels da primeira
  img.pintar(50, 55, 1, 1, [0, 255, 0]); // longe das duas
  const { rotulos, manchas: lista } = manchas(img.pixels, 100, 60);
  assert.equal(lista.length, 4);
  assert.equal(rotulos[0], -1);
  const figuras = figurasDasManchas(lista, 2).sort((a, b) => a.x0 - b.x0);
  assert.equal(figuras.length, 2);
  assert.deepEqual({ ...figuras[0], ids: figuras[0].ids.length }, { ids: 2, n: 604, x0: 10, y0: 10, x1: 33, y1: 39 });
  assert.deepEqual({ ...figuras[1], ids: figuras[1].ids.length }, { ids: 1, n: 600, x0: 60, y0: 10, x1: 79, y1: 39 });
});

test('Encaixe: as linhas e as posições pela ordem (o Parado que passa da linha fica na dele); a figura que falta, a linha a mais e o pedaço grande perto', () => {
  const img = folhaSintetica();
  const { manchas: lista } = manchas(img.pixels, 800, 400);
  const { posicoes, erros } = posicoesDasFiguras(figurasDasManchas(lista, 28), DISPOSICAO_PADRAO);
  assert.deepEqual(erros, []);
  assert.equal(posicoes.length, 28);
  const caixa = chave => { const f = posicoes.find(p => p.chave === chave).figura; return [f.x0, f.y0, f.x1, f.y1]; };
  assert.deepEqual(caixa('parado-0'), [42, 52, 57, 111], 'os pés passam da linha 100, e a figura é do Parado');
  assert.deepEqual(caixa('parado-90'), [32, 52, 59, 111].map((v, i) => v + [200, 0, 200, 0][i]));
  assert.deepEqual(caixa('caminhando-315'), [743, 127, 770, 186], 'o braço para a direita (de 759 a 770)');
  assert.deepEqual(posicoes.filter(p => p.linha === 3).map(p => [p.chave, p.figura.x0]), [['ferido-leve', 442], ['ferido-grave', 530], ['incapacitado', 620], ['morto', 720]]);
  // A figura que falta: a linha inteira é recusada (não dá para saber qual falta).
  const falta = folhaSintetica({ semFigura: 'mirando-90' });
  const r1 = posicoesDasFiguras(figurasDasManchas(manchas(falta.pixels, 800, 400).manchas, 28), DISPOSICAO_PADRAO);
  assert.deepEqual(r1.erros, ['A linha 3 (Mirando) tem 7 figura(s), e o molde pede 8. Duas figuras encostadas viram uma só: peça ao ChatGPT para separá-las.']);
  assert.equal(r1.posicoes.length, 20);
  // Um pedaço grande (a arma solta, 30% de uma figura) a 3 pixels do Caminhando 0: junta-se a ele.
  const solta = folhaSintetica();
  solta.pintar(61, 140, 22, 12, [30, 30, 200]);
  const r2 = posicoesDasFiguras(figurasDasManchas(manchas(solta.pixels, 800, 400).manchas, 28), DISPOSICAO_PADRAO);
  assert.deepEqual(r2.erros, []);
  assert.equal(r2.posicoes.find(p => p.chave === 'caminhando-0').figura.x1, 82);
  // Uma linha de figuras a mais (a folha tem 4 linhas, e a disposição, 3).
  const tres = { colunas: 8, linhas: [{ tipo: 'parado' }, { tipo: 'caminhando' }, { tipo: 'mirando' }] };
  const r3 = posicoesDasFiguras(figurasDasManchas(manchas(img.pixels, 800, 400).manchas, 24), tres);
  assert.deepEqual(r3, { posicoes: [], erros: ['Achei 4 linha(s) de figuras, e o molde tem 3. Confira se a folha tem as mesmas linhas do molde, com as figuras separadas.'] });
});

test('Encaixe: o meio da figura é o centro de massa (a arma estendida quase não o puxa); a escala pelo Parado; os pés na linha e as deitadas no centro', () => {
  // O corpo 10 × 40 (x de 0 a 9) e a arma 10 × 2 para a direita: o meio fica em 4,98, e não em 9,5 (o meio da caixa).
  const img = imagem(20, 40);
  img.pintar(0, 0, 10, 40, [1, 1, 1]);
  img.pintar(10, 10, 10, 2, [1, 1, 1]);
  const { rotulos } = manchas(img.pixels, 20, 40);
  assert.equal(Math.round(meioDaFigura(rotulos, 20, { ids: [0], x0: 0, y0: 0, x1: 19, y1: 39 }) * 100) / 100, 4.98);
  const fig = (x0, y0, w, h, meio = x0 + w / 2 - 0.5) => ({ ids: [0], x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, meio });
  const posicoes = [
    { chave: 'parado-0', figura: fig(10, 0, 20, 50) }, { chave: 'parado-90', figura: fig(100, 0, 20, 48) }, { chave: 'parado-180', figura: fig(200, 0, 20, 52) },
    { chave: 'mirando-90', figura: fig(300, 0, 40, 50, 309.5) }, { chave: 'morto', figura: fig(400, 0, 120, 30) }, { chave: 'ferido-grave', figura: fig(600, 0, 30, 40) }
  ];
  assert.equal(escalaDaFolha(posicoes), 192 / 50, 'a mediana do Parado (48, 50, 52) fica com 75% do quadro');
  assert.equal(escalaDaFolha(posicoes.filter(p => !p.chave.startsWith('parado'))), 192 / 50, 'sem o Parado, as poses com direção');
  const plano = Object.fromEntries(planoDoEncaixe(posicoes).map(p => [p.chave, p]));
  assert.deepEqual(plano['parado-0'].destino, { x: 90, y: 32, largura: 77, altura: 192 }, 'os pés em 224 (87,5%), o meio no meio');
  assert.deepEqual(plano['parado-0'].origem, { x: 10, y: 0, largura: 20, altura: 50 });
  assert.deepEqual(plano['mirando-90'].destino, { x: 90, y: 32, largura: 154, altura: 192 }, 'o meio do corpo no meio, com a arma para o lado');
  assert.deepEqual(plano['ferido-grave'].destino, { x: 70, y: 70, largura: 115, altura: 154 }, 'de joelhos: pelos pés');
  assert.deepEqual(plano.morto.destino, { x: 4, y: 97, largura: 248, altura: 62 }, 'deitado: no centro, diminuído para caber');
  assert.equal(plano.morto.reduzida, true);
  assert.equal(plano['parado-0'].reduzida, false);
  // A figura que passaria da borda fica dentro do quadro (a margem de 4).
  const torta = planoDoEncaixe([{ chave: 'parado-0', figura: fig(0, 0, 20, 50) }, { chave: 'parado-45', figura: fig(100, 0, 60, 50, 101) }]);
  assert.equal(torta[1].destino.x, 256 - 4 - torta[1].destino.largura);
});

test('Encaixe: os pixels só da figura (o pedaço de outra que entrou na caixa fica transparente)', () => {
  // A vermelha (x de 0 a 4) e a azul (x de 6 a 9), separadas pela coluna 5; a caixa da vermelha vai até o 6 (como a arma de
  // uma figura que entra na célula da outra).
  const img = imagem(10, 4);
  img.pintar(0, 0, 4, 4, [255, 0, 0]);
  img.pintar(4, 3, 1, 1, [255, 0, 0]);
  img.pintar(6, 0, 4, 4, [0, 0, 255]);
  const { rotulos, manchas: lista } = manchas(img.pixels, 10, 4);
  assert.equal(lista.length, 2);
  const vermelha = lista.find(m => img.px(m.x0, m.y0)[0] === 255);
  const pixels = pixelsDaFigura(img.pixels, 10, rotulos, { ids: [vermelha.id], origem: { x: 0, y: 0, largura: 7, altura: 4 } });
  assert.deepEqual([...pixels.subarray(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...pixels.subarray((3 * 7 + 4) * 4, (3 * 7 + 4) * 4 + 4)], [255, 0, 0, 255]);
  assert.deepEqual([...pixels.subarray(6 * 4, 6 * 4 + 4)], [0, 0, 0, 0], 'o azul na caixa da vermelha fica fora');
});

test('Encaixe: os avisos (a figura bem menor que o Parado; o par de lados virado para o mesmo lado)', () => {
  const certa = folhaSintetica();
  const lida = img => {
    const { rotulos, manchas: lista } = manchas(img.pixels, 800, 400);
    return { rotulos, posicoes: posicoesDasFiguras(figurasDasManchas(lista, 28), DISPOSICAO_PADRAO).posicoes };
  };
  const a = lida(certa);
  assert.deepEqual(avisosDoEncaixe(a.posicoes, a.rotulos, 800), []);
  const trocada = lida(folhaSintetica({ ladoTrocado: 'caminhando-270' }));
  assert.deepEqual(avisosDoEncaixe(trocada.posicoes, trocada.rotulos, 800), ['Caminhando 90° e 270° parecem virados para o mesmo lado (um devia ser o espelho do outro).']);
  // O Mirando 45 com 40 de altura (o Parado tem 60): 67%.
  const pequena = lida(certa);
  const m45 = pequena.posicoes.find(p => p.chave === 'mirando-45').figura;
  m45.y1 = m45.y0 + 39;
  assert.deepEqual(avisosDoEncaixe(pequena.posicoes, pequena.rotulos, 800).filter(t => /saiu/.test(t)), ['Mirando 45° saiu menor que o Parado (67% da altura).']);
});

test('Encaixe: a folha inteira (no verde: tira o fundo e encaixa as 28); o fundo que não é liso e a folha vazia', () => {
  const verde = folhaSintetica({ fundo: VERDE });
  const r = encaixarFolha(verde.pixels, 800, 400, DISPOSICAO_PADRAO);
  assert.deepEqual(r.fundo, VERDE);
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.plano.length, 28);
  assert.equal(verde.alfa(0, 0), 0);
  // Todas de pé com os pés na mesma linha (224) e a mesma altura (192); as deitadas no centro.
  for (const p of r.plano.filter(p => /^(parado|caminhando|mirando)-/.test(p.chave))) {
    assert.equal(p.destino.y + p.destino.altura, 224, p.chave);
    assert.equal(p.destino.altura, 192, p.chave);
  }
  const morto = r.plano.find(p => p.chave === 'morto').destino;
  assert.equal(morto.x * 2 + morto.largura, 256);
  // Os cantos de cores diferentes: o fundo não é liso, e o encaixe recusa.
  const listrada = folhaSintetica({ fundo: [200, 200, 200] });
  listrada.pintar(0, 0, 400, 400, [20, 20, 20]);
  assert.deepEqual(encaixarFolha(listrada.pixels, 800, 400, DISPOSICAO_PADRAO).erros, ['A folha tem fundo, e ele não é de uma cor só: peça ao ChatGPT o fundo transparente (ou verde puro, liso).']);
  assert.deepEqual(encaixarFolha(imagem(80, 40).pixels, 80, 40, DISPOSICAO_PADRAO).erros, ['A folha não tem nenhuma figura (está toda transparente).']);
});

test('Encaixe: o molde do ChatGPT (1536 × 1024, cada quadro a 3/4 na célula de 192 × 256) e o cinza do manequim', () => {
  const molde = moldeDaDisposicao(DISPOSICAO_PADRAO);
  assert.equal(molde.largura, 1536);
  assert.equal(molde.altura, 1024);
  assert.equal(molde.posicoes.length, 28);
  assert.deepEqual(molde.posicoes[0], { chave: 'parado-0', x: 0, y: 32, lado: 192 });
  assert.deepEqual(molde.posicoes.find(p => p.chave === 'morto'), { chave: 'morto', x: 1344, y: 800, lado: 192 });
  assert.deepEqual([...cinzaDoManequim(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 128, 255, 0, 0, 255]))], [70, 70, 70, 255, 198, 198, 198, 128, 108, 108, 108, 255]);
});

test('Encaixe: o prompt do ChatGPT (o personagem, as linhas na ordem do molde, as poses por coluna e as regras do encaixe)', () => {
  const prompt = promptDoChatGPT({ descricao: ' Qyan, netrunner de casaco preto. ' });
  assert.match(prompt, /^Faça uma folha de sprites de um personagem para token de RPG \(Cyberpunk RED\), seguindo o molde da primeira imagem: 4 linhas e 8 colunas/);
  assert.match(prompt, /\nO personagem: Qyan, netrunner de casaco preto\.\n/);
  assert.match(prompt, /\n1\. Parado, em pé e relaxado, em 8 direções, uma por coluna: de frente \(virado para baixo\); virado para baixo e para a esquerda; de perfil, virado para a esquerda;/);
  assert.match(prompt, /\n3\. Mirando, com a arma nas duas mãos, apontada para onde ele olha, em 8 direções/);
  assert.match(prompt, /\n4\. Uma pose por coluna, as outras colunas vazias: na coluna 5, ferido leve \(em pé, curvado, com a mão no ferimento\); na coluna 6, ferido grave \(de joelhos, apoiado numa mão\); na coluna 7, incapacitado \(deitado de lado no chão\); na coluna 8, morto \(de bruços no chão\)\.\n/);
  for (const regra of ['o mesmo formato do molde (1536 × 1024, paisagem)', 'fundo transparente (PNG); se não der, um verde puro e liso (#00FF00)', 'nenhuma encosta na outra', 'sem texto, números, molduras, linhas de grade']) assert.ok(prompt.includes(regra), regra);
  assert.match(promptDoChatGPT(), /\nO personagem: o da segunda imagem\.\n/);
  const outra = promptDoChatGPT({ disposicao: { colunas: 8, linhas: [{ tipo: 'parado' }, { tipo: 'ignorar' }] } });
  assert.match(outra, /2 linhas e 8 colunas/);
  assert.match(outra, /\n2\. Vazia\.\n/);
  assert.match(outra, /\(1536 × 512, paisagem\)/);
});
