const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../../personagem-roles');
const C = require('../../system-criacao');

test('personagem antigo mantém uma Role no Rank 4 e o contrato do compêndio', () => {
  const doc = { role: 'solo', habilidades: { 'Initiative Reaction': 4 } };
  const antes = JSON.stringify(doc);
  const [role] = R.resultados(doc, C);
  assert.equal(R.lista(doc).length, 1);
  assert.equal(role.id, 'solo');
  assert.equal(role.rank, 4);
  assert.deepEqual(role.foundry, { pack: 'cyberpunk-red-core.core_roles', nome: 'Solo' });
  assert.equal(role.habilidades.find(item => item.nome === 'Initiative Reaction').rank, 4);
  assert.equal(JSON.stringify(doc), antes);
});

test('as duas distribuições e as derivadas de Medtech são independentes', () => {
  const doc = {
    role: 'solo', rankRole: 2, habilidades: { 'Initiative Reaction': 2 }, oficina: ['original'],
    lifepath: { role: { tipo: 1 }, personalidade: 'Calma' },
    roleSecundaria: { id: 'medtech', rank: 3, habilidades: { Surgery: 2, 'Medical Tech (Pharmaceuticals)': 1 }, lifepath: { tipo: 2 } }
  };
  const roles = R.resultados(doc, C);
  assert.deepEqual(roles.map(({ id, rank }) => ({ id, rank })), [{ id: 'solo', rank: 2 }, { id: 'medtech', rank: 3 }]);
  const medtech = new Map(roles[1].habilidades.map(item => [item.nome, item.rank]));
  assert.equal(medtech.get('Surgery Skill'), 4);
  assert.equal(medtech.get('Medical Tech Skill'), 1);
  assert.equal(roles[0].habilidades.find(item => item.nome === 'Initiative Reaction').rank, 2);
  const contexto = R.contexto(doc, R.lista(doc)[1]);
  assert.equal(contexto.role, 'medtech');
  assert.equal(contexto.rankRole, 3);
  assert.deepEqual(contexto.lifepath.role, { tipo: 2 });
  assert.equal(contexto.lifepath.personalidade, 'Calma');
  assert.deepEqual(contexto.oficina, []);
  assert.equal(R.lista(contexto).length, 1);
  assert.deepEqual(doc.oficina, ['original']);
});

test('pontos e limites acompanham o Rank sem mudar as tabelas de Rank 4', () => {
  assert.equal(R.especificacao('solo', 1, C).pontos, 1);
  assert.equal(R.especificacao('tech', 2, C).pontos, 4);
  assert.equal(R.especificacao('tech', 2, C).max, 2);
  assert.equal(R.especificacao('medtech', 7, C).pontos, 7);
  const doc = { role: 'medtech', rankRole: 7, habilidades: { Surgery: 7 } };
  assert.equal(R.resultados(doc, C)[0].habilidades.find(item => item.nome === 'Surgery Skill').rank, 10);
  assert.equal(C.roleAbilities.solo.pontos, 4);
  assert.equal(C.roleAbilities.tech.pontos, 8);
});

test('normalização recusa Roles repetidas e Ranks fora do intervalo da mesa', () => {
  for (const rank of [0, 11, 1.5, true, null, 'infinito']) {
    assert.throws(() => R.normalizar({ role: 'solo', rankRole: rank }), /Rank/);
    assert.throws(() => R.normalizar({ role: 'solo', roleSecundaria: { id: 'tech', rank } }), /Rank/);
  }
  assert.throws(() => R.normalizar({ role: 'rockerboy', roleSecundaria: { id: 'face', rank: 1 } }), /diferente/);
  assert.throws(() => R.normalizar({ role: 'solo', roleSecundaria: { id: 'inexistente' } }), /válidas/);
  const doc = R.normalizar({ role: 'corpo', roleSecundaria: { id: 'face' } });
  assert.equal(doc.role, 'exec');
  assert.equal(doc.roleSecundaria.id, 'rockerboy');
  assert.equal(doc.roleSecundaria.rank, 1);
});

test('snapshot conserva a principal da wiki quando a Role ativa no Foundry muda', () => {
  const doc = { role: 'solo', mesa: { role: { nome: 'Netrunner', rank: 2 }, roles: [
    { nome: 'Netrunner', rank: 2, habilidades: [['Interface', 2]] },
    { id: 'solo', nome: 'Solo', rank: 6, habilidades: [{ nome: 'Initiative Reaction', rank: 6 }] }
  ] } };
  const roles = R.listaMesa(doc);
  assert.deepEqual(roles.map(item => [item.id, item.rank]), [['solo', 6], ['netrunner', 2]]);
  assert.deepEqual(roles[0].habilidades, [['Initiative Reaction', 6]]);
  assert.equal(doc.mesa.roles[0].nome, 'Netrunner');
});

test('snapshot antigo não inventa uma segunda Role instalada', () => {
  const doc = { role: 'solo', roleSecundaria: { id: 'tech', rank: 1 }, mesa: { role: { nome: 'Solo', rank: 5 } } };
  assert.deepEqual(R.listaMesa(doc), [{ id: 'solo', nome: 'Solo', rank: 5, habilidades: [] }]);
});

test('uma habilidade inválida no snapshot não impede a leitura das outras Roles', () => {
  const doc = { role: 'medtech', mesa: { roles: [
    { nome: 'Medtech', rank: 3, habilidades: [null, false, 23, 'inválida', [], ['Surgery', 1], { nome: 'Medical Tech Skill', rank: 2 }] },
    { nome: 'Solo', rank: 1, habilidades: null }
  ] } };
  assert.deepEqual(R.listaMesa(doc)[0].habilidades, [['Surgery', 1], ['Medical Tech Skill', 2]]);
  assert.deepEqual(R.listaMesa(doc)[1].habilidades, []);
  assert.throws(() => R.normalizar({ role: { toString: {} } }), /válida/);
});
