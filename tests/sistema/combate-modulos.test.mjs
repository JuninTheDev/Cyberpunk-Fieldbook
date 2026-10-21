// A porta do combate conserva a API do ciclo 148; os módulos podem ser lidos sem iniciar o Foundry.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pasta = new URL('../../foundry-sistema/scripts/', import.meta.url);
const ler = arquivo => readFileSync(new URL(arquivo, pasta), 'utf8');
const modulos = ['combate/socket.mjs', 'combate/modos.mjs', 'combate/cartao.mjs', 'combate/apoio.mjs'];
// Lista tirada dos exports do combate.mjs antes da divisão, incluindo os dois estados.
const nomesOriginais = [
  'STATUS_SUPRIMIDO', 'STATUS_COBERTURA', 'souOMestreAtivo', 'pedir', 'desistir', 'naFila', 'registrarCombate',
  'tokenNaCena', 'centroDe', 'distancia', 'jogadorDe', 'atacar', 'cargaDa', 'alternarCarga', 'perguntarDefesa',
  'resolver', 'defesaContra', 'combateDe', 'suprimir', 'acoesDe2077', 'destinatarios', 'desfazer',
  'aplicarDanoDoCartao', 'rolarLesaoDoCartao', 'ligarBotoes'
];

// Leitura lexical, sem executar código nem carregar seus imports. O texto de um template é ignorado, mas suas
// interpolações entram entre parênteses: `${game.user}` também precisa acusar uma leitura no topo.
function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  function codigo(interpolacao = false) {
    let chaves = 0;
    while (i < texto.length) {
      const resto = texto.slice(i);
      const ignorar = resto.match(/^(?:\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/);
      if (ignorar) { i += ignorar[0].length; continue; }
      const letra = texto[i];
      if (interpolacao && letra === '}' && chaves === 0) { i++; return; }
      if (letra === "'" || letra === '"') {
        i++;
        while (i < texto.length) { if (texto[i++] === '\\') i++; else if (texto[i - 1] === letra) break; }
        tokens.push('literal');
      } else if (letra === '`') {
        i++; tokens.push('(');
        while (i < texto.length) {
          if (texto[i] === '\\') { i += 2; continue; }
          if (texto[i] === '`') { i++; break; }
          if (texto.slice(i, i + 2) === '${') { i += 2; tokens.push('('); codigo(true); tokens.push(')'); }
          else i++;
        }
        tokens.push(')');
      } else {
        const token = resto.match(/^(?:[\p{ID_Start}_$][\p{ID_Continue}$]*|=>|\?\.|\?\?)/u)?.[0] ?? letra;
        tokens.push(token); i += token.length;
        if (token === '{') chaves++;
        if (token === '}') chaves--;
      }
    }
  }
  codigo();
  return tokens;
}

function paresDe(tokens) {
  const pares = new Map(), pilha = [];
  const aberturas = { ')': '(', ']': '[', '}': '{' };
  for (let i = 0; i < tokens.length; i++) {
    if (['(', '[', '{'].includes(tokens[i])) pilha.push(i);
    else if (Object.hasOwn(aberturas, tokens[i])) {
      const inicio = pilha.pop();
      assert.equal(tokens[inicio], aberturas[tokens[i]], 'delimitadores do módulo');
      pares.set(inicio, i); pares.set(i, inicio);
    }
  }
  assert.equal(pilha.length, 0, 'delimitadores fechados');
  return pares;
}

function globaisNoTopo(texto) {
  const tokens = tokenizar(texto), pares = paresDe(tokens), dentro = new Set();
  const marcar = (inicio, fim) => { for (let i = inicio; i <= fim; i++) dentro.add(i); };
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'function') {
      const parametros = tokens.indexOf('(', i + 1), fim = pares.get(parametros);
      assert.equal(tokens[fim + 1], '{', 'corpo da função');
      marcar(i, pares.get(fim + 1));
    } else if (tokens[i] === '=>') {
      // Os parâmetros também são adiados, inclusive os valores padrão que leem canvas ou game.
      const inicio = tokens[i - 1] === ')' ? pares.get(i - 1) : i - 1;
      let fim = i + 1, ternarios = 0;
      if (tokens[fim] === '{') fim = pares.get(fim) + 1;
      else {
        for (; fim < tokens.length; fim++) {
          const token = tokens[fim];
          if (['(', '[', '{'].includes(token)) { fim = pares.get(fim); continue; }
          if ([';', ',', ')', ']', '}'].includes(token) || (token === ':' && !ternarios)) break;
          if (token === '?') ternarios++;
          if (token === ':') ternarios--;
        }
      }
      marcar(inicio, fim - 1);
    } else if (tokens[i] === '(' && tokens[pares.get(i) + 1] === '{'
      && /^[\p{ID_Start}_$][\p{ID_Continue}$]*$/u.test(tokens[i - 1] ?? '')
      && !['if', 'for', 'while', 'switch', 'catch', 'with', 'await'].includes(tokens[i - 1])) {
      // Métodos de objetos e classes também são funções; um bloco de if/for/try continua no topo.
      marcar(i, pares.get(pares.get(i) + 1));
    }
  }
  return tokens.filter((token, i) => !dentro.has(i) && ['game', 'canvas', 'ui', 'foundry'].includes(token));
}

function exportsDe(texto) {
  const tokens = tokenizar(texto), pares = paresDe(tokens), nomes = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== 'export' || ['.', '?.'].includes(tokens[i - 1])) continue;
    let posicao = i + 1;
    if (tokens[posicao] === 'async') posicao++;
    if (tokens[posicao] === 'function' || tokens[posicao] === 'class') nomes.push(tokens[posicao + 1]);
    else if (['const', 'let', 'var'].includes(tokens[posicao])) {
      nomes.push(tokens[++posicao]);
      for (posicao++; posicao < tokens.length && tokens[posicao] !== ';'; posicao++) {
        if (['(', '[', '{'].includes(tokens[posicao])) posicao = pares.get(posicao);
        else if (tokens[posicao] === ',') nomes.push(tokens[++posicao]);
      }
    } else if (tokens[posicao] === '{') {
      for (let j = posicao + 1; j < pares.get(posicao); j++) {
        if (tokens[j] === ',') continue;
        if (tokens[j + 1] === 'as') { nomes.push(tokens[j + 2]); j += 2; }
        else nomes.push(tokens[j]);
      }
    } else nomes.push(tokens[posicao]);
  }
  return nomes.sort();
}

test('módulos do combate: a porta conserva exatamente os 25 nomes exportados no ciclo 148', () => {
  assert.deepEqual(exportsDe(ler('combate.mjs')), [...nomesOriginais].sort());
});

for (const arquivo of modulos) {
  test(`módulos do combate: ${arquivo} existe e só usa os globais do Foundry dentro de funções`, () => {
    assert.deepEqual(globaisNoTopo(ler(arquivo)), [], arquivo);
  });
}

test('leitura dos módulos: distingue funções, blocos executados no topo e interpolações', () => {
  const adiado = 'const f = (cena = canvas.scene) => game.user; function g(valor = ui.x) { return foundry.utils; }';
  assert.deepEqual(globaisNoTopo(adiado), []);
  assert.deepEqual(globaisNoTopo('const f = { async executar(valor = game.user) { return canvas.scene; } };'), []);
  assert.deepEqual(globaisNoTopo('const f = () => `${game.user}`; // foundry\nconst texto = "ui";'), []);
  assert.deepEqual(globaisNoTopo('if (true) { game.user; } const a = { valor: canvas.scene };'), ['game', 'canvas']);
  assert.deepEqual(globaisNoTopo('const a = `${game.user}: ${`${ui.x}`}`;'), ['game', 'ui']);
  assert.deepEqual(globaisNoTopo('const a = true ? () => 1 : foundry.utils;'), ['foundry']);
  assert.deepEqual(exportsDe('export const a = 1, b = () => 2; export async function c() {} export { d as e, f };'), ['a', 'b', 'c', 'e', 'f']);
});
