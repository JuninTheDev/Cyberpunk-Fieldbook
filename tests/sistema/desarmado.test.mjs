// Briga e Artes Marciais (o C10): o dano pela tabela do BODY, como a wiki da mesa (system-rules.js, "Briga e artes
// marciais", p. 176–178) e o CORE (getWeaponDamage); o cyberbraço, que só vale na Briga; a forma das Artes Marciais com
// que a arma ataca; o ponto mínimo na perícia; e as duas armas do catálogo, que trazem o resto da regra (a metade do SP
// e a CDT 2).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { artesMarciaisLiberadas, DANO_PELO_BODY, danoDesarmado, ehDesarmada, formaDasArtesMarciais } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

// A tabela da wiki: as linhas do brawlTable, com o "até que BODY" de cada uma ("4 ou menos", "5 a 6", "11 ou mais").
function tabelaDaWiki() {
  const texto = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const bloco = texto.match(/const brawlTable = table\(\[[^\]]*\], \[([\s\S]*?)\], 'dense'\)/);
  assert.ok(bloco, 'a tabela de Briga da wiki (brawlTable) não foi achada em system-rules.js');
  return [...bloco[1].matchAll(/\['([^']+)', '(\d+d6)'\]/g)].map(([, faixa, dano]) => {
    const ate = /ou mais/.test(faixa) ? Infinity : Number((faixa.match(/^(\d+) a (\d+)/) ?? faixa.match(/^(\d+) ou menos/)).at(-1));
    return [ate, dano];
  });
}

test('a tabela do dano pelo BODY é a da wiki (Briga e artes marciais, p. 176)', () => {
  assert.deepEqual(DANO_PELO_BODY, tabelaDaWiki());
});

test('o dano pelo BODY nas bordas da tabela, e o cyberbraço só na Briga (pelo menos 2d6)', () => {
  const casos = [[1, '1d6'], [4, '1d6'], [5, '2d6'], [6, '2d6'], [7, '3d6'], [10, '3d6'], [11, '4d6'], [14, '4d6']];
  for (const [body, dano] of casos) {
    assert.equal(danoDesarmado({ body, tipo: 'unarmed' }), dano, `Briga, BODY ${body}`);
    assert.equal(danoDesarmado({ body, tipo: 'martialArts' }), dano, `Artes Marciais, BODY ${body}`);
  }
  assert.equal(danoDesarmado({ body: 3, tipo: 'unarmed', cyberbraco: true }), '2d6');
  assert.equal(danoDesarmado({ body: 4, tipo: 'martialArts', cyberbraco: true }), '1d6');
  assert.equal(danoDesarmado({ body: 8, tipo: 'unarmed', cyberbraco: true }), '3d6');
  assert.equal(danoDesarmado({ body: 0, tipo: 'unarmed' }), '1d6');
});

test('a arma de Artes Marciais da família toda ataca com a forma de mais pontos; a de uma forma, com ela', () => {
  const pericias = {
    brawling: { nivel: 6, familia: '' },
    'martial-arts-aikido': { nivel: 2, familia: 'martial-arts', nome: 'Aikido' },
    'martial-arts-karate': { nivel: 4, familia: 'martial-arts', nome: 'Karatê' },
    'martial-arts-judo': { nivel: 4, familia: 'martial-arts', nome: 'Judô' }
  };
  assert.equal(formaDasArtesMarciais('martial-arts', pericias), 'martial-arts-karate');
  assert.equal(formaDasArtesMarciais('martial-arts-aikido', pericias), 'martial-arts-aikido');
  assert.equal(formaDasArtesMarciais('martial-arts', { brawling: { nivel: 6, familia: '' } }), 'martial-arts');
  assert.equal(formaDasArtesMarciais('martial-arts', undefined), 'martial-arts');
  assert.equal(formaDasArtesMarciais('melee-weapon', pericias), 'melee-weapon');
});

test('as Artes Marciais pedem pelo menos 1 ponto na perícia', () => {
  assert.equal(artesMarciaisLiberadas(0), false);
  assert.equal(artesMarciaisLiberadas(undefined), false);
  assert.equal(artesMarciaisLiberadas(1), true);
});

test('as armas do catálogo trazem o resto da regra: a Briga não ignora armadura; as Artes Marciais ignoram metade e têm CDT 2', () => {
  const briga = catalogo['core_weapons:unarmed'];
  const artes = catalogo['core_weapons:martial-arts'];
  assert.ok(ehDesarmada(briga.system.tipo) && ehDesarmada(artes.system.tipo));
  assert.deepEqual([briga.system.pericia, briga.system.ignorarArmadura, briga.system.aDistancia], ['brawling', 0, false]);
  assert.deepEqual([artes.system.pericia, artes.system.ignorarArmadura, artes.system.cdt, artes.system.aDistancia], ['martial-arts', 50, 2, false]);
  assert.equal(ehDesarmada('medMelee'), false);
});
