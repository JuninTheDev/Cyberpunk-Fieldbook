// C46, parte 4: o resto pelo ator, as contas sem o Foundry. A direção pelo veículo do token (a wiki, system-rules.js:538;
// o M17 do master: o primeiro da tripulação dirige), quem dispara a arma montada (o CORE 0.92.4, os upgrades Onboard; a
// wiki, system-criacao.js:267) e a régua do veículo (system-rules.js:538, :499 e :501; system-criacao.js:266, o NOS).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { motivoDoAssento, veiculoDaDirecao } from '../../foundry-sistema/scripts/regras-tripulacao.mjs';
import {
  CORES_DA_REGUA, corDaFaixa, faixaDoGasto, faixasDoVeiculo, METROS_POR_MOVE, ROTULO_DO_VEICULO, rotuloDaFaixa, ROTULOS_DA_REGUA
} from '../../foundry-sistema/scripts/regras-regua.mjs';

const ler = relativo => fs.readFileSync(new URL('../../' + relativo, import.meta.url), 'utf8');
const wiki = ler('system-rules.js');
const criacao = ler('system-criacao.js');
const upgrades = JSON.parse(ler('cyberpunk-red-core/babele/en/cyberpunk-red-core.core_upgrades.json')).entries;
const texto = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

test('C46.4 a wiki e o CORE ainda dizem isto do motorista, das armas montadas e do NOS', () => {
  assert.ok(wiki.includes('o MOVE do veículo passa a ser o dele e ele não usa mais Ações de Movimento.'));
  assert.ok(wiki.includes("['Ação de Movimento', 'Anda até MOVE × 2 m (ou MOVE quadrados no grid).']"));
  assert.ok(wiki.includes("['Correr', 'Uma Ação de Movimento extra (só se já usou a Ação de Movimento no turno).']"));
  assert.match(criacao, /id: 'Onboard Flamethrower'.*desc: 'O motorista dispara com a Ação\. Não recarrega dirigindo\.'/);
  assert.match(criacao, /id: 'NOS'.*desc: 'Uma Ação de Movimento a mais ao dirigir/);
  assert.ok(texto(upgrades['Onboard Machine Gun'].description).includes('The driver may fire it using an Action, cannot be reloaded while driving'));
  assert.ok(texto(upgrades['Onboard Flamethrower'].description).includes('The driver may fire it using an Action. It cannot be reloaded while driving'));
  assert.ok(texto(upgrades['Onboard Melee Weapon'].description).includes('The driver may attack with it using an Action.'));
  assert.ok(texto(upgrades.NOS.description).includes('use an additional Move Action while driving'));
});

test('C46.4 direção: o motorista do token dirige aquele veículo, também o de NPC ou de outro dono; o passageiro, nenhum', () => {
  const npc = { nome: 'carro de NPC' }, deOutro = { nome: 'item do outro dono' }, proprio = { nome: 'o do C40' };
  const dentro = veiculo => ({ ocupantes: ['motorista', 'passageiro'], veiculo });
  // O primeiro da tripulação dirige, mesmo com o próprio carro do C40 em "Dirigindo".
  assert.equal(veiculoDaDirecao({ tokenId: 'motorista', dentro: dentro(npc) }), npc);
  assert.equal(veiculoDaDirecao({ tokenId: 'motorista', dentro: dentro(deOutro), proprio }), deOutro);
  // Dentro, quem não é o primeiro não dirige: nem aquele veículo nem o próprio.
  assert.equal(veiculoDaDirecao({ tokenId: 'passageiro', dentro: dentro(npc), proprio }), null);
  assert.equal(veiculoDaDirecao({ tokenId: null, dentro: dentro(npc), proprio }), null);
  assert.equal(veiculoDaDirecao({ tokenId: 'motorista', dentro: { ocupantes: [], veiculo: npc } }), null);
  // Fora: o caso de hoje (o C40) continua; o próprio com token na cena se dirige de dentro.
  assert.equal(veiculoDaDirecao({ proprio }), proprio);
  assert.equal(veiculoDaDirecao({ tokenId: 'motorista', proprio }), proprio);
  assert.equal(veiculoDaDirecao({ proprio, proprioNaCena: true }), null);
  assert.equal(veiculoDaDirecao({}), null);
  assert.equal(veiculoDaDirecao(), null);
});

test('C46.4 armas montadas: dentro, só o motorista dispara, e só as daquele veículo; fora, o C15 sem o token na cena', () => {
  const recusas = {
    outro: 'Esta arma montada é de outro veículo.',
    passageiro: 'Só o motorista dispara a arma montada do veículo.',
    entrar: 'Entre no veículo como motorista para usar a arma montada.',
    selecionar: 'Selecione o veículo desta arma antes de atacar.'
  };
  // O motorista, dono ou não, com as armas do veículo em que está.
  assert.equal(motivoDoAssento({ dentro: true, motorista: true, doVeiculo: true, naCena: true, dono: false }), '');
  assert.equal(motivoDoAssento({ dentro: true, motorista: true, doVeiculo: true, naCena: true, dono: true, emUso: false }), '');
  // O passageiro (também o dono) e a arma de outro veículo.
  assert.equal(motivoDoAssento({ dentro: true, motorista: false, doVeiculo: true, naCena: true, dono: true, emUso: true }), recusas.passageiro);
  assert.equal(motivoDoAssento({ dentro: true, motorista: true, doVeiculo: false, naCena: false, dono: true, emUso: true }), recusas.outro);
  assert.equal(motivoDoAssento({ dentro: true, motorista: false, doVeiculo: false }), recusas.outro);
  // Fora, com o token do veículo na cena: ninguém, nem o dono com ele em uso.
  assert.equal(motivoDoAssento({ naCena: true, dono: true, emUso: true }), recusas.entrar);
  // Fora, sem o token: o C15 (o dono com o veículo em uso); quem não é o dono, não.
  assert.equal(motivoDoAssento({ emUso: true }), '');
  assert.equal(motivoDoAssento({ emUso: false }), recusas.selecionar);
  assert.equal(motivoDoAssento({ dono: false, emUso: true }), recusas.entrar);
  assert.equal(motivoDoAssento(), recusas.selecionar);
});

test('C46.4 régua: o veículo anda a velocidade de combate × 2 m numa faixa só, na cor da Ação de Movimento, sem Correr', () => {
  // A tabela da wiki (:538): Moto estradeira MOVE 20, Carro esportivo 40, Superbike 60; MOVE × 2 m (:499).
  const tabela = /table\(\['Veículo terrestre', 'PDE', 'Assentos', 'MOVE', 'Custo'\], \[(.*?)\], 'dense'\)/.exec(wiki);
  assert.ok(tabela, 'a tabela dos veículos terrestres da wiki');
  const move = Object.fromEntries([...tabela[1].matchAll(/\['([^']+)', '\d+', '\d+', '(\d+)', '[^']+'\]/g)].map(([, nome, valor]) => [nome, Number(valor)]));
  assert.deepEqual(move, { 'Moto estradeira': 20, Superbike: 60, 'Carro compacto': 20, 'Carro esportivo': 40, Supercarro: 60 });
  assert.equal(METROS_POR_MOVE, 2);
  assert.deepEqual(faixasDoVeiculo(move['Moto estradeira']), { veiculo: 40 });
  assert.deepEqual(faixasDoVeiculo(move['Carro esportivo']), { veiculo: 80 });
  assert.deepEqual(faixasDoVeiculo(move.Superbike), { veiculo: 120 });
  for (const ruim of [0, -5, NaN, undefined, null, 'x']) assert.deepEqual(faixasDoVeiculo(ruim), { veiculo: 0 }, String(ruim));
  const carro = faixasDoVeiculo(20);
  const casos = [[0, 'veiculo'], [20, 'veiculo'], [40, 'veiculo'], [40.004, 'veiculo'], [40.01, 'longe'], [60, 'longe'], [80, 'longe'], [Infinity, 'longe']];
  for (const [gasto, faixa] of casos) assert.equal(faixaDoGasto(gasto, carro), faixa, String(gasto));
  for (const gasto of [NaN, undefined, null, '20', -2]) assert.equal(faixaDoGasto(gasto, carro), null, String(gasto));
  // MOVE 0 (o veículo parado na ficha): longe demais desde o começo.
  for (const gasto of [0, 2]) assert.equal(faixaDoGasto(gasto, faixasDoVeiculo(0)), 'longe');
  // A cor e o rótulo: a da Ação de Movimento (o "walk" do CORE) e "Velocidade de combate"; Andar e Correr não mudam.
  assert.equal(corDaFaixa('veiculo'), CORES_DA_REGUA.andar);
  assert.equal(corDaFaixa('longe'), CORES_DA_REGUA.longe);
  assert.equal(corDaFaixa('correr'), CORES_DA_REGUA.correr);
  assert.equal(ROTULO_DO_VEICULO, 'Velocidade de combate');
  assert.equal(rotuloDaFaixa('veiculo'), 'Velocidade de combate');
  assert.equal(rotuloDaFaixa('andar'), ROTULOS_DA_REGUA.andar);
  assert.equal(rotuloDaFaixa('longe'), undefined);
  assert.equal(faixaDoGasto(10, { andar: 8, correr: 16 }), 'correr');
});
