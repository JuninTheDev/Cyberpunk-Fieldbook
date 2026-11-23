// A loja da wiki e o catálogo do Foundry 14 (a fase 3 da auditoria de 2026-11-16, decisão do usuário: "O catálogo do
// 14"): cada item da loja existe no catálogo com o mesmo preço e, se for arma, os mesmos dados; e o que o catálogo tem e
// a loja não vende é só o que fica de fora de propósito. Se falhar depois de um build da loja (o foundry-2077/build/loja.mjs)
// ou do catálogo (o foundry-sistema/build/conteudo.mjs), rode: node loja-do-14.mjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const raiz = path.join(__dirname, '..', '..');
const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(raiz, 'loja-catalogo.js'), 'utf8'), contexto);
const loja = JSON.parse(JSON.stringify(contexto.window.shopCatalog.itens)); // fora do vm (o deepEqual compara o protótipo)
const catalogo = Object.values(JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens);
const idDe = item => item.flags['cpr-fieldbook'].catalogo;
const porId = new Map(catalogo.map(item => [idDe(item), item]));

test('cada item da loja está no catálogo do 14, com o mesmo preço', () => {
  assert.ok(loja.length > 700, `${loja.length} itens na loja`);
  assert.deepEqual(loja.filter(item => !porId.has(item.id)).map(item => item.id), [], 'fora do catálogo');
  assert.deepEqual(loja.filter(item => item.preco !== porId.get(item.id).system.preco).map(item => `${item.id}: ${item.preco} / ${porId.get(item.id).system.preco}`), []);
});

test('as armas da loja com os dados do catálogo do 14 (o dano, a CDT, o pente, as mãos), também no resumo do cartão', async () => {
  const { armaDo14 } = await import(require('node:url').pathToFileURL(path.join(raiz, 'loja-do-14.mjs')).href);
  const armas = loja.filter(item => item.arma);
  assert.ok(armas.length > 150);
  const diferentes = armas.flatMap(item => Object.entries(armaDo14(porId.get(item.id).system))
    .filter(([campo, valor]) => item.arma[campo] !== valor).map(([campo, valor]) => `${item.id}: ${campo} ${item.arma[campo]} / ${valor}`));
  assert.deepEqual(diferentes, []);
  assert.deepEqual(armas.filter(item => !item.resumo.startsWith(`${item.arma.dano} · CDT ${item.arma.cdt}`)).map(item => `${item.id}: ${item.resumo}`), []);
  // A que o CORE traz errada e o catálogo do 14 corrige (foundry-sistema/build/conteudo-blackchrome.mjs).
  const pepper = loja.find(item => item.id === 'black-chrome_weapons:federated-arms-pepper-shaker');
  assert.equal(pepper.arma.dano, '2d6'); assert.match(pepper.resumo, /^2d6 · /);
});

test('o que o catálogo do 14 tem e a loja não vende é só o que fica de fora de propósito', () => {
  const ids = new Set(loja.map(item => item.id));
  const deFora = item => ['lesao', 'veiculo'].includes(item.type) // os ferimentos e os veículos (o mestre dá)
    || (item.type === 'upgrade' && item.system.alvo === 'veiculo') // os upgrades de veículo, idem
    || idDe(item).startsWith('black-ice:') // o Black ICE não se compra
    || !item.system.preco // o que é de graça (as artes marciais, os membros de carne, os quickhacks de 2077)
    || /^black-chrome_weapons:modfire-10x-(smg|rifle)$/.test(idDe(item)); // a ModFire se vende no modo pistola
  assert.deepEqual(catalogo.filter(item => !ids.has(idDe(item)) && !deFora(item)).map(idDe), [], 'à venda no 14, fora da loja');
  assert.deepEqual(catalogo.filter(item => ids.has(idDe(item)) && deFora(item)).map(idDe), [], 'na loja, mas devia ficar de fora');
});

test('o loja-do-14.mjs põe na loja o preço e as armas do catálogo, refaz o resumo e aponta o item sem par', async () => {
  const { lojaComO14 } = await import(require('node:url').pathToFileURL(path.join(raiz, 'loja-do-14.mjs')).href);
  const pepper = loja.find(item => item.id === 'black-chrome_weapons:federated-arms-pepper-shaker');
  const arco = loja.find(item => item.id === 'core_weapons:bow');
  // A loja como o foundry-2077/build/loja.mjs gera: o dano 0 do CORE, o preço de outra fonte e um item que o 14 não tem.
  const antes = { itens: [
    { ...pepper, arma: { ...pepper.arma, dano: '0', pente: 20, maos: 2 }, resumo: '0 · CDT 1 · pente 20 · 2 mãos · oculta · Armas de uma Mão' },
    { ...arco, preco: 999 },
    { id: 'core_gear:nao-existe', preco: 10 }
  ] };
  const { loja: depois, mudancas, semPar } = lojaComO14(antes, { itens: Object.fromEntries(catalogo.map(item => [idDe(item), item])) });
  assert.equal(depois.itens[0].arma.dano, '2d6');
  assert.equal(depois.itens[0].resumo, '2d6 · CDT 1 · pente 30 · 1 mão · oculta · Armas de uma Mão');
  assert.equal(depois.itens[1].preco, porId.get('core_weapons:bow').system.preco);
  assert.deepEqual(semPar, ['core_gear:nao-existe']);
  assert.equal(mudancas.length, 4, mudancas.join(' · '));
});
