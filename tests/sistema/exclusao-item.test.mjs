// CORE 0.92.4, _deleteOwnedItem: a configuração desliga só a confirmação simples, não a de instalação/conteúdo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { lugaresDaInstalacao, pedeConfirmacaoAoApagar, podeApagarItem, podeEditarParaApagar } from '../../foundry-sistema/scripts/exclusao-item.mjs';

const contexto = { editavel: true, presente: true, mestre: false };
function fixture(type = 'personagem') {
  const ator = { type, isOwner: true, name: 'V', system: { permissoes: { apagar: true } }, items: new Map() };
  const item = { id: 'item', type: 'equipamento', name: 'Agent', system: {}, parent: ator };
  ator.items.set(item.id, item);
  return { ator, item };
}

test('C34.2: a exclusão exige dono, ficha editável, ator presente e o mesmo item ainda na ficha', () => {
  const { ator, item } = fixture();
  for (const tipo of ['personagem', 'capanga', 'conteiner']) {
    ator.type = tipo;
    assert.equal(podeApagarItem(ator, item, contexto), true);
  }
  assert.equal(podeApagarItem(ator, item), false);
  assert.equal(podeApagarItem(ator, null, contexto), false);
  for (const campo of ['editavel', 'presente']) assert.equal(podeApagarItem(ator, item, { ...contexto, [campo]: false }), false);
  ator.isOwner = false;
  assert.equal(podeApagarItem(ator, item, contexto), false);
  assert.equal(podeApagarItem(ator, item, { ...contexto, mestre: true }), false);
  ator.isOwner = true;
  ator.items.delete(item.id);
  assert.equal(podeApagarItem(ator, item, contexto), false);
  ator.items.set(item.id, { ...item });
  assert.equal(podeApagarItem(ator, item, contexto), false);
  ator.items.set(item.id, item);
  for (const tipo of ['blackice', 'demonio', 'outro']) {
    ator.type = tipo;
    assert.equal(podeApagarItem(ator, item, contexto), false);
  }
});

test('C34.2: a permissão do contêiner é relida; o mestre a dispensa, mas continua precisando de edição e presença', () => {
  const { ator, item } = fixture('conteiner');
  assert.equal(podeApagarItem(ator, item, contexto), true);
  ator.system.permissoes.apagar = false;
  assert.equal(podeApagarItem(ator, item, contexto), false);
  assert.equal(podeApagarItem(ator, item, { ...contexto, mestre: true }), true);
  assert.equal(podeEditarParaApagar(ator, { ...contexto, mestre: true, presente: false }), false);
  assert.equal(podeEditarParaApagar(ator, { ...contexto, mestre: true, editavel: false }), false);
  ator.type = 'personagem';
  assert.equal(podeApagarItem(ator, item, contexto), true);
});

test('C34.2: fundação no ator, item aninhado e munição carregada avisam os lugares certos mesmo com a opção desligada', () => {
  const { ator, item } = fixture();
  assert.deepEqual(lugaresDaInstalacao(item), []);
  assert.equal(pedeConfirmacaoAoApagar(false, []), false);
  assert.equal(pedeConfirmacaoAoApagar(true, []), true);
  item.type = 'cyberware'; item.system.instalado = true;
  assert.deepEqual(lugaresDaInstalacao(item), ['V']);
  assert.equal(pedeConfirmacaoAoApagar(false, lugaresDaInstalacao(item)), true);
  item.system.instaladoEm = 'base';
  const fundacao = { id: 'base', name: '<Fundação>', system: {} };
  assert.deepEqual(lugaresDaInstalacao(item, [fundacao]), ['<Fundação>', 'V']);
  item.type = 'programa';
  assert.deepEqual(lugaresDaInstalacao(item, [fundacao]), ['<Fundação>']);
  assert.deepEqual(lugaresDaInstalacao(item), ['base']);
  item.system.instaladoEm = ''; item.type = 'municao';
  const armas = [{ id: 'um', type: 'arma', name: 'Pistola', system: { carregada: item.id, pente: { value: 0 } } },
    { id: 'dois', type: 'arma', name: 'Rifle', system: { carregada: item.id } },
    { id: 'tres', type: 'arma', name: 'Outra', system: { carregada: 'outra' } },
    { id: 'deck', type: 'cyberdeck', name: 'Não é arma', system: { carregada: item.id } }];
  assert.deepEqual(lugaresDaInstalacao(item, armas), ['Pistola', 'Rifle']);
  assert.equal(pedeConfirmacaoAoApagar(false, lugaresDaInstalacao(item, armas)), true);
  item.type = 'equipamento';
  assert.deepEqual(lugaresDaInstalacao(item, armas), []);
  item.type = 'cyberware'; item.parent = null;
  assert.deepEqual(lugaresDaInstalacao(item), ['personagem']);
  item.parent = ator; item.system.instaladoEm = 'base'; fundacao.name = 'V';
  assert.deepEqual(lugaresDaInstalacao(item, [fundacao]), ['V']);
});

test('C34.2: o método real do CORE confirma instalação e conteúdo independentemente da configuração simples', async () => {
  const fonte = fs.readFileSync(new URL('../../cyberpunk-red-core/modules/actor/sheet/cpr-actor-sheet.js', import.meta.url), 'utf8');
  const metodo = fonte.match(/async _deleteOwnedItem\(item, skipConfirm = false\) \{[\s\S]+?\n  \}\r?\n/)[0];
  for (const opcao of [false, true]) for (const instalado of [false, true]) for (const conteudo of [false, true]) {
    const perguntas = [], deletados = [];
    const excluir = vm.runInNewContext('({' + metodo + '})._deleteOwnedItem', {
      game: { system: { id: 'cyberpunk-red-core' }, settings: { get: () => opcao } },
      SystemUtils: { Localize: chave => chave }, LOGGER: { debug: () => {} },
      CPRDialog: { showDialog: async () => { perguntas.push('simples'); return true; } },
      ContainerUtils: { confirmContainerDelete: async () => { perguntas.push('conteudo'); return { deleteInstalled: false }; } }
    });
    const item = { id: 'item', name: 'Agent', type: 'gear', system: { isInstalled: instalado, installedIn: ['ator'], hasInstalled: conteudo } };
    await excluir.call({ actor: { getOwnedItem: () => ({ name: 'V' }), deleteEmbeddedDocuments: async (tipo, ids) => deletados.push([...ids]) } }, item);
    assert.deepEqual(perguntas, [...(opcao || instalado ? ['simples'] : []), ...(conteudo ? ['conteudo'] : [])]);
    assert.deepEqual(deletados, [['item']]);
  }
});
