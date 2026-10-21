// A revisão seletiva da mesa: foundry-2077/scripts/wiki.mjs, atualizarDaWiki, applySkills e planRoles.
// O formato dos campos do sistema é o de dados.mjs; os conversores de importação ficam em wiki.mjs.
import assert from 'node:assert/strict';
import test from 'node:test';
import { planejarAtualizacao } from '../../foundry-sistema/scripts/wiki-atualizacao.mjs';

const role = (nome, rank = 4, habilidades = {}) => ({ nome, rank, habilidades });
const grupo = (plano, chave) => plano.grupos.find(entrada => entrada.chave === chave);

test('Atualizar da wiki: compara os STATs de origem e não repõe HP, Humanidade, dinheiro nem Sorte gastos', () => {
  // atualizarDaWiki compara STATs e mantém recursos de jogo; EMP usa o máximo, não a EMP já reduzida.
  const sistema = { atributos: { ref: { valor: 3 }, emp: { valor: 6 } }, hp: { value: 12 }, humanidade: { value: 8 }, dinheiro: 40, sorte: { value: 1 } };
  const plano = planejarAtualizacao({ sistema, atributosBase: { ref: { valor: 8 }, emp: { valor: 6 } } }, {
    resultado: { stats: { REF: 8, EMP: 7, LUCK: 6 }, derivados: { hp: 50 }, humanidade: { atual: 70 }, dinheiro: { saldo: 900 } }
  });
  assert.deepEqual(grupo(plano, 'stats').atualizacao, { 'system.atributos.luck.valor': 6, 'system.atributos.emp.valor': 7 });
  assert.deepEqual(sistema, { atributos: { ref: { valor: 3 }, emp: { valor: 6 } }, hp: { value: 12 }, humanidade: { value: 8 }, dinheiro: 40, sorte: { value: 1 } });
  assert.deepEqual(plano.grupos.map(entrada => entrada.chave), ['stats']);
});

test('Atualizar da wiki: applySkills muda só os níveis recebidos e conserva perícias manuais e seus metadados', () => {
  const sistema = { pericias: {
    concentracao: { nivel: 2, familia: '', nome: '', atributo: '' },
    propria: { nivel: 3, familia: 'custom', nome: 'Minha perícia', atributo: 'cool' },
    'language-japanese': { nivel: 4, familia: 'language', nome: 'Japanese', atributo: '' }
  } };
  const antes = structuredClone(sistema);
  const plano = planejarAtualizacao({ sistema }, {}, { pericias: {
    concentracao: { nivel: 6, familia: '', nome: '' },
    'language-japanese': { nivel: 4, familia: 'language', nome: 'Japanese' },
    'language-streetslang': { nivel: 2, familia: 'language', nome: 'Streetslang' }
  } });
  assert.deepEqual(grupo(plano, 'pericias').atualizacao, {
    'system.pericias.concentracao.nivel': 6,
    'system.pericias.language-streetslang': { nivel: 2, familia: 'language', nome: 'Streetslang' }
  });
  assert.deepEqual(sistema, antes);
});

test('Atualizar da wiki: planRoles retira somente a Role importada e preserva a Role manual e as notas', () => {
  const sistema = { role: { ...role('Solo'), notas: 'Treino e contatos' }, roleSecundaria: role('Tech', 2) };
  const plano = planejarAtualizacao({ sistema, vinculo: { roles: ['Solo'] } }, {}, { roles: [role('Netrunner', 5, { Interface: 5 })] });
  assert.deepEqual(grupo(plano, 'roles').atualizacao, {
    'system.role': { ...role('Netrunner', 5, { Interface: 5 }), notas: 'Treino e contatos' }
  });
  assert.deepEqual(plano.rolesVinculadas, ['Netrunner']);
  assert.deepEqual(plano.notas, []);
});

test('Atualizar da wiki: uma Role manual reaproveitada muda Rank e habilidades sem ganhar a marca do importador', () => {
  const sistema = { role: { ...role('Tech', 2, { fabricar: 1 }), notas: 'Oficina' }, roleSecundaria: role('', 0) };
  const recebida = role('Tech', 4, { inventar: 3 });
  const plano = planejarAtualizacao({ sistema }, {}, { roles: [recebida] });
  assert.deepEqual(grupo(plano, 'roles').atualizacao, { 'system.role': { ...recebida, notas: 'Oficina' } });
  assert.deepEqual(plano.rolesVinculadas, []);
  assert.deepEqual(sistema.role.habilidades, { fabricar: 1 });
});

test('Atualizar da wiki: retirar a segunda Role importada deixa o campo vazio sem alterar a principal', () => {
  const sistema = { role: { ...role('Solo'), notas: '' }, roleSecundaria: role('Tech', 2) };
  const plano = planejarAtualizacao({ sistema, vinculo: { roles: ['Solo', 'Tech'] } }, {}, { roles: [role('Solo')] });
  assert.deepEqual(grupo(plano, 'roles').atualizacao, { 'system.roleSecundaria': role('', 0) });
  assert.deepEqual(plano.rolesVinculadas, ['Solo']);
});

test('Atualizar da wiki: a Role principal manual passa à segunda sem gravar notas fora do schema', () => {
  const sistema = { role: { ...role('Solo'), notas: 'Notas livres' }, roleSecundaria: role('Tech', 2) };
  const opcoes = { roles: [role('Tech', 2)] };
  const plano = planejarAtualizacao({ sistema, vinculo: { roles: ['Tech'] } }, {}, opcoes);
  assert.deepEqual(grupo(plano, 'roles').atualizacao, {
    'system.role': { ...role('Tech', 2), notas: 'Notas livres' }, 'system.roleSecundaria': role('Solo')
  });
  const depois = { role: { ...role('Tech', 2), notas: 'Notas livres' }, roleSecundaria: role('Solo') };
  assert.deepEqual(planejarAtualizacao({ sistema: depois, vinculo: { roles: ['Tech'] } }, {}, opcoes).grupos, []);
});

test('Atualizar da wiki: Roles manuais que excederiam os dois espaços bloqueiam o grupo sem apagar dados', () => {
  const sistema = { role: { ...role('Solo'), notas: 'Manual' }, roleSecundaria: role('Tech', 2) };
  const antes = structuredClone(sistema);
  const plano = planejarAtualizacao({ sistema }, {}, { roles: [role('Netrunner')] });
  assert.equal(grupo(plano, 'roles').bloqueado, true);
  assert.deepEqual(grupo(plano, 'roles').atualizacao, {});
  assert.match(plano.notas[0], /Solo, Tech.*não há espaço/);
  assert.deepEqual(sistema, antes);
});

test('Atualizar da wiki: entregues e UIDs presentes impedem recriar itens perdidos ou gastos', () => {
  // atualizarDaWiki filtra por link.entregues. A importação do sistema também marca wikiUid em cada cópia criada.
  const entradas = [
    { uid: 'gasto', nome: 'Munição', qtd: 10 },
    { uid: 'presente', nome: 'Agent', qtd: 1 },
    { uid: 'novo', nome: 'Equipamento', qtd: 2 }
  ];
  const plano = planejarAtualizacao({ vinculo: { entregues: ['gasto'] }, itens: [{ flags: { 'cpr-fieldbook': { wikiUid: 'presente' } } }] }, { resultado: { itens: entradas } });
  assert.deepEqual(plano.novosItens, [entradas[2]]);
  assert.deepEqual(grupo(plano, 'itens').linhas, ['Equipamento ×2']);
});

test('Atualizar da wiki: UID presente basta no ator legado sem entregues e uma entrada repetida só entra uma vez', () => {
  const novo = { uid: 'novo', nome: 'Novo' };
  const plano = planejarAtualizacao({ itens: [{ uid: 'antigo' }] }, { resultado: { itens: [{ uid: 'antigo' }, novo, { ...novo }, { nome: 'Sem UID' }] } });
  assert.deepEqual(plano.novosItens, [novo]);
});

test('Atualizar da wiki: Lifepath e moradia formam grupos independentes sem incluir campos de jogo', () => {
  // atualizarDaWiki compara o Lifepath e lifestyleUpdate; moradiaDaWiki acrescenta a moda aos campos do sistema.
  const sistema = { lifepath: { origem: 'Antes', amigos: 'Contato manual' }, moradia: { custo: 1000, descricao: 'Contêiner de carga' }, moda: 'Kitsch', dinheiro: 50 };
  const plano = planejarAtualizacao({ sistema }, {}, {
    lifepath: { origem: 'Depois' },
    moradia: { moradia: { custo: 1500, descricao: 'Quitinete' }, moda: 'Kitsch' }
  });
  assert.deepEqual(grupo(plano, 'lifepath').atualizacao, { 'system.lifepath.origem': 'Depois' });
  assert.deepEqual(grupo(plano, 'moradia').atualizacao, { 'system.moradia': { custo: 1500, descricao: 'Quitinete' } });
  assert.deepEqual(plano.grupos.map(entrada => entrada.chave), ['lifepath', 'moradia']);
  assert.equal(sistema.dinheiro, 50);
});

test('Atualizar da wiki: a ficha igual e a resposta sem campos aplicáveis não abrem grupos vazios', () => {
  const sistema = { atributos: { ref: { valor: 8 } }, role: { ...role('Solo', 4, { a: 1, b: 2 }), notas: '' }, roleSecundaria: role('', 0), lifepath: { origem: 'Night City' }, moradia: { custo: 1000, descricao: 'Contêiner de carga' } };
  const plano = planejarAtualizacao({ sistema, vinculo: { roles: ['Solo'] } }, { resultado: { stats: { REF: 8 } } }, {
    roles: [role('Solo', 4, { b: 2, a: 1 })], lifepath: { origem: 'Night City' }, moradia: { moradia: { descricao: 'Contêiner de carga', custo: 1000 } }
  });
  assert.deepEqual(plano.grupos, []);
  assert.deepEqual(planejarAtualizacao().grupos, []);
  assert.deepEqual(planejarAtualizacao({ sistema, vinculo: { roles: ['Solo'] } }).rolesVinculadas, ['Solo']);
});
