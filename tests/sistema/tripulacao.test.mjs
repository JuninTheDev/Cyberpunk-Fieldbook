import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { motivoEmbarque, ordemMotorista, posicaoEmbarcada, posicoesDeSaida } from '../../foundry-sistema/scripts/regras-tripulacao.mjs';

const embarque = mudancas => motivoEmbarque({ tipo: 'personagem', dono: true, visivel: true,
  ocupantes: [], assentos: 2, distancia: 1, ...mudancas });
const carro = { x: 300, y: 400, width: 2, height: 2, elevation: 4, sort: 12 };
const pessoa = { x: 0, y: 0, width: 1, height: 1, elevation: 9, sort: 5,
  texture: { src: 'pose-c45.webp', scaleX: -1, scaleY: 1 } };

test('C46.3: os dois assentos da moto da wiki recebem dois ocupantes; o terceiro e zero assentos recusam', () => {
  // Wiki, system-rules.js:538: Moto estradeira, 2 assentos. M17, mesa-api.js:1311: cheio antes de acrescentar.
  const wiki = readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes("['Moto estradeira', '35', '2', '20', '20.000eb']"));
  assert.equal(embarque({ ocupantes: [] }), '');
  assert.equal(embarque({ ocupantes: ['primeiro'] }), '');
  assert.equal(embarque({ ocupantes: ['primeiro', 'segundo'] }), 'O veículo está cheio.');
  assert.equal(embarque({ assentos: 0 }), 'O veículo está cheio.');
  assert.equal(embarque({ assentos: -2 }), 'O veículo está cheio.');
  assert.equal(embarque({ assentos: 1.9, ocupantes: ['primeiro'] }), 'O veículo está cheio.');
  assert.equal(embarque({ mestre: true, ocupantes: ['primeiro', 'segundo'] }), 'O veículo está cheio.');
});

test('C46.3: dono do personagem ou capanga embarca em veículo visível sem exigir a posse dele', () => {
  // M17, mesa-api.js:1305-1308: canControl é do ocupante; não há exigência de dono do veículo.
  for (const tipo of ['personagem', 'capanga']) {
    assert.equal(embarque({ tipo }), '');
    assert.equal(embarque({ tipo, dono: false }), 'Esse token não é seu.');
    assert.equal(embarque({ tipo, visivel: false }), 'Você não vê esse veículo.');
    assert.equal(embarque({ tipo, mestre: true, dono: false, visivel: false, distancia: Infinity }), '');
  }
  assert.equal(embarque({ tipo: 'veiculo', mestre: true }), 'Só personagens e capangas podem embarcar.');
  assert.equal(embarque({ tipo: 'arquitetura' }), 'Só personagens e capangas podem embarcar.');
  assert.equal(embarque({ tipo: 'drone' }), 'Só personagens e capangas podem embarcar.');
  assert.equal(embarque({ dentro: 'outro' }), 'Desça do outro veículo antes.');
  assert.equal(embarque({ dentro: 'mesmo', mestre: true }), 'Desça do outro veículo antes.');
});

test('C46.3: dois quadrados da borda incluem o limite, mas só o mestre embarca de longe', () => {
  // M17, mesa-api.js:1313: comparação estrita > metade do veículo + 2 quadrados.
  assert.equal(embarque({ distancia: 2 }), '');
  assert.equal(embarque({ distancia: 2.000001 }), 'Chegue mais perto do veículo.');
  assert.equal(embarque({ distancia: Infinity }), 'Chegue mais perto do veículo.');
  assert.equal(embarque({ distancia: NaN }), 'Chegue mais perto do veículo.');
  assert.equal(embarque({ distancia: -0.5 }), '');
  assert.equal(embarque({ distancia: 999, mestre: true }), '');
});

test('C46.3: primeiro ocupante dirige; Dirigir muda só a ordem e não embarca quem está fora', () => {
  // M17, mesa-api.js:1314 e :1342: push conserva o primeiro; motorista passa à frente dos restantes.
  const ocupantes = ['primeiro', 'segundo', 'terceiro'], antes = [...ocupantes];
  assert.deepEqual(ordemMotorista(ocupantes, 'primeiro'), ['primeiro', 'segundo', 'terceiro']);
  assert.deepEqual(ordemMotorista(ocupantes, 'segundo'), ['segundo', 'primeiro', 'terceiro']);
  assert.deepEqual(ordemMotorista(ocupantes, 'terceiro'), ['terceiro', 'primeiro', 'segundo']);
  assert.deepEqual(ordemMotorista(ocupantes, 'fora'), antes);
  assert.notEqual(ordemMotorista(ocupantes, 'fora'), ocupantes);
  assert.deepEqual(ocupantes, antes);
  assert.deepEqual(ordemMotorista([], 'fora'), []);
});

test('C46.3: dentro conserva o centro do veículo, com metade do tamanho e por cima sem tocar no C45', () => {
  // M17, mesa-api.js:1315 (mesmo centro); mesa.js:1346 (metade), :1358 (por cima).
  const antes = structuredClone({ carro, pessoa });
  const dentro = posicaoEmbarcada(carro, pessoa, 100);
  assert.deepEqual(dentro, { x: 375, y: 475, width: 0.5, height: 0.5, elevation: 4, sort: 13 });
  assert.equal(dentro.x + dentro.width * 100 / 2, carro.x + carro.width * 100 / 2);
  assert.equal(dentro.y + dentro.height * 100 / 2, carro.y + carro.height * 100 / 2);
  assert.equal(posicaoEmbarcada(carro, pessoa, 100, 1).sort, 14);
  assert.equal('texture' in dentro, false);
  assert.equal(Object.keys(dentro).some(chave => chave.startsWith('texture.')), false);
  assert.deepEqual({ carro, pessoa }, antes);
});

test('C46.3: dentro acompanha o centro novo inclusive num veículo retangular e token de tamanho próprio', () => {
  const veiculo = { x: 700, y: 300, width: 4, height: 2, elevation: -2, sort: 20 };
  const ocupante = { width: 2, height: 1, texture: pessoa.texture };
  assert.deepEqual(posicaoEmbarcada(veiculo, ocupante, 100, 2), {
    x: 850, y: 375, width: 1, height: 0.5, elevation: -2, sort: 23
  });
  const antes = posicaoEmbarcada(carro, pessoa, 100), depois = posicaoEmbarcada({ ...carro, x: 500, y: 700 }, pessoa, 100);
  assert.equal(depois.x - antes.x, 200);
  assert.equal(depois.y - antes.y, 300);
});

test('C46.3: Descer oferece os quatro lados antes das diagonais, sem sobrepor o veículo', () => {
  // M17, mesa-api.js:701-705: metade do veículo + meio quadrado, ordem E/S/W/N e depois diagonais.
  const antes = structuredClone({ carro, pessoa });
  assert.deepEqual(posicoesDeSaida(carro, pessoa, 100), [
    { x: 500, y: 450 }, { x: 350, y: 600 }, { x: 200, y: 450 }, { x: 350, y: 300 },
    { x: 500, y: 600 }, { x: 200, y: 600 }, { x: 200, y: 300 }, { x: 500, y: 300 }
  ]);
  for (const p of posicoesDeSaida(carro, pessoa, 100)) {
    assert.ok(p.x + 100 <= carro.x || p.x >= carro.x + 200 || p.y + 100 <= carro.y || p.y >= carro.y + 200);
  }
  assert.deepEqual({ carro, pessoa }, antes);
});

test('C46.3: saída respeita dimensões reais e preserva a ordem para escolher o primeiro lugar livre', () => {
  const veiculo = { x: 300, y: 400, width: 4, height: 2 };
  const lugares = posicoesDeSaida(veiculo, { width: 2, height: 1 }, 100);
  assert.deepEqual(lugares.slice(0, 4), [{ x: 700, y: 450 }, { x: 400, y: 600 }, { x: 100, y: 450 }, { x: 400, y: 300 }]);
  const bloqueados = new Set([JSON.stringify(lugares[0]), JSON.stringify(lugares[1])]);
  assert.deepEqual(lugares.find(ponto => !bloqueados.has(JSON.stringify(ponto))), { x: 100, y: 450 });
  assert.equal(lugares.find(() => false), undefined);
});
