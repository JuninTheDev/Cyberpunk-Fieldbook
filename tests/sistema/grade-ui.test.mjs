import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { destinoDoPonto, htmlDaGrade, modeloDaGrade, moverCursor } from '../../foundry-sistema/scripts/compartilhado/grade-ui.mjs';
import { lugaresDoConteiner, lugaresDoPersonagem } from '../../foundry-sistema/scripts/compartilhado/regras-grade.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const doCatalogo = (id, extra = {}) => ({ id, catalogo: id, ...structuredClone(catalogo[id]), ...extra });
const noLugar = (lugar, x = 0, y = 0, girado = false) => ({ lugar, x, y, girado, rev: 1 });
const LUGARES = lugaresDoPersonagem({ moradia: { descricao: 'Quitinete' }, mochila: 'P' });
const porId = modelo => Object.fromEntries(modelo.map(lugar => [lugar.id, lugar]));

test('C109: o modelo da tela: o fuzil nas duas mãos (a secundária mostra o par), a armadura inteira, a lista e a grade com o tamanho girado', () => {
  const itens = [
    doCatalogo('core_weapons:assault-rifle', { id: 'rifle', grade: noLugar('corpo:maoPrincipal') }),
    doCatalogo('core_armor:bodyweight-suit', { id: 'traje', grade: noLugar('corpo:tronco') }),
    doCatalogo('core_gear:agent', { id: 'agent', grade: noLugar('corpo:emUso') }),
    doCatalogo('core_weapons:light-melee', { id: 'faca', grade: noLugar('cinto', 2, 0, true) }),
    doCatalogo('core_gear:computer', { id: 'pc', grade: noLugar('mochila', 1, 2) }),
    doCatalogo('core_gear:tech-bag', { id: 'perdida', grade: { ...noLugar('organizar'), uso: 'guardado' } }),
    doCatalogo('core_gear:flashlight', { id: 'semLugar' }),
    { id: 'lesao', name: 'Costela', type: 'lesao', system: {}, grade: noLugar('bolsos') }
  ];
  const m = porId(modeloDaGrade(LUGARES, itens));
  assert.equal(m['corpo:maoPrincipal'].item.id, 'rifle');
  assert.equal(m['corpo:maoPrincipal'].deOutro, false);
  assert.equal(m['corpo:maoSecundaria'].item.id, 'rifle');
  assert.equal(m['corpo:maoSecundaria'].deOutro, true);
  assert.equal(m['corpo:cabeca'].item.id, 'traje');
  assert.equal(m['corpo:cabeca'].deOutro, true);
  assert.equal(m['corpo:tronco'].deOutro, false);
  assert.equal(m.coldre.item, null);
  assert.deepEqual(m['corpo:emUso'].itens.map(item => item.id), ['agent']);
  assert.deepEqual(m.organizar.itens.map(item => item.id), ['perdida']);
  assert.deepEqual(m.cinto.itens.map(({ id, l, a }) => [id, l, a]), [['faca', 2, 1]]);
  assert.deepEqual(m.mochila.itens.map(({ id, l, a }) => [id, l, a]), [['pc', 2, 2]]);
  // O sem lugar e o que não ocupa lugar ficam de fora.
  assert.deepEqual(Object.values(m).flatMap(lugar => lugar.itens ?? (lugar.item ? [lugar.item] : [])).map(item => item.id).sort(), ['agent', 'faca', 'pc', 'perdida', 'rifle', 'rifle', 'traje', 'traje'].sort());
  // Com BODY 8, a espada de duas mãos fica numa só.
  const espada = doCatalogo('core_weapons:sword', { id: 'espada', grade: noLugar('corpo:maoPrincipal') });
  assert.equal(porId(modeloDaGrade(LUGARES, [espada], { body: 8 }))['corpo:maoSecundaria'].item, null);
  assert.equal(porId(modeloDaGrade(LUGARES, [espada], { body: 4 }))['corpo:maoSecundaria'].item.id, 'espada');
});

test('C109: o HTML da tela: cada lugar com o data-lugar, o item na grade pela coluna e pela linha, o nome escapado e a quantidade', () => {
  const itens = [
    { ...doCatalogo('core_gear:computer', { id: 'pc', grade: noLugar('mochila', 1, 2) }), name: '<b>PC</b> "do Rato"', img: 'icones/pc.svg' },
    { id: 'balas', name: 'Balas', type: 'municao', system: { tipo: 'rifle' }, qtd: 20, grade: noLugar('cinto', 3, 0), img: '' },
    doCatalogo('core_weapons:assault-rifle', { id: 'rifle', name: 'Rifle', grade: noLugar('corpo:maoPrincipal') }),
    doCatalogo('core_gear:tech-bag', { id: 'perdida', name: 'Bolsa', grade: { ...noLugar('organizar'), uso: 'carregando' } })
  ];
  const html = htmlDaGrade(modeloDaGrade(LUGARES, itens), { editavel: true, selecionado: 'balas', organizar: 1 });
  for (const lugar of LUGARES) assert.ok(html.includes(`data-lugar="${lugar.id}"`), lugar.id);
  assert.match(html, /data-lugar="mochila" style="--l: 4; --a: 4"/);
  assert.match(html, /data-item-id="pc" style="grid-column: 2 \/ span 2; grid-row: 3 \/ span 2"/);
  // O nome aparece no item largo (dois quadrados ou mais); o de um quadrado mostra só a imagem.
  assert.match(html, /class="grade-item largo" data-item-id="pc"/);
  assert.doesNotMatch(html, /class="grade-item largo[^"]*" data-item-id="balas"/);
  assert.match(html, /data-item-id="balas"[^>]*style="grid-column: 4 \/ span 1; grid-row: 1 \/ span 1"/);
  assert.ok(!html.includes('<b>PC</b>'));
  assert.ok(html.includes('&lt;b&gt;PC&lt;/b&gt; &quot;do Rato&quot;'));
  assert.match(html, /<img src="icones\/pc.svg"/);
  assert.match(html, /class="grade-item selecionado" data-item-id="balas"/);
  assert.match(html, /aria-label="Balas \(20\)"/);
  assert.match(html, /<span class="qtd">20<\/span>/);
  // A dica do navegador só a pedido (a wiki, o C110; o Foundry tem a dele).
  assert.doesNotMatch(html, / title=/);
  assert.match(htmlDaGrade(modeloDaGrade(LUGARES, itens), { editavel: false, titulo: true }), /data-item-id="balas"[^>]* title="Balas \(20\)"/);
  // A mão secundária mostra o par (não é outro botão do mesmo item).
  assert.equal(html.match(/data-item-id="rifle"/g).length, 2);
  assert.match(html, /<span class="par" data-item-id="rifle">Rifle<\/span>/);
  assert.match(html, /class="grade-organizar com-itens"/);
  assert.match(html, /class="grade-inventario editavel"/);
  // O contêiner (só o Conteúdo): sem a coluna do corpo, numa coluna só.
  const doConteiner = htmlDaGrade(modeloDaGrade(lugaresDoConteiner({ l: 4, a: 3 }), []), { editavel: true });
  assert.match(doConteiner, /class="grade-inventario editavel sem-corpo"/);
  assert.doesNotMatch(doConteiner, /grade-corpo/);
  assert.match(doConteiner, /data-lugar="conteudo" style="--l: 4; --a: 3"/);
  assert.doesNotMatch(html, /sem-corpo/);
  const soLer = htmlDaGrade(modeloDaGrade(LUGARES, itens), { editavel: false });
  assert.match(soLer, /class="grade-inventario"/);
  assert.match(soLer, /aria-disabled="true"/);
  assert.doesNotMatch(soLer, /com-itens/);
});

test('C109: o destino pelo ponto do ponteiro: o quadrado sob ele, menos o quadrado do item onde foi pego', () => {
  const mochila = LUGARES.find(lugar => lugar.id === 'mochila');
  const caixa = { left: 100, top: 50, width: 136, height: 136 };
  assert.deepEqual(destinoDoPonto(mochila, caixa, { x: 100, y: 50 }), { lugar: 'mochila', x: 0, y: 0, girado: false });
  assert.deepEqual(destinoDoPonto(mochila, caixa, { x: 175, y: 120 }), { lugar: 'mochila', x: 2, y: 2, girado: false });
  assert.deepEqual(destinoDoPonto(mochila, caixa, { x: 235, y: 185 }, { x: 1, y: 0 }, true), { lugar: 'mochila', x: 2, y: 3, girado: true });
  // Fora da grade, o destino sai dela (o conferir diz "passa da borda").
  assert.deepEqual(destinoDoPonto(mochila, caixa, { x: 90, y: 40 }), { lugar: 'mochila', x: -1, y: -1, girado: false });
});

test('C109: o cursor do teclado anda sem passar da borda, troca de lugar com PageUp e PageDown e gira com R', () => {
  const bolsos = { lugar: 'bolsos', x: 0, y: 0, girado: false };
  assert.deepEqual(moverCursor(bolsos, 'ArrowRight', LUGARES), { ...bolsos, x: 1 });
  assert.deepEqual(moverCursor(bolsos, 'ArrowLeft', LUGARES), bolsos);
  assert.deepEqual(moverCursor(bolsos, 'ArrowUp', LUGARES), bolsos);
  assert.deepEqual(moverCursor({ ...bolsos, x: 3, y: 1 }, 'ArrowRight', LUGARES), { ...bolsos, x: 3, y: 1 });
  assert.deepEqual(moverCursor({ ...bolsos, x: 3, y: 1 }, 'ArrowDown', LUGARES), { ...bolsos, x: 3, y: 1 });
  assert.deepEqual(moverCursor({ ...bolsos, x: 2, y: 0 }, 'ArrowDown', LUGARES), { ...bolsos, x: 2, y: 1 });
  const ordem = LUGARES.map(lugar => lugar.id);
  assert.deepEqual(moverCursor({ ...bolsos, x: 2 }, 'PageDown', LUGARES), { ...bolsos, lugar: ordem[ordem.indexOf('bolsos') + 1] });
  assert.deepEqual(moverCursor(bolsos, 'PageUp', LUGARES), { ...bolsos, lugar: ordem[ordem.indexOf('bolsos') - 1] });
  assert.deepEqual(moverCursor({ ...bolsos, lugar: ordem[0] }, 'PageUp', LUGARES), { ...bolsos, lugar: ordem.at(-1) });
  assert.deepEqual(moverCursor({ ...bolsos, lugar: ordem.at(-1) }, 'PageDown', LUGARES), { ...bolsos, lugar: ordem[0] });
  assert.deepEqual(moverCursor(bolsos, 'r', LUGARES), { ...bolsos, girado: true });
  assert.deepEqual(moverCursor({ ...bolsos, girado: true }, 'R', LUGARES), bolsos);
  // No encaixe e na lista, as setas não andam.
  assert.deepEqual(moverCursor({ ...bolsos, lugar: 'coldre' }, 'ArrowRight', LUGARES), { ...bolsos, lugar: 'coldre' });
  assert.equal(moverCursor(bolsos, 'Enter', LUGARES), null);
  assert.equal(moverCursor({ ...bolsos, lugar: 'sumiu' }, 'ArrowRight', LUGARES), null);
});

test('C109: a tela não usa o Foundry nem o DOM no carregamento (a wiki usa o mesmo arquivo); a ficha tem a aba e o estilo', () => {
  const fonte = fs.readFileSync(new URL('../../foundry-sistema/scripts/compartilhado/grade-ui.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(fonte, /\b(game|foundry|ui|Hooks|CONFIG)\./);
  assert.deepEqual([...fonte.matchAll(/^import .* from '([^']+)';/gm)].map(m => m[1]), ['./regras-grade.mjs']);
  const ficha = fs.readFileSync(new URL('../../foundry-sistema/scripts/ficha-personagem.mjs', import.meta.url), 'utf8');
  assert.match(ficha, /\{ id: 'inventario', label: 'Inventário', icon: 'fa-solid fa-table-cells' \}/);
  assert.match(ficha, /inventario: aba\('inventario'\)/);
  const sistema = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/system.json', import.meta.url), 'utf8'));
  assert.ok(sistema.styles.some(estilo => estilo.src === 'styles/grade.css'));
  assert.ok(fs.existsSync(new URL('../../foundry-sistema/templates/personagem/inventario.hbs', import.meta.url)));
});

test('C110: a wiki serve ao jogador a tela e a regra da grade (o módulo e o que ele importa) e o CSS dela, como JavaScript', async () => {
  const { createRequire } = await import('node:module');
  const publicos = createRequire(import.meta.url)('../../arquivos-publicos.js');
  const raiz = new URL('../../', import.meta.url);
  const modulos = ['foundry-sistema/scripts/compartilhado/grade-ui.mjs'];
  // Cada import relativo de um módulo da lista entra na lista também: sem ele, a página do jogador não carrega a grade.
  for (let i = 0; i < modulos.length; i++) {
    const texto = fs.readFileSync(new URL(modulos[i], raiz), 'utf8');
    for (const [, de] of texto.matchAll(/^import [^;]*? from '(\.[^']+)';/gm)) {
      const caminho = new URL(de, new URL(modulos[i], raiz)).href.slice(raiz.href.length);
      if (!modulos.includes(caminho)) modulos.push(caminho);
    }
  }
  assert.deepEqual(modulos, ['foundry-sistema/scripts/compartilhado/grade-ui.mjs', 'foundry-sistema/scripts/compartilhado/regras-grade.mjs']);
  for (const arquivo of [...modulos, 'foundry-sistema/styles/grade.css']) assert.ok(publicos.guardados.includes(`/${arquivo}`), arquivo);
  assert.match(fs.readFileSync(new URL('server.js', raiz), 'utf8'), /'\.mjs': 'text\/javascript; charset=utf-8'/);
  // A ficha da wiki carrega o mesmo módulo e o CSS, e tem a aba.
  const criador = fs.readFileSync(new URL('criador.js', raiz), 'utf8');
  assert.match(criador, /import\(new URL\('foundry-sistema\/scripts\/compartilhado\/grade-ui\.mjs'/);
  assert.match(criador, /href: 'foundry-sistema\/styles\/grade\.css'/);
  assert.match(criador, /\['inventario', 'Inventário'\]/);
});
