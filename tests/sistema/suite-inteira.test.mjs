// O C106: a suíte inteira da wiki (node tests/rodar.js) sem as falhas que um cenário deixa para o outro. Os cenários
// dividem os servidores de teste e os dados; sozinhos, passavam. Sem navegador. Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const exigir = createRequire(import.meta.url);
const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');

test('C106: o v14 tem a wiki de teste só dele: o rodar.js sobe os servidores de novo antes dele, se outro cenário já os usou', () => {
  assert.equal(exigir('../cenarios/v14.js').dadosProprios, true);
  const rodar = ler('tests/rodar.js');
  assert.match(rodar, /if \(cenario\.dadosProprios && usados\) \{ await servidores\.parar\(\); servidores = await subirServidores\(\); \}\r?\n\s+usados = true;/);
  // E os servidores novos usam uma pasta de dados nova (a de antes sai no parar).
  const servidores = ler('tests/lib/servidores.js');
  assert.match(servidores, /const dados = fs\.mkdtempSync\(/);
  assert.match(servidores, /parar: async \(\) => \{[^}]*fs\.rmSync\(dados/);
  // Os outros cenários continuam dividindo os dados (nenhum outro pede a wiki só dele).
  for (const arquivo of fs.readdirSync(new URL('../cenarios/', import.meta.url)).filter(f => f.endsWith('.js') && f !== 'v14.js')) {
    assert.doesNotMatch(ler(`tests/cenarios/${arquivo}`), /dadosProprios/, arquivo);
  }
});

test('C106: o limite de tentativas do cenário contas gasta o endereço do cabeçalho (pelo túnel), não o endereço de rede deste PC', () => {
  const contas = ler('tests/cenarios/contas.js');
  const passo = contas.slice(contas.indexOf("r.passo('limite: 10 códigos errados"), contas.indexOf("r.passo('limite: 10 códigos errados") + 900);
  assert.match(passo, /'CF-Connecting-IP': '203\.0\.113\.9'/);
  assert.match(passo, /api\(gm, '\/api\/entrar'/);
  assert.doesNotMatch(passo, /api\(rede, '\/api\/entrar'/);
  assert.match(contas, /const gm = servidores\.local;/);
});

test('C106: o clone do cenário reversao leva a marca do repositório raso, e o commit confere pelo hash inteiro', () => {
  const reversao = ler('tests/cenarios/reversao.js');
  assert.match(reversao, /git\(\['rev-parse', '--path-format=absolute', '--git-common-dir'\], servidores\.raiz\)/);
  assert.match(reversao, /if \(fs\.existsSync\(raso\)\) fs\.copyFileSync\(raso, path\.join\(pasta, '\.git', 'shallow'\)\);/);
  assert.match(reversao, /inteiro\(item\.commit\) === inteiro\('a6ab001'\)/);
  assert.doesNotMatch(reversao, /item\.commit === 'a6ab001'/);
});
