// O arquivo comum dos nomes (wiki-nomes.js, o B7 do worldbuilding), que as duas wikis carregam: o buscador e os nomes de
// um texto, no Node. O link e o cartão, no navegador, ficam nos cenários base (a wiki do mestre) e jogadores (a dos
// jogadores).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const raiz = path.join(__dirname, '..', '..');
const N = require(path.join(raiz, 'wiki-nomes.js'));

test('o buscador: os nomes de mais de duas letras, o mais longo primeiro; um nome em duas entradas fica com a primeira', () => {
  // O nome curto vem antes do longo que começa com ele ("Ana" antes de "Ana Lobo"): a busca procura o longo primeiro.
  const entradas = [
    { id: 'b', tipo: 'pessoa', nomes: ['Ana', 'Beto (o.k.)'], href: '#b' },
    { id: 'a', tipo: 'pessoa', nomes: ['Ana Lobo', 'Ana', 'Al'], href: '#a' },
    { id: 'c', tipo: 'lugar', nomes: ['Bar Azul'], href: '#c' }
  ];
  const busca = N.buscador(entradas);
  assert.deepEqual([...busca.formas.keys()], ['Ana', 'Beto (o.k.)', 'Ana Lobo', 'Bar Azul']);
  assert.equal(busca.formas.get('Ana'), entradas[0]);
  assert.equal(busca.formas.get('Ana Lobo'), entradas[1]);
  // A ordem do texto. O nome inteiro ganha da parte ("Ana Lobo" é de a, e não o "Ana" de b); os sinais do nome valem
  // como texto (o ponto de "o.k." não aceita o "x").
  assert.deepEqual([...N.nomesEm(busca, 'Ana Lobo foi ao Bar Azul. Beto (oxk) não; Beto (o.k.) sim.')], ['a', 'c', 'b']);
  assert.deepEqual([...N.nomesEm(busca, 'Só a Ana.')], ['b']);
  // O nome dentro de outra palavra não conta, nem com letra antes ("TiaAna") nem com letra ou número depois.
  assert.deepEqual([...N.nomesEm(busca, 'TiaAna, Anabela e Ana2 não contam.')], []);
  // A mesma busca serve de novo (o lastIndex da regex volta ao começo).
  assert.deepEqual([...N.nomesEm(busca, 'Bar Azul')], ['c']);
  assert.deepEqual([...N.nomesEm(busca, 'Bar Azul')], ['c']);
});

test('o buscador sem nomes: null, e o texto não acha nada', () => {
  assert.equal(N.buscador([]), null);
  assert.equal(N.buscador([{ id: 'x', tipo: 'pessoa', nomes: ['Al', ''], href: '#x' }]), null);
  assert.deepEqual([...N.nomesEm(null, 'Al e Ana')], []);
});

test('o endereço das seções: o mesmo slug da wiki (sem acento, minúsculo, com hífens)', () => {
  assert.equal(N.slug('Sessão 03: Kabuki & Cia.'), 'sessao-03-kabuki-cia');
  assert.equal(N.slug('  Armazém de Kabuki  '), 'armazem-de-kabuki');
  assert.equal(N.slug(''), '');
});

// O servidor entrega o arquivo aos jogadores (o cenário jogadores confere) e a wiki do celular o guarda (o
// mapa-publico.test.js confere): ele não pode ter nada da campanha.
test('o arquivo comum não tem dados da campanha, e as duas wikis o carregam (a do mestre, antes da base)', () => {
  const texto = fs.readFileSync(path.join(raiz, 'wiki-nomes.js'), 'utf8');
  const base = require(path.join(raiz, 'campanha-base.js')).ler(fs.readFileSync(path.join(raiz, 'documentos', 'morana', 'base-da-campanha.md'), 'utf8'));
  const nomes = [...base.todos.values()].flatMap(item => [item.nome, ...item.tambem]).filter(nome => nome.length > 3 && texto.includes(nome));
  assert.deepEqual(nomes, []);
  assert.match(fs.readFileSync(path.join(raiz, 'jogadores.html'), 'utf8'), /<script src="wiki-nomes\.js"><\/script>/);
  assert.match(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8'), /<script src="wiki-nomes\.js"><\/script>\s*<script src="campanha-base\.js"><\/script>/);
});
