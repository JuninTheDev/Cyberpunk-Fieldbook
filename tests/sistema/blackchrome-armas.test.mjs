// Testes de referência das armas do Black Chrome (o C48, parte 2; foundry-sistema/scripts/regras-black-chrome.mjs e
// build/conteudo-blackchrome.mjs), sem Foundry, pela wiki (system-blackchrome.js): a Combinação, o dano direto no HP, as
// de arremesso que continuam reduzindo o SP à metade, a munição sucata, a Pepper Shaker e os explosivos.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { dadosDaArmaMontada, ehArmaDaCombinacao, ehArmaMontadaEmItem, FLAG_DA_COMBINACAO, idDaOrigem } from '../../foundry-sistema/scripts/armas-cyberware.mjs';
import { ignorarNoArremesso, podeArremessar } from '../../foundry-sistema/scripts/arremessar.mjs';
import * as BC from '../../foundry-sistema/scripts/regras-black-chrome.mjs';
import { aplicarDano, MUNICAO_SEM_DANO } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = new URL('../../', import.meta.url);
const { itens: catalogo } = JSON.parse(fs.readFileSync(new URL('foundry-sistema/dados/catalogo.json', raiz), 'utf8'));
const wiki = fs.readFileSync(new URL('system-blackchrome.js', raiz), 'utf8');
const arma = nome => catalogo[`black-chrome_weapons:${nome}`].system;

test('Combinação: as seis armas da wiki têm o outro modo no catálogo, com o pente e a munição dele', () => {
  // As armas da wiki com o tipo "Combinação: ...": as mesmas do catálogo com o combinacao.
  const daWiki = [...wiki.matchAll(/arma\('([^']+)', \{[^}]*?tipo: 'Combinação:/g)].map(([, nome]) => nome).sort();
  const doCatalogo = Object.values(catalogo).filter(item => item.system.combinacao?.ataca).map(item => item.name).sort();
  assert.deepEqual(doCatalogo, daWiki);
  const modos = Object.fromEntries(Object.entries(catalogo).filter(([, item]) => item.system.combinacao?.ataca)
    .map(([id, item]) => [id.split(':')[1], [item.system.combinacao.modo, item.system.combinacao.tipo, item.system.combinacao.dano, item.system.combinacao.pente, item.system.combinacao.municoes.join('+'), item.system.combinacao.qualidade]]));
  assert.deepEqual(modos, {
    'pursuit-security-bouncer': ['Microwaver', 'vHeavyPistol', '0', 8, 'battery', 'standard'],
    'eagletech-survivalist': ['rifle', 'assaultRifle', '5d6', 10, 'rifle', 'standard'],
    'ktech-techhammer': ['lança-foguetes', 'rocketLauncher', '8d6', 2, 'rocket', 'standard'],
    'militech-mastiff-smg': ['espingarda', 'shotgun', '5d6', 3, 'shotgunShell+shotgunSlug', 'standard'],
    'sternmeyer-m-04-variable-assault': ['lança-granadas', 'grenadeLauncher', '6d6', 2, 'grenade', 'poor'],
    tommyknocker: ['espingarda', 'shotgun', '5d6', 2, 'shotgunShell+shotgunSlug', 'poor']
  });
  // A Survivalist não faz autofogo em nenhum modo; o primeiro modo da TechHammer é só a espingarda.
  assert.deepEqual([arma('eagletech-survivalist').combinacao.autofogo, arma('eagletech-survivalist').combinacao.supressivo], [0, false]);
  assert.deepEqual(arma('ktech-techhammer').municoes, ['shotgunShell', 'shotgunSlug']);
});

test('Combinação: o modo é uma arma ligada à principal, com o nome do modo, o pente dele e sem ocupar as mãos', () => {
  const mastiff = { ...catalogo['black-chrome_weapons:militech-mastiff-smg'], id: 'mastiff' };
  const modo = dadosDaArmaMontada(mastiff);
  assert.equal(modo.name, 'Militech Mastiff SMG (espingarda)');
  assert.deepEqual([modo.system.tipo, modo.system.pente, modo.system.maos, modo.system.instaladoEm], ['shotgun', { value: 0, max: 3 }, 0, 'mastiff']);
  assert.deepEqual(modo.flags, { 'cpr-fieldbook': { [FLAG_DA_COMBINACAO]: 'mastiff' } });
  const ligada = { ...modo, id: 'modo1' };
  assert.ok(ehArmaDaCombinacao(ligada) && ehArmaMontadaEmItem(ligada));
  assert.equal(idDaOrigem(ligada), 'mastiff');
  // O modo não tem modo (o combinacao dele vem vazio), e a arma sem Combinação não dá arma.
  assert.equal(dadosDaArmaMontada({ ...ligada, system: { ...ligada.system, combinacao: mastiff.system.combinacao } }), null);
  assert.equal(dadosDaArmaMontada({ ...catalogo['core_weapons:shotgun'], id: 'x' }), null);
});

test('Combinação: o emperramento é só do modo que disparou, menos na Sternmeyer, que emperra os dois', () => {
  assert.match(BC.falhaNaCombinacao('A arma emperrou.'), /^A arma emperrou\. Só este modo: o outro modo da arma continua funcionando\.$/);
  assert.match(BC.falhaNaCombinacao('A arma emperrou.', { emperraJunto: true }), /Emperram os dois modos da arma\.$/);
  assert.equal(BC.perfilDoBlackChrome('black-chrome_weapons:sternmeyer-m-04-variable-assault')?.emperraJunto, true);
  assert.equal(BC.perfilDoBlackChrome('black-chrome_weapons:militech-mastiff-smg'), null);
});

test('Dano direto no HP: a armadura não reduz nem se desgasta, e o lugar do corpo não multiplica', () => {
  assert.deepEqual(aplicarDano({ dano: 20, sp: 11, local: 'cabeca', direto: true }), { spEfetivo: 0, passou: true, bruto: 20, recebido: 20, ablar: false, menos: 0 });
  // Sem o direto, como antes: (20 − 11) × 2 na cabeça, e a armadura perde SP.
  assert.deepEqual(aplicarDano({ dano: 20, sp: 11, local: 'cabeca' }), { spEfetivo: 11, passou: true, bruto: 18, recebido: 18, ablar: true, menos: 0 });
});

test('Munição sucata: 1d6 a menos só em quem tem SP 1 ou mais, antes da armadura, nunca abaixo de 0', () => {
  assert.equal(BC.MENOS_DA_SUCATA, '1d6');
  assert.deepEqual(aplicarDano({ dano: 15, sp: 7, menos: 4 }), { spEfetivo: 7, passou: true, bruto: 4, recebido: 4, ablar: true, menos: 4 });
  assert.deepEqual(aplicarDano({ dano: 15, sp: 0, menos: 4 }), { spEfetivo: 0, passou: true, bruto: 15, recebido: 15, ablar: false, menos: 0 });
  assert.deepEqual(aplicarDano({ dano: 3, sp: 1, menos: 6 }), { spEfetivo: 1, passou: false, bruto: 0, recebido: 0, ablar: false, menos: 3 });
  // As seis da wiki ("flecha, pistola média, pesada e muito pesada, rifle, balote") com o efeito dela.
  const sucatas = Object.entries(catalogo).filter(([, item]) => item.type === 'municao' && item.system.efeito === BC.MUNICAO_SUCATA).map(([id, item]) => `${id.split(':')[0]}:${item.system.tipo}`);
  assert.deepEqual(sucatas.sort(), ['arrow', 'heavyPistol', 'medPistol', 'rifle', 'shotgunSlug', 'vHeavyPistol'].map(tipo => `dlc_black-chrome-plus:${tipo}`).sort());
});

test('Pepper Shaker: só autofogo (3) e fogo supressivo, o autofogo com 6 balas, e 2d6 de dano', () => {
  const id = 'black-chrome_weapons:federated-arms-pepper-shaker';
  const perfil = BC.perfilDoBlackChrome(id);
  assert.deepEqual([perfil.soRajada, perfil.balasDoAutofogo], [true, 6]);
  assert.deepEqual([catalogo[id].system.dano, catalogo[id].system.autofogo, catalogo[id].system.supressivo], ['2d6', 3, true]);
  assert.match(BC.impedimentoDoBlackChrome(perfil, 'tiro'), /só faz autofogo e fogo supressivo/);
  assert.equal(BC.impedimentoDoBlackChrome(perfil, 'autofogo'), '');
  assert.equal(BC.impedimentoDoBlackChrome(perfil, 'supressivo'), '');
  assert.equal(BC.impedimentoDoBlackChrome(null, 'tiro'), '');
});

test('Arremesso: o Boomerang, a Mono-Star e a Tomahawk continuam reduzindo o SP à metade; a Tomahawk e a Mono-Star são armas brancas', () => {
  const comMetade = Object.entries(BC.PERFIS_DO_BLACK_CHROME).filter(([, perfil]) => perfil.metadeArremessada).map(([id]) => id.split(':')[1]).sort();
  assert.deepEqual(comMetade, ['kendachi-mono-star', 'ranger-combat-boomerang', 'utility-tomahawk']);
  const doc = (nome, metade = true) => ({ type: 'arma', system: arma(nome), getFlag: () => null, perfilDoBlackChrome: metade ? BC.perfilDoBlackChrome(`black-chrome_weapons:${nome}`) : null });
  for (const nome of comMetade) assert.equal(ignorarNoArremesso(doc(nome), { arremesso: true }), 50, nome);
  // Sem o perfil, o arremesso usa o SP inteiro, como as outras armas brancas.
  assert.equal(ignorarNoArremesso(doc('utility-tomahawk', false), { arremesso: true }), 0);
  assert.deepEqual([arma('utility-tomahawk').tipo, arma('kendachi-mono-star').tipo], ['heavyMelee', 'medMelee']);
  assert.ok(podeArremessar(doc('utility-tomahawk')) && podeArremessar(doc('kendachi-mono-star')));
  assert.equal(arma('ranger-combat-boomerang').tipo, 'thrownWeapon');
});

test('Explosivos: não atacam, e o dano aplicado pelo cartão segue a regra de cada um', () => {
  const explosivos = Object.entries(BC.PERFIS_DO_BLACK_CHROME).filter(([, perfil]) => perfil.explosivo);
  // Os explosivos da wiki (o tipo "Explosivo"), todos no catálogo, sem o "ignora metade do SP" que o CORE copiou.
  const daWiki = [...wiki.matchAll(/coisa\('([^']+)', \{[^}]*?tipo: 'Explosivo'/g)].map(([, nome]) => nome).sort();
  assert.deepEqual(explosivos.map(([id]) => catalogo[id].name).sort(), daWiki);
  for (const [id, perfil] of explosivos) {
    assert.equal(catalogo[id].system.ignorarArmadura, 0, id);
    assert.match(BC.impedimentoDoBlackChrome(perfil, 'tiro'), /^é um explosivo: /, id);
  }
  const doExplosivo = nome => BC.danoDoExplosivo(BC.perfilDoBlackChrome(`black-chrome_weapons:${nome}`).explosivo);
  assert.deepEqual(doExplosivo('killchip-100-micro-bomb'), { modo: 'tiro', ablacao: null, direto: true, lesao: 'core_critical-injuries-head:brain-injury', pontoFraco: false });
  assert.deepEqual(doExplosivo('outlet-explosive'), { modo: 'explosivo', ablacao: 2, direto: false, lesao: null, pontoFraco: false });
  assert.deepEqual(doExplosivo('tr-4-detonator-fluid'), { modo: 'explosivo', ablacao: 2, direto: false, lesao: null, pontoFraco: true });
  assert.equal(doExplosivo('gunmart-door-cracker'), null);
  assert.ok(catalogo[BC.LESAO_DO_KILLCHIP]);
  assert.deepEqual(BC.PONTO_FRACO, { multiplicador: 2, ignorarPct: 100 });
});

test('Granadas: a Shuriken Tornado rola o dano por alvo e dobra a lesão do objeto estranho; a Arachnid não causa dano', () => {
  assert.ok(catalogo[BC.SHURIKEN_TORNADO]);
  assert.equal(BC.danoPorAlvo(BC.SHURIKEN_TORNADO), true);
  assert.equal(BC.danoPorAlvo('core_ammo:grenade-armor-piercing'), false);
  assert.equal(BC.lesaoDupla({ efeito: 'special', catalogo: BC.SHURIKEN_TORNADO }), true);
  assert.equal(BC.lesaoDupla({ efeito: 'expansive', catalogo: '' }), true);
  assert.equal(BC.lesaoDupla({ efeito: 'basic', catalogo: '' }), false);
  assert.equal(catalogo['black-chrome_ammo:grenade-arachnid'].system.efeito, 'arachnid');
  assert.match(MUNICAO_SEM_DANO.arachnid, /agarrado/);
  assert.match(MUNICAO_SEM_DANO.arachnid, /Briga DV15/);
});

test('Black Chrome: todo perfil é de uma arma do catálogo', () => {
  for (const id of Object.keys(BC.PERFIS_DO_BLACK_CHROME)) assert.equal(catalogo[id]?.type, 'arma', id);
});
