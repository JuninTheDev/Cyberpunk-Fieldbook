// C37: system-rules.js:16–24, :516 e :535 (p. 173/177); conta do arremesso sem Foundry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { baseArremesso, dvArremesso } from '../../foundry-sistema/scripts/arremesso-regras.mjs';
import { dvDoArremesso, ehArremesso, ignorarNoArremesso, podeArremessar, rolarDanoDoArremesso } from '../../foundry-sistema/scripts/arremessar.mjs';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';
import { TABELAS_DV } from '../../foundry-sistema/scripts/gerado.mjs';

const textoDaWiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
const contexto = { window: {} };
vm.runInNewContext(textoDaWiki, contexto);
const wiki = contexto.window.systemRules.data;
const dvs = Array.from(wiki.rangeDV.find(linha => linha.id === 'grenade').dv);
const limites = Array.from(wiki.rangeBandLimits);
const tabela = limites.map((maximo, indice) => [indice ? limites[indice - 1] + 1 : 0, maximo, dvs[indice]]);

test('C37 arremesso: base é DEX + Atletismo, conforme a regra da wiki', () => {
  assert.ok(textoDaWiki.includes('<b>Arremessar objeto:</b> DEX + Atletismo + 1d10, até 25 m, DV da tabela do lança-granadas.'));
  // Os operandos são exemplos de ficha; os resultados vêm da soma indicada pela fórmula da wiki, sem o d10.
  assert.equal(baseArremesso(8, 6), 14);
  assert.equal(baseArremesso(3, 5), 8);
  assert.equal(baseArremesso(8, 0), 8);
  assert.equal(baseArremesso(0, 6), 6);
});

test('C37 arremesso: 5 m, 20 m e os limites das faixas usam a linha grenade lida da própria wiki', () => {
  assert.ok(textoDaWiki.includes('Objetos arremessados usam a linha do lança-granadas, até no máximo 25 m.'));
  assert.equal(dvArremesso(5, tabela), dvs[0]);
  assert.equal(dvArremesso(20, tabela), dvs[2]);
  for (let indice = 0; indice < 3; indice++) {
    const [minimo, maximo, dv] = tabela[indice];
    for (const metros of [minimo, maximo]) {
      assert.equal(dvArremesso(metros, tabela), dv, `${metros} m, ${wiki.rangeBands[indice]}`);
      assert.equal(dvArremesso(metros, TABELAS_DV['DV Grenade Launcher']), dv, `tabela gerada, ${metros} m`);
    }
  }
});

test('C37 arremesso: acima de 25 m fica fora do alcance mesmo com DV de lança-granadas disponível', () => {
  assert.equal(dvArremesso(25, tabela), dvs[2], 'o teto de 25 m é inclusivo');
  for (const metros of [25.01, 25.49, 25.5, 26, 30, 50, 100, 200, 400, 800]) {
    assert.equal(dvArremesso(metros, tabela), null, `${metros} m`);
    assert.equal(dvArremesso(metros, TABELAS_DV['DV Grenade Launcher']), null, `tabela gerada, ${metros} m`);
  }
});

test('C37 arremesso: distância inválida ou faixa sem DV não produz dificuldade utilizável', () => {
  for (const metros of [-1, -0.01, NaN, Infinity, -Infinity, undefined, null, '', 'longe']) {
    assert.equal(dvArremesso(metros, tabela), null, String(metros));
  }
  assert.equal(dvArremesso(5, []), null);
  assert.equal(dvArremesso(5, undefined), null);
  assert.equal(dvArremesso(5, [[0, 6, null]]), null);
});

test('C37 arremesso: CORE escolhe DEX para Thrown Weapon, inclusive sendo arma à distância', () => {
  // CORE 0.92.4, modules/item/mixins/cpr-attackable.js:95–102: ramo real de escolha do atributo.
  const core = fs.readFileSync(new URL('../../cyberpunk-red-core/modules/item/mixins/cpr-attackable.js', import.meta.url), 'utf8');
  const trecho = core.match(/let statName;[\s\S]*?(?=\s*const niceStatName)/)?.[0];
  assert.ok(trecho, 'ramo do atributo do ataque do CORE encontrado');
  const atributo = vm.runInNewContext(`cprWeaponData => { ${trecho} return statName; }`);
  assert.equal(atributo({ isRanged: true, weaponType: 'thrownWeapon' }), 'dex');
  assert.equal(atributo({ isRanged: true, weaponType: 'grenadeLauncher' }), 'ref');
});

const armaDeTeste = (sistema = {}, flags = {}) => ({
  type: 'arma', uuid: 'Actor.atirador.Item.faca', actor: { id: 'atirador' },
  system: { tipo: 'lightMelee', aDistancia: false, instaladoEm: '', ignorarArmadura: 50, ...sistema },
  getFlag: (escopo, chave) => escopo === SISTEMA ? flags[chave] : undefined
});

test('C37 arremesso: só arma branca solta oferece o botão; instalação permanece sob o fluxo operacional do C11', () => {
  for (const tipo of ['lightMelee', 'medMelee', 'heavyMelee', 'vHeavyMelee']) assert.equal(podeArremessar(armaDeTeste({ tipo })), true, tipo);
  for (const tipo of ['unarmed', 'brawling', 'martialArts', 'pistol', 'grenadeLauncher', 'thrownWeapon']) {
    assert.equal(podeArremessar(armaDeTeste({ tipo })), false, tipo);
  }
  assert.equal(podeArremessar(armaDeTeste({ aDistancia: true })), false);
  assert.equal(podeArremessar(armaDeTeste({ instaladoEm: 'cyberbraco' })), false);
  assert.equal(podeArremessar(armaDeTeste({}, { armaVeicular: { frontal: true } })), false);
  assert.equal(podeArremessar({ ...armaDeTeste(), type: 'equipamento' }), false);
  assert.equal(podeArremessar(null), false);
});

test('C37 arremesso: Thrown Weapon é automática e faca exige o modo explícito, preservando o golpe normal', () => {
  const faca = armaDeTeste();
  const granada = armaDeTeste({ tipo: 'thrownWeapon', aDistancia: true });
  assert.equal(ehArremesso(granada), true);
  assert.equal(ehArremesso(granada, 'arremesso'), true);
  assert.equal(ehArremesso(faca, 'arremesso'), true);
  assert.equal(ehArremesso(faca), false);
  assert.equal(ehArremesso(faca, 'mirado'), false);
  assert.equal(ehArremesso(armaDeTeste({ instaladoEm: 'cyberbraco' }), 'arremesso'), false);
  assert.equal(ehArremesso(armaDeTeste({ aDistancia: true, tipo: 'pistol' }), 'arremesso'), false);
  assert.equal(ehArremesso(null, 'arremesso'), false);
});

test('C37 arremesso: integração da DV usa a tabela real de lança-granadas e recusa 30 m', () => {
  for (const [metros, indice] of [[0, 0], [5, 0], [6, 0], [7, 1], [12, 1], [13, 2], [20, 2], [25, 2]]) {
    assert.equal(dvDoArremesso(metros), dvs[indice], `${metros} m`);
  }
  for (const metros of [25.01, 30, 50, 800, -1, NaN, Infinity]) assert.equal(dvDoArremesso(metros), null, String(metros));
});

test('C37 arremesso: faca usa SP inteiro e conserva os 50% ignorados no golpe normal', () => {
  assert.ok(textoDaWiki.includes('Arma branca arremessada não ignora metade do SP.'));
  const faca = armaDeTeste(), antes = structuredClone(faca.system);
  assert.equal(ignorarNoArremesso(faca, { arremesso: true }), 0);
  assert.equal(ignorarNoArremesso(faca, { arremesso: false }), 50);
  assert.equal(ignorarNoArremesso(faca, {}), 50);
  assert.equal(ignorarNoArremesso(faca), 50);
  assert.deepEqual(faca.system, antes);
});

async function comDanoManual(tarefa) {
  const nomes = ['game', 'fromUuid', 'ui'];
  const anteriores = nomes.map(nome => ({ nome, propria: Object.hasOwn(globalThis, nome), valor: globalThis[nome] }));
  const env = { arma: armaDeTeste(), resolvidos: [], danos: [], avisos: [], gm: true,
    ataque: { arremesso: true, modo: 'tiro', linhas: [{ resultado: 'acertou' }] } };
  const retorno = { id: 'dano' };
  env.arma.rolarDano = async opcoes => { env.danos.push({ arma: env.arma.uuid, opcoes }); return retorno; };
  env.mensagem = { getFlag: (escopo, chave) => escopo === SISTEMA ? ({ ataque: env.ataque, armaDoArremesso: env.arma.uuid })[chave] : undefined };
  globalThis.game = { user: { get isGM() { return env.gm; } } };
  globalThis.fromUuid = async uuid => { env.resolvidos.push(uuid); await env.aoResolver?.(); return env.disponivel === false ? null : env.arma; };
  globalThis.ui = { notifications: { warn: mensagem => env.avisos.push(mensagem) } };
  try { return await tarefa(env, retorno); } finally {
    for (const { nome, propria, valor } of anteriores) {
      if (propria) globalThis[nome] = valor;
      else delete globalThis[nome];
    }
  }
}

test('C37 arremesso manual: o mestre rola pela arma original com arremesso:true e preserva o ataque', async () => comDanoManual(async (env, retorno) => {
  const antes = structuredClone({ sistema: env.arma.system, ataque: env.ataque });
  assert.equal(await rolarDanoDoArremesso(env.mensagem), retorno);
  assert.deepEqual(env.resolvidos, [env.arma.uuid]);
  assert.deepEqual(env.danos, [{ arma: env.arma.uuid, opcoes: { arremesso: true, modoDoArremesso: 'tiro' } }]);
  assert.deepEqual(env.avisos, []);
  assert.deepEqual({ sistema: env.arma.system, ataque: env.ataque }, antes);
}));

test('C37 arremesso manual: Thrown Weapon conserva o modo explosivo para aplicar dano com a defesa de área', async () => comDanoManual(async (env, retorno) => {
  env.arma.system.tipo = 'thrownWeapon';
  env.arma.system.aDistancia = true;
  env.ataque.modo = 'explosivo';
  env.arma.municaoCarregada = { system: { efeito: 'armorPiercing' } };
  assert.equal(await rolarDanoDoArremesso(env.mensagem), retorno);
  assert.deepEqual(env.danos, [{ arma: env.arma.uuid, opcoes: { arremesso: true, modoDoArremesso: 'explosivo' } }]);
  assert.deepEqual(env.avisos, []);
}));

test('C37 arremesso manual: granadas de efeito sem dano não rolam os 6d6 da arma', async () => comDanoManual(async env => {
  // Wiki, system-catalog.js:191–201: venenos, EMP, sonífera, flashbang e gás aplicam o efeito; fumaça cobre a área.
  env.arma.system.tipo = 'thrownWeapon';
  env.arma.system.aDistancia = true;
  env.ataque.modo = 'explosivo';
  for (const efeito of ['poison', 'emp', 'biotoxin', 'sleep', 'flashbang', 'smoke', 'teargas']) {
    env.arma.municaoCarregada = { system: { efeito } };
    assert.equal(await rolarDanoDoArremesso(env.mensagem), null, efeito);
  }
  assert.deepEqual(env.danos, []);
  assert.deepEqual(env.avisos, Array(7).fill('Esta munição aplica seu efeito, sem rolar o dano da arma.'));
}));

test('C37 arremesso manual: relê instalação e munição após resolver o UUID da arma', async () => comDanoManual(async env => {
  env.aoResolver = async () => { env.arma.system.instaladoEm = 'cyberbraco'; };
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  assert.deepEqual(env.avisos, ['A arma deste arremesso não está mais disponível.']);
  env.arma.system.instaladoEm = '';
  env.arma.system.tipo = 'thrownWeapon';
  env.arma.system.aDistancia = true;
  env.ataque.modo = 'explosivo';
  env.arma.municaoCarregada = { system: { efeito: 'armorPiercing' } };
  env.aoResolver = async () => { env.arma.municaoCarregada = { system: { efeito: 'emp' } }; };
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  assert.deepEqual(env.danos, []);
  assert.deepEqual(env.avisos, ['A arma deste arremesso não está mais disponível.', 'Esta munição aplica seu efeito, sem rolar o dano da arma.']);
}));

test('C37 arremesso manual: jogador, cartão comum e ataque sem acerto não resolvem a arma nem rolam dano', async () => comDanoManual(async env => {
  env.gm = false;
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  env.gm = true;
  for (const ataque of [null, { arremesso: false, linhas: [{ resultado: 'acertou' }] }, { arremesso: true, linhas: [] },
    { arremesso: true, linhas: [{ resultado: 'errou' }, { resultado: 'esquivou' }, { resultado: 'fora' }] }]) {
    env.ataque = ataque;
    assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  }
  assert.deepEqual(env.resolvidos, []);
  assert.deepEqual(env.danos, []);
  assert.deepEqual(env.avisos, []);
}));

test('C37 arremesso manual: arma apagada, sem dono ou instalada depois do ataque avisa e não rola', async () => comDanoManual(async env => {
  env.disponivel = false;
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  env.disponivel = true;
  env.arma.actor = null;
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  env.arma.actor = { id: 'atirador' };
  env.arma.system.instaladoEm = 'cyberbraco';
  assert.equal(await rolarDanoDoArremesso(env.mensagem), null);
  assert.deepEqual(env.danos, []);
  assert.deepEqual(env.avisos, Array(3).fill('A arma deste arremesso não está mais disponível.'));
}));
