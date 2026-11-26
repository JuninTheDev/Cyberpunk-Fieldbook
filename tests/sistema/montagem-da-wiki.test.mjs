// A montagem segue a regra da wiki (o C98; as decisões do usuário de 2026-11-26 sobre as dúvidas do C68 ao C75): a
// armadura vestida e a NET arrastam da ficha (o cyberware e as lesões não); o acessório no Foundry cabe só onde a Montagem
// da wiki deixa (criador.js, accessoryFits; personagem-bancada.js, acessorioCabe); o Compensador só em arma com autofogo; o
// cabo balanceado dá +1 no arremesso.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import * as R from '../../foundry-sistema/scripts/regras.mjs';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';

const require = createRequire(import.meta.url);
const B = require('../../personagem-bancada.js');
const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const janela = arquivo => { const contexto = { window: {} }; vm.runInNewContext(ler(arquivo), contexto); return contexto.window; };
const loja = JSON.parse(JSON.stringify(janela('loja-catalogo.js').shopCatalog.itens));
const daLoja = new Map(loja.map(item => [item.id, item]));
const modsDaWiki = JSON.parse(JSON.stringify(janela('system-modificacoes.js').systemModificacoes.data.mods));
const catalogo = Object.values(JSON.parse(ler('foundry-sistema/dados/catalogo.json')).itens);
const idDe = item => item.flags['cpr-fieldbook'].catalogo;
const doCatalogo = id => catalogo.find(item => idDe(item) === id);
const bloco = (texto, inicio) => texto.slice(texto.indexOf(inicio), texto.indexOf('{{/each}}', texto.indexOf(inicio)));
// O documentos.mjs (paraAcessorios), sem o Foundry: a exótica pela flag de 2077, pelos slots ou pela descrição.
const paraAcessorios = item => {
  const s = item.system;
  const exotica = item.flags['cpr-fieldbook'].arma2077?.exotica ?? (R.armaExotica({ slots: s.slots }) || /\bexotic\b/i.test(s.descricao ?? ''));
  return { aDistancia: s.aDistancia, slots: s.slots, tipo: s.tipo, dano: s.dano, maos: s.maos, exotica: Boolean(s.aDistancia) && exotica };
};

test('C98: a armadura vestida, os cyberdecks e os programas arrastam da ficha; o cyberware e as lesões não', () => {
  assert.match(bloco(ler('foundry-sistema/templates/personagem/bloco-armadura.hbs'), '{{#each armaduras}}'), /<li data-item-id="\{\{id\}\}" class="draggable /);
  const net = ler('foundry-sistema/templates/personagem/net.hbs');
  assert.match(bloco(net, '{{#each decks}}'), /<li data-item-id="\{\{id\}\}" class="draggable /);
  assert.match(bloco(net, '{{#each programas}}'), /<li class="draggable" data-item-id="\{\{id\}\}">/);
  // O cyberware instalado arrastado para outra ficha passaria por fora da cirurgia.
  assert.doesNotMatch(ler('foundry-sistema/templates/personagem/cyberware.hbs'), /draggable/);
  assert.doesNotMatch(ler('foundry-sistema/templates/personagem/bloco-lesoes.hbs'), /draggable/);
  // A arma da ficha passa o que o encaixe lê (a exótica pela descrição; a Heavy SMG pelo dano).
  const documentos = ler('foundry-sistema/scripts/documentos.mjs');
  assert.match(documentos, /get paraAcessorios\(\) \{\r?\n    const \{ aDistancia, slots, tipo, dano, maos \} = this\.system;\r?\n    const exotica = this\.getFlag\(SISTEMA, 'arma2077'\)\?\.exotica \?\? \(armaExotica\(\{ slots \}\) \|\| \/\\bexotic\\b\/i\.test\(this\.system\.descricao \?\? ''\)\);/);
  // O arrasto e a bancada passam pelo encaixe; o Rebuild, pelas regras dele.
  assert.match(documentos, /const encaixe = rebuild \? \{ cabe: true \} : encaixeDoAcessorio\(arma\.paraAcessorios, this\.getFlag\(SISTEMA, 'catalogo'\)\);/);
  assert.match(ler('foundry-sistema/scripts/montagem-da-arma.mjs'), /const encaixe = encaixeDoAcessorio\(arma\.paraAcessorios, acessorio\.getFlag\(SISTEMA, 'catalogo'\)\);\r?\n  if \(!encaixe\.cabe\) return encaixe;/);
});

test('C98: onde o acessório serve, como a Montagem da wiki', () => {
  const fuzil = { aDistancia: true, exotica: false, slots: 3, tipo: 'assaultRifle', dano: '5d6', maos: 2 };
  const pistola = { aDistancia: true, exotica: false, slots: 3, tipo: 'heavyPistol', dano: '3d6', maos: 1 };
  const sim = { cabe: true, motivo: '' };
  assert.deepEqual(R.encaixeDoAcessorio(fuzil, 'core_upgrades:extended-magazine-assault-rifle'), sim);
  assert.deepEqual(R.encaixeDoAcessorio(fuzil, 'core_upgrades:drum-magazine-heavy-pistol'), { cabe: false, motivo: 'só em pistola pesada' });
  assert.deepEqual(R.encaixeDoAcessorio(pistola, 'core_upgrades:extended-magazine-heavy-pistol'), sim);
  assert.deepEqual(R.encaixeDoAcessorio(pistola, 'core_upgrades:grenade-launcher-underbarrel'), { cabe: false, motivo: 'só em arma de duas mãos' });
  assert.deepEqual(R.encaixeDoAcessorio(fuzil, 'core_upgrades:shotgun-underbarrel'), sim);
  assert.deepEqual(R.encaixeDoAcessorio({ ...fuzil, aDistancia: false }, 'core_upgrades:bayonet'), { cabe: false, motivo: 'acessório só em arma de longo alcance' });
  assert.deepEqual(R.encaixeDoAcessorio({ ...fuzil, exotica: true }, 'core_upgrades:sniping-scope'), { cabe: false, motivo: 'a arma exótica não leva acessório' });
  assert.deepEqual(R.encaixeDoAcessorio({ ...fuzil, slots: 0 }, 'core_upgrades:sniping-scope'), { cabe: false, motivo: 'a arma não tem slots de acessório' });
  // A Heavy SMG do CORE é uma SMG de 3d6: o carregador dela é o da Heavy SMG, não o da SMG.
  const pesada = { aDistancia: true, exotica: false, slots: 3, tipo: 'smg', dano: '3d6', maos: 1 };
  assert.deepEqual(R.encaixeDoAcessorio(pesada, 'core_upgrades:extended-magazine-heavy-smg'), sim);
  assert.deepEqual(R.encaixeDoAcessorio(pesada, 'core_upgrades:extended-magazine-smg'), { cabe: false, motivo: 'só em submetralhadora' });
  assert.deepEqual(R.encaixeDoAcessorio({ ...pesada, dano: '2d6' }, 'core_upgrades:extended-magazine-smg'), sim);
  // O acessório feito à mão (sem catálogo) só tem a regra da arma.
  assert.deepEqual(R.encaixeDoAcessorio(pistola, ''), sim);
});

test('C98: em toda arma e todo acessório do catálogo, o Foundry diz o mesmo que a bancada da wiki (a arma vazia)', () => {
  const armas = catalogo.filter(item => item.type === 'arma' && daLoja.has(idDe(item)));
  const acessorios = catalogo.filter(item => item.type === 'upgrade' && item.system.alvo === 'arma' && !item.flags['cpr-fieldbook'].mod
    && !item.flags['cpr-fieldbook'].arma2077?.rebuild && daLoja.has(idDe(item)));
  assert.ok(armas.length > 150 && acessorios.length > 25);
  const diferentes = new Set();
  for (const arma of armas) {
    const modelo = B.daCriacao({ uid: 'x', nome: arma.name, item: daLoja.get(idDe(arma)) });
    for (const acessorio of acessorios) {
      const encaixe = R.encaixeDoAcessorio(paraAcessorios(arma), idDe(acessorio));
      const noFoundry = encaixe.cabe ? R.acessorioCabe({ slots: arma.system.slots, usados: 0, tamanho: acessorio.system.tamanho }).cabe : false;
      if (noFoundry !== B.acessorioCabe(modelo, daLoja.get(idDe(acessorio))).cabe) diferentes.add(idDe(arma));
    }
  }
  // O Pulsar: a página do 2077 diz que não é exótico (o Foundry), e a loja da wiki diz que é (MIGRATION_STATUS, Dúvidas).
  assert.deepEqual([...diferentes], ['armas-2077:darra-polytechnic-ds1-pulsar']);
});

test('C98: o Compensador só em arma com autofogo, no Foundry e na bancada da wiki', () => {
  const compensador = doCatalogo('mods-armas:compensador').flags['cpr-fieldbook'].mod;
  assert.deepEqual(compensador.encaixe, { aDistancia: true, autofogo: true });
  const armaDe = id => { const s = doCatalogo(id).system; return { aDistancia: s.aDistancia, slots: s.slots, qualidade: s.qualidade, tipo: s.tipo, autofogo: Number(s.autofogo) > 0 }; };
  assert.deepEqual(M.modCabe(armaDe('core_weapons:assault-rifle'), [], compensador), { cabe: true, motivo: '' });
  assert.deepEqual(M.modCabe(armaDe('core_weapons:heavy-pistol'), [], compensador), { cabe: false, motivo: 'esta modificação só serve em arma com autofogo' });
  // A wiki: a da criação pela loja (o arma.mods.autofogo), a da mesa pela bancada que o Foundry manda.
  const daWiki = modsDaWiki.find(mod => mod.id === 'compensador');
  const fuzil = B.daCriacao({ uid: 'f', nome: 'Fuzil', item: daLoja.get('core_weapons:assault-rifle') });
  const pistola = B.daCriacao({ uid: 'p', nome: 'Pistola', item: daLoja.get('core_weapons:heavy-pistol') });
  assert.equal(fuzil.autofogo, true);
  assert.deepEqual(B.modCabe(fuzil, [], daWiki), { cabe: true, motivo: '' });
  assert.deepEqual(B.modCabe(pistola, [], daWiki), { cabe: false, motivo: 'só serve em arma com autofogo' });
  assert.match(ler('foundry-sistema/scripts/wiki.mjs'), /autofogo: Number\(arma\.system\.autofogo\) > 0\r?\n  \};/);
  // A página da regra diz onde ele serve.
  assert.match(ler('system-modificacoes.js'), /if \(encaixe\.autofogo\) return 'arma de longo alcance com autofogo';/);
});

test('C98: o cabo balanceado dá +1 no ataque arremessado, e o combate diz quando é arremesso', () => {
  const cabo = doCatalogo('mods-armas:cabo-balanceado').flags['cpr-fieldbook'].mod;
  assert.equal(M.validarMod(cabo), '');
  assert.ok(M.ehDeAtaque(cabo));
  assert.equal(M.avaliar({ arremesso: true }, { arremesso: true }), true);
  assert.equal(M.avaliar({ arremesso: true }, { arremesso: false }), false);
  assert.equal(M.avaliar({ arremesso: true }, {}), null);
  assert.deepEqual(M.efeitosDoAtaque([cabo], { modo: 'tiro', arremesso: true }).situacionais.map(({ valor, ligado }) => [valor, ligado]), [[1, true]]);
  assert.deepEqual(M.efeitosDoAtaque([cabo], { modo: 'tiro', arremesso: false }).situacionais, []);
  // O ataque passa o arremesso para os situacionais, e a ficha os lê com ele.
  assert.match(ler('foundry-sistema/scripts/combate.mjs'), /atacante\.situacionaisDoAtaque\(arma, \{ [^}]*arremesso: Boolean\(arremesso\) \}\)/);
  assert.match(ler('foundry-sistema/scripts/documentos.mjs'), /const contexto = \{ [^}]*dono, arremesso \};/);
});
