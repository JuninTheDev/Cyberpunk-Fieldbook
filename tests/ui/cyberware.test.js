// Opcional: node --test tests/ui/cyberware.test.js
const assert = require('node:assert/strict');
const test = require('node:test');
const { comNavegadorIsolado } = require('../lib/navegador-isolado');

test('Cyberware mostra os lados, abre a loja no alvo correto e funciona no celular', { timeout: 60000 }, async t => {
  await comNavegadorIsolado(t, async ({ comando, avaliar, ate, captura, esperar }) => {
    const fixture = {
      nome: 'V — revisão de cyberware', role: 'tech', metodo: 'pacote',
      stats: { INT: 6, REF: 6, DEX: 6, TECH: 6, COOL: 5, WILL: 6, LUCK: 4, MOVE: 6, BODY: 5, EMP: 8 },
      itens: [
        { uid: 'arm-left', id: 'core_cyberware:cyberarm', qtd: 1 },
        { uid: 'arm-right', id: 'core_cyberware:cyberarm', qtd: 1 },
        { uid: 'eye-left', id: 'core_cyberware:cybereye', qtd: 1 },
        { uid: 'leg-right', id: 'core_cyberware:cyberleg', qtd: 1 },
        { uid: 'hand', id: 'core_cyberware:tool-hand', qtd: 1 }
      ],
      montagem: {
        'arm-left': { local: 'braco-esquerdo' }, 'arm-right': { local: 'braco-direito' },
        'eye-left': { local: 'olho-esquerdo' }, 'leg-right': { local: 'perna-direita' }, hand: { em: 'arm-right' }
      }
    };
    const doc = await avaliar(`(async () => {const r=characterCreator.regras;const d={...r.blank(),...${JSON.stringify(fixture)}};d.resultado=r.result(d);const response=await fetch('/api/personagens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(!response.ok)throw new Error(await response.text());return (await response.json()).personagem;})()`);
    await avaliar(`wikiApp.openPage('ficha',{section:${JSON.stringify(doc.id)}})`);
    await ate('!!document.querySelector("[data-cc-tab=cyberware]")');
    await avaliar(`document.querySelector('[data-cc-tab=cyberware]').click()`);
    await ate('!!document.querySelector(".cy-location")');
    const texto = await avaliar('document.querySelector(".cy-screen").textContent');
    for (const local of ['Braço esquerdo', 'Braço direito', 'Olho esquerdo', 'Perna direita']) assert.ok(texto.includes(local), local);
    assert.equal(await avaliar('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'Sem rolagem lateral no computador.');
    await captura('cyberware-desktop', '.cy-screen');
    await comando('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await esperar(150);
    assert.equal(await avaliar('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'Sem rolagem lateral no celular.');
    await captura('cyberware-celular', '.cy-screen');

    // O slot transmite o membro e a base exatos, e a compra persiste os dois na API real.
    await avaliar(`document.querySelector('.cy-unit[data-cy-local="braco-direito"] [data-cy-loja]').click()`);
    await ate('!!document.querySelector(\'[data-shop-em="core_cyberware:tool-hand"]\')');
    assert.equal(await avaliar(`document.querySelector('[data-shop-em="core_cyberware:tool-hand"]').value`), 'arm-right');
    assert.equal(await avaliar(`document.querySelector('[data-shop-local="core_cyberware:tool-hand"]').value`), 'braco-direito');
    assert.equal(await avaliar('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'Seletores da loja cabem no celular.');
    await avaliar(`document.querySelector('[data-shop-buy="core_cyberware:tool-hand"]').click()`);
    await ate(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem.itens.filter(i=>i.id==='core_cyberware:tool-hand').length===2)`);
    const comprada = await avaliar(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem.resultado.itens.find(i=>i.id==='core_cyberware:tool-hand'&&i.uid!=='hand'))`);
    assert.equal(comprada.local, 'braco-direito');
    assert.equal(comprada.em, 'arm-right');

    // Equipar em outra base troca o lado herdado, sem confundir os dois cyberbraços.
    await comando('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await avaliar(`wikiApp.openPage('criador',{section:${JSON.stringify(doc.id)}})`);
    await ate('!!document.querySelector("[data-step=\\"5\\"]")');
    await avaliar(`document.querySelector('[data-step="5"]').click()`);
    await ate('!!document.querySelector("[data-mont-tab=cyberware]")');
    await avaliar(`document.querySelector('[data-mont-tab=cyberware]').click()`);
    await ate('!!document.querySelector("[data-mont-em=hand]")');
    await avaliar(`(() => {const s=document.querySelector('[data-mont-em=hand]');s.value='arm-left';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await ate(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem.resultado.itens.find(i=>i.uid==='hand')?.local==='braco-esquerdo')`);
    await avaliar(`(() => {const s=document.querySelector('[data-mont-local="leg-right"]');s.value='perna-esquerda';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await ate(`fetch('/api/personagens/${doc.id}').then(r=>r.json()).then(r=>r.personagem.montagem['leg-right']?.local==='perna-esquerda')`);
    await avaliar(`wikiApp.openPage('ficha',{section:${JSON.stringify(doc.id)}})`);
    await ate('!!document.querySelector("[data-cc-tab=cyberware]")');
    await avaliar(`document.querySelector('[data-cc-tab=cyberware]').click()`);
    assert.match(await avaliar(`document.querySelector('.cy-unit[data-cy-local="braco-esquerdo"]').textContent`), /mão de ferramentas/i);

    // Cada compra de base pede um lado e cria uma unidade independente.
    const nova = await avaliar(`fetch('/api/personagens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...characterCreator.regras.blank(),nome:'Compras por lado',role:'solo',metodo:'pacote'})}).then(r=>r.json()).then(r=>r.personagem)`);
    await avaliar(`wikiApp.openPage('ficha',{section:${JSON.stringify(nova.id)}})`);
    await ate('!!document.querySelector("[data-cc-tab=cyberware]")');
    await avaliar(`document.querySelector('[data-cc-tab=cyberware]').click()`);
    await avaliar(`document.querySelector('.cy-unit[data-cy-local="braco-esquerdo"] [data-cy-loja]').click()`);
    await ate('!!document.querySelector(\'[data-shop-local="core_cyberware:cyberarm"]\')');
    assert.equal(await avaliar(`document.querySelector('[data-shop-local="core_cyberware:cyberarm"]').value`), 'braco-esquerdo');
    await avaliar(`document.querySelector('[data-shop-buy="core_cyberware:cyberarm"]').click()`);
    await ate(`fetch('/api/personagens/${nova.id}').then(r=>r.json()).then(r=>r.personagem.itens.length===1)`);
    await avaliar(`(() => {const s=document.querySelector('[data-shop-local="core_cyberware:cyberarm"]');s.value='braco-direito';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await avaliar(`document.querySelector('[data-shop-buy="core_cyberware:cyberarm"]').click()`);
    await ate(`fetch('/api/personagens/${nova.id}').then(r=>r.json()).then(r=>r.personagem.itens.length===2)`);
    const salva = await avaliar(`fetch('/api/personagens/${nova.id}').then(r=>r.json()).then(r=>r.personagem)`);
    assert.equal(new Set(salva.itens.map(i=>i.uid)).size, 2);
    assert.deepEqual(salva.resultado.itens.filter(i=>i.id==='core_cyberware:cyberarm').map(i=>i.local).sort(), ['braco-direito', 'braco-esquerdo']);
  });
});
