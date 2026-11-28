// O inventário mexido na wiki (o C111): as operações (mover, dividir, juntar), conferidas no servidor da wiki e de novo no
// Foundry com a mesma regra (compartilhado/regras-grade.mjs), e o item resumido que a ficha da mesa leva para isso.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  aplicarOperacao, conferirLugar, conferirOperacao, encaixesDoItem, ENCAIXES, limiteDaPilha, lugaresDoPersonagem, MAXIMO_PENDENTE, podeJuntar, projetar,
  regraDoItem, tamanhoDoItem, TIPOS_DE_OPERACAO, usoDoItem
} from '../../foundry-sistema/scripts/compartilhado/regras-grade.mjs';
import { mesmaPilha } from '../../foundry-sistema/scripts/regras-inventario.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const doCatalogo = (id, extra = {}) => ({ id, catalogo: id, ...structuredClone(catalogo[id]), qtd: 1, ...extra });
const noLugar = (lugar, x = 0, y = 0, girado = false) => ({ lugar, x, y, girado, rev: 1 });
const LUGARES = lugaresDoPersonagem({ moradia: { descricao: 'Quitinete' }, mochila: 'P' });
const resumido = item => ({ id: item.id, name: item.name, grade: item.grade ?? null, qtd: item.qtd, ...regraDoItem(item, { upgrades: item.upgrades ?? 0 }) });

test('C111: o item resumido que vai para a wiki dá a mesma regra que o inteiro, em cada item do catálogo (o tamanho, os encaixes, as listas, a pilha e o uso)', () => {
  const variantes = Object.entries(catalogo).flatMap(([id, item]) => {
    const base = { id, catalogo: id, name: item.name, type: item.type, system: structuredClone(item.system ?? {}), montada: false };
    return [base, { ...base, system: { ...base.system, equipada: true } }, { ...base, system: { ...base.system, uso: 'guardado' } },
      { ...base, system: { ...base.system, instalado: true } }, { ...base, montada: true }];
  });
  assert.ok(variantes.length > 1000);
  const listas = ['corpo:roupa', 'corpo:emUso', 'organizar'];
  let comTamanho = 0;
  for (const inteiro of variantes) {
    const curto = { ...regraDoItem(inteiro), id: inteiro.id, name: inteiro.name };
    // Pela linha da wiki (o JSON), como o servidor a lê.
    const lido = JSON.parse(JSON.stringify(curto));
    for (const item of [curto, lido]) {
      const rotulo = `${inteiro.id} ${JSON.stringify(inteiro.system).slice(0, 60)}`;
      assert.deepEqual(tamanhoDoItem(item), tamanhoDoItem(inteiro), rotulo);
      assert.equal(limiteDaPilha(item), limiteDaPilha(inteiro), rotulo);
      assert.equal(usoDoItem(item), usoDoItem(inteiro), rotulo);
      for (const body of [0, 6, 8]) for (const encaixe of Object.keys(ENCAIXES)) assert.deepEqual(encaixesDoItem(item, encaixe, body), encaixesDoItem(inteiro, encaixe, body), `${rotulo} ${encaixe}`);
      for (const lista of listas) assert.equal(conferirLugar(LUGARES, [], item, { lugar: lista }), conferirLugar(LUGARES, [], inteiro, { lugar: lista }), `${rotulo} ${lista}`);
    }
    if (tamanhoDoItem(inteiro)) comTamanho++;
  }
  assert.ok(comTamanho > 500);
  assert.equal(regraDoItem({ type: 'equipamento', system: {} }, { upgrades: 2 }).upgrades, 2);
});

test('C111: juntar pilhas pela wiki é o mesmaPilha do CORE (o mesmo tipo empilhável e o mesmo nome; o equipamento e a roupa, só na pilha com upgrades)', () => {
  for (const tipo of ['municao', 'droga', 'equipamento', 'roupa', 'arma', 'armadura', 'cyberware'])
    for (const outroTipo of ['municao', 'equipamento', 'arma'])
      for (const [nome, outroNome] of [['Balas', 'Balas'], ['Balas', 'Outras']])
        for (const upgrades of [0, 1]) {
          const origem = { type: tipo, name: nome }, destino = { type: outroTipo, name: outroNome, upgrades };
          assert.equal(podeJuntar(origem, destino), mesmaPilha(origem, destino), JSON.stringify([origem, destino]));
        }
  assert.deepEqual(TIPOS_DE_OPERACAO, ['mover', 'dividir', 'juntar']);
  assert.equal(MAXIMO_PENDENTE, 200);
});

// Um personagem: a pistola no coldre, o Agent nos bolsos, duas pilhas de balas de pistola pesada no cinto e um computador na mochila.
const personagem = () => [
  doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', grade: noLugar('coldre') }),
  doCatalogo('core_gear:agent', { id: 'agent', grade: noLugar('bolsos') }),
  doCatalogo('core_ammo:heavy-pistol-basic', { id: 'balasA', qtd: 20, grade: noLugar('cinto', 0, 0) }),
  doCatalogo('core_ammo:heavy-pistol-basic', { id: 'balasB', qtd: 5, grade: noLugar('cinto', 1, 0) }),
  doCatalogo('core_gear:computer', { id: 'pc', grade: noLugar('mochila', 0, 0) })
].map(resumido);

test('C111: a conferência das operações: mover (para onde cabe; não para o mesmo lugar nem por cima de outro), dividir (de 1 a uma a menos, numa pilha empilhável, onde cabe) e juntar (a mesma pilha, até o teto)', () => {
  const itens = personagem();
  const pilha = limiteDaPilha(itens.find(item => item.id === 'balasA'));
  assert.ok(pilha >= 25);
  // Mover.
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent', para: { lugar: 'bolsos', x: 2, y: 0 } }), null);
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent', para: { lugar: 'esconderijo', x: 0, y: 0 } }), null);
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent', para: { lugar: 'bolsos', x: 0, y: 0, girado: false } }), 'Agent já está aí.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent', para: { lugar: 'mochila', x: 1, y: 1 } }), 'Mochila: Computer já está ali.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent', para: { lugar: 'coldre' } }), 'Coldre: não serve para Agent.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'pistola', para: { lugar: 'corpo:maoPrincipal' } }), null);
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'sumiu', para: { lugar: 'bolsos' } }), 'Esse item não está mais na ficha da mesa.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'mover', item: 'agent' }), 'Para onde?');
  // O que a wiki não faz.
  for (const tipo of ['apagar', 'dar', 'usar', 'recarregar', undefined]) assert.equal(conferirOperacao(itens, LUGARES, { tipo, item: 'agent' }), 'A wiki só move, divide e junta: o resto é na mesa.');
  // Dividir.
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'dividir', item: 'balasA', qtd: 8, para: { lugar: 'cinto', x: 2, y: 0 } }), null);
  for (const qtd of [0, 20, 21, 2.5, '8']) assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'dividir', item: 'balasA', qtd, para: { lugar: 'cinto', x: 2, y: 0 } }), 'Escolha de 1 a 19 para a pilha nova.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'dividir', item: 'balasA', qtd: 8, para: { lugar: 'cinto', x: 1, y: 0 } }), 'Cinto: Heavy Pistol (Basic) já está ali.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'dividir', item: 'pistola', qtd: 1, para: { lugar: 'bolsos', x: 2, y: 0 } }), 'Heavy Pistol não se divide.');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'dividir', item: 'balasA', qtd: 8 }), 'Para onde vai a pilha nova?');
  // Juntar.
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' }), null);
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'juntar', item: 'balasB', alvo: 'balasB' }), 'Juntar com qual pilha?');
  assert.equal(conferirOperacao(itens, LUGARES, { tipo: 'juntar', item: 'balasB', alvo: 'agent' }), 'Heavy Pistol (Basic) não junta com Agent.');
  const cheia = itens.map(item => (item.id === 'balasA' ? { ...item, qtd: pilha } : item));
  assert.equal(conferirOperacao(cheia, LUGARES, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' }), 'Heavy Pistol (Basic) já está cheia.');
  const comUpgrade = itens.map(item => (item.id === 'balasB' ? { ...item, upgrades: 1 } : item));
  assert.equal(conferirOperacao(comUpgrade, LUGARES, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' }), 'Retire os upgrades de Heavy Pistol (Basic) antes de juntar.');
});

test('C111: o estado depois das operações e o projetado (a ficha da mesa com as pendentes por cima, na ordem do seq; a que não cabe mais fica de fora), sem mexer na entrada', () => {
  const itens = personagem();
  const antes = structuredClone(itens);
  const porId = estado => Object.fromEntries(estado.map(item => [item.id, [item.grade?.lugar, item.grade?.x, item.grade?.y, item.qtd]]));
  const mover = aplicarOperacao(itens, { tipo: 'mover', item: 'agent', para: { lugar: 'esconderijo', x: 3, y: 2, girado: true } });
  assert.deepEqual(mover.find(item => item.id === 'agent').grade, { lugar: 'esconderijo', x: 3, y: 2, girado: true, rev: 1 });
  const dividir = aplicarOperacao(itens, { id: 'op9', tipo: 'dividir', item: 'balasA', qtd: 8, para: { lugar: 'cinto', x: 2, y: 0 } });
  assert.deepEqual([porId(dividir).balasA, porId(dividir).op9], [['cinto', 0, 0, 12], ['cinto', 2, 0, 8]]);
  assert.equal(dividir.find(item => item.id === 'op9').name, 'Heavy Pistol (Basic)');
  const juntar = aplicarOperacao(itens, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' });
  assert.deepEqual([porId(juntar).balasA, porId(juntar).balasB], [['cinto', 0, 0, 25], undefined]);
  // Até o teto: o resto fica na origem.
  const limite = limiteDaPilha(itens[2]);
  const quase = itens.map(item => (item.id === 'balasA' ? { ...item, qtd: limite - 2 } : item));
  assert.deepEqual([porId(aplicarOperacao(quase, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' })).balasA[3], porId(aplicarOperacao(quase, { tipo: 'juntar', item: 'balasB', alvo: 'balasA' })).balasB[3]], [limite, 3]);
  assert.deepEqual(itens, antes);
  // O projetado: a ordem é a do seq (não a da lista); a segunda para o mesmo quadrado não cabe e fica de fora.
  const ops = [
    { id: 'b', seq: 2, tipo: 'mover', item: 'pc', para: { lugar: 'esconderijo', x: 0, y: 0 } },
    { id: 'a', seq: 1, tipo: 'mover', item: 'agent', para: { lugar: 'esconderijo', x: 0, y: 0 } },
    { id: 'c', seq: 3, tipo: 'mover', item: 'pistola', para: { lugar: 'bolsos', x: 0, y: 0 } }
  ];
  const projetado = porId(projetar(itens, ops, LUGARES));
  assert.deepEqual([projetado.agent, projetado.pc, projetado.pistola], [['esconderijo', 0, 0, 1], ['mochila', 0, 0, 1], ['bolsos', 0, 0, 1]]);
  assert.deepEqual(itens, antes);
});
