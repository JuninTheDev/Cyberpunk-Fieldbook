// CORE 0.92.4: o mapa GetDefaultImage e os SVGs locais que alimentam o getDefaultArtwork dos documentos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { imagemPadrao } from '../../foundry-sistema/scripts/imagens-padrao.mjs';

const sistema = new URL('../../foundry-sistema/', import.meta.url);
const referencia = fs.readFileSync(new URL('../../cyberpunk-red-core/modules/utils/cpr-systemUtils.js', import.meta.url), 'utf8');
const fonte = referencia.match(/static GetDefaultImage\(foundryObject, objectType\) \{[\s\S]+?\n  \}\r?\n/)[0];
const doCore = vm.runInNewContext('(' + fonte.replace('static GetDefaultImage', 'function') + ')', { game: { system: { id: 'cyberpunk-red-core' } } });
const tipos = {
  Actor: { personagem: 'character', capanga: 'mook', conteiner: 'container', blackice: 'blackIce', demonio: 'demon' },
  Item: { arma: 'weapon', armadura: 'armor', municao: 'ammo', cyberware: 'cyberware', lesao: 'criticalInjury', equipamento: 'gear', roupa: 'clothing',
    droga: 'drug', cyberdeck: 'cyberdeck', programa: 'program', upgrade: 'itemUpgrade', veiculo: 'vehicle', arquitetura: 'netarch' }
};

test('C34.3: cada tipo do manifesto tem o ícone padrão de seu equivalente no CORE 0.92.4', () => {
  const manifesto = JSON.parse(fs.readFileSync(new URL('system.json', sistema), 'utf8'));
  for (const [classe, mapa] of Object.entries(tipos)) {
    assert.deepEqual(Object.keys(mapa).sort(), Object.keys(manifesto.documentTypes[classe]).sort());
    for (const [tipo, tipoDoCore] of Object.entries(mapa)) {
      const nome = doCore(classe, tipoDoCore).split('/').at(-1);
      assert.equal(imagemPadrao(classe, tipo), 'systems/cpr-fieldbook/icones/padrao/' + nome);
    }
  }
});

test('C34.3: os SVGs seguem no pacote do Fieldbook sem dependência do CORE instalado nem alteração dos originais', () => {
  const nomes = new Set();
  for (const [classe, mapa] of Object.entries(tipos)) for (const tipoDoCore of Object.values(mapa)) {
    const nome = doCore(classe, tipoDoCore).split('/').at(-1);
    nomes.add(nome);
    const svg = fs.readFileSync(new URL('icones/padrao/' + nome, sistema));
    assert.deepEqual(svg, fs.readFileSync(new URL('../../cyberpunk-red-core/icons/compendium/default/' + nome, import.meta.url)));
    assert.match(svg.toString(), /<svg\b/);
  }
  assert.equal(nomes.size, 16);
});

test('C34.3: tipo ou documento desconhecido deixa o Foundry decidir o padrão, sem herdar chaves de Object', () => {
  for (const classe of ['Actor', 'Item']) for (const tipo of ['outro', '__proto__', 'constructor', 'toString', '', null, undefined]) assert.equal(imagemPadrao(classe, tipo), null);
  for (const classe of ['JournalEntry', '', null, undefined]) assert.equal(imagemPadrao(classe, 'arma'), null);
});
