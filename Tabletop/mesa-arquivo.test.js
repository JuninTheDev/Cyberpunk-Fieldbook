const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { sleep, montar, fichaJax } = require('./teste-ajuda');

const semCopia = 'A mesa desta campanha não abriu: o arquivo dela (mesa.json) não pôde ser lido, e não há cópia boa. Nada foi apagado: restaure o backup ou conserte o arquivo.';
const ocupada = 'A mesa desta campanha está ocupada: o arquivo dela não abriu agora. Tente de novo em instantes.';
const quebrado = Buffer.concat([Buffer.from('{"cenas": [\r\n'), Buffer.from([0xff, 0x00])]);
const estado = () => ({
  formato: 1, cenaAtiva: 'beco', combate: null, registro: [],
  cenas: [{ id: 'beco', nome: 'Beco recuperado', largura: 2000, altura: 1500, grade: { tamanho: 100, metros: 2 }, tokens: [], paredes: [], luzes: [] }]
});
function arquivos(m) {
  const pasta = path.join(m.dados, 'mesa', m.campanha);
  fs.mkdirSync(pasta, { recursive: true });
  return { pasta, principal: path.join(pasta, 'mesa.json'), copia: path.join(pasta, 'mesa.anterior.json') };
}
const lerJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const ilegíveis = pasta => fs.readdirSync(pasta).filter(nome => /^mesa\.ilegivel-\d{8}-\d{6}\.json$/.test(nome));

test('arquivo quebrado: abre a cópia, guarda os bytes e avisa só o mestre', async t => {
  // O servidor da mesa roda em UTC: a hora do aviso tem de sair em Brasília assim mesmo.
  const fuso = process.env.TZ;
  process.env.TZ = 'UTC';
  t.after(() => { if (fuso === undefined) delete process.env.TZ; else process.env.TZ = fuso; });
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const a = arquivos(m);
  fs.writeFileSync(a.principal, quebrado);
  fs.writeFileSync(a.copia, JSON.stringify(estado()));
  fs.utimesSync(a.copia, new Date('2026-10-22T16:47:00Z'), new Date('2026-10-22T16:47:00Z'));
  const stat = fs.statSync;
  let primeiraData = true;
  t.mock.method(fs, 'statSync', (file, ...args) => {
    if (file === a.copia && primeiraData) { primeiraData = false; throw Object.assign(new Error('ocupado'), { code: 'EBUSY' }); }
    return stat(file, ...args);
  });
  const mestre = await m.pedir('/api/mesa/estado');
  assert.equal(mestre.status, 200, mestre.text);
  assert.equal(mestre.json.cena.nome, 'Beco recuperado');
  const aviso = mestre.json.registro.find(item => /cópia/.test(item.texto));
  assert.ok(aviso, 'o mestre recebe o aviso da recuperação');
  assert.equal(aviso.tipo, 'sistema');
  assert.equal(aviso.secreta, true);
  assert.match(aviso.texto, /cópia de 13:47/);
  const guardados = ilegíveis(a.pasta);
  assert.equal(guardados.length, 1);
  assert.ok(aviso.texto.includes(guardados[0]));
  assert.deepEqual(fs.readFileSync(path.join(a.pasta, guardados[0])), quebrado);
  const jogador = await m.pedir('/api/mesa/estado', { cookie: ana.cookie });
  assert.equal(jogador.json.cena.nome, 'Beco recuperado');
  assert.deepEqual(jogador.json.registro, [], 'a recuperação fica só para o mestre');
  // A recuperação chama save mesmo sem uma operação do mestre.
  await sleep(550);
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Beco recuperado');
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Beco recuperado');
});

// JSON que abre mas não é uma mesa: normalizado, viraria uma mesa vazia que sobrescreve o principal e a cópia velha.
for (const principal of ['{}', '{"formato":1,"cenas":null}']) {
  test(`${principal} não é uma mesa: abre a cópia em vez de uma mesa vazia`, async t => {
    const m = await montar(t);
    const a = arquivos(m);
    fs.writeFileSync(a.principal, principal);
    fs.writeFileSync(a.copia, JSON.stringify(estado()));
    fs.utimesSync(a.copia, new Date('2026-10-22T16:47:00Z'), new Date('2026-10-22T16:47:00Z'));
    const resposta = await m.pedir('/api/mesa/estado');
    assert.equal(resposta.status, 200, resposta.text);
    assert.equal(resposta.json.cena.nome, 'Beco recuperado');
    assert.ok(resposta.json.registro.some(item => /não é uma mesa/.test(item.texto)));
    const guardados = ilegíveis(a.pasta);
    assert.equal(guardados.length, 1);
    assert.equal(fs.readFileSync(path.join(a.pasta, guardados[0]), 'utf8'), principal);
    await m.mesa.tableApi.flush();
    assert.equal(lerJson(a.principal).cenas[0].nome, 'Beco recuperado');
    assert.equal(lerJson(a.copia).cenas[0].nome, 'Beco recuperado');
  });
}

for (const [nome, principal, copia] of [
  ['JSON quebrado sem cópia', quebrado, null],
  ['JSON quebrado com cópia quebrada', quebrado, Buffer.from('{copia')],
  ['JSON null sem cópia', Buffer.from('null'), null],
  ['JSON array sem cópia', Buffer.from('[]'), null]
]) test(`${nome}: recusa sem apagar nem guardar uma mesa vazia`, async t => {
  const m = await montar(t);
  const a = arquivos(m);
  fs.writeFileSync(a.principal, principal);
  if (copia) fs.writeFileSync(a.copia, copia);
  const erros = [];
  t.mock.method(console, 'error', (...args) => erros.push(args.join(' ')));
  for (const pedir of [() => m.pedir('/api/mesa/estado'), () => m.op('cena.criar', { nome: 'Não gravar' }), () => m.pedir('/api/mesa/eventos')]) {
    const resposta = await pedir();
    assert.equal(resposta.status, 503, resposta.text);
    assert.equal(resposta.json.erro, semCopia);
  }
  assert.ok(erros.some(texto => /mesa\.json/.test(texto)), 'o motivo também vai para o log');
  await sleep(550);
  await m.mesa.tableApi.flush();
  assert.deepEqual(fs.readFileSync(a.principal), principal);
  assert.deepEqual(ilegíveis(a.pasta), []);
  if (copia) assert.deepEqual(fs.readFileSync(a.copia), copia);
  else assert.equal(fs.existsSync(a.copia), false);
  assert.equal((await m.pedir('/api/eu')).status, 200, 'a wiki continua respondendo');
  // Consertou o arquivo: o próximo pedido relê, sem reiniciar o servidor.
  fs.writeFileSync(a.principal, JSON.stringify(estado()));
  const consertada = await m.pedir('/api/mesa/estado');
  assert.equal(consertada.status, 200, consertada.text);
  assert.equal(consertada.json.cena.nome, 'Beco recuperado');
});

test('arquivo ocupado uma vez: recusa sem tocar nos arquivos e relê no pedido seguinte', async t => {
  let ocupado = true;
  const m = await montar(t, { lerArquivo(file) {
    if (path.basename(file) === 'mesa.json' && ocupado) { ocupado = false; throw Object.assign(new Error('arquivo ocupado'), { code: 'EBUSY' }); }
    return fs.readFileSync(file, 'utf8');
  } });
  const a = arquivos(m);
  const original = JSON.stringify(estado());
  fs.writeFileSync(a.principal, original);
  fs.writeFileSync(a.copia, JSON.stringify({ ...estado(), cenas: [] }));
  const recusada = await m.pedir('/api/mesa/estado');
  assert.equal(recusada.status, 503, recusada.text);
  assert.equal(recusada.json.erro, ocupada);
  await m.mesa.tableApi.flush();
  assert.equal(fs.readFileSync(a.principal, 'utf8'), original);
  assert.deepEqual(ilegíveis(a.pasta), []);
  const aberta = await m.pedir('/api/mesa/estado');
  assert.equal(aberta.status, 200, aberta.text);
  assert.equal(aberta.json.cena.nome, 'Beco recuperado');
  assert.deepEqual(aberta.json.registro, []);
});

test('a cópia acompanha o snapshot gravado quando o intervalo já passou', async t => {
  const m = await montar(t, { copiaACada: 25 });
  const a = arquivos(m);
  const criada = await m.op('cena.criar', { nome: 'Primeira' });
  assert.equal(criada.status, 200, criada.text);
  await m.mesa.tableApi.flush();
  assert.deepEqual(fs.readFileSync(a.copia), fs.readFileSync(a.principal));
  await sleep(50);
  assert.equal((await m.op('cena.editar', { cena: criada.json.resultado.cena, nome: 'Segunda' })).status, 200);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.copia).cenas[0].nome, 'Segunda');
  assert.deepEqual(fs.readFileSync(a.copia), fs.readFileSync(a.principal));
});

test('antes do intervalo, duas mudanças deixam a cópia na primeira', async t => {
  const m = await montar(t, { copiaACada: 60_000 });
  const a = arquivos(m);
  const criada = await m.op('cena.criar', { nome: 'Primeira' });
  assert.equal(criada.status, 200, criada.text);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.copia).cenas[0].nome, 'Primeira');
  assert.equal((await m.op('cena.editar', { cena: criada.json.resultado.cena, nome: 'Segunda' })).status, 200);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Segunda');
  assert.equal(lerJson(a.copia).cenas[0].nome, 'Primeira');
});

test('gravação falha: avisa só o mestre uma vez, tenta de novo e avisa que voltou', async t => {
  let tentativas = 0;
  const m = await montar(t, { tentarGravarDe: 40, async gravarJson(file, snapshot) {
    if (path.basename(file) === 'mesa.json' && ++tentativas <= 3) throw new Error('disco ocupado');
    const temporario = `${file}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(snapshot));
    fs.renameSync(temporario, file);
  } });
  const ana = await m.jogador('Ana', fichaJax);
  const mestre = await m.ouvir();
  const jogador = await m.ouvir(ana.cookie);
  mestre.limpar(); jogador.limpar();
  const a = arquivos(m);
  t.mock.method(console, 'error', () => {});
  assert.equal((await m.op('cena.criar', { nome: 'Não perder' })).status, 200);
  await m.mesa.tableApi.flush();
  const falha = await mestre.esperar(item => item.evento === 'registro' && /não conseguiu gravar/.test(item.data.texto));
  assert.ok(falha, 'o mestre recebe a falha ao vivo');
  assert.equal(falha.data.secreta, true);
  assert.match(falha.data.texto, /disco ocupado.*a cada 5 segundos/);
  const voltou = await mestre.esperar(item => item.evento === 'registro' && item.data.texto === 'A mesa voltou a gravar.');
  assert.ok(voltou, 'o timer tenta de novo sem outra operação');
  assert.equal(voltou.data.secreta, true);
  assert.equal(mestre.eventos.filter(item => item.evento === 'registro' && /não conseguiu gravar/.test(item.data.texto)).length, 1);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Não perder');
  assert.ok(lerJson(a.principal).registro.some(item => item.texto === 'A mesa voltou a gravar.'));
  assert.equal(jogador.eventos.filter(item => item.evento === 'registro').length, 0, 'os dois avisos não chegam ao jogador');
  const visao = await m.pedir('/api/mesa/estado', { cookie: ana.cookie });
  assert.deepEqual(visao.json.registro, []);
});

test('mesa.json sumiu: abre a cópia e avisa só o mestre, sem dizer que guardou o arquivo', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const a = arquivos(m);
  fs.writeFileSync(a.copia, JSON.stringify(estado()));
  const stat = fs.statSync;
  let datasOcupadas = 2;
  t.mock.method(fs, 'statSync', (file, ...args) => {
    if (file === a.copia && datasOcupadas-- > 0) throw Object.assign(new Error('ocupado'), { code: 'EBUSY' });
    return stat(file, ...args);
  });
  const ocupadaAgora = await m.pedir('/api/mesa/estado');
  assert.equal(ocupadaAgora.status, 503, ocupadaAgora.text);
  assert.equal(ocupadaAgora.json.erro, ocupada);
  await m.mesa.tableApi.flush();
  assert.equal(fs.existsSync(a.principal), false);
  assert.deepEqual(lerJson(a.copia), estado(), 'não perde a cópia se não conseguiu conferir a data dela');
  const resposta = await m.pedir('/api/mesa/estado');
  assert.equal(resposta.status, 200, resposta.text);
  assert.equal(resposta.json.cena.nome, 'Beco recuperado');
  const aviso = resposta.json.registro.find(item => /mesa\.json.*sumiu/.test(item.texto));
  assert.ok(aviso);
  assert.equal(aviso.secreta, true);
  assert.match(aviso.texto, /cópia de \d{2}:\d{2}/);
  assert.doesNotMatch(aviso.texto, /guardado como/);
  assert.deepEqual(ilegíveis(a.pasta), []);
  assert.deepEqual((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.registro, []);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Beco recuperado');
});

test('falha só na cópia: tenta de novo sem dizer que o principal ficou só na memória', async t => {
  let tentativas = 0;
  const m = await montar(t, { tentarGravarDe: 40, async gravarJson(file, snapshot) {
    if (path.basename(file) === 'mesa.anterior.json' && ++tentativas <= 2) throw new Error('cópia ocupada');
    const temporario = `${file}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(snapshot));
    fs.renameSync(temporario, file);
  } });
  const a = arquivos(m);
  const erros = [];
  t.mock.method(console, 'error', (...args) => erros.push(args.join(' ')));
  assert.equal((await m.op('cena.criar', { nome: 'Principal salvo' })).status, 200);
  await m.mesa.tableApi.flush();
  assert.equal(lerJson(a.principal).cenas[0].nome, 'Principal salvo');
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.registro, []);
  const limite = Date.now() + 3000;
  while (!fs.existsSync(a.copia) && Date.now() < limite) await sleep(20);
  assert.equal(lerJson(a.copia).cenas[0].nome, 'Principal salvo', 'o timer também recupera a cópia');
  assert.ok(erros.some(texto => /mesa\.anterior\.json.*cópia ocupada/.test(texto)));
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.registro, []);
});

for (const [nome, principal] of [['mesa.json sumiu', null], ['mesa.json quebrado', quebrado]]) {
  test(`${nome} e a cópia ocupada: recusa como ocupada, sem abrir vazia nem perder a cópia`, async t => {
    let copiaOcupada = true;
    const m = await montar(t, { lerArquivo(file) {
      if (path.basename(file) === 'mesa.anterior.json' && copiaOcupada) { copiaOcupada = false; throw Object.assign(new Error('arquivo ocupado'), { code: 'EBUSY' }); }
      return fs.readFileSync(file, 'utf8');
    } });
    const a = arquivos(m);
    if (principal) fs.writeFileSync(a.principal, principal);
    const copia = JSON.stringify(estado());
    fs.writeFileSync(a.copia, copia);
    // A cópia é velha: uma mesa vazia aberta por engano a sobrescreveria na primeira gravação.
    fs.utimesSync(a.copia, new Date('2026-10-22T16:47:00Z'), new Date('2026-10-22T16:47:00Z'));
    t.mock.method(console, 'error', () => {});
    const recusada = await m.pedir('/api/mesa/estado');
    assert.equal(recusada.status, 503, recusada.text);
    assert.equal(recusada.json.erro, ocupada);
    await sleep(550);
    await m.mesa.tableApi.flush();
    assert.equal(fs.readFileSync(a.copia, 'utf8'), copia);
    if (principal) assert.deepEqual(fs.readFileSync(a.principal), principal);
    else assert.equal(fs.existsSync(a.principal), false);
    assert.deepEqual(ilegíveis(a.pasta), []);
    const aberta = await m.pedir('/api/mesa/estado');
    assert.equal(aberta.status, 200, aberta.text);
    assert.equal(aberta.json.cena.nome, 'Beco recuperado');
  });
}

test('mesa.json sumiu e a cópia quebrada: recusa sem apagar a cópia (havia uma mesa)', async t => {
  const m = await montar(t);
  const a = arquivos(m);
  const copia = Buffer.from('{copia');
  fs.writeFileSync(a.copia, copia);
  fs.utimesSync(a.copia, new Date('2026-10-22T16:47:00Z'), new Date('2026-10-22T16:47:00Z'));
  t.mock.method(console, 'error', () => {});
  const recusada = await m.pedir('/api/mesa/estado');
  assert.equal(recusada.status, 503, recusada.text);
  assert.equal(recusada.json.erro, semCopia);
  await sleep(550);
  await m.mesa.tableApi.flush();
  assert.deepEqual(fs.readFileSync(a.copia), copia);
  assert.equal(fs.existsSync(a.principal), false);
});
