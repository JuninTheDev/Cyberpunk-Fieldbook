// Os termos no padrão também nas páginas de regras, os system-*.js (a fase 3 da auditoria de 2026-11-16). O teste dos
// documentos (tests/lib/documentos-estaticos.js) só lê os .md; lá ficam os nomes em inglês das perícias e o "PV" do
// glossário (o outro nome do HP), então aqui só os erros de português.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const raiz = path.join(__dirname, '..', '..');
const proibidos = [
  [/Seriamente Ferid/i, 'use "Gravemente Ferido"'],
  [/Resistir [àa] Tortura/, 'a perícia é "Resistir Tortura/Drogas"'],
  [/\b(faz|teste de|rola) Cybertech\b/, 'a perícia é "Cybertecnologia"']
];

test('as páginas de regras (system-*.js) usam os termos do padrão', () => {
  const arquivos = fs.readdirSync(raiz).filter(nome => /^system-[\w-]+\.js$/.test(nome)).sort();
  assert.ok(arquivos.length >= 5, `${arquivos.length} arquivos de regras`);
  const achados = arquivos.flatMap(nome => fs.readFileSync(path.join(raiz, nome), 'utf8').split(/\r?\n/)
    .flatMap((texto, i) => proibidos.filter(([re]) => re.test(texto)).map(([, dica]) => `${nome}:${i + 1} (${dica})`)));
  assert.deepEqual(achados, []);
});
