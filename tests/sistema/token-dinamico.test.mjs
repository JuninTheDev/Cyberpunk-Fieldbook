// Testes de referência dos tokens dinâmicos (o C45, parte 1; foundry-sistema/scripts/regras-token-dinamico.mjs), sem
// Foundry: a pose pelo estado (a ordem das decisões do usuário, 2026-10-25), a direção pelo giro com a calibração da folha,
// os recuos quando falta a imagem e os nomes padronizados dos arquivos.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { ANIMACAO_DA_DIRECAO, animacaoDaTroca, CHAVES, chaveDoArquivo, conjuntoValido, direcaoDaArte, imagemDoToken, imagensDaPasta, imagensDoConjunto, poseDoToken, TRANSICOES } from '../../foundry-sistema/scripts/regras-token-dinamico.mjs';

test('Token dinâmico: a pose pelo estado, na ordem das decisões (morto, incapacitado, caído, mirando, caminhando, ferido, parado)', () => {
  assert.equal(poseDoToken({}), 'parado');
  assert.equal(poseDoToken({ ferimento: 'leve' }), 'ferido-leve');
  assert.equal(poseDoToken({ ferimento: 'grave' }), 'ferido-grave');
  // Andando ou mirando, a direção manda sobre o ferimento.
  assert.equal(poseDoToken({ ferimento: 'grave', andando: true }), 'caminhando');
  assert.equal(poseDoToken({ ferimento: 'leve', armado: true }), 'mirando');
  assert.equal(poseDoToken({ armado: true, andando: true }), 'mirando');
  // Caído vence a arma; mortalmente ferido, inconsciente e estase são Incapacitado; morto vence tudo.
  assert.equal(poseDoToken({ caido: true, armado: true }), 'caido');
  for (const estado of [{ ferimento: 'mortal' }, { inconsciente: true }, { estase: true }, { ferimento: 'mortal', caido: true, armado: true }]) assert.equal(poseDoToken(estado), 'incapacitado');
  assert.equal(poseDoToken({ morto: true, ferimento: 'mortal', estase: true }), 'morto');
});

test('Token dinâmico: a direção da folha pelo giro do Foundry (0° para baixo, 90° esquerda, 180° cima, 270° direita), com a calibração', () => {
  assert.deepEqual([0, 90, 180, 270, 45, 359, 22, 23, -45, 405].map(r => direcaoDaArte(r)), [0, 90, 180, 270, 45, 0, 0, 45, 315, 45]);
  // A folha que conta no sentido contrário: o 90° do Foundry é o 270° dela.
  assert.deepEqual([0, 90, 270, 45].map(r => direcaoDaArte(r, { sentido: 'antihorario' })), [0, 270, 90, 315]);
  // O 0° da folha deslocado: com o início em 180°, o giro 0 do Foundry é o 180° dela.
  assert.deepEqual([0, 90].map(r => direcaoDaArte(r, { inicio: 180 })), [180, 270]);
  assert.equal(direcaoDaArte(90, { inicio: 90, sentido: 'antihorario' }), 0);
});

const conjunto = imagens => conjuntoValido({ ativo: true, imagens });

test('Token dinâmico: a imagem da pose e da direção; faltou, a direção mais perto, depois a pose mais geral; sem nada, null', () => {
  const cheio = conjunto(Object.fromEntries(CHAVES.map(chave => [chave, `${chave}.webp`])));
  assert.equal(imagemDoToken(cheio, {}, 90).src, 'parado-90.webp');
  assert.equal(imagemDoToken(cheio, { armado: true }, 270).src, 'mirando-270.webp');
  assert.equal(imagemDoToken(cheio, { ferimento: 'grave' }, 270).src, 'ferido-grave.webp');
  assert.equal(imagemDoToken(cheio, { morto: true }, 270).src, 'morto.webp');
  // Só o Parado a 0 e 90: o giro 135 fica no 90 (o mais perto); o 225 está a 135° de cada um, e o empate vai para o primeiro
  // no sentido horário a partir dele (o 0).
  const pouco = conjunto({ 'parado-0': 'p0', 'parado-90': 'p90' });
  assert.deepEqual(imagemDoToken(pouco, {}, 135), { src: 'p90', pose: 'parado', direcao: 90 });
  assert.equal(imagemDoToken(pouco, {}, 315).src, 'p0');
  assert.equal(imagemDoToken(pouco, {}, 225).src, 'p0');
  // No empate entre o 90 e o 180 (o giro 135), o sentido horário escolhe o 180, mesmo que o 90 venha antes na lista.
  assert.equal(imagemDoToken(conjunto({ 'parado-90': 'p90', 'parado-180': 'p180' }), {}, 135).src, 'p180');
  // Mirando sem imagem cai no Parado; Ferido grave no leve, e o leve no Parado; Caído e Morto no Incapacitado.
  assert.equal(imagemDoToken(pouco, { armado: true }, 90).src, 'p90');
  assert.equal(imagemDoToken(conjunto({ 'ferido-leve': 'fl', 'parado-0': 'p0' }), { ferimento: 'grave' }, 0).src, 'fl');
  assert.equal(imagemDoToken(pouco, { ferimento: 'grave' }, 90).src, 'p90');
  assert.equal(imagemDoToken(conjunto({ incapacitado: 'inc' }), { caido: true }, 0).src, 'inc');
  assert.equal(imagemDoToken(conjunto({ incapacitado: 'inc' }), { morto: true }, 0).src, 'inc');
  // Sem nenhuma imagem que sirva: null (o token fica com a base).
  assert.equal(imagemDoToken(conjunto({ morto: 'm' }), {}, 0), null);
  assert.equal(imagemDoToken(conjunto({}), { morto: true }, 0), null);
});

test('Token dinâmico: os nomes padronizados dos arquivos da pasta', () => {
  assert.equal(chaveDoArquivo('tokens/ricky/ricky_parado_045.webp'), 'parado-45');
  assert.equal(chaveDoArquivo('Ricky-Mirando-270.PNG'), 'mirando-270');
  assert.equal(chaveDoArquivo('x_caminhando_0.png'), 'caminhando-0');
  assert.equal(chaveDoArquivo('ricky_ferido-leve.webp'), 'ferido-leve');
  assert.equal(chaveDoArquivo('ricky_ferido_grave.png'), 'ferido-grave');
  assert.equal(chaveDoArquivo('ricky_morto.webm'), 'morto');
  assert.equal(chaveDoArquivo('ricky_caido.webp'), 'caido');
  // O que não casa: ângulo que não é das 8, pose desconhecida, extensão que não é imagem, sem extensão.
  for (const nome of ['ricky_parado_030.webp', 'ricky_correndo_000.webp', 'ricky_parado_045.txt', 'ricky_morto', 'retrato.webp']) assert.equal(chaveDoArquivo(nome), null, nome);
  const imagens = imagensDaPasta(['p/b_parado_090.webp', 'p/a_parado_090.webp', 'p/ricky_morto.png', 'p/leia-me.txt']);
  assert.equal(imagens['parado-90'], 'p/a_parado_090.webp');
  assert.equal(imagens.morto, 'p/ricky_morto.png');
  assert.equal(Object.keys(imagens).length, CHAVES.length);
  assert.equal(CHAVES.length, 29);
});

test('Token dinâmico: o conjunto guardado é sempre completo e com a calibração válida', () => {
  const c = conjuntoValido({ ativo: 1, pasta: ' tokens/r ', angulos: { inicio: 30, sentido: 'outro' }, imagens: { 'parado-0': ' a.webp ', lixo: 'x' } });
  assert.equal(c.ativo, true);
  assert.equal(c.pasta, 'tokens/r');
  assert.deepEqual(c.angulos, { inicio: 0, sentido: 'horario' });
  assert.equal(c.imagens['parado-0'], 'a.webp');
  assert.equal(c.imagens.lixo, undefined);
  assert.equal(Object.keys(c.imagens).length, CHAVES.length);
  assert.deepEqual(conjuntoValido({ angulos: { inicio: '270', sentido: 'antihorario' } }).angulos, { inicio: 270, sentido: 'antihorario' });
});

test('Token dinâmico (a parte 2): a transição da troca pelo estado, a da direção na hora, e as imagens da pré-carga', () => {
  assert.deepEqual(animacaoDaTroca('glitch'), { transition: 'glitch' });
  assert.deepEqual(animacaoDaTroca('hologram'), { transition: 'hologram' });
  assert.deepEqual(animacaoDaTroca('fade'), { transition: 'fade' });
  assert.deepEqual(animacaoDaTroca('nenhuma'), { duration: 0 });
  // Uma escolha que não existe mais volta ao padrão (glitch).
  assert.deepEqual(animacaoDaTroca('antiga'), { transition: 'glitch' });
  assert.deepEqual(Object.keys(TRANSICOES), ['glitch', 'fade', 'hologram', 'nenhuma']);
  assert.deepEqual(ANIMACAO_DA_DIRECAO, { duration: 0 });
  // A pré-carga: as imagens do conjunto, sem vazias e sem repetir.
  const c = conjuntoValido({ imagens: { 'parado-0': 'a.webp', 'parado-90': 'a.webp', 'caminhando-90': 'b.webp', morto: ' c.webp ', 'mirando-0': '' } });
  assert.deepEqual(imagensDoConjunto(c), ['a.webp', 'b.webp', 'c.webp']);
  assert.deepEqual(imagensDoConjunto(null), []);
});
