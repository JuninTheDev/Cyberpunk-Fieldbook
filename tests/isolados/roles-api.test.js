// Regra da mesa: duas Roles já na criação, sem cobrar ou conceder IP por escolher seus Ranks.
// Todas as chamadas passam pelo atendimento real da API, com transporte e dados isolados.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

async function jogador(servidor, mestre, nome, campanhas) {
  const conta = await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome, ...(campanhas ? { campanhas } : {}) } });
  assert.equal(conta.status, 201, conta.text);
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
  assert.equal(login.status, 200, login.text);
  return { cookie: servidor.cookieDe(login), conta: conta.json.conta };
}

async function preparar(t) {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const ana = await jogador(servidor, mestre, 'Ana');
  return { servidor, mestre, ana };
}

async function criar(servidor, cookie, dados) {
  const resposta = await servidor.pedir('/api/personagens', { method: 'POST', cookie, body: { nome: 'V', ...dados } });
  assert.equal(resposta.status, 201, resposta.text);
  return resposta.json.personagem;
}

async function ler(servidor, cookie, id, sufixo = '', headers) {
  const resposta = await servidor.pedir(`/api/personagens/${id}${sufixo}`, { cookie, headers });
  assert.equal(resposta.status, 200, resposta.text);
  return resposta.json.personagem;
}

const identidades = roles => roles.map(({ id, rank }) => ({ id, rank }));
const duasRoles = () => ({
  role: 'tech', rankRole: 6,
  habilidades: { 'Field Expertise': 4, 'Upgrade Expertise': 4, 'Fabrication Expertise': 2, 'Invention Expertise': 2 },
  roleSecundaria: {
    id: 'medtech', rank: 3, habilidades: { Surgery: 1, 'Medical Tech (Pharmaceuticals)': 2 },
    oficina: [], lifepath: { trabalho: 'Clínica particular' }, especializacao: ''
  },
  resultado: { itens: [{ id: 'core_gear:agent', qtd: 1 }], dinheiro: { saldo: 500, inicial: 2550 } }
});

test('ficha legada mantém Role única no Rank 4 e a secundária omitida começa no Rank 1', async t => {
  const { servidor, ana } = await preparar(t);
  const legada = await criar(servidor, ana.cookie, { role: 'solo' });
  const lida = await ler(servidor, ana.cookie, legada.id);
  assert.equal(lida.role, 'solo');
  assert.equal(lida.rankRole ?? 4, 4);
  assert.ok(!lida.roleSecundaria);
  assert.equal(lida.resultado.role.id, 'solo');
  assert.equal(lida.resultado.role.rank, 4);
  assert.deepEqual(identidades(lida.resultado.roles), [{ id: 'solo', rank: 4 }]);
  const dupla = await criar(servidor, ana.cookie, { role: 'netrunner', roleSecundaria: { id: 'fixer' } });
  assert.equal(dupla.roleSecundaria.rank, 1);
  assert.deepEqual(identidades(dupla.resultado.roles), [{ id: 'netrunner', rank: 4 }, { id: 'fixer', rank: 1 }]);
  assert.deepEqual(dupla.avanco || [], []);
  assert.deepEqual(dupla.ip?.ganhos || [], []);
});

test('Ranks e habilidades das duas Roles persistem sem confiar nas Roles calculadas pelo cliente', async t => {
  const { servidor, ana } = await preparar(t);
  const dados = duasRoles();
  dados.resultado.role = { id: 'exec', rank: 10 };
  dados.resultado.roles = [{ id: 'exec', rank: 10 }, { id: 'nomad', rank: 10 }];
  const criada = await criar(servidor, ana.cookie, dados);
  const doc = await ler(servidor, ana.cookie, criada.id);
  assert.equal(doc.role, 'tech');
  assert.equal(doc.rankRole, 6);
  assert.equal(doc.roleSecundaria.id, 'medtech');
  assert.equal(doc.roleSecundaria.rank, 3);
  assert.deepEqual(doc.roleSecundaria.habilidades, dados.roleSecundaria.habilidades);
  assert.deepEqual(doc.roleSecundaria.lifepath, dados.roleSecundaria.lifepath);
  assert.deepEqual(identidades(doc.resultado.roles), [{ id: 'tech', rank: 6 }, { id: 'medtech', rank: 3 }]);
  assert.deepEqual(doc.resultado.role, doc.resultado.roles[0]);
  const campo = doc.resultado.roles[0].habilidades.find(item => item.nome === 'Field Expertise');
  const cirurgia = doc.resultado.roles[1].habilidades.find(item => item.nome === 'Surgery Skill');
  const medicina = doc.resultado.roles[1].habilidades.find(item => item.nome === 'Medical Tech Skill');
  assert.equal(campo.rank, 4);
  assert.equal(cirurgia.rank, 2);
  assert.equal(medicina.rank, 2);
});

test('escolher a segunda Role não duplica dinheiro, itens ou concede IP, inclusive nos Ranks 1 e 10', async t => {
  const { servidor, ana } = await preparar(t);
  const recursos = { itens: [{ id: 'core_gear:agent', qtd: 1 }], resultado: { itens: [{ id: 'core_gear:agent', qtd: 1 }], dinheiro: { saldo: 500, inicial: 2550 } } };
  const simples = await criar(servidor, ana.cookie, { role: 'netrunner', rankRole: 1, ...recursos });
  const dupla = await criar(servidor, ana.cookie, { role: 'netrunner', rankRole: 1, roleSecundaria: { id: 'exec', rank: 10 }, ...recursos });
  assert.deepEqual(identidades(dupla.resultado.roles), [{ id: 'netrunner', rank: 1 }, { id: 'exec', rank: 10 }]);
  assert.deepEqual(dupla.itens, simples.itens);
  assert.deepEqual(dupla.resultado.itens, simples.resultado.itens);
  assert.deepEqual(dupla.resultado.dinheiro, simples.resultado.dinheiro);
  assert.deepEqual(dupla.avanco || [], simples.avanco || []);
  assert.deepEqual(dupla.ip?.ganhos || [], []);
});

const invalidos = [
  ['Rank principal zero', { role: 'solo', rankRole: 0 }],
  ['Rank principal acima de 10', { role: 'solo', rankRole: 11 }],
  ['Rank principal fracionário', { role: 'solo', rankRole: 4.5 }],
  ['Rank secundário zero', { role: 'solo', roleSecundaria: { id: 'tech', rank: 0 } }],
  ['Rank secundário acima de 10', { role: 'solo', roleSecundaria: { id: 'tech', rank: 11 } }],
  ['Rank secundário fracionário', { role: 'solo', roleSecundaria: { id: 'tech', rank: 1.5 } }],
  ['Role principal desconhecida', { role: 'inexistente' }],
  ['Role secundária desconhecida', { role: 'solo', roleSecundaria: { id: 'inexistente', rank: 1 } }],
  ['Roles repetidas', { role: 'solo', roleSecundaria: { id: 'solo', rank: 2 } }],
  ['alias principal repete a secundária', { role: 'face', roleSecundaria: { id: 'rockerboy', rank: 1 } }],
  ['alias secundário repete a principal', { role: 'exec', roleSecundaria: { id: 'corpo', rank: 1 } }]
];

test('criação rejeita Ranks inválidos e Roles inválidas ou repetidas sem deixar fichas parciais', async t => {
  const { servidor, ana } = await preparar(t);
  for (const [nome, dados] of invalidos) {
    const resposta = await servidor.pedir('/api/personagens', { method: 'POST', cookie: ana.cookie, body: { nome, ...dados } });
    assert.equal(resposta.status, 400, `${nome}: ${resposta.text}`);
    assert.ok(resposta.json.erro, nome);
  }
  const lista = await servidor.pedir('/api/personagens', { cookie: ana.cookie });
  assert.deepEqual(lista.json.personagens, []);
});

test('edição inválida preserva Roles, resultado e versão que já estavam salvos', async t => {
  const { servidor, ana } = await preparar(t);
  const doc = await criar(servidor, ana.cookie, duasRoles());
  for (const [nome, dados] of invalidos) {
    const resposta = await servidor.pedir(`/api/personagens/${doc.id}`, { method: 'PUT', cookie: ana.cookie, body: { ...doc, roleSecundaria: null, ...dados } });
    assert.equal(resposta.status, 400, `${nome}: ${resposta.text}`);
    const depois = await ler(servidor, ana.cookie, doc.id);
    assert.equal(depois.versao, doc.versao, nome);
    assert.deepEqual(depois.resultado.roles, doc.resultado.roles, nome);
    assert.deepEqual(depois.roleSecundaria, doc.roleSecundaria, nome);
  }
});

test('duas Roles continuam protegidas por autoria, campanha e controle de versão', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const bruno = await jogador(servidor, mestre, 'Bruno');
  const campanha = await servidor.pedir('/api/campanhas', { method: 'POST', cookie: mestre, body: { nome: 'Outra mesa' } });
  assert.equal(campanha.status, 201, campanha.text);
  const fora = await jogador(servidor, mestre, 'Fora', [campanha.json.campanha.id]);
  const doc = await criar(servidor, ana.cookie, duasRoles());
  const url = `/api/personagens/${doc.id}`;
  const corpo = { ...doc, rankRole: 7 };
  assert.equal((await servidor.pedir(url, { method: 'PUT', body: corpo })).status, 401);
  assert.equal((await servidor.pedir(url, { method: 'PUT', cookie: bruno.cookie, body: corpo })).status, 403);
  assert.equal((await servidor.pedir(`${url}?roles=2`, { cookie: fora.cookie })).status, 404);
  assert.equal((await servidor.pedir(url, { method: 'PUT', cookie: fora.cookie, body: corpo })).status, 404);
  assert.equal((await servidor.pedir(`${url}/ip`, { method: 'POST', cookie: ana.cookie, body: { qtd: 1000 } })).status, 403);
  const salva = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: { ...corpo, notas: 'Ranks combinados com o mestre' } });
  assert.equal(salva.status, 200, salva.text);
  assert.equal(salva.json.personagem.rankRole, 7);
  assert.equal(salva.json.personagem.roleSecundaria.rank, 3);
  const antiga = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: { ...doc, roleSecundaria: null } });
  assert.equal(antiga.status, 409, antiga.text);
  assert.deepEqual(antiga.json.personagem.roleSecundaria, salva.json.personagem.roleSecundaria);
});

test('pós-importação preserva as duas Roles e suas habilidades ao aceitar notas do proprietário', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const doc = await criar(servidor, ana.cookie, duasRoles());
  const url = `/api/personagens/${doc.id}`;
  const vinculo = await servidor.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator: 'ator12', nomeAtor: 'V' } });
  assert.equal(vinculo.status, 200, vinculo.text);
  const antes = await ler(servidor, ana.cookie, doc.id);
  const resposta = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: {
    ...antes, role: 'solo', rankRole: 10, habilidades: {},
    roleSecundaria: { id: 'fixer', rank: 10, habilidades: {}, oficina: ['v:Roadbike'], lifepath: { trabalho: 'Outro' } },
    resultado: { ...antes.resultado, role: { id: 'solo', rank: 10 }, roles: [] }, notas: 'Ainda pode anotar pistas'
  } });
  assert.equal(resposta.status, 200, resposta.text);
  const depois = resposta.json.personagem;
  assert.equal(depois.role, antes.role);
  assert.equal(depois.rankRole, antes.rankRole);
  assert.deepEqual(depois.habilidades, antes.habilidades);
  assert.deepEqual(depois.roleSecundaria, antes.roleSecundaria);
  assert.deepEqual(depois.resultado.roles, antes.resultado.roles);
  assert.equal(depois.notas, 'Ainda pode anotar pistas');
});

test('pós-importação também bloqueia a introdução de uma secundária numa ficha legada sem os campos novos', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const criada = await criar(servidor, ana.cookie, { role: 'netrunner' });
  // Representa um arquivo antigo apenas dentro da pasta temporária desta instância.
  const arquivo = path.join(servidor.dados, 'personagens', `${criada.id}.json`);
  const legado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  delete legado.rankRole;
  delete legado.roleSecundaria;
  if (legado.resultado) delete legado.resultado.roles;
  fs.writeFileSync(arquivo, JSON.stringify(legado));
  const url = `/api/personagens/${criada.id}`;
  const vinculo = await servidor.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator: 'ator14', nomeAtor: 'V', geracao: 14 } });
  assert.equal(vinculo.status, 200, vinculo.text);
  const atual = await ler(servidor, ana.cookie, criada.id);
  const salva = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: {
    ...atual, rankRole: 10, roleSecundaria: { id: 'tech', rank: 10, habilidades: { 'Field Expertise': 10 } }, notas: 'Anotação permitida'
  } });
  assert.equal(salva.status, 200, salva.text);
  const depois = await ler(servidor, mestre, criada.id);
  assert.equal(depois.rankRole ?? 4, 4);
  assert.ok(!depois.roleSecundaria);
  assert.deepEqual(identidades(depois.resultado.roles), [{ id: 'netrunner', rank: 4 }]);
  assert.equal(depois.notas, 'Anotação permitida');
  assert.equal(depois.foundry14.ator, 'ator14');
});

test('legado importado sem resultado não aceita uma ficha calculada com Roles forjadas', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const criada = await criar(servidor, ana.cookie, { role: 'netrunner' });
  const arquivo = path.join(servidor.dados, 'personagens', `${criada.id}.json`);
  const legado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  delete legado.rankRole;
  delete legado.roleSecundaria;
  delete legado.resultado;
  fs.writeFileSync(arquivo, JSON.stringify(legado));
  const url = `/api/personagens/${criada.id}`;
  assert.equal((await servidor.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator: 'legado14', geracao: 14 } })).status, 200);
  const salva = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: {
    ...legado, role: 'solo', rankRole: 10, roleSecundaria: { id: 'tech', rank: 10 },
    resultado: { stats: { INT: 10 }, dinheiro: { saldo: 999999 } }, notas: 'Só a nota muda'
  } });
  assert.equal(salva.status, 200, salva.text);
  const depois = await ler(servidor, ana.cookie, criada.id);
  assert.equal(depois.role, 'netrunner');
  assert.equal(depois.rankRole, undefined);
  assert.equal(depois.roleSecundaria, undefined);
  assert.equal(depois.resultado, undefined);
  assert.equal(depois.notas, 'Só a nota muda');
  assert.equal(depois.foundry.ator, 'legado14');
  assert.equal((await ler(servidor, mestre, criada.id)).foundry14.ator, 'legado14');
});

test('snapshot legado atualiza uma Role sem apagar outra nem misturar gerações do Foundry', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const doc = await criar(servidor, ana.cookie, duasRoles());
  const url = `/api/personagens/${doc.id}`;
  for (const [ator, geracao] of [['ator12', 12], ['ator14', 14]]) {
    assert.equal((await servidor.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator, geracao } })).status, 200);
  }
  const enviar = body => servidor.pedir(`${url}/mesa`, { method: 'PUT', cookie: mestre, body });
  const roles = [{ id: 'tech', nome: 'Tech', rank: 6, habilidades: [] }, { id: 'medtech', nome: 'Medtech', rank: 3, habilidades: [] }];
  assert.equal((await enviar({ ator: 'ator12', geracao: 12, role: roles[0], roles })).status, 200);
  assert.equal((await enviar({ ator: 'ator12', geracao: 12, role: { nome: 'Medtech', rank: 4 } })).status, 200);
  const atualizada = await ler(servidor, ana.cookie, doc.id);
  assert.deepEqual(atualizada.mesa.roles.map(({ nome, rank }) => ({ nome, rank })), [{ nome: 'Tech', rank: 6 }, { nome: 'Medtech', rank: 4 }]);
  assert.equal((await enviar({ ator: 'ator14', geracao: 14, role: { nome: 'Tech', rank: 7 } })).status, 200);
  const outraGeracao = await ler(servidor, ana.cookie, doc.id);
  assert.equal(outraGeracao.mesa.roles, undefined);
  assert.equal(outraGeracao.mesa.role.rank, 7);
});

test('restaurar uma versão repõe as duas Roles e conserva ambos os vínculos, mesa e IP atuais', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const doc = await criar(servidor, ana.cookie, duasRoles());
  const url = `/api/personagens/${doc.id}`;
  assert.equal((await servidor.pedir(`${url}/ip`, { method: 'POST', cookie: mestre, body: { qtd: 120, motivo: 'Sessão' } })).status, 200);
  for (const [ator, geracao] of [['ator12', 12], ['ator14', 14]]) {
    const resposta = await servidor.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator, geracao, nomeAtor: ator } });
    assert.equal(resposta.status, 200, resposta.text);
  }
  const original = await ler(servidor, mestre, doc.id);
  const editada = await servidor.pedir(url, { method: 'PUT', cookie: mestre, body: { ...original, rankRole: 7, roleSecundaria: { ...original.roleSecundaria, rank: 4 }, notas: 'Estado posterior' } });
  assert.equal(editada.status, 200, editada.text);
  assert.equal((await servidor.pedir(`${url}/ip`, { method: 'POST', cookie: mestre, body: { qtd: 50, motivo: 'Outra sessão' } })).status, 200);
  const mesa = { ator: 'ator14', geracao: 14, hp: { atual: 23, max: 40 }, ip: 170, roles: [
    { id: 'tech', nome: 'Tech', rank: 7, habilidades: [['Field Expertise', 4]] },
    { id: 'medtech', nome: 'Medtech', rank: 4, habilidades: [['Surgery', 2]] }
  ] };
  assert.equal((await servidor.pedir(`${url}/mesa`, { method: 'PUT', cookie: mestre, body: mesa })).status, 200);
  const antes = await ler(servidor, mestre, doc.id);
  const historico = await servidor.pedir(`${url}/versoes`, { cookie: mestre });
  assert.equal(historico.status, 200, historico.text);
  const antiga = historico.json.versoes.find(item => item.versao === original.versao);
  assert.ok(antiga, historico.text);
  assert.equal((await servidor.pedir(`${url}/versoes`, { cookie: ana.cookie })).status, 403);
  const rota = `${url}/versoes/${antiga.id}/restaurar`;
  assert.equal((await servidor.pedir(rota, { method: 'POST', cookie: ana.cookie })).status, 403);
  const restaurada = await servidor.pedir(rota, { method: 'POST', cookie: mestre });
  assert.equal(restaurada.status, 200, restaurada.text);
  const depois = restaurada.json.personagem;
  assert.deepEqual(identidades(depois.resultado.roles), identidades(original.resultado.roles));
  assert.deepEqual(depois.roleSecundaria, original.roleSecundaria);
  assert.equal(depois.rankRole, original.rankRole);
  assert.deepEqual(depois.foundry12, antes.foundry12);
  assert.deepEqual(depois.foundry14, antes.foundry14);
  assert.deepEqual(depois.mesa, antes.mesa);
  assert.deepEqual(depois.ip, antes.ip);
  assert.deepEqual(depois.ip.ganhos.map(item => item.qtd), [120, 50]);
  assert.equal(depois.versao, antes.versao + 1);
});

test('importação de duas Roles exige anúncio de suporte e a leitura normal da wiki permanece disponível', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const dupla = await criar(servidor, ana.cookie, duasRoles());
  const headers = { Origin: 'http://localhost:30000' };
  const url = `/api/personagens/${dupla.id}`;
  const antiga = await servidor.pedir(url, { cookie: mestre, headers });
  assert.equal(antiga.status, 409, antiga.text);
  assert.match(antiga.json.erro, /duas|2\s*Roles|multiclasse/i);
  assert.equal(antiga.json.personagem, undefined);
  assert.equal((await servidor.pedir(`${url}?roles=1`, { cookie: mestre, headers })).status, 409);
  const compativel = await servidor.pedir(`${url}?roles=2`, { cookie: mestre, headers });
  assert.equal(compativel.status, 200, compativel.text);
  assert.equal(compativel.json.personagem.resultado.roles.length, 2);
  assert.equal((await servidor.pedir(url, { cookie: ana.cookie })).status, 200);
  const simples = await criar(servidor, ana.cookie, { role: 'solo' });
  assert.equal((await servidor.pedir(`/api/personagens/${simples.id}`, { cookie: mestre, headers })).status, 200);
});

test('snapshot da mesa mantém as duas Roles completas e o resumo público revela somente seus IDs e Ranks', async t => {
  const { servidor, mestre, ana } = await preparar(t);
  const bruno = await jogador(servidor, mestre, 'Bruno');
  const doc = await criar(servidor, ana.cookie, duasRoles());
  const url = `/api/personagens/${doc.id}`;
  const roles = [
    { id: 'tech', nome: 'Tech', rank: 7, habilidades: [['Field Expertise', 4], ['Invention Expertise', 3]] },
    { id: 'medtech', nome: 'Medtech', rank: 4, habilidades: [['Surgery', 2], ['Medical Tech Skill', 2]] }
  ];
  const mesa = await servidor.pedir(`${url}/mesa`, { method: 'PUT', cookie: mestre, body: { roles, hp: { atual: 20, max: 40 }, ip: 30 } });
  assert.equal(mesa.status, 200, mesa.text);
  const particular = await ler(servidor, ana.cookie, doc.id);
  assert.deepEqual(particular.mesa.roles, roles);
  const publico = await ler(servidor, bruno.cookie, doc.id);
  assert.equal(publico.role, 'tech');
  assert.equal(publico.publico, true);
  assert.deepEqual(publico.roles, identidades(roles));
  assert.equal(publico.mesa, undefined);
  assert.equal(publico.resultado, undefined);
  assert.equal(publico.roleSecundaria, undefined);
  const lista = await servidor.pedir('/api/personagens', { cookie: bruno.cookie });
  const resumo = lista.json.personagens.find(item => item.id === doc.id);
  assert.deepEqual(resumo.roles, identidades(roles));
  assert.equal(resumo.habilidades, undefined);
});
