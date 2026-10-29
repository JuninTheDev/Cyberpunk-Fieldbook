// As partes da ficha do veículo (o C46): no Foundry 14, cada parte de uma ficha ApplicationV2 tem de desenhar um único
// elemento raiz (client/applications/api/handlebars-application.mjs: "Template part ... must render a single HTML
// element."). A primeira versão da ficha tinha o cabeçalho, o corpo e o rodapé numa parte só, e o G3 não via: só o G4,
// abrindo a ficha.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const raiz = new URL('../../foundry-sistema/', import.meta.url);
const ler = arquivo => readFileSync(new URL(arquivo, raiz), 'utf8');
const VAZIOS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr']);

// Os elementos no nível de cima do template, sem os comentários e as expressões do Handlebars.
function raizes(html) {
  const limpo = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '').replace(/\{\{[^}]*\}\}\}?/g, '');
  let profundidade = 0;
  let quantas = 0;
  for (const [, fecha, tag, auto] of limpo.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
    if (fecha) { profundidade -= 1; continue; }
    if (profundidade === 0) quantas += 1;
    if (!auto && !VAZIOS.has(tag.toLowerCase())) profundidade += 1;
  }
  return quantas;
}

test('C46: cada parte da ficha do veículo é um template com um só elemento raiz, e a ficha usa as três', () => {
  const ficha = ler('scripts/ficha-veiculo.mjs');
  for (const parte of ['topo', 'corpo', 'rodape']) {
    assert.match(ficha, new RegExp(`${parte}: \\{ template: caminho\\('templates/veiculo/${parte}\\.hbs'\\)`), `a parte ${parte}`);
    assert.equal(raizes(ler(`templates/veiculo/${parte}.hbs`)), 1, `templates/veiculo/${parte}.hbs`);
  }
  // O contador pega o caso que quebrou: três elementos no nível de cima.
  assert.equal(raizes('<header><img src="x"></header>\r\n<div>{{#if a}}<p>b</p>{{/if}}</div>\r\n<footer></footer>'), 3);
});
