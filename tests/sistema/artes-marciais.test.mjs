// Os movimentos especiais das Artes Marciais (o C10, parte 2): a lista é a da wiki da mesa (system-rules.js,
// "Movimentos de artes marciais", p. 178–180), com a forma, a DV (ou o golpe pelo ataque) e os requisitos de WILL e MOVE;
// as formas pelo nome da perícia; os movimentos que o personagem pode usar; a DV que precisa ser superada; e as lesões
// dos golpes, que existem no catálogo.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { FORMAS_DAS_ARTES_MARCIAIS, formaDaPericia, LESOES_DOS_GOLPES, MOVIMENTOS, movimentosDisponiveis, passouNoMovimento } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

// As linhas da tabela da wiki: [forma, movimento, requisito, efeito].
function tabelaDaWiki() {
  const texto = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const bloco = texto.match(/section\('Movimentos de artes marciais'[\s\S]*?table\(\[[^\]]*\], \[([\s\S]*?)\], 'dense'\)/);
  assert.ok(bloco, 'a tabela "Movimentos de artes marciais" não foi achada em system-rules.js');
  return [...bloco[1].matchAll(/\['([^']*)', '([^']*)', '([^']*)', '([^']*)'\]/g)].map(m => m.slice(1));
}

test('os movimentos são os da wiki: a forma, o nome, a DV ou o golpe pelo ataque, e o WILL e o MOVE do requisito', () => {
  const linhas = tabelaDaWiki();
  assert.equal(linhas.length, Object.keys(MOVIMENTOS).length);
  for (const [forma, nome, requisito, efeito] of linhas) {
    const m = Object.values(MOVIMENTOS).find(mov => mov.nome === nome);
    assert.ok(m, `falta o movimento ${nome}`);
    assert.equal(m.forma ? FORMAS_DAS_ARTES_MARCIAIS[m.forma] : 'Todas', forma, nome);
    const dv = efeito.match(/DV ?(\d+)/);
    assert.equal(m.teste === 'ataque' ? null : m.teste.dv, dv ? Number(dv[1]) : null, `${nome}: a DV`);
    assert.equal(m.will ?? null, /WILL (\d+)\+/.test(requisito) ? Number(requisito.match(/WILL (\d+)\+/)[1]) : null, `${nome}: o WILL`);
    assert.equal(m.move ?? null, /MOVE (\d+)\+/.test(requisito) ? Number(requisito.match(/MOVE (\d+)\+/)[1]) : null, `${nome}: o MOVE`);
  }
});

test('a forma pelo nome da perícia (o do Foundry, o com acento ou o "Caratê") ou pela chave', () => {
  assert.equal(formaDaPericia({ nome: 'Karate' }), 'karate');
  assert.equal(formaDaPericia({ nome: 'Karatê' }), 'karate');
  assert.equal(formaDaPericia({ nome: 'Caratê' }), 'karate');
  assert.equal(formaDaPericia({ nome: 'Judô' }), 'judo');
  assert.equal(formaDaPericia({ nome: 'Aikido' }), 'aikido');
  assert.equal(formaDaPericia({ nome: 'Tae Kwon Do' }), 'taekwondo');
  assert.equal(formaDaPericia({ id: 'martial-arts-taekwondo', nome: '' }), 'taekwondo');
  assert.equal(formaDaPericia({ nome: 'Capoeira' }), null);
});

test('os movimentos de quem tem a forma (com 1 ponto ou mais), a Recuperação com a melhor forma, e o WILL e o MOVE que faltam', () => {
  const karate = { forma: 'karate', pericia: 'martial-arts-karate', nivel: 3 };
  const lista = movimentosDisponiveis([karate, { forma: 'judo', pericia: 'martial-arts-judo', nivel: 0 }], { will: 7, move: 5 });
  assert.deepEqual(lista.map(m => m.id), ['recuperacao', 'quebraArmadura', 'quebraOssos']);
  assert.equal(lista.find(m => m.id === 'recuperacao').pericia, 'martial-arts-karate');
  assert.equal(lista.find(m => m.id === 'quebraOssos').bloqueio, 'Pede WILL 8+.');
  assert.equal(lista.find(m => m.id === 'quebraArmadura').bloqueio, '');
  const taekwondo = movimentosDisponiveis([{ forma: 'taekwondo', pericia: 'martial-arts-taekwondo', nivel: 2 }], { will: 8, move: 7 });
  assert.equal(taekwondo.find(m => m.id === 'pontoDePressao').bloqueio, '');
  assert.equal(taekwondo.find(m => m.id === 'voadora').bloqueio, 'Pede MOVE 8+.');
  assert.deepEqual(movimentosDisponiveis([{ forma: 'aikido', pericia: 'martial-arts-aikido', nivel: 0 }], { will: 9, move: 9 }), []);
});

test('o movimento precisa superar a DV: o empate não passa', () => {
  assert.equal(passouNoMovimento(15, 15), false);
  assert.equal(passouNoMovimento(16, 15), true);
  assert.equal(passouNoMovimento(14, 13), true);
});

test('as lesões dos golpes existem no catálogo, na tabela certa (corpo ou cabeça)', () => {
  for (const [chave, id] of Object.entries(LESOES_DOS_GOLPES)) {
    const lesao = catalogo[id];
    assert.ok(lesao?.type === 'lesao', `${chave}: ${id}`);
    assert.equal(lesao.system.local, ['cranio', 'cerebro'].includes(chave) ? 'cabeca' : 'corpo', chave);
  }
});
