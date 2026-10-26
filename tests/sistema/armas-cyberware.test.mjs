import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { dadosDaArmaMontada, ehArmaDoCyberware, ehArmaDoUpgrade, ehArmaMontadaEmItem, FLAG_DA_ARMA, FLAG_DO_UPGRADE, idDaOrigem, mudancasDaArma } from '../../foundry-sistema/scripts/armas-cyberware.mjs';
import { migrarDados, PASSOS } from '../../foundry-sistema/scripts/migracao.mjs';
import * as regras from '../../foundry-sistema/scripts/regras.mjs';

const SISTEMA = 'cpr-fieldbook';
const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const doCatalogo = (id, _id = 'cyber1') => ({ ...structuredClone(catalogo[id]), _id });

// CORE 0.92.4, os packs core/cyberware: os doze com isWeapon, e os campos do attackable e do loadable de cada um.
const resumo = id => { const a = catalogo[id].system.arma; return [a.tipo, a.pericia, a.dano, a.cdt, a.aDistancia, a.pente, a.ignorarArmadura, a.ocultavel].join(' '); };

test('Catálogo: os doze cyberwares que são arma no CORE, os cinco do Black Chrome e os quatro do Kit trazem a arma (o tipo, a perícia, o dano, o CDT, o pente); nenhum outro', () => {
  const comArma = Object.entries(catalogo).filter(([, item]) => item.type === 'cyberware' && item.system.arma?.ataca).map(([id]) => id).sort();
  assert.deepEqual(comArma, [
    ...['dartgun-cyberfinger', 'one-shot-special-cyberfinger', 'popup-net-launcher', 'popup-shotgun', 'wirecutter-scissors-cyberfingers'].map(nome => `black-chrome_cyberware:${nome}`),
    ...['big-knucks', 'cybersnake', 'dartgun', 'popup-grenade-launcher', 'popup-melee-weapon', 'popup-ranged-weapon', 'rippers', 'scratchers', 'slice-n-dice', 'talon-foot', 'vampyres', 'wolvers'].map(nome => `core_cyberware:${nome}`),
    ...['gorilla-arm', 'mantis-blade', 'monowire', 'projectile-launch-system'].map(nome => `cyberware-2077:${nome}`)
  ]);
  // Do Black Chrome (a wiki, system-blackchrome.js): a espingarda embutida com 2 tiros no pente; o One Shot Special, uma
  // pistola pesada exótica de 1 tiro; os cyberdedos alicate/tesoura, uma arma branca leve.
  assert.equal(resumo('black-chrome_cyberware:popup-shotgun'), 'shotgun shoulder-arms 5d6 1 true 2 0 false');
  assert.equal(resumo('black-chrome_cyberware:one-shot-special-cyberfinger'), 'heavyPistol handgun 3d6 2 true 1 0 true');
  assert.equal(resumo('black-chrome_cyberware:wirecutter-scissors-cyberfingers'), 'lightMelee melee-weapon 1d6 2 false 0 50 true');
  // Wolvers (p. 366): arma branca pesada, 3d6, ROF 2; a arma branca ignora metade do SP (o ignoreArmorPercent do CORE).
  assert.equal(resumo('core_cyberware:wolvers'), 'heavyMelee melee-weapon 3d6 2 false 0 50 false');
  // Big Knucks: arma branca média pela Briga, como o CORE.
  assert.equal(resumo('core_cyberware:big-knucks'), 'medMelee brawling 2d6 2 false 0 50 false');
  // Popup Ranged Weapon: pistola média de 12 balas, escondida.
  assert.equal(resumo('core_cyberware:popup-ranged-weapon'), 'medPistol handgun 2d6 1 true 12 0 true');
  assert.deepEqual(catalogo['core_cyberware:popup-ranged-weapon'].system.arma.municoes, ['medPistol']);
  // Popup Grenade Launcher: um tiro, granada.
  assert.equal(resumo('core_cyberware:popup-grenade-launcher'), 'grenadeLauncher heavy-weapons 6d6 1 true 1 0 true');
  // O que não ataca vem sem a arma (o modelo dá a de sempre, que não ataca).
  assert.equal(catalogo['core_cyberware:cyberarm'].system.arma, undefined);
});

// A wiki (system-2077.js, Cybermembros do Kit) e o módulo cpr-2077 da mesa (foundry-2077/build/cyberware.mjs).
test('Catálogo: os quatro do Kit que são arma (a Gorilla Arm e a Mantis Blade excelentes, +1; o Monowire; o Projectile Launch System, com foguete ou granada)', () => {
  const qualidade = id => { const a = catalogo[id].system.arma; return [a.bonusAtaque, a.qualidade].join(' '); };
  // Gorilla Arm: "arma branca pesada de qualidade excelente (3d6, CDT 2, +1 no ataque)".
  assert.equal(resumo('cyberware-2077:gorilla-arm'), 'heavyMelee melee-weapon 3d6 2 false 0 50 false');
  assert.equal(qualidade('cyberware-2077:gorilla-arm'), '1 excellent');
  // Mantis Blade: a mesma, "escondida sem teste".
  assert.equal(resumo('cyberware-2077:mantis-blade'), 'heavyMelee melee-weapon 3d6 2 false 0 50 true');
  assert.equal(qualidade('cyberware-2077:mantis-blade'), '1 excellent');
  // Monowire: "arma branca pesada exótica de uma mão (3d6, CDT 2)", sem a qualidade excelente.
  assert.equal(resumo('cyberware-2077:monowire'), 'heavyMelee melee-weapon 3d6 2 false 0 50 true');
  assert.equal(qualidade('cyberware-2077:monowire'), '0 standard');
  // Projectile Launch System: "lança-foguetes ou lança-granadas de uma mão com um tiro no pente".
  assert.equal(resumo('cyberware-2077:projectile-launch-system'), 'rocketLauncher heavy-weapons 8d6 1 true 1 0 true');
  assert.deepEqual(catalogo['cyberware-2077:projectile-launch-system'].system.arma.municoes, ['rocket', 'grenade']);
  assert.equal(catalogo['cyberware-2077:projectile-launch-system'].system.arma.tabelaDV, 'DV Rocket Launcher');
  // O resto do cyberware de 2077 não ataca.
  assert.equal(catalogo['cyberware-2077:ballistic-coprocessor'].system.arma, undefined);
});

// A wiki (system-2077.js): o Projectile Launch System, "com foguete, é lança-foguetes; com granada, lança-granadas"; o
// Monowire "ataca a até 6 m". Decisão do usuário (2026-10-19): só o que é conta.
test('As regras do Kit que são conta (o C11, parte 2b): o Projectile Launch System com granada é o lança-granadas do RED; com foguete, fica o lança-foguetes; a nota dos 6 m do Monowire', () => {
  const lancaGranadas = catalogo['core_weapons:grenade-launcher'].system;
  assert.deepEqual(regras.perfilPelaMunicao(regras.PROJECTILE_LAUNCH_SYSTEM, 'grenade'), { tipo: lancaGranadas.tipo, dano: lancaGranadas.dano, tabelaDV: lancaGranadas.tabelaDV });
  assert.equal(regras.perfilPelaMunicao(regras.PROJECTILE_LAUNCH_SYSTEM, 'rocket'), null);
  assert.equal(regras.perfilPelaMunicao(regras.PROJECTILE_LAUNCH_SYSTEM, undefined), null);
  // Só o do Kit: o lança-granadas embutido do CORE e as outras armas ficam como são.
  assert.equal(regras.perfilPelaMunicao('core_cyberware:popup-grenade-launcher', 'grenade'), null);
  assert.equal(regras.perfilPelaMunicao('', 'grenade'), null);
  assert.equal(catalogo[regras.MONOWIRE].system.arma.ataca, true);
  assert.equal(regras.notaDoMonowire('Capanga', 2), 'Monowire: alcança até 6 m.');
  assert.equal(regras.notaDoMonowire('Capanga', 6), 'Monowire: alcança até 6 m.');
  assert.equal(regras.notaDoMonowire('Capanga', 9.5), 'Monowire: alcança até 6 m (Capanga está a 9.5 m).');
  assert.equal(regras.notaDoMonowire('Capanga', null), 'Monowire: alcança até 6 m.');
});

test('A arma do cyberware: os dados de arma dele, sem mãos, montada nele (o instaladoEm e a flag); o que não ataca não tem', () => {
  const wolvers = doCatalogo('core_cyberware:wolvers');
  const arma = dadosDaArmaMontada(wolvers);
  assert.equal(arma.name, 'Wolvers');
  assert.equal(arma.type, 'arma');
  assert.equal(arma.img, 'icons/svg/sword.svg');
  assert.deepEqual([arma.system.tipo, arma.system.pericia, arma.system.dano, arma.system.cdt, arma.system.aDistancia, arma.system.ignorarArmadura], ['heavyMelee', 'melee-weapon', '3d6', 2, false, 50]);
  assert.deepEqual(arma.system.pente, { value: 0, max: 0 });
  assert.deepEqual([arma.system.maos, arma.system.equipada, arma.system.slots, arma.system.instaladoEm], [0, false, 0, 'cyber1']);
  assert.equal(arma.flags[SISTEMA][FLAG_DA_ARMA], 'cyber1');
  assert.ok(ehArmaDoCyberware(arma));
  assert.equal(ehArmaDoCyberware(doCatalogo('core_weapons:heavy-pistol')), false);
  const pistola = dadosDaArmaMontada(doCatalogo('core_cyberware:popup-ranged-weapon', 'cyber2'));
  assert.equal(pistola.img, 'icons/svg/target.svg');
  assert.deepEqual(pistola.system.pente, { value: 0, max: 12 });
  // A lista de munições é uma cópia: mudar a da arma não muda a do cyberware.
  pistola.system.municoes.push('heavyPistol');
  assert.deepEqual(catalogo['core_cyberware:popup-ranged-weapon'].system.arma.municoes, ['medPistol']);
  assert.equal(dadosDaArmaMontada(doCatalogo('core_cyberware:cyberarm')), null);
  assert.equal(dadosDaArmaMontada(doCatalogo('core_weapons:heavy-pistol')), null);
});

// CORE 0.92.4, core/upgrades: os três com modifiers.secondaryWeapon.configured; a wiki (system-catalog.js, Acessórios de
// arma): "a arma também serve de arma branca leve"; "também dispara como lança-granadas, com 1 granada"; "como espingarda,
// com 2 cartuchos".
test('O acessório que é arma: a baioneta, o lança-granadas e a espingarda sob o cano trazem a arma; montado na arma, dá a arma dele, com a flag do acessório', () => {
  const comArma = Object.entries(catalogo).filter(([, item]) => item.type === 'upgrade' && item.system.arma?.ataca).map(([id]) => id).sort();
  assert.deepEqual(comArma, ['core_upgrades:bayonet', 'core_upgrades:grenade-launcher-underbarrel', 'core_upgrades:shotgun-underbarrel']);
  assert.equal(resumo('core_upgrades:bayonet'), 'lightMelee melee-weapon 1d6 2 false 0 50 false');
  assert.equal(resumo('core_upgrades:grenade-launcher-underbarrel'), 'grenadeLauncher heavy-weapons 6d6 1 true 1 0 false');
  assert.deepEqual(catalogo['core_upgrades:grenade-launcher-underbarrel'].system.arma.municoes, ['grenade']);
  assert.equal(resumo('core_upgrades:shotgun-underbarrel'), 'shotgun shoulder-arms 5d6 1 true 2 0 false');
  assert.deepEqual(catalogo['core_upgrades:shotgun-underbarrel'].system.arma.municoes, ['shotgunShell', 'shotgunSlug']);
  assert.equal(catalogo['core_upgrades:smartgun-link']?.system.arma, undefined);
  const baioneta = dadosDaArmaMontada(doCatalogo('core_upgrades:bayonet', 'acessorio1'));
  assert.equal(baioneta.name, 'Bayonet');
  assert.deepEqual([baioneta.system.dano, baioneta.system.maos, baioneta.system.instaladoEm], ['1d6', 0, 'acessorio1']);
  assert.deepEqual(baioneta.flags[SISTEMA], { [FLAG_DO_UPGRADE]: 'acessorio1' });
  assert.ok(ehArmaDoUpgrade(baioneta) && ehArmaMontadaEmItem(baioneta) && !ehArmaDoCyberware(baioneta));
  assert.equal(idDaOrigem(baioneta), 'acessorio1');
  assert.equal(idDaOrigem(dadosDaArmaMontada(doCatalogo('core_cyberware:wolvers', 'cyber1'))), 'cyber1');
});

test('A arma acompanha o cyberware: o nome, o dano e o pente mudam nela; o pente atual e a munição carregada ficam', () => {
  const wolvers = doCatalogo('core_cyberware:wolvers');
  const arma = dadosDaArmaMontada(wolvers);
  assert.deepEqual(mudancasDaArma(arma, wolvers), {});
  wolvers.name = 'Wolvers do Lado Esquerdo';
  wolvers.system.arma.dano = '4d6';
  wolvers.system.arma.pente = 2;
  arma.system.pente.value = 1;
  arma.system.carregada = 'municao1';
  assert.deepEqual(mudancasDaArma(arma, wolvers), { name: 'Wolvers do Lado Esquerdo', 'system.dano': '4d6', 'system.pente.max': 2 });
  // O máximo de um carregador instalado (o prepareDerivedData) não conta: compara com o da fonte.
  assert.deepEqual(mudancasDaArma({ name: wolvers.name, system: { ...arma.system, dano: '4d6', pente: { value: 1, max: 6 } }, pente: 2 }, wolvers), {});
  wolvers.system.arma.ataca = false;
  assert.deepEqual(mudancasDaArma(arma, wolvers), {});
});

test('Migração (passo 6): o cyberware do catálogo que é arma ganha a arma uma vez; o outro e o já migrado ficam como estão', () => {
  const passo = PASSOS.find(p => p.versao === 6);
  const semArma = id => { const item = doCatalogo(id); item.system.arma = { ataca: false, dano: '1d6' }; return item; };
  const dados = { items: [semArma('core_cyberware:wolvers'), semArma('core_cyberware:cyberarm'), { ...semArma('core_cyberware:rippers'), flags: { [SISTEMA]: { catalogo: 'core_cyberware:rippers', armaMigrada: true } } }] };
  const migrar = entrada => migrarDados(entrada, { documento: 'Actor', passos: [passo], catalogo });
  const novo = migrar(dados);
  assert.deepEqual(novo.items[0].system.arma, catalogo['core_cyberware:wolvers'].system.arma);
  assert.equal(novo.items[0].flags[SISTEMA].armaMigrada, true);
  assert.deepEqual(novo.items[1].system.arma, { ataca: false, dano: '1d6' });
  assert.deepEqual(novo.items[2].system.arma, { ataca: false, dano: '1d6' });
  assert.deepEqual(migrar(novo), novo);
  assert.deepEqual(dados.items[0].system.arma, { ataca: false, dano: '1d6' });
});

test('Migração (passo 7): no mundo que já passou do 6, o cyberware do Kit ganha a arma; o do CORE já migrado fica; os dois passos juntos dão uma vez só', () => {
  const [seis, sete] = [6, 7].map(versao => PASSOS.find(p => p.versao === versao));
  const semArma = id => { const item = doCatalogo(id); item.system.arma = { ataca: false, dano: '1d6' }; return item; };
  const migrado = { ...semArma('core_cyberware:wolvers'), flags: { [SISTEMA]: { catalogo: 'core_cyberware:wolvers', armaMigrada: true } } };
  const dados = { items: [semArma('cyberware-2077:mantis-blade'), migrado] };
  const novo = migrarDados(dados, { documento: 'Actor', passos: [sete], catalogo });
  assert.deepEqual(novo.items[0].system.arma, catalogo['cyberware-2077:mantis-blade'].system.arma);
  assert.equal(novo.items[0].flags[SISTEMA].armaMigrada, true);
  assert.deepEqual(novo.items[1].system.arma, { ataca: false, dano: '1d6' });
  assert.deepEqual(migrarDados(dados, { documento: 'Actor', passos: [seis, sete], catalogo }), novo);
});

test('Migração (passo 8): no mundo que já passou do 7, o acessório que é arma ganha a arma; o outro acessório fica', () => {
  const oito = PASSOS.find(p => p.versao === 8);
  const semArma = id => { const item = doCatalogo(id); item.system.arma = { ataca: false, dano: '1d6' }; return item; };
  const dados = { items: [semArma('core_upgrades:shotgun-underbarrel'), semArma('core_upgrades:smartgun-link')] };
  const novo = migrarDados(dados, { documento: 'Actor', passos: [oito], catalogo });
  assert.deepEqual(novo.items[0].system.arma, catalogo['core_upgrades:shotgun-underbarrel'].system.arma);
  assert.equal(novo.items[0].flags[SISTEMA].armaMigrada, true);
  assert.deepEqual(novo.items[1].system.arma, { ataca: false, dano: '1d6' });
  assert.deepEqual(migrarDados(novo, { documento: 'Actor', passos: [oito], catalogo }), novo);
});
