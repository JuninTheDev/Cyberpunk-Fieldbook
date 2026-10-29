// Testes de referência da cena da arquitetura (foundry-sistema/scripts/arquitetura.mjs: desenhoDaCena), sem Foundry: a
// posição de cada andar e de cada ligação, pela regra do _generateNetarchScene do CORE 0.92.4
// (cyberpunk-red-core/modules/item/types/cpr-netarch.js:64-345), com as medidas dele (:19-30).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CENA, desenhoDaCena, ENTRADA, lerArquitetura } from '../../foundry-sistema/scripts/arquitetura.mjs';
import { EXEMPLOS } from '../../foundry-sistema/build/arquiteturas.mjs';

const ler = caminho => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8');
const vazios = ids => lerArquitetura({ andares: ids.map(id => ({ andar: Number(id.slice(0, -1)), ramo: id.slice(-1), tipo: 'vazio' })) });
// A clínica de ripperdoc do compêndio "Arquiteturas da NET" (o G4 gera a cena dela): o ramo B sai do andar 2.
const clinica = lerArquitetura(EXEMPLOS.find(arquitetura => arquitetura.name === 'Clínica de ripperdoc (ramificada)').system);

// O ponto está num trecho da linha (horizontal ou vertical), com as pontas.
const naLinha = ([x, y], pontos) => pontos.slice(1).some(([x2, y2], i) => {
  const [x1, y1] = pontos[i];
  return (x1 === x2 && x === x1 && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) || (y1 === y2 && y === y1 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2));
});

test('as medidas da cena são as do CORE: a grade de 110 px, o andar de 3 × 3 quadrados, a ligação de 1 e a margem de 2', () => {
  const opcoes = ler('cyberpunk-red-core/modules/item/types/cpr-netarch.js');
  for (const trecho of ['gridSize: 110,', 'connectorWidth: 1,', 'connectorHeight: 1,', 'levelWidth: 3,', 'levelHeight: 3,', 'cornerOffsetX: 2,', 'cornerOffsetY: 2,']) {
    assert.ok(opcoes.includes(trecho), trecho);
  }
  // O tamanho do modelo de cena do CORE (o "Netarch Template", scene.netarch.template.yaml:65 e :90 dos compêndios-fonte).
  assert.deepEqual(CENA, { grade: 110, andar: 3, ligacao: 1, margem: 2, largura: 3840, altura: 2160 });
});

test('a clínica de ripperdoc: cada andar no lugar do Tile do CORE, 330 × 330, e a cena do tamanho do modelo', () => {
  const desenho = desenhoDaCena(clinica);
  // cpr-netarch.js:151-164: x = 110 × (2 + 4 × (andar − 1)); y = 110 × (2 + 4 × ramo), com o ramo A = 0.
  assert.deepEqual(desenho.andares.map(({ id, x, y }) => `${id} ${x},${y}`), [
    '1a 220,220', '2a 660,220', '3a 1100,220', '3b 1100,660', '4a 1540,220', '4b 1540,660', '5a 1980,220', '5b 1980,660'
  ]);
  assert.ok(desenho.andares.every(andar => andar.largura === 330 && andar.altura === 330));
  assert.deepEqual([desenho.grade, desenho.largura, desenho.altura], [110, 3840, 2160]);
  // O desenho de cada andar é o do conteúdo dele (um só por andar na clínica).
  assert.deepEqual(desenho.andares.map(andar => andar.tipo), ['senha', 'ice', 'arquivo', 'controle', 'ice', 'senha', 'arquivo', 'controle']);
});

test('o andar com mais de um conteúdo tem o desenho do que manda nele, como a cor na janela da NET: o inimigo, a senha, o nó de controle, o arquivo', () => {
  const tipoDe = (...conteudos) => desenhoDaCena(lerArquitetura({ andares: conteudos.map(tipo => ({ andar: 1, ramo: 'a', tipo, dv: 6, ice: 'asp' })) })).andares[0].tipo;
  assert.equal(tipoDe('arquivo', 'senha', 'ice'), 'ice');
  assert.equal(tipoDe('arquivo', 'demonio'), 'demonio');
  assert.equal(tipoDe('controle', 'netrunner'), 'netrunner');
  assert.equal(tipoDe('arquivo', 'controle', 'senha'), 'senha');
  assert.equal(tipoDe('arquivo', 'controle'), 'controle');
  assert.equal(tipoDe('vazio', 'arquivo'), 'arquivo');
  assert.equal(tipoDe('vazio'), 'vazio');
  // O armazém da TLB (o exemplo do livro): o Hellhound e o Killer no andar 1.
  const armazem = desenhoDaCena(lerArquitetura(EXEMPLOS.find(arquitetura => arquitetura.name.startsWith('Armazém da TLB')).system));
  assert.deepEqual(armazem.andares.map(andar => `${andar.id} ${andar.tipo}`), ['1a ice', '2a senha', '3a ice', '4a controle']);
});

test('a clínica de ripperdoc: uma ligação por andar, pelo centro das setas do CORE, sem passar delas', () => {
  const { ligacoes } = desenhoDaCena(clinica);
  assert.deepEqual(ligacoes.map(({ de, para, pontos }) => `${de}>${para} ${pontos.map(p => p.join(',')).join(' ')}`), [
    `${ENTRADA}>1a 110,385 220,385`,
    '1a>2a 550,385 660,385',
    '2a>3a 990,385 1100,385',
    // O ramo B: desce do meio de baixo do 2A e segue na altura do meio do 3B.
    '2a>3b 825,550 825,825 1100,825',
    '3a>4a 1430,385 1540,385',
    '3b>4b 1430,825 1540,825',
    '4a>5a 1870,385 1980,385',
    '4b>5b 1870,825 1980,825'
  ]);
  // As setas do CORE (110 × 110, o canto de cima à esquerda): a de cada andar (cpr-netarch.js:181-201, x = 110 × (2 − 1 +
  // 4 × (andar − 1)), y = 110 × (2 + 1 + 4 × ramo)) e o cotovelo do ramo B, que começa no andar 3 (:203-274: deltaHeight
  // = 2 e deltaWidth = 2; as duas descendo na coluna do meio do 2A, x = 770, y = 550 e 660; as duas deitadas em y = 770,
  // x = 880 e 770).
  const setas = [[110, 330], [550, 330], [990, 330], [990, 770], [1430, 330], [1430, 770], [1870, 330], [1870, 770], [770, 550], [770, 660], [880, 770], [770, 770]];
  for (const [x, y] of setas) assert.ok(ligacoes.some(({ pontos }) => naLinha([x + 55, y + 55], pontos)), `o centro da seta ${x},${y}`);
  // E nenhum pedaço de linha fora das setas: de 5 em 5 px, cada ponto cai numa delas.
  for (const { para, pontos } of ligacoes) {
    for (let i = 1; i < pontos.length; i++) {
      const [[x1, y1], [x2, y2]] = [pontos[i - 1], pontos[i]];
      const passos = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 5;
      for (let p = 0; p <= passos; p++) {
        const [x, y] = [x1 + ((x2 - x1) * p) / passos, y1 + ((y2 - y1) * p) / passos];
        assert.ok(setas.some(([sx, sy]) => x >= sx && x <= sx + 110 && y >= sy && y <= sy + 110), `${para}: ${x},${y}`);
      }
    }
  }
});

test('os ramos fora do caso do CORE seguem o pai do mapa da ficha; a cena cresce para caber a arquitetura', () => {
  // O ramo com buraco (o mesmo de regras.test.mjs): o 2B sai do 1A, como o cotovelo do CORE; o 4B sai do 3A (o pai dele no
  // mapa), e não do 3B vazio, de onde vem a seta solta do CORE.
  const buraco = desenhoDaCena(vazios(['1a', '2a', '2b', '3a', '4b']));
  const linhaPara = (desenho, id) => desenho.ligacoes.find(ligacao => ligacao.para === id);
  assert.deepEqual(linhaPara(buraco, '2b'), { de: '1a', para: '2b', pontos: [[385, 550], [385, 825], [660, 825]] });
  assert.deepEqual(linhaPara(buraco, '4b'), { de: '3a', para: '4b', pontos: [[1265, 550], [1265, 825], [1540, 825]] });
  // O ramo que começa no andar 1 sai do ponto de acesso, na linha dele (o CORE ainda desenha um cotovelo fora da cena).
  assert.deepEqual(linhaPara(desenhoDaCena(vazios(['1a', '1b'])), '1b'), { de: ENTRADA, para: '1b', pontos: [[110, 825], [220, 825]] });
  // Até o andar 7 e o ramo D, o tamanho do modelo; o andar 18 e o ramo H: 110 × (2 + 4 × 17) + 330 + 220 = 8250 e
  // 110 × (2 + 4 × 7) + 330 + 220 = 3850.
  const ate7 = desenhoDaCena(vazios(['1a', '7a', '1d']));
  assert.deepEqual([ate7.largura, ate7.altura], [3840, 2160]);
  const grande = desenhoDaCena(vazios(['1a', '18a', '1h']));
  assert.deepEqual([grande.largura, grande.altura], [8250, 3850]);
  assert.deepEqual(grande.andares.find(andar => andar.id === '18a'), { id: '18a', x: 7700, y: 220, largura: 330, altura: 330, tipo: 'vazio' });
  // Sem andares, nada.
  assert.deepEqual(desenhoDaCena(lerArquitetura({ andares: [] })), { grade: 110, andares: [], ligacoes: [], largura: 3840, altura: 2160 });
});

test('o "Gerar a cena" é do mestre: o botão só no contexto dele, com teclado, e a geração recusa quem não é', () => {
  const modelo = ler('foundry-sistema/templates/arquitetura.hbs');
  assert.match(modelo, /{{#if gm}}<div class="acoes-arquitetura"><a class="acao" data-action="gerarCena" role="button" tabindex="0"[^>]*>Gerar a cena<\/a><\/div>{{\/if}}/);
  const ficha = ler('foundry-sistema/scripts/ficha-arquitetura.mjs');
  assert.ok(ficha.includes("if (!game.user.isGM) return ui.notifications.warn('Só o mestre gera a cena da arquitetura.');"));
  assert.ok(ficha.includes('item, fonte, editavel, gm: game.user.isGM,'));
});
