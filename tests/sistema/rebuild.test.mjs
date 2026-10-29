// Testes de referência do Rebuild (o C47; foundry-sistema/scripts/regras.mjs), sem Foundry: o que a wiki diz (system-2077.js,
// Rebuilds, o Kit p. 31–32) e o catálogo (os três Rebuilds com a flag arma2077.rebuild), onde ele cabe, quantos slots ocupa
// e a classe que dá à arma.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { armaExotica, classeDoRebuild, flagComRebuild, perfil2077, rebuildCabe, tamanhoDoRebuild } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = new URL('../../', import.meta.url);
const pistola = { aDistancia: true, slots: 3, tipo: 'medPistol' };
const exotica = { aDistancia: true, slots: 1, tipo: 'medPistol' };

test('Rebuild: o texto da wiki e os três Rebuilds do catálogo', () => {
  const wiki = fs.readFileSync(new URL('system-2077.js', raiz), 'utf8');
  for (const trecho of ['ocupa <b>2 slots de acessório</b>', 'Só cabe um por arma', 'Serve em qualquer arma de longo alcance que não seja exótica; o Tech Rebuild não serve em lança-granadas nem em lança-foguetes',
    'Numa arma exótica, o Rebuild entra num slot só, se a arma tiver um livre', 'As armas desta página já vêm com o Rebuild']) assert.ok(wiki.includes(trecho), trecho);
  const { itens } = JSON.parse(fs.readFileSync(new URL('foundry-sistema/dados/catalogo.json', raiz), 'utf8'));
  for (const classe of ['power', 'smart', 'tech']) {
    const item = itens[`armas-2077:${classe}-rebuild`];
    assert.equal(item.type, 'upgrade');
    assert.equal(classeDoRebuild(item.flags['cpr-fieldbook'].arma2077), classe);
    assert.equal(item.system.tamanho, 2);
  }
  assert.equal(classeDoRebuild({ rebuild: 'laser' }), null);
  assert.equal(classeDoRebuild(null), null);
});

test('Rebuild: onde cabe (longo alcance, não de 2077, um só, o Tech fora dos lançadores) e os slots (2; 1 na exótica)', () => {
  assert.deepEqual(rebuildCabe({ rebuild: 'power', arma: pistola }), { cabe: true, motivo: '', tamanho: 2 });
  assert.deepEqual(rebuildCabe({ rebuild: 'smart', arma: exotica }), { cabe: true, motivo: '', tamanho: 1 });
  assert.equal(rebuildCabe({ rebuild: 'power', arma: { ...pistola, aDistancia: false } }).motivo, 'o Rebuild só serve em arma de longo alcance');
  assert.equal(rebuildCabe({ rebuild: 'power', arma: pistola, classe2077: 'smart' }).motivo, 'a arma já é de 2077 e vem com o Rebuild dela');
  assert.equal(rebuildCabe({ rebuild: 'tech', arma: pistola, outroRebuild: true }).motivo, 'só cabe um Rebuild por arma');
  for (const tipo of ['grenadeLauncher', 'rocketLauncher']) {
    assert.equal(rebuildCabe({ rebuild: 'tech', arma: { ...pistola, tipo } }).motivo, 'o Tech Rebuild não serve em lança-granadas nem em lança-foguetes');
    assert.equal(rebuildCabe({ rebuild: 'power', arma: { ...pistola, tipo } }).cabe, true);
  }
  // Os slots: 1 dos 3 já em uso deixa os 2; 2 em uso, não; na exótica sem slot livre, não.
  assert.equal(rebuildCabe({ rebuild: 'power', arma: pistola, usados: 1 }).cabe, true);
  assert.equal(rebuildCabe({ rebuild: 'power', arma: pistola, usados: 2 }).motivo, '2 de 3 slots em uso');
  assert.equal(rebuildCabe({ rebuild: 'power', arma: exotica, usados: 1 }).motivo, 'na arma exótica, o Rebuild pede um slot livre');
  assert.equal(rebuildCabe({ rebuild: 'power', arma: { aDistancia: true, slots: 0 } }).motivo, 'na arma exótica, o Rebuild pede um slot livre');
  assert.equal(rebuildCabe({ rebuild: 'nenhum', arma: pistola }).cabe, false);
  assert.deepEqual([armaExotica(pistola), armaExotica(exotica), tamanhoDoRebuild(pistola), tamanhoDoRebuild(exotica)], [false, true, 2, 1]);
  // Só a de 3 slots é comum: a de 2 também é exótica (o Rebuild ocupa 1).
  assert.deepEqual([armaExotica({ slots: 2 }), tamanhoDoRebuild({ slots: 2 })], [true, 1]);
});

test('Rebuild: a classe que ele dá à arma (a própria da arma de 2077 manda) e o perfil de 2077 que sai dela', () => {
  assert.deepEqual(flagComRebuild(null, 'tech'), { classe: 'tech' });
  assert.deepEqual(flagComRebuild({ cargaGrossa: true }, 'power'), { cargaGrossa: true, classe: 'power' });
  assert.deepEqual(flagComRebuild({ classe: 'smart' }, 'power'), { classe: 'smart' });
  assert.equal(flagComRebuild(null, null), null);
  assert.equal(flagComRebuild(null, 'outro'), null);
  // A pistola média do RED com o Power Rebuild: ricocheteia (longo alcance, sem autofogo); com o Smart, é Smart.
  const power = perfil2077(flagComRebuild(null, 'power'), { aDistancia: true, pericia: 'handgun' });
  assert.deepEqual([power.classe, power.ricocheteia, power.smart], ['power', true, false]);
  assert.equal(perfil2077(flagComRebuild(null, 'smart'), { aDistancia: true, pericia: 'handgun' }).smart, true);
  assert.equal(perfil2077(flagComRebuild(null, null), { aDistancia: true }), null);
});
