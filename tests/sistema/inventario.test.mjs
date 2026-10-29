import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { tipoDeScanner, scannerPreferido, luzDoItem, efeitoDaLuz, nomeDoItemNovo, passaNaBusca, descarga, descarregaAoApagar, apagarComInstalados } from '../../foundry-sistema/scripts/regras-inventario.mjs';

test('C16: a wiki manda não acumular Medscanner e Techscanner; o catálogo identifica equipamentos e implantes renomeados', () => {
  const wiki = fs.readFileSync(new URL('../../system-catalog.js', import.meta.url), 'utf8');
  assert.match(wiki, /Medscanner<\/b>[^\n]+\+2[^\n]+Não acumula com outro/);
  assert.match(wiki, /Techscanner<\/b>[^\n]+\+2[^\n]+Não acumula com outro/);
  assert.equal(tipoDeScanner({ name: 'Diagnóstico', type: 'equipamento', catalogo: 'core_gear:medscanner' }), 'medscanner');
  assert.equal(tipoDeScanner({ name: 'Oficina', type: 'cyberware', catalogo: 'core_cyberware:techscanner' }), 'techscanner');
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'equipamento' }), 'medscanner');
  assert.equal(tipoDeScanner({ name: 'Techscanner', type: 'cyberware' }), 'techscanner');
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'equipamento', catalogo: 'core_gear:agent' }), null);
  assert.equal(tipoDeScanner({ name: 'Medscanner', type: 'droga' }), null);
});

test('C16: só um scanner ativo de cada tipo vale; o substituto assume sem suprimir outros bônus', () => {
  const candidatos = [{ id: 'b', tipo: 'medscanner', ativo: true }, { id: 'a', tipo: 'medscanner', ativo: true }, { id: 'c', tipo: 'techscanner', ativo: true }];
  assert.equal(scannerPreferido(candidatos, 'medscanner'), 'a');
  assert.equal(scannerPreferido(candidatos, 'techscanner'), 'c');
  candidatos[1].ativo = false;
  assert.equal(scannerPreferido(candidatos, 'medscanner'), 'b');
  candidatos[0].ativo = false;
  assert.equal(scannerPreferido(candidatos, 'medscanner'), null);
});

test('C16: luz de 100 m confirmada pelo usuário; a wiki dá uma hora de uso único ao sinalizador', () => {
  const wiki = fs.readFileSync(new URL('../../system-catalog.js', import.meta.url), 'utf8');
  assert.match(wiki, /Lanterna[^\n]+Facho de 100 m; 10 horas por carga/);
  assert.match(wiki, /Sinalizador de estrada[^\n]+Ilumina 100 m por 1 hora. Uso único/);
  assert.deepEqual(luzDoItem({ name: 'Nova', type: 'equipamento', catalogo: 'core_gear:flashlight' }), { alcance: 100 });
  assert.deepEqual(luzDoItem({ name: 'Road Flare', type: 'equipamento' }), { alcance: 100, segundos: 3600, descartavel: true });
  assert.equal(luzDoItem({ name: 'Flashlight', type: 'arma' }), null);
  assert.equal(luzDoItem({ name: 'Flashlight', type: 'equipamento', catalogo: 'core_gear:agent' }), null);
  const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
  for (const id of ['flashlight', 'road-flare']) {
    const item = catalogo['core_gear:' + id], efeito = item.effects[0];
    assert.equal(item.system.ativacao, 'manual');
    assert.ok(efeito.disabled && efeito.transfer);
    assert.deepEqual(efeito.system.changes, efeitoDaLuz(item.name, 100).system.changes);
  }
});

// O C32: a ficha do personagem, o que faltava do CORE 0.92.4 (o "+", a busca, descarregar e apagar com o instalado).
const doCore = caminho => fs.readFileSync(new URL('../../cyberpunk-red-core/' + caminho, import.meta.url), 'utf8');

test('C32: o "+" de cada lista dá ao item em branco o "New {item}" do CORE em português, com o gênero do tipo', () => {
  assert.equal(JSON.parse(doCore('lang/en.json'))['CPR.actorSheets.commonActions.new'], 'New {item}');
  const tipos = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/lang/pt-BR.json', import.meta.url), 'utf8')).TYPES.Item;
  assert.deepEqual(Object.fromEntries(Object.entries(tipos).map(([tipo, rotulo]) => [tipo, nomeDoItemNovo(tipo, rotulo)])), {
    arma: 'Arma nova', armadura: 'Armadura nova', municao: 'Munição nova', cyberware: 'Cyberware novo', lesao: 'Lesão crítica nova',
    equipamento: 'Equipamento novo', roupa: 'Roupa nova', droga: 'Droga nova', cyberdeck: 'Cyberdeck novo', programa: 'Programa novo',
    upgrade: 'Upgrade novo', veiculo: 'Veículo novo', arquitetura: 'Arquitetura da NET nova'
  });
});

test('C32: a busca da ficha passa o nome que contém o texto, sem diferença de maiúsculas, acentos e espaços nas pontas; vazia, tudo passa', () => {
  // O cprSheetContentFilter do CORE: sem filtro, tudo; com filtro, o indexOf em minúsculas.
  assert.match(doCore('modules/system/register-helpers.js'), /applyToText\.toLowerCase\(\)\.indexOf\(filterValue\.toLowerCase\(\)\) !== -1/);
  for (const busca of ['', '   ', undefined]) assert.equal(passaNaBusca('Armas de uma Mão', busca), true);
  assert.equal(passaNaBusca('Heavy Pistol', 'pist'), true);
  assert.equal(passaNaBusca('Heavy Pistol', 'PISTOL'), true);
  assert.equal(passaNaBusca('Evasão', 'evasao'), true);
  assert.equal(passaNaBusca('Evasao', ' EVASÃO '), true);
  assert.equal(passaNaBusca('└ Smartgun Link', 'smartgun'), true);
  assert.equal(passaNaBusca('Assault Rifle', 'pist'), false);
  assert.equal(passaNaBusca('Furtividade', 'evasao'), false);
  assert.equal(passaNaBusca(undefined, 'a'), false);
});

test('C32: descarregar põe o pente em 0 e devolve as balas ao estoque da munição (o unload do CORE)', () => {
  const unload = doCore('modules/item/mixins/cpr-loadable.js');
  assert.match(unload, /const newAmount = currentAmmo\.system\.amount \+ this\.system\.magazine\.value;/);
  assert.match(unload, /await this\.update\(\{ "system\.magazine\.value": 0 \}\);/);
  assert.deepEqual(descarga(25, 15), { pente: 0, estoque: 40 });
  assert.deepEqual(descarga(10, 0), { pente: 0, estoque: 10 });
  assert.deepEqual(descarga(0, 7), { pente: 0, estoque: 7 });
  assert.deepEqual(descarga(-3, 7), { pente: 0, estoque: 7 });
  assert.deepEqual(descarga('12', undefined), { pente: 0, estoque: 12 });
});

test('C32: a arma descarrega antes de sair, na confirmação simples e no "só tirar", e não no "apagar junto" (o unloadAmmo do CORE)', () => {
  // O deleteEmbeddedDocuments do CORE: o unloadAmmo ligado por padrão, e o descarregar só no caminho sem o deleteInstalled.
  const ator = doCore('modules/actor/cpr-actor.js');
  assert.match(ator, /options = \{\s+cprIsMigrating: false,\s+unloadAmmo: true,\s+deleteInstalled: false,\s+\}/);
  assert.match(ator, /if \(!options\.deleteInstalled\) \{\s+\/\/ Uninstall all items before deletion of parent\.\s+uninstallPromises\.push\(\s+item\.uninstallItems\(installedItemsList, \{\s+unloadAmmo: options\.unloadAmmo,/);
  assert.equal(descarregaAoApagar({ tipo: 'arma', pente: 12, municaoNaFicha: true }), true);
  assert.equal(descarregaAoApagar({ tipo: 'arma', pente: 12, municaoNaFicha: true, junto: false }), true);
  assert.equal(descarregaAoApagar({ tipo: 'arma', pente: 12, municaoNaFicha: true, junto: true }), false);
  assert.equal(descarregaAoApagar({ tipo: 'arma', pente: 0, municaoNaFicha: true }), false);
  assert.equal(descarregaAoApagar({ tipo: 'arma', pente: 12, municaoNaFicha: false }), false);
  assert.equal(descarregaAoApagar({ tipo: 'upgrade', pente: undefined, municaoNaFicha: false }), false);
});

test('C32: apagar com o que está instalado: só tirar solta o que está direto no item; apagar junto leva todos os andares; a arma do item fica com o gancho', () => {
  assert.match(doCore('modules/item/mixins/cpr-container.js'), /static async confirmContainerDelete\(\)/);
  const itens = [
    { id: 'rifle', instaladoEm: '' }, { id: 'link', instaladoEm: 'rifle' }, { id: 'baioneta', instaladoEm: 'rifle' },
    { id: 'armaDaBaioneta', instaladoEm: 'baioneta', propria: true }, { id: 'municao', instaladoEm: '' },
    { id: 'deck', instaladoEm: '' }, { id: 'sword', instaladoEm: 'deck' },
    { id: 'braco', instaladoEm: '' }, { id: 'popup', instaladoEm: 'braco' }, { id: 'armaDoPopup', instaladoEm: 'popup', propria: true },
    { id: 'carro', instaladoEm: '' }, { id: 'metralhadora', instaladoEm: 'carro' }, { id: 'mira', instaladoEm: 'metralhadora' }
  ];
  assert.deepEqual(apagarComInstalados('rifle', itens, false), { apagar: ['rifle'], soltar: ['link', 'baioneta'] });
  assert.deepEqual(apagarComInstalados('rifle', itens, true), { apagar: ['rifle', 'link', 'baioneta'], soltar: [] });
  assert.deepEqual(apagarComInstalados('deck', itens, false), { apagar: ['deck'], soltar: ['sword'] });
  assert.deepEqual(apagarComInstalados('braco', itens, true), { apagar: ['braco', 'popup'], soltar: [] });
  // Os andares de baixo: o veículo leva a arma montada e o acessório dela; só tirar, a arma sai com o acessório nela.
  assert.deepEqual(apagarComInstalados('carro', itens, true), { apagar: ['carro', 'metralhadora', 'mira'], soltar: [] });
  assert.deepEqual(apagarComInstalados('carro', itens, false), { apagar: ['carro'], soltar: ['metralhadora'] });
  assert.deepEqual(apagarComInstalados('municao', itens, false), { apagar: ['municao'], soltar: [] });
  // Uma montagem em laço (dados quebrados) não trava.
  assert.deepEqual(apagarComInstalados('a', [{ id: 'a', instaladoEm: 'b' }, { id: 'b', instaladoEm: 'a' }], true), { apagar: ['a', 'b'], soltar: [] });
});
