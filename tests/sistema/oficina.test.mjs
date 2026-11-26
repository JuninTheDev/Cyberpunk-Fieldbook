// A oficina do mestre (o C71): as contas do regras-oficina.mjs, com o plano do ROADMAP (criar uma modificação sem programar
// e os defeitos escondidos), as decisões do usuário de 2026-11-24 (o defeito escondido só vale depois de revelado; a
// raridade é só um rótulo) e as modificações da wiki como referência: o menu da oficina refaz a condição e o efeito de
// cada uma que tem efeito na regra (system-modificacoes.js).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as O from '../../foundry-sistema/scripts/regras-oficina.mjs';
import { validarMod } from '../../foundry-sistema/scripts/regras-modificacoes.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const roadmap = ler('foundry-sistema/ROADMAP.md').replace(/\s+/g, ' ');
const contexto = { window: {} };
vm.runInNewContext(ler('system-modificacoes.js'), contexto);
const daWiki = id => JSON.parse(JSON.stringify(contexto.window.systemModificacoes.data.mods.find(mod => mod.id === id)));
// O que a regra faz (sem o rótulo, que a oficina escreve do jeito dela).
const regra = efeitos => efeitos.map(({ quando, entao }) => ({ ...(quando ? { quando } : {}), entao }));

test('C71: o plano do ROADMAP e o menu da oficina', () => {
  assert.match(roadmap, /C71\. A oficina do mestre:\*\* .*Criar uma modificação sem programar e os defeitos escondidos/);
  assert.deepEqual(Object.keys(O.RARIDADES), ['catalogo', 'rara', 'lendaria']);
  assert.deepEqual(Object.keys(O.EFEITOS), ['situacao', 'sempre', 'dano', 'pente', 'ocultavel', 'emperra', 'instavel']);
  assert.equal(O.MAXIMO_DE_EFEITOS, 2);
  assert.equal(O.idDaOficina('Mira "Kiroshi" Ótica!', 'Ab12_x'), 'oficina:mira-kiroshi-otica-ab12x');
  assert.equal(validarMod({ versao: 1, id: O.idDaOficina('Ç', ''), nome: 'X', tipo: 'sabor', tamanho: 1, efeitos: [] }), '');
});

test('C71: o menu da oficina refaz a regra das modificações da wiki (a situação, o dano contra coisas, o pente, o esconder, o emperrar)', () => {
  const casos = [
    ['mira-holografica', { tipo: 'tatica', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'situacao', valor: 1, situacao: 'perto', metrosMax: 12 }] }],
    ['mira-medio-alcance', { tipo: 'tatica', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'situacao', valor: '1', situacao: 'faixa', metrosMin: '13', metrosMax: '50' }] }],
    ['compensador', { tipo: 'tatica', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'situacao', valor: 1, situacao: 'autofogo' }, { tipo: 'ocultavel', valor: 'nao' }] }],
    ['cano-de-alta-pressao', { tipo: 'tatica', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'dano', dados: '1d6', alvos: ['cobertura', 'objeto'] }] }],
    ['gatilho-sensivel', { tipo: 'defeito', tamanho: 1, serve: 'distancia', efeitos: [{ tipo: 'emperra', valor: 2 }] }],
    ['mira-descalibrada-para-estranhos', { tipo: 'defeito', serve: 'distancia', efeitos: [{ tipo: 'situacao', valor: -2, situacao: 'estranho' }] }],
    ['barulhenta-e-chamativa', { tipo: 'defeito', serve: 'qualquer', efeitos: [{ tipo: 'ocultavel', valor: 'nao' }] }]
  ];
  for (const [id, dados] of casos) {
    const wiki = daWiki(id);
    const { mod, erro } = O.modDoFormulario({ nome: wiki.nome, ...dados }, `oficina:${id}`);
    assert.equal(erro, undefined, `${id}: ${erro}`);
    assert.deepEqual(regra(mod.efeitos), regra(wiki.efeitos), id);
    assert.deepEqual(mod.encaixe ?? {}, wiki.encaixe ?? {}, id);
    assert.equal(mod.tipo, wiki.tipo, id);
    assert.equal(mod.tamanho, wiki.tamanho, `${id}: o defeito não ocupa slot`);
  }
  // A situação escrita à mão (o bipé) e a da distância a partir de (o cano serrado).
  const { mod: bipe } = O.modDoFormulario({ nome: 'Bipé', tamanho: 1, efeitos: [{ tipo: 'situacao', valor: 1, situacao: 'manual', manual: 'a arma apoiada' }] });
  assert.deepEqual(bipe.efeitos[0].quando, { manual: 'a arma apoiada' });
  const { mod: serrado } = O.modDoFormulario({ nome: 'Serrado', tipo: 'defeito', efeitos: [{ tipo: 'ocultavel', valor: 'sim' }, { tipo: 'situacao', valor: -2, situacao: 'longe', metrosMin: 26 }] });
  assert.deepEqual(regra(serrado.efeitos), regra(daWiki('cano-serrado').efeitos));
  // Os rótulos que a oficina escreve, e o do mestre por cima.
  assert.equal(O.modDoFormulario({ nome: 'A', tamanho: 1, efeitos: [{ tipo: 'situacao', valor: 1, situacao: 'alvo', alvos: ['veiculo', 'objeto'] }] }).mod.efeitos[0].rotulo, 'contra veículos e objetos');
  assert.equal(O.modDoFormulario({ nome: 'A', tamanho: 1, efeitos: [{ tipo: 'pente', valor: 4, rotulo: '  tambor  maior ' }] }).mod.efeitos[0].rotulo, 'tambor maior');
  // A classe e a raridade (só um rótulo), e o texto do mestre.
  const lendaria = O.modDoFormulario({ nome: 'Kiroshi', raridade: 'lendaria', tamanho: 2, serve: 'distancia', classe: 'smart', texto: ' Feita <b>sob</b> medida ', efeitos: [] });
  assert.deepEqual([lendaria.raridade, lendaria.mod.encaixe, lendaria.mod.tamanho, lendaria.texto], ['lendaria', { aDistancia: true, classe: 'smart' }, 2, 'Feita <b>sob</b> medida']);
  assert.equal(O.modDoFormulario({ nome: 'X', raridade: 'mitica', tamanho: 1 }).raridade, 'catalogo');
});

test('C71: a oficina recusa o que a regra da casa não deixa, com o motivo', () => {
  const erro = dados => O.modDoFormulario({ nome: 'Teste', tamanho: 1, ...dados }).erro;
  assert.equal(O.modDoFormulario({ nome: '   ' }).erro, 'dê um nome à modificação');
  assert.match(erro({ efeitos: [{ tipo: 'sempre', valor: 1 }] }), /ataque sempre é só negativo/);
  assert.match(erro({ efeitos: [{ tipo: 'situacao', valor: 2, situacao: 'mirado' }] }), /o ataque vai de −4 a \+1/);
  assert.match(erro({ efeitos: [{ tipo: 'dano', dados: '1d6', alvos: ['pessoa', 'objeto'] }] }), /nunca vale contra gente/);
  assert.match(erro({ efeitos: [{ tipo: 'dano', dados: '1d8', alvos: ['objeto'] }] }), /o dano a mais é um dado/);
  assert.match(erro({ efeitos: [{ tipo: 'situacao', valor: 1, situacao: 'perto' }] }), /^efeito 1: diga até quantos metros$/);
  assert.match(erro({ efeitos: [{ tipo: 'pente', valor: 2 }, { tipo: 'situacao', valor: 1, situacao: 'manual', manual: ' ' }] }), /^efeito 2: escreva a situação$/);
  assert.match(erro({ efeitos: [{ tipo: 'pente', valor: 1 }, { tipo: 'pente', valor: 1 }, { tipo: 'pente', valor: 1 }] }), /até 2 efeitos/);
  assert.match(erro({ efeitos: [{ tipo: 'emperra', valor: 4 }] }), /emperra até o 1, o 2 ou o 3/);
  assert.match(erro({ tamanho: 3 }), /de 0 a 2 slots/);
  // O efeito vazio (o "Nenhum" do formulário) não conta.
  assert.equal(erro({ efeitos: [{ tipo: '' }, { tipo: 'ocultavel', valor: 'sim' }] }), undefined);
});

test('C71: a descrição do item da oficina e o sorteio do defeito (1d6, de novo quando não serve)', () => {
  const { mod, raridade, texto } = O.modDoFormulario({ nome: 'Kiroshi', raridade: 'rara', tamanho: 1, serve: 'distancia', texto: '<script>x</script> & pronto', efeitos: [] });
  const descricao = O.descricaoDaMod(mod, { raridade, texto });
  assert.match(descricao, /^<p><b>Modificação de arma<\/b> · Rara · Tática · 1 slot de modificação · serve em arma de longo alcance<\/p>/);
  assert.ok(descricao.includes('&lt;script&gt;x&lt;/script&gt; &amp; pronto') && !descricao.includes('<script>'));
  assert.equal(O.serveEm({ encaixe: { classe: 'tech' } }), 'arma Tech');
  assert.equal(O.serveEm({}), 'qualquer arma');
  const tabela = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id }));
  const dados = valores => { const fila = [...valores]; return () => fila.shift(); };
  // Só o c e o e servem: o 1 e o 2 rolam de novo.
  assert.deepEqual(O.sortearDefeito({ defeitos: tabela, cabe: mod => ['c', 'e'].includes(mod.id), rolar: dados([1, 2, 5]) }), { mod: { id: 'e' }, rolagens: [1, 2, 5] });
  assert.deepEqual(O.sortearDefeito({ defeitos: tabela, rolar: dados([3]) }), { mod: { id: 'c' }, rolagens: [3] });
  assert.equal(O.sortearDefeito({ defeitos: tabela, cabe: () => false, rolar: dados([1]) }), null);
  assert.equal(O.sortearDefeito({ defeitos: tabela, cabe: mod => mod.id === 'f', rolar: () => 1, tentativas: 5 }), null);
  assert.equal(O.chaveDoDefeito({ uuid: 'Actor.a1.Item.b2' }), 'Actor.a1.Item.b2');
  assert.ok(O.CHAVE_DO_DEFEITO.test('Actor.a1.Item.b2') && !O.CHAVE_DO_DEFEITO.test('../mesa'));
});
