// Testes de referência dos perigos do ambiente (o C38; foundry-sistema/scripts/regras-perigos.mjs), sem Foundry: os
// números da tabela "Outras formas de se ferir" da wiki (system-rules.js:555-563, p. 180–181).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  contarCyberpernas, danoDaRadiacao, danoDoFogo, drogaDe, fogoQueVale, folegoEmMinutos, lerComandoPerigo, nivelValido, PERIGOS, quedaDe, superou, venenoDe,
  DANO_DA_ELETROCUCAO, DV_DA_QUEDA, LEMBRETE_DA_QUEDA, PERICIA_DA_QUEDA, PERICIA_DO_VENENO
} from '../../foundry-sistema/scripts/regras-perigos.mjs';

const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
const linhaDaWiki = fonte => {
  const achada = new RegExp(`\\['${fonte}', '([^']+)'\\]`).exec(wiki);
  assert.ok(achada, `a linha "${fonte}" da tabela "Outras formas de se ferir"`);
  return achada[1];
};

test('a wiki (p. 180–181): a tabela "Outras formas de se ferir" ainda tem estes números', () => {
  assert.match(wiki, /section\('Outras formas de se ferir', '180–181'/);
  const fogo = linhaDaWiki('Fogo');
  assert.equal(fogo, 'Dano direto no HP no fim do seu turno até gastar uma Ação para se apagar: brando (fogueira) 2, intenso (incêndio) 4, mortal (termite) 6. Não reduz a armadura.');
  const [, brando, intenso, mortal] = /brando \(fogueira\) (\d+), intenso \(incêndio\) (\d+), mortal \(termite\) (\d+)/.exec(fogo).map(Number);
  assert.deepEqual([danoDoFogo('brando'), danoDoFogo('intenso'), danoDoFogo('mortal')], [brando, intenso, mortal]);
  assert.equal(linhaDaWiki('Afogamento e asfixia'), 'Segura o fôlego por BODY minutos. Depois, no início de cada turno, dano igual ao BODY direto no HP.');
  const choque = linhaDaWiki('Eletrocução');
  assert.equal(choque, '6d6 de dano (a armadura absorve). Repete no fim de cada turno até se afastar da fonte.');
  assert.equal(choque.split(' ')[0], DANO_DA_ELETROCUCAO);
  const queda = linhaDaWiki('Queda');
  assert.equal(queda, 'Cai 40 m por turno; agarrar uma borda: Atletismo DV15. Ao bater (10 m ou mais): 2d6 a cada 10 m (a armadura absorve) e Atletismo DV15 para evitar Perna Quebrada. Duas cyberpernas anulam tudo isso até 30 m.');
  assert.ok(queda.startsWith(LEMBRETE_DA_QUEDA));
  const venenos = linhaDaWiki('Venenos');
  assert.equal(venenos, 'WILL + Resistir Tortura/Drogas + 1d10 contra DV11 (brando, 1d6 direto no HP), DV13 (intenso, 2d6) ou DV15 (mortal, 3d6).');
  const lidos = [...venenos.matchAll(/DV(\d+) \((\w+), (\d+d6)/g)].map(([, dv, nivel, dano]) => [nivel, { dv: Number(dv), dano }]);
  assert.deepEqual(lidos.map(([nivel]) => [nivel, venenoDe(nivel)]), lidos);
  assert.equal(linhaDaWiki('Drogas como arma'), 'Mesma rolagem contra DV11 (álcool: embriaguez), DV13 (tiopental: sugestionável) ou DV15 (droga projetada: o que o criador quis).');
  assert.equal(linhaDaWiki('Radiação'), 'Baixa: adoece com o tempo, a critério do mestre. Alta: como fogo brando que não se apaga enquanto estiver na zona. Extrema (reator vazando): como fogo mortal.');
  assert.equal(danoDaRadiacao('alta'), danoDoFogo('brando'));
  assert.equal(danoDaRadiacao('extrema'), danoDoFogo('mortal'));
});

test('fogo (p. 180): brando 2, intenso 4, mortal 6 no fim do turno; o fogo não acumula, vale o maior', () => {
  assert.deepEqual(['brando', 'intenso', 'mortal'].map(danoDoFogo), [2, 4, 6]);
  assert.equal(danoDoFogo('alto'), null);
  assert.equal(fogoQueVale(null, 2), 'novo');
  assert.equal(fogoQueVale(undefined, 6), 'novo');
  assert.equal(fogoQueVale(2, 4), 'trocar');
  assert.equal(fogoQueVale(4, 6), 'trocar');
  // Igual ou menor: não troca.
  assert.equal(fogoQueVale(4, 4), 'manter');
  assert.equal(fogoQueVale(4, 2), 'manter');
  assert.equal(fogoQueVale(6, 4), 'manter');
});

test('radiação (p. 181): a baixa sem dano, a alta 2 e a extrema 6', () => {
  assert.deepEqual(['baixa', 'alta', 'extrema'].map(danoDaRadiacao), [0, 2, 6]);
  assert.deepEqual(Object.keys(PERIGOS.radiacao.niveis), ['baixa', 'alta', 'extrema']);
});

test('queda (p. 180): menos de 10 m, nada; 2d6 a cada 10 m; duas cyberpernas anulam até 30 m', () => {
  const formula = (metros, pernas) => quedaDe(metros, pernas).formula;
  // 0 e 1 cyberperna: o dano todo.
  for (const pernas of [0, 1]) {
    assert.deepEqual([9, 10, 25, 30, 31, 40].map(m => formula(m, pernas)), [null, '2d6', '4d6', '6d6', '6d6', '8d6']);
    assert.deepEqual([9, 10, 25, 30, 31, 40].map(m => quedaDe(m, pernas).teste), [false, true, true, true, true, true]);
  }
  // 2 cyberpernas: nada até 30 m; 31 m, o dano todo.
  assert.deepEqual([9, 10, 25, 30, 31, 40].map(m => formula(m, 2)), [null, null, null, null, '6d6', '8d6']);
  assert.deepEqual([9, 10, 25, 30, 31, 40].map(m => quedaDe(m, 2).teste), [false, false, false, false, true, true]);
  assert.deepEqual([9, 10, 30].map(m => quedaDe(m, 2).motivo), ['baixa', 'cyberpernas', 'cyberpernas']);
  assert.equal(quedaDe(25, 0).dados, 4);
  assert.equal(quedaDe(31, 2).dados, 6);
  assert.equal(quedaDe(-5, 0).motivo, 'baixa');
  assert.equal(DV_DA_QUEDA, 15);
  assert.equal(PERICIA_DA_QUEDA, 'athletics');
});

test('queda: as cyberpernas que contam são as fundações cyberLeg instaladas, sem a Meat Leg do membro natural', () => {
  const perna = (dados = {}) => ({ tipo: 'cyberLeg', fundacional: true, instalado: true, catalogo: 'core_cyberware:cyberleg', nome: 'Cyberleg', ...dados });
  assert.equal(contarCyberpernas([perna(), perna()]), 2);
  assert.equal(contarCyberpernas([perna(), perna({ instalado: false })]), 1);
  assert.equal(contarCyberpernas([perna(), perna({ catalogo: 'core_cyberware:medical-grade-cyberleg', nome: 'Medical Grade Cyberleg' })]), 2);
  assert.equal(contarCyberpernas([perna(), perna({ catalogo: 'core_cyberware:meat-leg', nome: 'Perna de carne' })]), 1);
  assert.equal(contarCyberpernas([perna(), perna({ catalogo: '', nome: 'Meat Leg — Perna direita' })]), 1);
  // A opção da cyberperna (não fundacional) e o cyberbraço não contam.
  assert.equal(contarCyberpernas([perna(), perna({ fundacional: false, catalogo: 'core_cyberware:talon-foot' }), perna({ tipo: 'cyberArm' })]), 1);
});

test('veneno (p. 181): WILL + Resistir Tortura/Drogas contra DV11 (1d6), DV13 (2d6) ou DV15 (3d6); passar é superar a DV', () => {
  assert.deepEqual(['brando', 'intenso', 'mortal'].map(venenoDe), [{ dv: 11, dano: '1d6' }, { dv: 13, dano: '2d6' }, { dv: 15, dano: '3d6' }]);
  assert.equal(PERICIA_DO_VENENO, 'resist-torture-drugs');
  assert.equal(superou(15, 15), false);
  assert.equal(superou(16, 15), true);
});

test('droga como arma (p. 181): a mesma rolagem contra DV11 (embriaguez), DV13 (sugestionável) ou DV15 (o que o criador quis)', () => {
  assert.deepEqual(['dv11', 'dv13', 'dv15'].map(nivel => drogaDe(nivel).dv), [11, 13, 15]);
  assert.deepEqual(['dv11', 'dv13', 'dv15'].map(nivel => drogaDe(nivel).efeito), ['embriaguez', 'fica sugestionável', 'o que o criador da droga quis']);
  assert.equal(drogaDe('mortal'), null);
});

test('afogamento (p. 180): segura o fôlego por BODY minutos', () => {
  assert.equal(folegoEmMinutos(6), 6);
  assert.equal(folegoEmMinutos(undefined), 0);
});

test('o /perigo: os argumentos preenchem a janela; o nível que não existe fica no primeiro', () => {
  assert.deepEqual(lerComandoPerigo('/perigo fogo intenso'), { perigo: 'fogo', nivel: 'intenso', metros: null });
  assert.deepEqual(lerComandoPerigo('/perigo queda 25'), { perigo: 'queda', nivel: '', metros: 25 });
  assert.deepEqual(lerComandoPerigo('/perigo queda 12m'), { perigo: 'queda', nivel: '', metros: 12 });
  assert.deepEqual(lerComandoPerigo('/perigo veneno mortal'), { perigo: 'veneno', nivel: 'mortal', metros: null });
  assert.deepEqual(lerComandoPerigo('/Perigo Radiação Extrema'), { perigo: 'radiacao', nivel: 'extrema', metros: null });
  assert.deepEqual(lerComandoPerigo('/perigo droga 13'), { perigo: 'droga', nivel: 'dv13', metros: null });
  assert.deepEqual(lerComandoPerigo('/perigo eletrocução'), { perigo: 'eletrocucao', nivel: '', metros: null });
  assert.deepEqual(lerComandoPerigo('/perigo'), { perigo: '', nivel: '', metros: null });
  assert.equal(lerComandoPerigo('/perigoso'), null);
  assert.equal(lerComandoPerigo('fogo'), null);
  assert.equal(nivelValido('fogo', 'alto'), 'brando');
  assert.equal(nivelValido('queda', 'alto'), '');
});
