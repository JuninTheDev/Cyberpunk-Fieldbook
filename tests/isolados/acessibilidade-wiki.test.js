// A acessibilidade da wiki (a fase 3 da auditoria de 2026-11-16): o leitor de tela não relê a página inteira a cada troca
// (nem o feed do NetWire a cada mensagem), o título da página nova recebe o foco, os botões − e + dizem de quê, os alvos
// de toque do celular têm 32 px e a borda da busca do tema 2077 passa de 3:1 de contraste. Sem navegador: o código.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const raiz = path.join(__dirname, '..', '..');
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');
const contraste = (a, b) => {
  const luz = hex => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test('o #content das duas wikis e o feed do NetWire não são regiões aria-live; o título da página nova recebe o foco', () => {
  for (const pagina of ['index.html', 'jogadores.html']) {
    assert.match(ler(pagina), /<article class="content" id="content"><\/article>/, pagina);
  }
  assert.doesNotMatch(ler('netwire.js'), /class="nw-feed" aria-live/);
  const app = ler('wiki-app.js');
  assert.match(app, /<h2 class="cyber-h" tabindex="-1">\$\{page\.title\}<\/h2>/);
  assert.match(app, /if \(historyMode !== 'none' && !target\) content\.querySelector\('h2\.cyber-h'\)\?\.focus\(\{ preventScroll: true \}\);/);
});

test('os botões − e + do criador e da loja dizem de quê (o nome da perícia ou do item)', () => {
  const criador = ler('criador.js');
  assert.match(criador, /data-skill-minus="\$\{esc\(name\)\}" aria-label="Diminuir \$\{esc\(special \? special\.nome : info\.pt \|\| name\)\}"/);
  assert.match(criador, /data-skill-plus="\$\{esc\(name\)\}" aria-label="Aumentar \$\{esc\(special \? special\.nome : info\.pt \|\| name\)\}"/);
  assert.match(criador, /data-extra-minus="\$\{index\}" aria-label="Diminuir \$\{esc\(C\.specializedSkills\[extra\.base\]\.nome\)\}"/);
  assert.match(criador, /data-pedido-menos="\$\{index\}" aria-label="Menos \$\{esc\(item\.nome \|\| line\.id\)\}"/);
  assert.doesNotMatch(criador, /aria-label="(Diminuir|Aumentar|Menos|Mais)">/, 'nenhum só com o verbo');
});

test('no celular, os botões − e + têm 32 px; a borda da busca do tema 2077 tem 3:1 de contraste', () => {
  assert.match(ler('wiki.css'), /@media \(pointer: coarse\) \{ \.cc-level \.action, \.shop-stepper button \{ min-width: 32px; min-height: 32px; \} \}/);
  const borda = (ler('netwire.css').match(/:root\[data-tema="2077"\] \.search-wrap input \{ border-color: (#[0-9a-f]{6});[^}]*background: (#[0-9a-f]{6})/) || []);
  assert.ok(borda[1], 'a borda da busca');
  assert.ok(contraste(borda[1], borda[2]) >= 3, `contraste de ${contraste(borda[1], borda[2]).toFixed(2)}:1`);
});
