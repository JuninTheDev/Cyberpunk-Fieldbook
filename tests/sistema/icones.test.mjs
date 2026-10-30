// Testes de referência dos ícones próprios do sistema (o C49, parte 1; foundry-sistema/build/icones.mjs e
// scripts/regras-icones.mjs), sem Foundry: os SVGs neon em dia com o gerador, nas três cores do tema; os estados no token
// (os 34 do Foundry 14 e os do sistema); as imagens padrão; o catálogo sem os ícones genéricos; e a migração 10.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CORES, cssDosGlifos, DESENHOS, FA_DO_PAINEL, FA_PARA_GLIFO, GLIFOS, svgDoGlifoNomeado, svgDoIcone } from '../../foundry-sistema/build/icones.mjs';
import * as I from '../../foundry-sistema/scripts/regras-icones.mjs';
import { PASSOS } from '../../foundry-sistema/scripts/migracao.mjs';

const sistema = new URL('../../foundry-sistema/', import.meta.url);
const { itens: catalogo } = JSON.parse(fs.readFileSync(new URL('dados/catalogo.json', sistema), 'utf8'));
const arquivo = src => new URL(src.replace('systems/cpr-fieldbook/', ''), sistema);
// O git pode trocar o fim de linha na cópia (o autocrlf): as comparações são pelo conteúdo.
const semCr = texto => texto.split(String.fromCharCode(13)).join('');
// Os estados do Foundry 14.369 (client/config.mjs, CONFIG.statusEffects).
const DO_FOUNDRY = ['dead', 'unconscious', 'sleep', 'stun', 'prone', 'restrain', 'paralysis', 'fly', 'blind', 'deaf', 'silence', 'fear', 'burning', 'frozen',
  'shock', 'corrode', 'bleeding', 'disease', 'poison', 'curse', 'regen', 'degen', 'hover', 'burrow', 'upgrade', 'downgrade', 'invisible', 'target', 'eye', 'bless',
  'fireShield', 'coldShield', 'magicShield', 'holyShield'];

test('Ícones: cada desenho tem o SVG em icones/neon igual ao do gerador, só nas cores do tema', () => {
  const nomes = Object.keys(DESENHOS);
  assert.ok(nomes.length >= 60);
  for (const nome of nomes) {
    const svg = semCr(fs.readFileSync(new URL(`icones/neon/${nome}.svg`, sistema), 'utf8'));
    assert.equal(svg, svgDoIcone(nome), `${nome}: rode node build/icones.mjs`);
    const cores = new Set(svg.match(/#[0-9a-f]{6}/gi).map(cor => cor.toLowerCase()));
    for (const cor of cores) assert.ok([...Object.values(CORES), '#0b0b10'].includes(cor), `${nome}: ${cor}`);
  }
  assert.deepEqual(fs.readdirSync(new URL('icones/neon/', sistema)).filter(f => f.endsWith('.svg')).map(f => f.replace('.svg', '')).sort(), [...nomes].sort());
});

test('Ícones: os 34 estados do Foundry e os do sistema têm o ícone neon, e todo ícone do mapa existe', () => {
  for (const id of DO_FOUNDRY) assert.ok(I.iconeDoEstado(id), id);
  for (const id of ['cpr-fieldbook-suprimido', 'cpr-fieldbook-em-cobertura', 'cpr-fieldbook-agarrando', 'cpr-fieldbook-agarrado', 'cprf-em-chamas', 'cprf-conectado-na-net', 'cprf-sem-ar', 'cprf-eletrocutado', 'cprf-radiacao']) {
    assert.ok(I.iconeDoEstado(id), id);
  }
  assert.equal(I.iconeDoEstado('outro'), null);
  assert.equal(I.iconeDoEstado('__proto__'), null);
  const usados = [...Object.values(I.ICONES_DOS_ESTADOS), ...Object.values(I.ICONES_DOS_EFEITOS), ...Object.values(I.ICONES_DOS_ATORES), ...Object.values(I.ICONES_DOS_ITENS), 'blackice', 'efeito'];
  for (const nome of usados) assert.ok(DESENHOS[nome], nome);
  // Estados diferentes, ícones diferentes (menos o fogo do sistema, que é o "burning").
  const porIcone = Object.entries(I.ICONES_DOS_ESTADOS).filter(([id]) => id !== 'cprf-em-chamas');
  assert.equal(new Set(porIcone.map(([, nome]) => nome)).size, porIcone.length);
});

test('Ícones: o catálogo e os efeitos dele sem os ícones genéricos do Foundry; cada item com o ícone do tipo', () => {
  for (const [id, item] of Object.entries(catalogo)) {
    assert.ok(I.ehIconeNeon(item.img), `${id}: ${item.img}`);
    assert.ok(fs.existsSync(arquivo(item.img)), `${id}: ${item.img}`);
    for (const efeito of item.effects ?? []) assert.equal(efeito.img, I.iconeNeon('efeito'), id);
  }
  assert.equal(catalogo['core_weapons:heavy-pistol'].img, I.iconeNeon('arma'));
  for (const [id, item] of Object.entries(catalogo).filter(([id]) => id.startsWith('black-ice:'))) assert.equal(item.img, I.iconeNeon('blackice'), id);
});

test('Ícones: a migração 10 troca a imagem padrão antiga e a genérica do catálogo, e o ícone dos estados no token; a do mestre fica', () => {
  const passo = PASSOS.find(p => p.versao === 10);
  const flags = catalogo => ({ 'cpr-fieldbook': { catalogo } });
  const arma = { type: 'arma', img: 'icons/svg/sword.svg', flags: flags('core_weapons:knife'), effects: [{ img: 'icons/svg/upgrade.svg' }] };
  passo.item(arma);
  assert.deepEqual([arma.img, arma.effects[0].img], [I.iconeNeon('arma'), I.iconeNeon('efeito')]);
  const ice = { type: 'programa', img: 'icons/svg/ice-aura.svg', flags: flags('black-ice:asp'), effects: [] };
  passo.item(ice);
  assert.equal(ice.img, I.iconeNeon('blackice'));
  // Sem catálogo, a genérica fica (pode ter sido escolhida); a padrão do CORE muda em qualquer um.
  const solta = { type: 'arma', img: 'icons/svg/sword.svg', flags: {}, effects: [] };
  passo.item(solta);
  assert.equal(solta.img, 'icons/svg/sword.svg');
  const emBranco = { type: 'armadura', img: 'systems/cpr-fieldbook/icones/padrao/Default_Armor.svg', flags: {}, effects: [] };
  passo.item(emBranco);
  assert.equal(emBranco.img, I.iconeNeon('armadura'));
  const escolhida = { type: 'arma', img: 'worlds/mesa/faca.webp', flags: flags('core_weapons:knife'), effects: [] };
  passo.item(escolhida);
  assert.equal(escolhida.img, 'worlds/mesa/faca.webp');
  const ator = { type: 'personagem', img: 'systems/cpr-fieldbook/icones/padrao/Default_CPR_Mystery_Man.svg', effects: [
    { statuses: ['prone'], img: 'icons/svg/falling.svg' }, { statuses: ['cpr-fieldbook-suprimido'], img: 'systems/cpr-fieldbook/icones/suprimido.svg' },
    { statuses: [], img: 'worlds/mesa/efeito.webp' }, { statuses: ['prone', 'stun'], img: 'icons/svg/daze.svg' }
  ] };
  passo.ator(ator);
  assert.deepEqual([ator.img, ...ator.effects.map(e => e.img)], [I.iconeNeon('personagem'), I.iconeNeon('caido'), I.iconeNeon('suprimido'), 'worlds/mesa/efeito.webp', 'icons/svg/daze.svg']);
});

test('Glifos dos botões (o C49, parte 2): os SVGs e o styles/icones.css iguais aos do gerador, no manifesto; cada classe do mapa usada pelo sistema e cada glifo usado', () => {
  const ler = caminho => semCr(fs.readFileSync(new URL(caminho, sistema), 'utf8'));
  for (const nome of Object.keys(GLIFOS)) assert.equal(ler(`icones/neon/glifos/${nome}.svg`), svgDoGlifoNomeado(nome), `${nome}: rode node build/icones.mjs`);
  assert.equal(ler('styles/icones.css'), cssDosGlifos());
  const manifesto = JSON.parse(ler('system.json'));
  assert.ok(manifesto.styles.some(estilo => estilo.src === 'styles/icones.css'));
  // O código e os modelos do sistema: cada classe do mapa aparece em algum (senão, o glifo sobra).
  const textos = [];
  const andar = pasta => { for (const nome of fs.readdirSync(new URL(pasta, sistema))) { const caminho = `${pasta}${nome}`; if (fs.statSync(new URL(caminho, sistema)).isDirectory()) andar(`${caminho}/`); else if (/\.(mjs|hbs)$/.test(nome)) textos.push(ler(caminho)); } };
  andar('scripts/'); andar('templates/');
  const tudo = textos.join('\n');
  for (const classe of [...Object.keys(FA_PARA_GLIFO), ...Object.keys(FA_DO_PAINEL)]) assert.match(tudo, new RegExp(`['" ]${classe}['" ]`), classe);
  assert.deepEqual([...new Set([...Object.values(FA_PARA_GLIFO), ...Object.values(FA_DO_PAINEL)])].sort(), Object.keys(GLIFOS).sort());
  // Os botões do HUD do sistema: o do perigo, o da régua, o do token dinâmico, o do scanner e os da tripulação.
  for (const classe of ['fa-triangle-exclamation', 'fa-bullseye', 'fa-person-walking-arrow-right', 'fa-satellite-dish', 'fa-right-to-bracket', 'fa-right-from-bracket', 'fa-car', 'fa-car-burst', 'fa-crosshairs']) assert.ok(FA_PARA_GLIFO[classe], classe);
});

test('Glifos do Painel Tático (o C51, ciclo 197): o mapa da ficha vale também no painel, e o do painel só nele; o fechar continua o do Font Awesome', () => {
  const css = cssDosGlifos();
  for (const classe of Object.keys(FA_DO_PAINEL)) {
    assert.equal(FA_PARA_GLIFO[classe], undefined, `${classe} já está no mapa da ficha`);
    assert.ok(css.includes(`#painel-tatico i.${classe}::before`), classe);
    assert.ok(!css.includes(`.cpr-fieldbook i.${classe}::before`), `${classe} fora do painel`);
  }
  for (const classe of Object.keys(FA_PARA_GLIFO)) assert.ok(css.includes(`#painel-tatico i.${classe}::before`) && css.includes(`.cpr-fieldbook i.${classe}::before`), classe);
  assert.ok(css.includes('#painel-tatico i[class*="fa-"]'), 'o brilho no painel');
  assert.equal(FA_PARA_GLIFO['fa-xmark'] ?? FA_DO_PAINEL['fa-xmark'], undefined);
  // Os ícones do painel que mostram estado e golpe têm glifo (os do topo, dos vitais, das ações e do agarrão).
  for (const classe of ['fa-heart', 'fa-skull', 'fa-shirt', 'fa-clover', 'fa-flag-checkered', 'fa-person-running', 'fa-person-shelter', 'fa-person-arrow-up-from-line', 'fa-hands', 'fa-hand-holding']) assert.ok(FA_DO_PAINEL[classe], classe);
});
