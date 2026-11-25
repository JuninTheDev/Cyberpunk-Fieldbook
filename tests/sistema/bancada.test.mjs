// A bancada da arma na wiki (o C70): o personagem-bancada.js, com o plano do ROADMAP (a bancada de cada arma no jeito da
// aba Cyberware, o esboço "Bancada da arma" de 2026-11-24 que o usuário aprovou) e as regras do sistema como referência:
// o que cabe num slot de modificação tem de ser o que o regras-modificacoes.modCabe aceita, para cada arma do catálogo do
// 14 e cada modificação da wiki; os slots de modificação que a loja guarda, os do slotsDeModificacao.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';
import { modsDaArma14 } from '../../loja-do-14.mjs';

const require = createRequire(import.meta.url);
const B = require('../../personagem-bancada.js');
const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const roadmap = ler('foundry-sistema/ROADMAP.md').replace(/\s+/g, ' ');
const janela = arquivo => { const contexto = { window: {} }; vm.runInNewContext(ler(arquivo), contexto); return contexto.window; };
// Fora do vm (o deepEqual compara o protótipo).
const loja = JSON.parse(JSON.stringify(janela('loja-catalogo.js').shopCatalog.itens));
const modsDaWiki = JSON.parse(JSON.stringify(janela('system-modificacoes.js').systemModificacoes.data.mods));
const catalogo = Object.values(JSON.parse(ler('foundry-sistema/dados/catalogo.json')).itens);
const idDe = item => item.flags['cpr-fieldbook'].catalogo;
const daLoja = new Map(loja.map(item => [item.id, item]));
const modDoCatalogo = new Map(catalogo.filter(item => item.flags['cpr-fieldbook'].mod).map(item => [item.flags['cpr-fieldbook'].mod.id, item.flags['cpr-fieldbook'].mod]));
const armas = catalogo.filter(item => item.type === 'arma' && daLoja.has(idDe(item)));
const paraModificacoes = item => ({ aDistancia: item.system.aDistancia, slots: item.system.slots, qualidade: item.system.qualidade, tipo: item.system.tipo,
  exotica: item.flags['cpr-fieldbook'].arma2077?.exotica ?? null, classe: item.flags['cpr-fieldbook'].arma2077?.classe ?? null });
const linhaDaLoja = id => ({ uid: `loja:${id}`, nome: daLoja.get(id).nome, item: daLoja.get(id) });

test('C70: o plano do ROADMAP e os slots de modificação da loja pela regra do sistema', () => {
  assert.match(roadmap, /C70\. O Arsenal e a bancada da arma na wiki:\*\* .*a arma em holograma, os slots de acessório e de modificação, o defeito, o teto e o que cabe em cada slot livre, e a identidade; com a ida e a volta para o Foundry/);
  assert.match(roadmap, /C74\. A bancada da arma no Foundry:\*\* pedido do usuário \(2026-11-24\)/);
  assert.ok(armas.length > 150);
  // Cada arma da loja guarda o que a regra do sistema diz (a loja-catalogo.js é gerada: node loja-do-14.mjs).
  const diferentes = armas.filter(item => JSON.stringify(daLoja.get(idDe(item)).arma.mods) !== JSON.stringify({ slots: M.slotsDeModificacao(paraModificacoes(item)), classe: paraModificacoes(item).classe, tipo: item.system.tipo }));
  assert.deepEqual(diferentes.map(idDe), []);
  assert.deepEqual(daLoja.get('core_weapons:very-heavy-pistol').arma.mods, { slots: 2, classe: null, tipo: 'vHeavyPistol' });
  assert.deepEqual(daLoja.get('core_weapons:very-heavy-pistol-poor').arma.mods, { slots: 1, classe: null, tipo: 'vHeavyPistol' });
  // A Yukimura é exótica no catálogo do 14 (a loja do CORE dizia que não): 1 slot.
  assert.deepEqual(daLoja.get('armas-2077:arasaka-hjke-11-yukimura').arma.mods, { slots: 1, classe: 'smart', tipo: 'smg' });
  // A Mono-Star é de arremesso na loja do CORE e branca média no 14: a bancada usa a do 14.
  assert.equal(daLoja.get('black-chrome_weapons:kendachi-mono-star').arma.mods.tipo, 'medMelee');
  assert.deepEqual(modsDaArma14(catalogo.find(item => idDe(item) === 'core_weapons:very-heavy-pistol')), { slots: 2, classe: null, tipo: 'vHeavyPistol' });
  // O loja-do-14.mjs grava o mesmo que a loja tem, em toda arma (a classe de 2077 inclusive).
  assert.deepEqual(armas.filter(item => JSON.stringify(modsDaArma14(item)) !== JSON.stringify(daLoja.get(idDe(item)).arma.mods)).map(idDe), []);
});

test('C70: o que cabe num slot de modificação é o que o regras-modificacoes.modCabe aceita, em toda arma do catálogo', () => {
  const porId = new Map(modsDaWiki.map(mod => [mod.id, mod]));
  // As montagens de teste: vazia, com a mod de ataque, com o defeito, com os dois e cheia de sabor.
  const montagens = [[], ['mira-holografica'], ['gatilho-sensivel'], ['mira-holografica', 'gatilho-sensivel'], ['nome-gravado', 'acabamento-de-grife'], ['cabo-balanceado']];
  let conferidas = 0;
  const diferentes = [];
  for (const item of armas) {
    const arma = paraModificacoes(item);
    for (const ids of montagens) {
      const doCatalogo = ids.map(id => modDoCatalogo.get(id));
      const defeitos = doCatalogo.filter(mod => mod.tipo === 'defeito').length;
      const modelo = {
        ...B.daCriacao(linhaDaLoja(idDe(item))),
        pecas: ids.map(id => ({ mod: id, tipo: porId.get(id).tipo === 'defeito' ? 'defeito' : 'modificacao', tamanho: porId.get(id).tamanho })),
        modificacoes: { usados: doCatalogo.reduce((soma, mod) => soma + mod.tamanho, 0), total: M.slotsDeModificacao(arma, defeitos) }
      };
      for (const nova of modsDaWiki) {
        const esperado = M.modCabe(arma, doCatalogo, modDoCatalogo.get(nova.id)).cabe;
        const visto = B.modCabe(modelo, ids.map(id => porId.get(id)), nova).cabe;
        conferidas++;
        if (esperado !== visto) diferentes.push(`${idDe(item)} [${ids}] + ${nova.id}: sistema ${esperado}, wiki ${visto}`);
      }
    }
  }
  assert.ok(conferidas > 25000, `${conferidas} conferidas`);
  assert.deepEqual(diferentes.slice(0, 10), []);
});

test('C70: a lista do slot livre (as modificações à venda, sem os defeitos; os acessórios pelas regras da montagem)', () => {
  const pistola = B.daCriacao(linhaDaLoja('core_weapons:very-heavy-pistol'));
  const { cabem, naoCabem } = B.cabeNoSlot({ ...pistola, pecas: [{ mod: 'mira-holografica', tipo: 'modificacao', tamanho: 1 }], modificacoes: { usados: 1, total: 2 } }, 'modificacao', { mods: modsDaWiki });
  const nomes = lista => lista.map(item => item.nome);
  assert.ok(nomes(cabem).includes('Supressor') && nomes(cabem).includes('Trava biométrica'));
  assert.ok(!nomes([...cabem, ...naoCabem]).some(nome => /Gatilho sensível|Coice brutal/.test(nome)), 'o defeito não se compra');
  assert.deepEqual(naoCabem.find(item => item.nome === 'Mira de médio alcance'), { id: 'mods-armas:mira-medio-alcance', nome: 'Mira de médio alcance', nota: 'só cabe uma modificação de ataque por arma' });
  assert.equal(naoCabem.find(item => item.nome === 'Cabo balanceado').nota, 'só serve em arma branca');
  assert.equal(naoCabem.find(item => item.nome === 'Carga silenciosa').nota, 'só serve em arma Tech');
  assert.equal(cabem.find(item => item.nome === 'Supressor').id, 'mods-armas:supressor');
  // Os acessórios: o carregador da classe dela, um por vez; o de baixo do cano só em arma de duas mãos; o Rebuild, um.
  const acessorio = (modelo, id) => B.acessorioCabe(modelo, daLoja.get(id));
  assert.deepEqual(acessorio(pistola, 'core_upgrades:extended-magazine-very-heavy-pistol'), { cabe: true, motivo: '' });
  assert.deepEqual(acessorio(pistola, 'core_upgrades:extended-magazine-shotgun'), { cabe: false, motivo: 'só em Shotgun' });
  assert.equal(acessorio(pistola, 'core_upgrades:grenade-launcher-underbarrel').motivo, 'só em arma de duas mãos');
  const comPente = B.daCriacao(linhaDaLoja('core_weapons:very-heavy-pistol'), [{ uid: 'loja:p', nome: 'Pente', item: daLoja.get('core_upgrades:extended-magazine-very-heavy-pistol') }]);
  assert.equal(acessorio(comPente, 'core_upgrades:drum-magazine-very-heavy-pistol').motivo, 'só cabe um carregador por vez');
  const cheia = B.daCriacao(linhaDaLoja('core_weapons:very-heavy-pistol'), [{ uid: 'loja:l', nome: 'Link', item: daLoja.get('core_upgrades:smartgun-link') }, { uid: 'loja:p', nome: 'Pente', item: daLoja.get('core_upgrades:extended-magazine-very-heavy-pistol') }]);
  assert.equal(acessorio(cheia, 'core_upgrades:sniping-scope').motivo, '3 de 3 slots em uso');
  assert.equal(acessorio(cheia, 'core_upgrades:bayonet').cabe, false);
  assert.equal(acessorio(B.daCriacao(linhaDaLoja('armas-2077:arasaka-hjke-11-yukimura')), 'armas-2077:smart-rebuild').motivo, 'a arma já é de 2077 e vem com o Rebuild dela');
  assert.equal(acessorio(B.daCriacao(linhaDaLoja('core_weapons:grenade-launcher')), 'armas-2077:tech-rebuild').motivo, 'o Tech Rebuild não serve em lança-granadas nem em lança-foguetes');
  const faca = B.daCriacao(linhaDaLoja(loja.find(item => item.arma && item.arma.tipo === 'lightMelee').id));
  assert.equal(acessorio(faca, 'core_upgrades:bayonet').motivo, 'acessório só em arma de longo alcance');
  const { cabem: deAcessorio } = B.cabeNoSlot(pistola, 'acessorio', { loja });
  assert.ok(nomes(deAcessorio).includes(daLoja.get('core_upgrades:extended-magazine-very-heavy-pistol').nome));
  assert.ok(!nomes(deAcessorio).includes(daLoja.get('core_upgrades:extended-magazine-shotgun').nome));
});

test('C70: o modelo pela ficha da mesa (a bancada que o Foundry manda) e pela criação: as posições, o defeito e o teto', () => {
  const linha = {
    id: 'arma1', nome: 'Pistola muito pesada', tipo: 'weapon', catalogo: 'core_weapons:very-heavy-pistol', dano: '4d6', cdt: 1, maos: 1, distancia: true,
    identidade: { apelido: 'Velha Senhora', abates: 7, criticos: 3, sessoes: 5, diario: [] },
    bancada: {
      acessorios: { usados: 3, total: 3 }, modificacoes: { usados: 2, total: 3 }, aDistancia: true, tipo: 'vHeavyPistol', qualidade: 'standard', classe: null,
      pecas: [
        { id: 'p1', nome: 'Pente estendido', catalogo: 'core_upgrades:extended-magazine-very-heavy-pistol', tipo: 'acessorio', tamanho: 1 },
        { id: 'p2', nome: 'Link de arma inteligente', catalogo: 'core_upgrades:smartgun-link', tipo: 'acessorio', tamanho: 2 },
        { id: 'm1', nome: 'Mira holográfica', mod: 'mira-holografica', tipo: 'tatica', tamanho: 1 },
        { id: 'm2', nome: 'Nome gravado', mod: 'nome-gravado', tipo: 'sabor', tamanho: 1 },
        { id: 'd1', nome: 'Gatilho sensível', mod: 'gatilho-sensivel', tipo: 'defeito', tamanho: 0 }
      ],
      ataque: { fixos: [{ rotulo: 'Link de arma inteligente', valor: 1 }, { rotulo: 'Coronha torta', valor: -1 }], situacionais: [{ rotulo: 'Mira holográfica: tiro único ou mirado a até 12 m', valor: 1 }], teto: 3 }
    }
  };
  const modelo = B.daMesa(linha, { mods: modsDaWiki, catalogo: id => daLoja.get(id) || null });
  assert.equal(modelo.fonte, 'mesa');
  assert.equal(modelo.apelido, 'Velha Senhora');
  assert.equal(modelo.silhueta, 'pistola');
  assert.deepEqual(modelo.lugares.map(l => `${l.posicao}:${l.peca ? l.peca.sigla : 'livre'}`), ['pente:PES', 'trilho:LAI']);
  assert.deepEqual(modelo.deModificacao.map(peca => `${peca.sigla}/${peca.grupo}`), ['MHO/situacional', 'NGR/sabor']);
  assert.equal(modelo.defeito.nome, 'Gatilho sensível');
  assert.deepEqual(modelo.livresDeModificacao, ['modificacao:0']);
  assert.deepEqual({ fixo: modelo.teto.fixo, situacional: modelo.teto.situacional, melhor: modelo.teto.melhor, negativos: modelo.teto.negativos.length }, { fixo: 1, situacional: 1, melhor: 2, negativos: 1 });
  // Sem a bancada (a ficha do Foundry 12, ou de antes do C70): o modelo diz, e não inventa slots.
  const antiga = B.daMesa({ ...linha, bancada: undefined }, { mods: modsDaWiki, catalogo: id => daLoja.get(id) || null });
  assert.equal(antiga.semBancada, true);
  assert.deepEqual(antiga.lugares, []);
  // A criação: os 3 slots da pistola, um ocupado pelo pente; os livres nas posições que sobram, sem modificação nem teto.
  const criada = B.daCriacao(linhaDaLoja('core_weapons:very-heavy-pistol'), [{ uid: 'loja:p', nome: 'Pente estendido', item: daLoja.get('core_upgrades:extended-magazine-very-heavy-pistol') }]);
  assert.deepEqual(criada.lugares.map(l => `${l.posicao}:${l.peca ? 'peca' : l.livre}`), ['pente:peca', 'trilho:acessorio:0', 'cano:acessorio:1']);
  assert.deepEqual(criada.livresDeModificacao, ['modificacao:0', 'modificacao:1']);
  assert.equal(criada.teto, null);
  assert.equal(B.silhueta('assaultRifle'), 'longa');
  assert.equal(B.silhueta('medMelee'), 'branca');
  assert.equal(B.sigla('Supressor'), 'SUP');
});
