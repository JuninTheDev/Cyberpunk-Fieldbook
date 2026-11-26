// Pôr o upgrade na arma sem depender do arrasto (o C75; pedido do usuário de 2026-11-26: no inventário "não é possível
// arrastar" o upgrade até a bancada, e "um botão que mostre todos os upgrades que o personagem tem no inventário e podem
// ser colocados naquela arma"). O Foundry 14 só arrasta da ficha o que tem a classe "draggable" (o _dragDrop do
// ActorSheetV2: dragSelector ".draggable"); a linha dos upgrades não tinha. O resto (as janelas e a instalação) é do G4.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ler = arquivo => fs.readFileSync(new URL(`../../foundry-sistema/${arquivo}`, import.meta.url), 'utf8');
const equipamento = ler('templates/personagem/equipamento.hbs');
const bloco = (texto, inicio) => texto.slice(texto.indexOf(inicio), texto.indexOf('{{/each}}', texto.indexOf(inicio)));

test('C75: a linha do upgrade (e a da arma e a do veículo) arrasta da aba Equipamento', () => {
  for (const lista of ['{{#each upgrades}}', '{{#each armas}}', '{{#each veiculos}}']) {
    assert.match(bloco(equipamento, lista), /<li [^>]*class="draggable[^"]*"[^>]*data-item-id="\{\{id\}\}"|<li data-item-id="\{\{id\}\}" class="draggable/, `${lista}: a linha arrasta`);
  }
});

test('C75: o "Instalar em…" do upgrade solto, o "Bancada" da arma e o "Escolher do inventário" da bancada', () => {
  assert.match(bloco(equipamento, '{{#each upgrades}}'), /\{\{#if instalarEm\}\}<button type="button" class="acao" data-action="instalarEmArma"/);
  assert.match(bloco(equipamento, '{{#each armas}}'), /data-action="abrirBancada"/);
  const item = ler('templates/item.hbs');
  assert.match(item, /\{\{#if podeVerMontagem\}\}<div class="escolher-da-bancada"><button type="button" class="acao" data-action="escolherDoInventario">ESCOLHER DO INVENTÁRIO<\/button>/);
  const ficha = ler('scripts/ficha-personagem.mjs');
  assert.match(ficha, /instalarEmArma: FichaPersonagem\.#instalarEmArma, abrirBancada: FichaPersonagem\.#abrirBancada/);
  assert.match(ficha, /instalarEm: !u\.system\.instaladoEm && Boolean\(tipoDaPeca\(u\)\) && this\.isEditable/);
  // A conta do acessório é uma só (a bancada e as janelas novas usam a mesma).
  assert.match(ler('scripts/ficha-item.mjs'), /import \{ abrirEscolha, compatibilidadeDoAcessorio \} from '\.\/montagem-da-arma\.mjs';/);
  assert.doesNotMatch(ler('scripts/ficha-item.mjs'), /function compatibilidadeDoAcessorio/);
});
