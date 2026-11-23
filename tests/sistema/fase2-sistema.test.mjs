// A fase 2 da auditoria de 2026-11-16, a parte do sistema: o C61 (os laços no tempo do mundo e no updateUser) e o C62 (a
// Humanidade máxima pela fórmula, na ficha). As regras puras ficam no regras.test.mjs (humanidadeMaxima); aqui, que o
// código as usa. O G4 confere que a droga do capanga solto continua expirando (o passo "a droga do capanga solto expira
// também fora da cena vista").
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ler = arquivo => fs.readFileSync(new URL(`../../foundry-sistema/scripts/${arquivo}`, import.meta.url), 'utf8');
const corpoDa = (fonte, assinatura) => {
  const inicio = fonte.indexOf(assinatura);
  assert.ok(inicio >= 0, `achei ${assinatura}`);
  return fonte.slice(inicio, fonte.indexOf('\n}', inicio));
};

test('C61: as drogas e as munições só montam o ator sintético dos tokens soltos com a marca no delta', () => {
  const drogas = corpoDa(ler('drogas.mjs'), 'export async function expirarDrogas(');
  assert.match(drogas, /t => !t\.actorLink && comFlag\(t\.delta\?\.items, 'sobEfeito'\)/);
  assert.doesNotMatch(drogas, /c\.tokens\.filter\(t => !t\.actorLink\)\.map/, 'não monta o de todos');
  const municoes = ler('municoes.mjs');
  assert.match(municoes, /const comPrazo = t => comFlag\(t\.delta\?\.effects, 'municao'\) \|\| comFlag\(t\.delta\?\.items, 'municao'\) \|\| comFlag\(t\.delta\?\.items, 'emp'\);/);
  assert.match(corpoDa(municoes, 'export async function expirarTemporarios('), /t => !t\.actorLink && comPrazo\(t\)/);
});

test('C61: a tripulação refaz as cenas só quando muda o papel ou o personagem de um usuário', async () => {
  const fonte = ler('tripulacao.mjs');
  const linha = fonte.match(/export const mudancaDeUsuarioImporta = \(mudancas = \{\}\) => (.+);/);
  assert.ok(linha, 'a função pura');
  // A função, sem carregar o módulo (que precisa do Foundry).
  const importa = new Function('mudancas = {}', `return ${linha[1]};`);
  assert.equal(importa({ role: 4 }), true);
  assert.equal(importa({ character: 'abc' }), true);
  assert.equal(importa({ flags: { 'cpr-fieldbook': { arvore: {} } } }), false, 'a flag da árvore de itens');
  assert.equal(importa({}), false);
  assert.match(fonte, /Hooks\.on\('updateUser', \(_usuario, mudancas\) => \{\s*if \(!mudancaDeUsuarioImporta\(mudancas\)\) return;/);
});

test('C63: a versão do sistema é 0.3.<o último ciclo do MIGRATION_STATUS> (sobe a cada ciclo, para a ficha mostrar o que está na mesa)', () => {
  const sistema = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/system.json', import.meta.url), 'utf8'));
  const registro = fs.readFileSync(new URL('../../foundry-sistema/MIGRATION_STATUS.md', import.meta.url), 'utf8');
  const ciclos = [...registro.matchAll(/^### Ciclo (\d+) \(/gm)].map(m => Number(m[1]));
  assert.ok(ciclos.length > 100, 'os ciclos do registro');
  assert.equal(sistema.version, `0.3.${Math.max(...ciclos)}`, 'suba a versão no system.json junto com o registro do ciclo');
  // Os documentos não dizem mais que a mesa é o Foundry 12.
  const leia = nome => fs.readFileSync(new URL(`../../foundry-sistema/${nome}`, import.meta.url), 'utf8');
  assert.doesNotMatch(leia('README.md'), /A campanha continua no Foundry 12/);
  assert.doesNotMatch(registro.slice(0, 2000), /A campanha real continua no Foundry 12/);
  assert.doesNotMatch(leia('instalar.mjs'), /a mesa real \(no servidor\) é Foundry 12/);
});

test('o tests/portoes.js roda os mesmos arquivos que o AGENTS.md lista no G1 e no G2', () => {
  const portoes = fs.readFileSync(new URL('../../tests/portoes.js', import.meta.url), 'utf8');
  const agentes = fs.readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');
  for (const arquivo of ['tests/lib/foundry14.js', 'tests/lib/trava.js', 'tests/lib/relatorio.js', 'tests/lib/foundry.js', 'tests/rodar.js', 'tests/cenarios/v14.js']) {
    assert.ok(portoes.includes(`'${arquivo}'`), `${arquivo} no portoes.js`);
    assert.ok(agentes.includes(arquivo), `${arquivo} no AGENTS.md`);
  }
  assert.match(portoes, /c\(34\|41\)-/, 'as bibliotecas c34 e c41');
  assert.match(agentes, /node tests\/portoes\.js/, 'o AGENTS.md aponta para o portoes.js');
});

test('C62: a ficha passa a fórmula da perda de cada peça para a Humanidade máxima', () => {
  assert.match(ler('dados.mjs'), /perda: item\.system\.perdaHumanidade\.media, formula: item\.system\.perdaHumanidade\.formula \}/);
});
