// As imagens padrão dos documentos (o getDefaultArtwork): os ícones neon do C49; os SVGs do CORE 0.92.4 (o C34.3, o mapa
// GetDefaultImage) ficam no pacote para os documentos antigos, e a migração 10 os troca.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { imagemPadrao } from '../../foundry-sistema/scripts/imagens-padrao.mjs';
import { imagemNova } from '../../foundry-sistema/scripts/regras-icones.mjs';

const sistema = new URL('../../foundry-sistema/', import.meta.url);
const referencia = fs.readFileSync(new URL('../../cyberpunk-red-core/modules/utils/cpr-systemUtils.js', import.meta.url), 'utf8');
const fonte = referencia.match(/static GetDefaultImage\(foundryObject, objectType\) \{[\s\S]+?\n  \}\r?\n/)[0];
const doCore = vm.runInNewContext('(' + fonte.replace('static GetDefaultImage', 'function') + ')', { game: { system: { id: 'cyberpunk-red-core' } } });
const tipos = {
  Actor: { personagem: 'character', capanga: 'mook', conteiner: 'container', blackice: 'blackIce', demonio: 'demon' },
  Item: { arma: 'weapon', armadura: 'armor', municao: 'ammo', cyberware: 'cyberware', lesao: 'criticalInjury', equipamento: 'gear', roupa: 'clothing',
    droga: 'drug', cyberdeck: 'cyberdeck', programa: 'program', upgrade: 'itemUpgrade', veiculo: 'vehicle', arquitetura: 'netarch' }
};

test('C49: cada tipo do manifesto tem o ícone neon próprio (decisão do usuário, 2026-10-26), e a imagem padrão do CORE de antes (o C34.3) vira a neon na migração 10', () => {
  const manifesto = JSON.parse(fs.readFileSync(new URL('system.json', sistema), 'utf8'));
  for (const [classe, mapa] of Object.entries(tipos)) {
    // C46: o CORE só tem item de veículo; o novo ator usa o mesmo ícone do item.
    assert.deepEqual([...Object.keys(mapa), ...(classe === 'Actor' ? ['veiculo'] : [])].sort(), Object.keys(manifesto.documentTypes[classe]).sort());
    for (const [tipo, tipoDoCore] of Object.entries(mapa)) {
      const neon = imagemPadrao(classe, tipo);
      assert.match(neon, /^systems\/cpr-fieldbook\/icones\/neon\/[a-z]+\.svg$/, `${classe} ${tipo}`);
      assert.match(fs.readFileSync(new URL(neon.replace('systems/cpr-fieldbook/', ''), sistema), 'utf8'), /<svg\s/);
      const antiga = 'systems/cpr-fieldbook/icones/padrao/' + doCore(classe, tipoDoCore).split('/').at(-1);
      assert.equal(imagemNova({ documento: classe, tipo, img: antiga }), neon, `${classe} ${tipo}: a antiga`);
    }
  }
  assert.equal(imagemPadrao('Actor', 'veiculo'), imagemPadrao('Item', 'veiculo'));
  // A imagem escolhida pelo mestre fica.
  assert.equal(imagemNova({ documento: 'Item', tipo: 'arma', img: 'worlds/x/arma.webp', catalogo: 'core_weapons:knife' }), null);
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
