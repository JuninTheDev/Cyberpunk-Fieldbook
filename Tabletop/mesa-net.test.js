// Testes da NET na mesa da wiki (M13, fase 1): as regras da arquitetura (mesa-net.js), os números conferidos contra a
// wiki, e pela API as arquiteturas do mestre e o netrunner da ficha.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const N = require('./mesa-net');
const characterGame = require('../personagem-jogo');
const { montar } = require('./teste-ajuda');

const raiz = path.join(__dirname, '..');
const textoDaWiki = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

test('os números da mesa são os da wiki: o Black ICE, os demônios, os programas e o lobby', () => {
  const net = textoDaWiki('system-net.js');
  for (const [, nome, numeros] of net.matchAll(/name: '([^']+)', tag: 'Black ICE [^']*', stats: iceStats\(([^)]*)\)/g)) {
    const [per, spd, atk, def, rez] = numeros.split(',').map(Number);
    const ice = Object.values(N.BLACK_ICE).find(item => item.nome === nome);
    assert.ok(ice, `${nome} está na mesa`);
    assert.deepEqual([ice.per, ice.spd, ice.atk, ice.def, ice.rez], [per, spd, atk, def, rez], nome);
  }
  assert.equal(Object.keys(N.BLACK_ICE).length, 12);
  for (const [, nome, stats] of net.matchAll(/name: '([^']+)', tag: 'Demônio', stats: (\[\[.*?\]\])/g)) {
    const numeros = Object.fromEntries([...stats.matchAll(/\['([^']+)', (\d+)\]/g)].map(([, rotulo, valor]) => [rotulo, Number(valor)]));
    const demonio = Object.values(N.DEMONIOS).find(item => item.nome === nome);
    assert.deepEqual([demonio.rez, demonio.interface, demonio.acoes, demonio.combate], [numeros.REZ, numeros.Interface, numeros['Ações NET'], numeros['Valor de combate']], nome);
  }
  let programas = 0;
  for (const [, nome, numeros] of net.matchAll(/name: '([^']+)', tag: '(?:Booster|Defensor|Ataque [^']*)', stats: programStats\(([^)]*)\)/g)) {
    const [atk, def, rez] = numeros.split(',').map(Number);
    const p = N.programaDe({ nome });
    assert.ok(p, `${nome} está na mesa`);
    assert.deepEqual([p.atk, p.def, p.rez], [atk, def, rez], nome);
    programas += 1;
  }
  assert.equal(programas, Object.keys(N.PROGRAMAS).length, 'todos os programas da wiki, nem mais nem menos');
  assert.match(net, /Causa <b>3d6 de REZ<\/b> num Black ICE, ou <b>2d6<\/b> num programa/, 'o dano do Sword');
  assert.deepEqual(N.PROGRAMAS.sword.dano, { programa: '2d6', ice: '3d6' });
  // O lobby da wiki: "1 arquivo DV6 · 2 senha DV6 · 3 senha DV8 · 4 Skunk · 5 Wisp · 6 Killer".
  assert.match(textoDaWiki('system-rules.js'), /1 arquivo DV6 · 2 senha DV6 · 3 senha DV8 · 4 Skunk · 5 Wisp · 6 Killer/);
  assert.deepEqual(N.TABELAS.lobby.resultados.map(r => r.rotulo), ['Arquivo DV 6', 'Senha DV 6', 'Senha DV 8', 'Skunk', 'Wisp', 'Killer']);
  assert.deepEqual(N.TABELAS.padrao.resultados.find(r => r.min === 4).conteudos, [{ tipo: 'ice', ice: 'hellhound' }, { tipo: 'ice', ice: 'killer' }]);
  assert.deepEqual(N.TABELAS.avancada.resultados.find(r => r.min === 3).conteudos.length, 3, 'Hellhound ×3: três linhas');
});

test('a arquitetura: os andares e os ramos, o pai de cada um, o fundo, o Pathfinder e a DV', () => {
  const clinica = N.lerArquitetura(N.EXEMPLOS[2]);
  assert.deepEqual(Object.values(clinica.nos).map(no => `${no.id}<${no.pai}`), ['1a<entrada', '2a<1a', '3a<2a', '3b<2a', '4a<3a', '4b<3b', '5a<4a', '5b<4b'], 'o ramo B sai do andar de cima do ramo A');
  assert.equal(clinica.dv, 10, 'a DV da arquitetura: a maior dos andares');
  assert.equal(N.lerArquitetura({ ...N.EXEMPLOS[2], dv: 12 }).dv, 12, 'a que o mestre pôs vale mais');
  assert.deepEqual([clinica.colunas, clinica.andares], [2, 5]);
  assert.deepEqual(N.vizinhos(clinica, '2a'), ['1a', '3a', '3b']);
  assert.deepEqual(N.vizinhos(clinica, '1a'), ['entrada', '2a']);
  assert.equal(N.ehFundo(clinica, '5b'), true);
  assert.equal(N.ehFundo(clinica, '4b'), false);
  assert.deepEqual(clinica.nos['1a'].conteudos[0], { chave: '1a.0', indice: 0, tipo: 'senha', dv: 8, ice: null, demonio: null, npc: null, nome: '', descricao: '' });
  // A senha DV 8 do andar 1 segura o Pathfinder de 3: o andar aparece, o resto não. Com 9, desce em largura.
  assert.deepEqual(N.revelarPathfinder(clinica, N.ENTRADA, 3), ['1a']);
  assert.deepEqual(N.revelarPathfinder(clinica, N.ENTRADA, 9).slice(0, 5), ['1a', '2a', '3a', '3b', '4a']);
  // Um buraco na numeração: o andar 4 sem o 3 sai do mais fundo acima dele.
  const buraco = N.lerArquitetura({ andares: [{ andar: 1, tipo: 'senha', dv: 6 }, { andar: 2, tipo: 'vazio' }, { andar: 4, tipo: 'arquivo', dv: 6 }] });
  assert.equal(buraco.nos['4a'].pai, '2a');
  // O ramo C sem o andar de cima sai do andar de cima do ramo à esquerda (o 2a), não do andar 1 do próprio ramo.
  const aEsquerda = N.lerArquitetura({ andares: [{ andar: 1, ramo: 'c', tipo: 'vazio' }, { andar: 2, ramo: 'a', tipo: 'vazio' }, { andar: 3, ramo: 'c', tipo: 'vazio' }] });
  assert.equal(aEsquerda.nos['3c'].pai, '2a');
  assert.equal(N.lerArquitetura({ andares: [] }).dv, 6, 'sem andares com DV, básica');
});

test('a linha conferida, gerar pelas tabelas, mover e criar andares no editor, e as Ações NET', () => {
  assert.deepEqual(N.limparLinha({ andar: 40, ramo: 'Z', tipo: 'senha', dv: 99, ice: 'kraken' }), { andar: 18, ramo: 'a', tipo: 'senha', dv: 20, ice: '', demonio: '', npc: '', nome: '', descricao: '' });
  assert.deepEqual(N.limparLinha({ tipo: 'ice', ice: 'kraken', dv: 8 }), { andar: 1, ramo: 'a', tipo: 'ice', dv: 0, ice: 'kraken', demonio: '', npc: '', nome: '', descricao: '' }, 'o Black ICE não tem DV');
  assert.equal(N.limparLinha({ tipo: 'demonio', demonio: 'nada' }).demonio, 'imp');
  assert.equal(N.limparLinha({ tipo: 'qualquer' }).tipo, 'vazio');
  assert.equal(N.limparAndares(Array.from({ length: 200 }, () => ({}))).length, N.MAX_LINHAS);
  // 3d6 = 8 andares; o 1d10 = 3 (sem ramo a mais); o lobby: 3 (senha DV 8) e 4 (Skunk); a tabela padrão: 9, 9 (senha
  // de novo não vale), 10, 11, 10 (arquivo repete), 5, 18.
  const fila = { '3d6': [8, 9, 9, 10, 11, 10, 5, 18], '1d10': [3], '1d6': [3, 4] };
  const gerada = N.gerarAndares({ dificuldade: 'padrao', rolar: formula => fila[formula].shift() });
  assert.deepEqual([gerada.total, gerada.ramosAMais], [8, 0]);
  assert.deepEqual(gerada.andares.map(linha => `${linha.andar}${linha.ramo}:${linha.tipo}${linha.ice || linha.dv || ''}`),
    ['1a:senha8', '2a:iceskunk', '3a:senha8', '4a:arquivo8', '5a:controle8', '6a:arquivo8', '7a:iceskunk', '7a:iceskunk', '8a:iceliche', '8a:iceraven']);
  assert.match(gerada.andares[0].descricao, /^Lobby, 3: Senha DV 8$/);
  assert.throws(() => N.gerarAndares({ dificuldade: 'facil', rolar: () => 3 }), /Dificuldade/);
  // Com ramos: 1d10 = 8, depois 2 (um ramo a mais). 3d6 = 6 andares: o quarto resultado já passa do andar 3 e de 6 ÷ 2,
  // então o ramo B começa ali, no andar 3, e o resto vai nele (como o CORE).
  const ramos = { '3d6': [6, 9, 10, 11, 9, 10], '1d10': [7, 2], '1d6': [1, 2] };
  const ramificada = N.gerarAndares({ dificuldade: 'basica', rolar: formula => ramos[formula].shift() });
  assert.equal(ramificada.ramosAMais, 1);
  assert.deepEqual(ramificada.andares.map(linha => `${linha.andar}${linha.ramo}`), ['1a', '2a', '3a', '3b', '4b', '5b']);
  assert.equal(N.lerArquitetura(ramificada).nos['3b'].pai, '2a');
  // 12 andares e um ramo a mais: o ramo B espera o andar passar de 12 ÷ 2, e começa no andar 3.
  const longa = { '3d6': [12, 3, 4, 6, 7, 8, 13, 14, 15, 18, 9], '1d10': [7, 1], '1d6': [1, 2] };
  const doze = N.gerarAndares({ dificuldade: 'basica', rolar: formula => longa[formula].shift() });
  assert.deepEqual(doze.andares.map(linha => `${linha.andar}${linha.ramo}`), ['1a', '2a', '3a', '4a', '5a', '6a', '3b', '4b', '5b', '6b', '7b', '8b']);
  const andares = N.EXEMPLOS[1].andares;
  assert.deepEqual(N.moverAndar(andares, '1a', '2a').map(linha => linha.andar), [2, 1, 3], 'em cima de outro: os dois trocam');
  assert.deepEqual(N.moverAndar(andares, '3a', '3c').map(linha => `${linha.andar}${linha.ramo}`), ['1a', '2a', '3c']);
  assert.equal(N.moverAndar(andares, '9a', '1a'), andares, 'de um lugar vazio: nada muda');
  assert.deepEqual(N.criarAndar(andares, '2b').slice(-1)[0], { andar: 2, ramo: 'b', tipo: 'senha', dv: 6, ice: '', demonio: '', npc: '', nome: '', descricao: '' });
  assert.equal(N.criarAndar(andares, '2a'), andares, 'onde já tem andar: nada');
  assert.equal(N.criarAndar(andares, '19a'), andares, 'fora da arquitetura: nada');
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10].map(N.acoesPorRank), [2, 2, 3, 3, 4, 4, 5]);
  assert.equal(N.programaDe({ catalogo: 'core_programs:see-ya' }).nome, 'See Ya');
  assert.equal(N.programaDe({ nome: 'Speedy Gonzalvez' }).chave, 'speedy-gonzalvez');
  assert.equal(N.programaDe({ nome: 'Programa caseiro' }), null);
  assert.deepEqual(N.hardwareDe([{ catalogo: 'core_upgrades:range-upgrade' }, { nome: 'KRASH Barrier' }]), { rangeUpgrade: true, isolado: false, krash: true });
});

// O catálogo da loja, como a mesa lê (o item pelo id e pelo nome).
const loja = (() => {
  const texto = textoDaWiki('loja-catalogo.js');
  const dados = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
  const porId = new Map(dados.itens.map(item => [item.id, item]));
  return { item: id => porId.get(id) || null, porNome: nome => dados.itens.find(item => item.en === nome || item.nome === nome) || null };
})();

test('a ficha: os programas e o hardware no deck da montagem, do pedido ou no primeiro com slot, e o estado da mesa', () => {
  const doc = {
    resultado: {
      itens: [
        { uid: 'd1', id: 'core_gear:cyberdeck-poor', nome: 'Deck ruim', uso: 'carregando' },
        { uid: 'd2', id: 'core_gear:cyberdeck', nome: 'Deck', uso: 'equipado' },
        { uid: 'p1', id: 'core_programs:sword', nome: 'Sword', qtd: 2 },
        { uid: 'p2', id: 'core_programs:armor', nome: 'Armor' },
        { uid: 'p3', id: 'core_programs:worm', nome: 'Worm' },
        { uid: 'h1', id: 'core_upgrades:krash-barrier', nome: 'KRASH Barrier' }
      ]
    },
    montagem: { p2: { em: 'd2' }, p3: { em: '-' } },
    jogo: { quando: new Date().toISOString(), compras: [{ uid: 'c1', id: 'core_programs:see-ya', nome: 'See Ya', em: 'd2' }], programas: { p2: { ativo: true, rezPerdida: 3 } } }
  };
  const ficha = characterGame.ficha(doc, loja);
  const onde = Object.fromEntries(ficha.noDeck.map(item => [item.id, item.em]));
  // O deck ruim tem 5 slots: as duas Swords (2) e a KRASH Barrier (2) cabem nele, o primeiro da lista.
  assert.deepEqual(onde, { p1: 'd1', p2: 'd2', p3: '', h1: 'd1', c1: 'd2' }, 'a escolha vale; "-" fica solto; sem escolha, o primeiro deck com slot');
  assert.deepEqual(ficha.noDeck.find(item => item.id === 'p2'), { id: 'p2', nome: 'Armor', tipo: 'programa', catalogo: 'core_programs:armor', qtd: 1, em: 'd2', ativo: true, rezPerdida: 3 });
  // O tamanho conta a quantidade: duas Swords no deck ruim (5 slots) deixam 3, e quatro Flak não cabem nele.
  const cheio = characterGame.ficha({ resultado: { itens: [doc.resultado.itens[0], doc.resultado.itens[1], doc.resultado.itens[2], { uid: 'p4', id: 'core_programs:flak', nome: 'Flak', qtd: 4 }] }, montagem: { p1: { em: 'd1' } } }, loja);
  assert.equal(cheio.noDeck.find(item => item.id === 'p1').em, 'd1');
  assert.equal(cheio.noDeck.find(item => item.id === 'p4').em, 'd2', 'quatro Flak não cabem no deck ruim ao lado das Swords');
  // O que a mesa grava em cada programa mistura com o que já tinha.
  assert.deepEqual(characterGame.comJogo(doc, { programas: { p2: { ativo: false } } }).programas.p2, { ativo: false, rezPerdida: 3 });
});

test('o netrunner da ficha: o rank da Role de Netrunner, o deck equipado (não o carregado) e só o que está nele', () => {
  const createNet = require('./mesa-netrun');
  const net = createNet({ fail: (status, mensagem) => new Error(mensagem), int: Math.round, line: String, block: String, newId: () => 'x', pool: () => [] });
  const ficha = {
    itens: [{ id: 'd1', tipo: 'deck', nome: 'Deck velho', uso: 'carregando', catalogo: 'core_gear:cyberdeck-poor' }, { id: 'd2', tipo: 'deck', nome: 'Deck novo', uso: 'equipado', catalogo: 'core_gear:cyberdeck-excellent' }],
    noDeck: [
      { id: 'p1', nome: 'Sword', tipo: 'programa', catalogo: 'core_programs:sword', em: 'd1' },
      { id: 'p2', nome: 'Armor', tipo: 'programa', catalogo: 'core_programs:armor', em: 'd2', rezPerdida: 3, ativo: true },
      { id: 'h1', nome: 'KRASH Barrier', tipo: 'hardware', catalogo: 'core_upgrades:krash-barrier', em: 'd2' }
    ]
  };
  const n = net.netrunnerDaFicha([{ id: 'solo', rank: 4 }, { id: 'netrunner', rank: 7 }], ficha, loja);
  assert.deepEqual([n.rank, n.acoes], [7, 4], 'o rank da Role de Netrunner, mesmo sendo a segunda');
  assert.deepEqual(n.deck, { id: 'd2', nome: 'Deck novo', slots: 9 }, 'o equipado');
  assert.deepEqual(n.programas.map(p => [p.nome, p.rezAtual, p.rez, p.ativo]), [['Armor', 4, 7, true]], 'só o que está no deck equipado, com a REZ perdida');
  assert.equal(n.krash, true);
  assert.equal(net.netrunnerDaFicha([{ id: 'solo', rank: 4 }], { itens: [], noDeck: [] }, loja), null, 'sem a Role e sem deck: não é netrunner');
});

const fichaDaNetrunner = {
  nome: 'Iris "Nyx" Tanaka', role: 'netrunner', rankRole: 6, stats: { REF: 6, INT: 8, DEX: 5 },
  resultado: {
    stats: { REF: 6, INT: 8, DEX: 5 }, derivados: { hp: 40 }, pericias: [{ nome: 'Brawling', stat: 'DEX', nivel: 2 }],
    itens: [
      { uid: 'd1', id: 'core_gear:cyberdeck', nome: 'Cyberdeck', uso: 'equipado' },
      { uid: 'p1', id: 'core_programs:sword', nome: 'Sword' },
      { uid: 'p2', id: 'core_programs:armor', nome: 'Armor' },
      { uid: 'p3', id: 'core_programs:worm', nome: 'Worm' },
      { uid: 'h1', id: 'core_upgrades:range-upgrade', nome: 'Range Upgrade' }
    ]
  }
};
const fichaDoSolo = { nome: 'Jax', role: 'solo', stats: { REF: 8 }, resultado: { stats: { REF: 8 }, derivados: { hp: 45 }, pericias: [] } };

test('as arquiteturas: só o mestre cria, edita, gera e apaga, e só ele recebe', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaDoSolo);
  const mestre = await m.ouvir();
  const exemplo = N.EXEMPLOS[2];
  assert.equal((await m.op('arquitetura.salvar', { arquitetura: exemplo }, ana.cookie)).status, 403, 'só o mestre');
  const salva = await m.op('arquitetura.salvar', { arquitetura: exemplo });
  assert.equal(salva.status, 200, salva.text);
  const id = salva.json.resultado.id;
  assert.ok(await mestre.esperar(item => item.evento === 'arquiteturas' && item.data.arquiteturas.length === 1), 'o mestre recebe na hora');
  let estado = (await m.pedir('/api/mesa/estado')).json;
  assert.deepEqual(estado.arquiteturas[0].andares.length, 8);
  assert.equal(estado.arquiteturas[0].nome, 'Clínica de ripperdoc (ramificada)');
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.arquiteturas, undefined, 'o jogador não recebe');
  // Editar mantém o id; sem nome ou sem andar, não.
  assert.equal((await m.op('arquitetura.salvar', { id, arquitetura: { nome: 'Clínica do Doc Fen', andares: N.criarAndar(exemplo.andares, '6a') } })).status, 200);
  estado = (await m.pedir('/api/mesa/estado')).json;
  assert.deepEqual([estado.arquiteturas.length, estado.arquiteturas[0].id, estado.arquiteturas[0].nome, estado.arquiteturas[0].andares.length], [1, id, 'Clínica do Doc Fen', 9]);
  assert.match((await m.op('arquitetura.salvar', { id, arquitetura: { nome: ' ' } })).json.erro, /nome/);
  assert.match((await m.op('arquitetura.salvar', { arquitetura: { nome: 'Vazia', andares: [] } })).json.erro, /pelo menos um andar/);
  // A importação: a mesma origem duas vezes dá 409; substituir troca e mantém o id.
  const origem = { mundo: 'protocolo', id: 'abc123' };
  const importada = await m.op('arquitetura.salvar', { arquitetura: N.EXEMPLOS[0], origem });
  assert.equal((await m.op('arquitetura.salvar', { arquitetura: N.EXEMPLOS[0], origem })).status, 409);
  const trocada = await m.op('arquitetura.salvar', { arquitetura: { ...N.EXEMPLOS[0], nome: 'Armazém de novo' }, origem, substituir: true });
  assert.equal(trocada.json.resultado.id, importada.json.resultado.id);
  // Gerar pelas tabelas (o servidor rola): 3d6 = 1 + 2 + 2 = 5 andares, sem ramo a mais.
  m.fila.push(1, 2, 2, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 4);
  const gerada = await m.op('arquitetura.gerar', { dificuldade: 'incomum' });
  assert.equal(gerada.status, 200, gerada.text);
  assert.deepEqual([gerada.json.resultado.total, gerada.json.resultado.ramosAMais], [5, 0]);
  estado = (await m.pedir('/api/mesa/estado')).json;
  const nova = estado.arquiteturas.find(arq => arq.id === gerada.json.resultado.id);
  assert.equal(nova.nome, 'Arquitetura incomum (5 andares)');
  assert.ok(nova.andares.every(linha => linha.ramo === 'a' && linha.andar >= 1 && linha.andar <= 5));
  assert.equal((await m.op('arquitetura.gerar', { dificuldade: 'facil' })).status, 400);
  assert.equal((await m.op('arquitetura.apagar', { id }, ana.cookie)).status, 403);
  assert.equal((await m.op('arquitetura.apagar', { id })).status, 200);
  assert.equal((await m.pedir('/api/mesa/estado')).json.arquiteturas.some(arq => arq.id === id), false);
});

test('o netrunner no token: o rank de Interface da Role, o deck equipado, os programas e o hardware; o NPC pela perícia', async t => {
  const m = await montar(t);
  const bruno = await m.jogador('Bruno', fichaDaNetrunner);
  const ana = await m.jogador('Ana', fichaDoSolo);
  const cena = (await m.op('cena.criar', { nome: 'Lab', largura: 1000, altura: 800, grade: { tamanho: 100 } })).json.resultado.cena;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 250, y: 150 })).json.resultado.token;
  const npc = (await m.op('token.criar', { cena, npc: 'lieutenants:0', x: 350, y: 150 })).json.resultado.token;
  await m.op('cena.ativar', { cena });
  const tokens = async cookie => Object.fromEntries((await m.pedir('/api/mesa/estado', { cookie })).json.cena.tokens.map(token => [token.id, token]));
  const vistos = await tokens(bruno.cookie);
  const net = vistos[nyx].netrunner;
  assert.deepEqual([net.rank, net.acoes], [6, 3], 'Interface 6: 3 Ações NET por turno');
  assert.deepEqual(net.deck, { id: 'd1', nome: 'Cyberdeck', slots: 7 });
  assert.deepEqual(net.programas.map(p => [p.nome, p.classe, p.atk, p.rez, p.ativo]), [['Sword', 'antiprogramattacker', 1, 0, false], ['Armor', 'defender', 0, 7, false], ['Worm', 'booster', 0, 7, false]]);
  assert.deepEqual([net.rangeUpgrade, net.isolado, net.krash], [true, false, false]);
  assert.equal((await tokens(ana.cookie))[nyx].netrunner, undefined, 'outro jogador não vê o deck da Nyx');
  assert.equal(vistos[jax].netrunner, undefined);
  assert.equal((await tokens())[jax].netrunner, undefined, 'o Solo sem deck não é netrunner');
  assert.deepEqual((await tokens())[npc].netrunner, { rank: 4, acoes: 3, deck: null, programas: [], hardware: [] }, 'o Netrunner do livro: Interface 4');
});

// ---------------- A fase 2: o ponto de acesso e o netrun ----------------
// A cena de 100 px = 2 m: a Nyx (Interface 6, deck, Range Upgrade) em (150, 150), o Jax (sem deck) ao lado, e o ponto de
// acesso do apartamento do fixer 2 quadrados à direita da Nyx (4 m; o alcance é 6, mais 2 do Range Upgrade).
async function netrun(t, { arquitetura = N.EXEMPLOS[1] } = {}) {
  const m = await montar(t);
  const bruno = await m.jogador('Bruno', fichaDaNetrunner);
  const ana = await m.jogador('Ana', fichaDoSolo);
  const arq = (await m.op('arquitetura.salvar', { arquitetura })).json.resultado.id;
  const cena = (await m.op('cena.criar', { nome: 'Prédio', largura: 2000, altura: 1000, grade: { tamanho: 100 } })).json.resultado.cena;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 250, y: 150 })).json.resultado.token;
  await m.op('cena.ativar', { cena });
  const ponto = (await m.op('net.ponto.criar', { cena, x: 350, y: 150, ponto: { nome: 'Terminal do fixer', arquitetura: arq } })).json.resultado.ponto;
  const estado = async cookie => (await m.pedir('/api/mesa/estado', { cookie })).json;
  const run = async cookie => (await estado(cookie)).cena.net.find(item => item.ponto === ponto);
  const ultima = async cookie => { const registro = (await estado(cookie)).registro; return registro[registro.length - 1]; };
  const acao = (tipo, corpo = {}, cookie = bruno.cookie) => m.op(tipo, { ponto, token: nyx, ...corpo }, cookie);
  return { m, bruno, ana, arq, cena, nyx, jax, ponto, estado, run, ultima, acao };
}

test('o ponto de acesso: só o mestre põe; o jogador vê o marcador (o oculto, não) e conecta perto, com o deck', async t => {
  const r = await netrun(t);
  assert.equal((await r.m.op('net.ponto.criar', { cena: r.cena, x: 10, y: 10 }, r.bruno.cookie)).status, 403);
  assert.match((await r.m.op('net.ponto.criar', { cena: r.cena, x: 10, y: 10, ponto: { arquitetura: 'arq:nada' } })).json.erro, /Arquitetura não encontrada/);
  const pontos = (await r.estado(r.ana.cookie)).cena.pontosNet;
  assert.deepEqual(pontos, [{ id: r.ponto, x: 350, y: 150, nome: 'Terminal do fixer', alcance: 6, conectados: 0 }], 'o jogador vê o marcador, sem a configuração');
  assert.equal((await r.estado()).cena.pontosNet[0].arquitetura, r.arq, 'o mestre vê a configuração');
  // O oculto: o jogador nem vê, nem conecta.
  const oculto = (await r.m.op('net.ponto.criar', { cena: r.cena, x: 150, y: 250, ponto: { arquitetura: r.arq, oculto: true } })).json.resultado.ponto;
  assert.equal((await r.estado(r.bruno.cookie)).cena.pontosNet.some(p => p.id === oculto), false);
  assert.equal((await r.m.op('net.conectar', { ponto: oculto, token: r.nyx }, r.bruno.cookie)).status, 404);
  // Os requisitos: o Jax não tem deck; o Bruno não conecta o token da Ana.
  assert.match((await r.m.op('net.conectar', { ponto: r.ponto, token: r.jax }, r.ana.cookie)).json.erro, /cyberdeck equipado/);
  assert.equal((await r.m.op('net.conectar', { ponto: r.ponto, token: r.jax }, r.bruno.cookie)).status, 403);
  // Longe: 9 quadrados = 18 m.
  await r.m.op('net.ponto.editar', { ponto: r.ponto, x: 1050, y: 150 });
  assert.match((await r.acao('net.conectar')).json.erro, /Longe demais do ponto de acesso: 18 m \(alcance 8 m\)/, 'o alcance com o Range Upgrade');
  // Perto, mas com uma parede no meio.
  await r.m.op('net.ponto.editar', { ponto: r.ponto, x: 350, y: 150 });
  const parede = (await r.m.op('parede.criar', { cena: r.cena, paredes: [{ c: [300, 50, 300, 300] }] })).json;
  assert.match((await r.acao('net.conectar')).json.erro, /parede/);
  await r.m.op('parede.apagar', { cena: r.cena, parede: parede.resultado.paredes[0] });
  const conectou = await r.acao('net.conectar');
  assert.equal(conectou.status, 200, conectou.text);
  assert.equal((await r.estado(r.ana.cookie)).cena.tokens.find(token => token.id === r.nyx).naNet, true, 'todos veem que a Nyx está na NET');
  const cartao = await r.ultima(r.ana.cookie);
  assert.deepEqual([cartao.tipo, cartao.net.frase], ['net', 'Iris "Nyx" Tanaka conectou em Terminal do fixer (Apartamento de um fixer).']);
  // O netrun: o Bruno vê o mapa que achou (o andar 1 como vizinho, sem o conteúdo); a Ana, nada; o mestre, tudo.
  const doBruno = await r.run(r.bruno.cookie);
  assert.deepEqual(doBruno.nos, [{ id: '1a', andar: 1, ramo: 'a', pai: 'entrada', visto: false }]);
  assert.deepEqual(doBruno.corredores.map(c => [c.nome, c.no, c.acoes, c.max, c.meu]), [['Iris "Nyx" Tanaka', 'entrada', 0, 3, true]]);
  assert.equal(doBruno.completa, undefined, 'o jogador não recebe a arquitetura inteira');
  assert.equal(await r.run(r.ana.cookie), undefined, 'quem não está na NET não vê o netrun');
  assert.equal((await r.run()).completa.length, 3, 'o mestre vê todos os andares');
  assert.equal((await r.estado(r.ana.cookie)).cena.pontosNet[0].conectados, 1);
});

test('andar e as habilidades: a senha trava, o Breach quebra, o Eye-Dee e o Control revelam só na janela, o Pathfinder', async t => {
  const r = await netrun(t);
  await r.acao('net.conectar');
  assert.equal((await r.acao('net.mover', { destino: '2a' })).status, 409, 'só um andar vizinho');
  assert.equal((await r.acao('net.mover', { destino: '1a' })).status, 200);
  let run = await r.run(r.bruno.cookie);
  assert.deepEqual(run.nos.find(no => no.id === '1a').conteudos, [{ chave: '1a.0', tipo: 'senha', dv: 6, feito: false }]);
  assert.match((await r.acao('net.mover', { destino: '2a' })).json.erro, /senha deste andar \(DV 6\) trava a descida/);
  assert.match((await r.acao('net.habilidade', { habilidade: 'eyedee' })).json.erro, /Não há arquivo/);
  // Breach: Interface 6 + 2 = 8 contra DV 6.
  r.m.fila.push(2);
  const breach = await r.acao('net.habilidade', { habilidade: 'backdoor' });
  assert.equal(breach.status, 200, breach.text);
  assert.deepEqual(breach.json.resultado, { total: 8, ok: true });
  const cartao = await r.ultima(r.ana.cookie);
  assert.deepEqual([cartao.net.titulo, cartao.net.rolagens[0].rolagem.total, cartao.net.resultado], ['Breach', 8, 'passou'], 'o cartão no chat, para todos');
  assert.equal((await r.acao('net.mover', { destino: '2a' })).status, 200, 'sem a senha, desce');
  // Eye-Dee: 6 + 2 = 8 > 6. O que o arquivo guarda fica na janela da NET, não no chat.
  r.m.fila.push(2);
  await r.acao('net.habilidade', { habilidade: 'eyedee' });
  run = await r.run(r.bruno.cookie);
  const arquivo = run.nos.find(no => no.id === '2a').conteudos[0];
  assert.match(arquivo.descricao, /Agenda de contatos/);
  assert.match(run.log[run.log.length - 1].texto, /Agenda de contatos/);
  assert.doesNotMatch(JSON.stringify(await r.ultima(r.ana.cookie)), /Agenda de contatos/, 'o chat não leva o segredo');
  // A falha não toma o nó: 6 + 1 (a falha crítica tira mais 1d10 = 4) = 3 contra DV 6.
  await r.acao('net.mover', { destino: '3a' });
  r.m.fila.push(1, 4);
  assert.deepEqual((await r.acao('net.habilidade', { habilidade: 'control' })).json.resultado, { total: 3, ok: false });
  assert.match((await r.acao('net.comandar', { texto: 'Abrir a porta' })).json.erro, /nó de controle tomado/);
  r.m.fila.push(3);
  await r.acao('net.habilidade', { habilidade: 'control' });
  assert.equal((await r.acao('net.comandar', { texto: 'Abrir a porta do corredor' })).status, 200);
  run = await r.run(r.bruno.cookie);
  assert.match(run.log.map(linha => linha.texto).join(' | '), /comanda o nó de controle: “Abrir a porta do corredor”/);
  // O Virus vai no andar mais fundo (o 3a): 6 + 5 = 11 contra a DV da arquitetura (6).
  assert.equal((await r.acao('net.habilidade', { habilidade: 'virus', texto: 'Apagar as câmeras' })).json.resultado.ok, true);
  await r.acao('net.mover', { destino: '2a' });
  assert.match((await r.acao('net.habilidade', { habilidade: 'virus' })).json.erro, /andar mais fundo/);
});

test('o Pathfinder, o mapa revelado pelo mestre e o Black ICE que segura a descida', async t => {
  const r = await netrun(t, { arquitetura: N.EXEMPLOS[2] });
  await r.acao('net.conectar');
  // 6 + 1 (… a falha crítica tira 1d10 = 1) = 6: a senha DV 8 do andar 1 segura o resto.
  r.m.fila.push(1, 1);
  await r.acao('net.habilidade', { habilidade: 'pathfinder' });
  assert.deepEqual((await r.run(r.bruno.cookie)).nos.filter(no => no.visto).map(no => no.id), ['1a']);
  // 6 + 5 = 11: desce em largura, a partir do ponto de acesso, até o 4b (a senha DV 10 não segura 11).
  await r.acao('net.habilidade', { habilidade: 'pathfinder' });
  assert.deepEqual((await r.run(r.bruno.cookie)).nos.filter(no => no.visto).map(no => no.id), ['1a', '2a', '3a', '3b', '4a', '4b', '5a', '5b']);
  await r.m.op('net.revelar', { ponto: r.ponto, tudo: true });
  assert.equal((await r.run(r.bruno.cookie)).nos.length, 8);
  // O Wisp do andar 2 segura a descida (o Black ICE ativo).
  r.m.fila.push(9);
  await r.acao('net.mover', { destino: '1a' });
  await r.acao('net.habilidade', { habilidade: 'backdoor' });
  await r.acao('net.mover', { destino: '2a' });
  assert.match((await r.acao('net.mover', { destino: '3a' })).json.erro, /O Wisp deste andar te segura/);
  assert.equal((await r.acao('net.mover', { destino: '1a' })).status, 200, 'subir é livre');
});

test('as Ações NET no combate, desconectar, sair do alcance e o reinício das defesas', async t => {
  const r = await netrun(t);
  await r.m.op('combate.iniciar', { tokens: [r.nyx, r.jax] });
  await r.m.op('combate.iniciativa', { token: r.nyx, valor: 30 });
  let combate = (await r.estado()).combate;
  while (combate.vez !== r.nyx) { await r.m.op('combate.proximo'); combate = (await r.estado()).combate; }
  await r.acao('net.conectar');
  const acoes = async () => (await r.run(r.bruno.cookie)).corredores[0].acoes;
  assert.equal(await acoes(), 1, 'conectar gasta 1 Ação NET');
  await r.acao('net.mover', { destino: '1a' });
  assert.equal(await acoes(), 1, 'andar não gasta');
  await r.acao('net.habilidade', { habilidade: 'cloak' });
  await r.acao('net.habilidade', { habilidade: 'backdoor' });
  assert.equal(await acoes(), 3);
  assert.match((await r.acao('net.habilidade', { habilidade: 'pathfinder' })).json.erro, /Sem Ações NET neste turno \(3 de 3\)/);
  assert.equal((await r.m.op('net.habilidade', { ponto: r.ponto, token: r.nyx, habilidade: 'pathfinder' })).status, 200, 'o mestre passa do limite');
  // A vez passa e volta: as Ações NET voltam.
  await r.m.op('combate.proximo');
  await r.m.op('combate.proximo');
  assert.equal(await acoes(), 0);
  // Desconectar com segurança gasta 1; sem ninguém, as defesas reiniciam (a senha tranca; o arquivo copiado fica).
  await r.acao('net.mover', { destino: '2a' });
  r.m.fila.push(2);
  await r.acao('net.habilidade', { habilidade: 'eyedee' });
  assert.equal((await r.acao('net.desconectar')).status, 200);
  assert.equal(await acoes().catch(() => null), null, 'fora da NET, o Bruno não vê o netrun');
  assert.equal((await r.estado(r.ana.cookie)).cena.tokens.find(token => token.id === r.nyx).naNet, undefined);
  await r.acao('net.conectar');
  const mestre = await r.run();
  assert.deepEqual(mestre.completa.map(no => no.conteudos[0].feito), [false, true, false], 'a senha tranca de novo; o arquivo copiado fica');
  assert.match(mestre.log.map(linha => linha.texto).join(' | '), /reiniciou as defesas/);
  // Sair do alcance: a Nyx anda 6 quadrados para baixo (12 m).
  await r.m.op('combate.encerrar');
  assert.equal((await r.m.op('token.mover', { token: r.nyx, x: 150, y: 750 }, r.bruno.cookie)).status, 200);
  assert.equal((await r.estado(r.ana.cookie)).cena.tokens.find(token => token.id === r.nyx).naNet, undefined, 'caiu da NET');
  assert.match((await r.run()).log.slice(-3).map(linha => linha.texto).join(' | '), /saiu do alcance/);
  // A insegura não gasta nada; trocar a arquitetura derruba quem estava; tirar o token da cena tira da NET.
  await r.m.op('token.mover', { token: r.nyx, x: 150, y: 150 }, r.bruno.cookie);
  await r.acao('net.conectar');
  assert.equal((await r.acao('net.desconectar', { inseguro: true })).status, 200);
  assert.equal((await r.ultima()).net.resultado, 'inseguro', 'o cartão diz que foi insegura');
  await r.acao('net.conectar');
  const outra = (await r.m.op('arquitetura.salvar', { arquitetura: N.EXEMPLOS[0] })).json.resultado.id;
  await r.m.op('net.ponto.editar', { ponto: r.ponto, arquitetura: outra });
  await r.m.op('net.revelar', { ponto: r.ponto, no: '1a' });
  assert.equal((await r.acao('net.mover', { destino: '1a' })).status, 409, 'trocar a arquitetura derruba quem estava');
  await r.acao('net.conectar');
  await r.m.op('token.apagar', { token: r.nyx });
  assert.equal((await r.run()).corredores.length, 0, 'sem o token, ninguém no netrun');
});

test('importar: o tile com o ponto de acesso (Foundry 12 e 14) vira o marcador, com a arquitetura que veio do mesmo mundo', async t => {
  const { converter, converterArquiteturas } = require('./importar-foundry');
  const m = await montar(t);
  // A arquitetura do mundo (o item netarch), importada antes da cena.
  const [{ arquitetura, origem }] = converterArquiteturas([{ _id: 'arq12', name: 'Armazém', type: 'netarch', system: { floors: [{ floor: '1', branch: 'a', content: 'CPR.netArchitecture.floor.options.password', dv: '8', blackice: '--', description: '' }] } }], 'mundo');
  const arq = (await m.op('arquitetura.salvar', { arquitetura, origem })).json.resultado.id;
  // Margem de 25%: o mapa começa em (300, 200) no canvas do Foundry. O tile de 100 × 100 em (500, 300): o centro, (250, 150).
  const cena = { _id: 'c1', name: 'Armazém', width: 1000, height: 800, padding: 0.25, grid: { size: 100, type: 1, distance: 2, units: 'm' }, background: { src: '' } };
  const tiles = [
    { _id: 'k1', x: 500, y: 300, width: 100, height: 100, texture: { src: '' }, flags: { 'net-architect': { pontoDeAcesso: { ativo: true, nome: 'Terminal', arquitetura: 'Compendium.world.arquiteturas-net.Item.arq12', dv: null, alcance: 4, exigeDeck: false, rankMinimo: 3, oculto: false, dvScanner: 12, reiniciar: false, revelados: ['userA'] } } } },
    { _id: 'k2', x: 700, y: 500, width: 200, height: 100, hidden: true, texture: { src: '' }, flags: { 'cpr-fieldbook': { pontoDeAcesso: { ativo: true, nome: 'Câmera', arquitetura: 'Item.outra', dv: 9 } } } },
    { _id: 'k3', x: 300, y: 200, width: 100, height: 100, texture: { src: '' }, flags: { 'net-architect': { pontoDeAcesso: { ativo: false, nome: 'Desligado' } } } },
    { _id: 'k4', x: 300, y: 200, width: 100, height: 100, texture: { src: '' } }
  ];
  const { cena: convertida } = converter(cena, { tokens: [], tiles, paredes: [], luzes: [], deltas: new Map() }, new Map(), 'mundo');
  assert.deepEqual(convertida.pontosNet.map(p => [p.nome, p.x, p.y, p.arqOrigem, p.oculto]), [['Terminal', 250, 150, 'arq12', false], ['Câmera', 500, 350, 'outra', true]], 'o centro do tile; o desligado não vem; o tile escondido deixa o ponto oculto');
  const importada = await m.op('cena.importar', { cena: convertida });
  assert.equal(importada.status, 200, importada.text);
  assert.equal(importada.json.resultado.pontos, 2);
  const id = importada.json.resultado.cena;
  await m.op('cena.ativar', { cena: id });
  const [terminal, camera] = (await m.pedir('/api/mesa/estado')).json.cena.pontosNet;
  assert.deepEqual([terminal.nome, terminal.arquitetura, terminal.alcance, terminal.dv, terminal.exigeDeck, terminal.rankMinimo, terminal.dvScanner, terminal.reiniciar, terminal.revelados],
    ['Terminal', arq, 4, 0, false, 3, 12, false, []], 'a configuração do NET Architect; a DV vazia é a da arquitetura; quem o Scanner achou no Foundry não vem');
  assert.deepEqual([camera.arquitetura, camera.dv, camera.oculto], ['', 9, true], 'a arquitetura que não veio do mundo: o ponto fica sem (o mestre escolhe)');
  // Em outro mundo, o mesmo item não serve.
  const deOutro = await m.op('cena.importar', { cena: { ...convertida, origem: { mundo: 'outro', id: 'c1' } } });
  await m.op('cena.ativar', { cena: deOutro.json.resultado.cena });
  assert.equal((await m.pedir('/api/mesa/estado')).json.cena.pontosNet[0].arquitetura, '');
});
