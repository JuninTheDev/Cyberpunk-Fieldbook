const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const ORIGINAL = Buffer.concat([PNG, Buffer.from('fonte original preservada')]);
const imagem = (buffer = PNG, tipo = 'png') => `data:image/${tipo};base64,${buffer.toString('base64')}`;
const RECORTE = { x: 0.2, y: 0.8, zoom: 2.5 };

async function jogador(wiki, mestre, nome) {
  const conta = await wiki.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome } });
  assert.equal(conta.status, 201, conta.text);
  const login = await wiki.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
  assert.equal(login.status, 200, login.text);
  return { cookie: wiki.cookieDe(login), conta: conta.json.conta };
}

async function preparar(t, dados = {}) {
  const wiki = criarServidorIsolado(t);
  const mestre = await wiki.entrarComoMestre();
  const ana = await jogador(wiki, mestre, 'Ana');
  const bruno = await jogador(wiki, mestre, 'Bruno');
  const resposta = await wiki.pedir('/api/personagens', { method: 'POST', cookie: ana.cookie, body: { nome: 'Retrato de V', ...dados } });
  assert.equal(resposta.status, 201, resposta.text);
  const doc = resposta.json.personagem;
  const url = `/api/personagens/${doc.id}`;
  const pasta = path.join(wiki.dados, 'personagens', 'retratos');
  const ler = async () => {
    const resposta = await wiki.pedir(url, { cookie: ana.cookie });
    assert.equal(resposta.status, 200, resposta.text);
    return resposta.json.personagem;
  };
  const enviar = (body = { imagem: imagem(), original: imagem(ORIGINAL), recorte: RECORTE }, cookie = ana.cookie) => wiki.pedir(`${url}/retrato`, { method: 'POST', cookie, body });
  const arquivos = () => fs.existsSync(pasta) ? Object.fromEntries(fs.readdirSync(pasta).sort().map(nome => [nome, fs.readFileSync(path.join(pasta, nome)).toString('base64')])) : {};
  return { wiki, mestre, ana, bruno, doc, url, pasta, ler, enviar, arquivos };
}

test('retratos guardam o recorte e o original separadamente e devolvem os metadados normalizados', async t => {
  const ctx = await preparar(t);
  const resposta = await ctx.enviar({ imagem: imagem(), original: imagem(ORIGINAL), recorte: { ...RECORTE, ignorado: 'não persiste' } });
  assert.equal(resposta.status, 200, resposta.text);
  assert.match(resposta.json.retrato, new RegExp(`^api/personagens/${ctx.doc.id}/retrato\\?v=\\d+$`));
  assert.equal(resposta.json.retratoOriginal, true);
  assert.deepEqual(resposta.json.retratoRecorte, RECORTE);
  const doc = await ctx.ler();
  assert.equal(doc.retrato, resposta.json.retrato);
  assert.equal(doc.retratoOriginal, true);
  assert.deepEqual(doc.retratoRecorte, RECORTE);
  assert.deepEqual(ctx.arquivos(), { [`${doc.id}-original.png`]: ORIGINAL.toString('base64'), [`${doc.id}.png`]: PNG.toString('base64') });
  const recortada = await ctx.wiki.pedir(`${ctx.url}/retrato`, { cookie: ctx.ana.cookie });
  const fonte = await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.ana.cookie });
  assert.equal(recortada.status, 200);
  assert.equal(recortada.headers['content-type'], 'image/png');
  assert.equal(Number(recortada.headers['content-length']), PNG.length);
  assert.equal(recortada.text, PNG.toString('utf8'));
  assert.equal(fonte.status, 200);
  assert.equal(Number(fonte.headers['content-length']), ORIGINAL.length);
  assert.equal(fonte.text, ORIGINAL.toString('utf8'));
});

test('só dono e mestre veem a fonte; outros jogadores da campanha continuam vendo apenas o recorte', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato`, { cookie: ctx.bruno.cookie })).status, 200);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.bruno.cookie })).status, 403);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.mestre })).status, 200);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`)).status, 401);
  assert.equal((await ctx.enviar(undefined, ctx.bruno.cookie)).status, 403);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato`, { method: 'DELETE', cookie: ctx.bruno.cookie })).status, 403);
  const publico = (await ctx.wiki.pedir(ctx.url, { cookie: ctx.bruno.cookie })).json.personagem;
  assert.equal(publico.publico, true);
  assert.ok(publico.retrato);
  assert.equal(publico.retratoOriginal, undefined);
  assert.equal(publico.retratoRecorte, undefined);
  assert.deepEqual((await ctx.ler()).retratoRecorte, RECORTE);
});

test('assinaturas PNG, JPEG e WebP são reconhecidas pelo conteúdo e a troca de extensão limpa os arquivos antigos', async t => {
  const ctx = await preparar(t);
  // A API verifica a assinatura; a decodificação dos pixels é conferida pelos testes do navegador.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x4a, 0x46, 0x49, 0x46]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
  for (const [buffer, tipo, extensao] of [[PNG, 'image/png', 'png'], [jpeg, 'image/jpeg', 'jpg'], [webp, 'image/webp', 'webp']]) {
    const resposta = await ctx.enviar({ imagem: imagem(buffer), original: imagem(buffer), recorte: { x: 0, y: 1, zoom: 5 } });
    assert.equal(resposta.status, 200, resposta.text);
    const arquivos = ctx.arquivos();
    assert.deepEqual(Object.keys(arquivos), [`${ctx.doc.id}-original.${extensao}`, `${ctx.doc.id}.${extensao}`]);
    assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato`, { cookie: ctx.ana.cookie })).headers['content-type'], tipo);
    assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.ana.cookie })).headers['content-type'], tipo);
  }
});

test('imagem, fonte ou recorte inválidos não alteram os bytes nem os metadados já salvos', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  const arquivos = ctx.arquivos(), antes = await ctx.ler();
  const base = { imagem: imagem(), original: imagem(ORIGINAL), recorte: RECORTE };
  const invalidos = [
    { ...base, imagem: imagem(Buffer.from('<script>não é PNG</script>')) },
    { ...base, original: imagem(Buffer.from('fonte inválida')) },
    { ...base, original: '' },
    { ...base, recorte: [] }, { ...base, recorte: '0,0,1' },
    ...[{ x: -0.01 }, { x: 1.01 }, { y: -0.01 }, { y: 1.01 }, { zoom: 0.99 }, { zoom: 5.01 }, { zoom: '2' }, { x: null }, { y: null }, { zoom: null }].map(d => ({ ...base, recorte: { ...RECORTE, ...d } })),
    { ...base, recorte: { x: 0.5, y: 0.5 } },
    `{"imagem":${JSON.stringify(imagem())},"original":${JSON.stringify(imagem(ORIGINAL))},"recorte":{"x":1e999,"y":0.5,"zoom":2}}`
  ];
  for (const body of invalidos) {
    const resposta = await ctx.enviar(body);
    assert.equal(resposta.status, 400, resposta.text);
    assert.deepEqual(ctx.arquivos(), arquivos);
    const depois = await ctx.ler();
    for (const campo of ['retrato', 'retratoOriginal', 'retratoRecorte', 'versao']) assert.deepEqual(depois[campo], antes[campo], campo);
  }
});

test('o limite de 2 MB vale para a soma de recorte e fonte e aceita exatamente esse total', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  const arquivos = ctx.arquivos();
  const grande = tamanho => { const bytes = Buffer.alloc(tamanho); PNG.copy(bytes); return bytes; };
  const megabyte = 1024 * 1024;
  const invalida = await ctx.enviar({ imagem: imagem(grande(megabyte)), original: imagem(grande(megabyte + 1)), recorte: RECORTE });
  assert.equal(invalida.status, 413, invalida.text);
  assert.deepEqual(ctx.arquivos(), arquivos);
  const valida = await ctx.enviar({ imagem: imagem(grande(megabyte)), original: imagem(grande(megabyte)), recorte: RECORTE });
  assert.equal(valida.status, 200, valida.text);
  assert.equal(Number((await ctx.wiki.pedir(`${ctx.url}/retrato`, { cookie: ctx.ana.cookie })).headers['content-length']), megabyte);
  assert.equal(Number((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.ana.cookie })).headers['content-length']), megabyte);
});

test('falha ao trocar o segundo arquivo devolve os dois retratos anteriores e remove arquivos temporários', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  const arquivos = ctx.arquivos(), antes = await ctx.ler();
  const rename = fs.renameSync;
  let falhou = false;
  fs.renameSync = (de, para) => {
    if (!falhou && path.dirname(para) === ctx.pasta && path.basename(para) === `${ctx.doc.id}-original.png` && String(de).endsWith('.tmp')) {
      falhou = true;
      throw new Error('Falha de gravação simulada');
    }
    return rename(de, para);
  };
  let resposta;
  try { resposta = await ctx.enviar({ imagem: imagem(ORIGINAL), original: imagem(), recorte: { x: 1, y: 0, zoom: 1 } }); }
  finally { fs.renameSync = rename; }
  assert.equal(falhou, true);
  assert.equal(resposta.status, 500, resposta.text);
  assert.deepEqual(ctx.arquivos(), arquivos);
  assert.deepEqual((await ctx.ler()).retratoRecorte, antes.retratoRecorte);
});

test('upload legado continua válido e limpa fonte e recorte anteriores, inclusive após salvar a ficha', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  const resposta = await ctx.enviar({ imagem: imagem() });
  assert.equal(resposta.status, 200, resposta.text);
  assert.equal(resposta.json.retratoOriginal, false);
  assert.equal(resposta.json.retratoRecorte, null);
  assert.deepEqual(Object.keys(ctx.arquivos()), [`${ctx.doc.id}.png`]);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.ana.cookie })).status, 404);
  const atual = await ctx.ler();
  const salva = await ctx.wiki.pedir(ctx.url, { method: 'PUT', cookie: ctx.ana.cookie, body: { ...atual, notas: 'Edição comum' } });
  assert.equal(salva.status, 200, salva.text);
  assert.equal(salva.json.personagem.retratoOriginal, false);
  assert.equal(salva.json.personagem.retratoRecorte, null);
});

test('DELETE apaga fonte, recorte e metadados e continua idempotente', async t => {
  const ctx = await preparar(t, { retratoLink: 'https://example.com/antiga.png' });
  assert.equal((await ctx.enviar()).status, 200);
  for (let i = 0; i < 2; i++) {
    const resposta = await ctx.wiki.pedir(`${ctx.url}/retrato`, { method: 'DELETE', cookie: ctx.ana.cookie });
    assert.equal(resposta.status, 200, resposta.text);
    assert.deepEqual(resposta.json, { retrato: null, retratoOriginal: false, retratoRecorte: null });
    assert.deepEqual(ctx.arquivos(), {});
    const doc = await ctx.ler();
    assert.equal(doc.retrato, null);
    assert.equal(doc.retratoLink, '');
    assert.equal(doc.retratoOriginal, false);
    assert.equal(doc.retratoRecorte, null);
    assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato`, { cookie: ctx.ana.cookie })).status, 404);
    assert.equal((await ctx.wiki.pedir(`${ctx.url}/retrato?original=1`, { cookie: ctx.ana.cookie })).status, 404);
  }
});

test('criar e salvar a ficha não permitem forjar os campos do retrato, e importar no Foundry conserva sua edição', async t => {
  const ctx = await preparar(t, { retrato: 'forjado', retratoOriginal: true, retratoRecorte: RECORTE });
  assert.equal(ctx.doc.retrato, undefined);
  assert.equal(ctx.doc.retratoOriginal, undefined);
  assert.equal(ctx.doc.retratoRecorte, undefined);
  assert.equal((await ctx.enviar()).status, 200);
  const atual = await ctx.ler();
  const salva = await ctx.wiki.pedir(ctx.url, { method: 'PUT', cookie: ctx.ana.cookie, body: { ...atual, retrato: 'forjado', retratoOriginal: false, retratoRecorte: null, nome: 'Outro nome' } });
  assert.equal(salva.status, 200, salva.text);
  for (const campo of ['retrato', 'retratoOriginal', 'retratoRecorte']) assert.deepEqual(salva.json.personagem[campo], atual[campo], campo);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}/foundry`, { method: 'PUT', cookie: ctx.mestre, body: { ator: 'retrato-foundry' } })).status, 200);
  const recorte = { x: 1, y: 0, zoom: 5 };
  assert.equal((await ctx.enviar({ imagem: imagem(), original: imagem(ORIGINAL), recorte })).status, 200);
  assert.deepEqual((await ctx.ler()).retratoRecorte, recorte);
});

test('restaurar versão conserva a fonte e o recorte atuais em vez dos metadados antigos do histórico', async t => {
  const ctx = await preparar(t);
  assert.equal((await ctx.enviar()).status, 200);
  const atual = await ctx.ler();
  assert.equal((await ctx.wiki.pedir(ctx.url, { method: 'PUT', cookie: ctx.ana.cookie, body: { ...atual, nome: 'Nome novo' } })).status, 200);
  const recorte = { x: 0.9, y: 0.1, zoom: 4 };
  assert.equal((await ctx.enviar({ imagem: imagem(ORIGINAL), original: imagem(), recorte })).status, 200);
  const arquivos = ctx.arquivos();
  const antes = await ctx.ler();
  const historico = await ctx.wiki.pedir(`${ctx.url}/versoes`, { cookie: ctx.mestre });
  const antiga = historico.json.versoes.find(v => v.versao === atual.versao);
  assert.ok(antiga);
  const restaurada = await ctx.wiki.pedir(`${ctx.url}/versoes/${antiga.id}/restaurar`, { method: 'POST', cookie: ctx.mestre });
  assert.equal(restaurada.status, 200, restaurada.text);
  assert.equal(restaurada.json.personagem.nome, atual.nome);
  for (const campo of ['retrato', 'retratoOriginal', 'retratoRecorte']) assert.deepEqual(restaurada.json.personagem[campo], antes[campo], campo);
  assert.deepEqual(ctx.arquivos(), arquivos);
});
