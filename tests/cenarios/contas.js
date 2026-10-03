// Códigos dos jogadores e a API de personagens (sem navegador): quem entra, quem vê, quem grava.
// Os dados ficam na pasta temporária dos servidores de teste, nunca na pasta da campanha.
const fs = require('fs');
const path = require('path');

module.exports = async ({ servidores, r }) => {
  if (!servidores.rede) { await r.passo('rede: sem IP de rede nesta máquina, cenário pulado', async () => [true, '']); return; }
  const gm = servidores.local;
  const rede = servidores.rede;
  const api = async (base, caminho, { method = 'GET', body, cookie, headers = {} } = {}) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    });
    const texto = await resposta.text();
    let dados = null;
    try { dados = JSON.parse(texto); } catch { /* texto puro */ }
    return { status: resposta.status, dados, texto, headers: resposta.headers };
  };
  const cookieDe = resposta => (resposta.headers.get('set-cookie') || '').split(';')[0];

  let conta1;
  let conta2;
  await r.passo('mestre cria códigos para dois jogadores', async () => {
    conta1 = (await api(gm, '/api/contas', { method: 'POST', body: { nome: 'Ana' } })).dados?.conta;
    conta2 = (await api(gm, '/api/contas', { method: 'POST', body: { nome: 'Bruno' } })).dados?.conta;
    return [/^NC-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(conta1?.codigo || '') && conta2?.codigo !== conta1?.codigo, `${conta1?.codigo} · ${conta2?.codigo}`];
  });
  await r.passo('jogador não vê nem cria códigos', async () => {
    const lista = await api(rede, '/api/contas');
    const cria = await api(rede, '/api/contas', { method: 'POST', body: { nome: 'X' } });
    return [lista.status === 403 && cria.status === 403, `${lista.status}/${cria.status}`];
  });

  let ana;
  let bruno;
  await r.passo('código errado dá 403; o certo entra e grava o cookie', async () => {
    const errado = await api(rede, '/api/entrar', { method: 'POST', body: { codigo: 'NC-AAAA-AAAA' } });
    const certo = await api(rede, '/api/entrar', { method: 'POST', body: { codigo: conta1.codigo.toLowerCase() } });
    ana = cookieDe(certo);
    bruno = cookieDe(await api(rede, '/api/entrar', { method: 'POST', body: { codigo: conta2.codigo } }));
    const eu = await api(rede, '/api/eu', { cookie: ana });
    return [errado.status === 403 && certo.status === 200 && /HttpOnly/.test(certo.headers.get('set-cookie')) && eu.dados?.jogador?.nome === 'Ana', `${errado.status}/${certo.status} · eu: ${eu.dados?.papel} ${eu.dados?.jogador?.nome}`];
  });
  await r.passo('visitante (sem código) não cria personagem', async () => {
    const resposta = await api(rede, '/api/personagens', { method: 'POST', body: { nome: 'Intruso' } });
    return [resposta.status === 401, `${resposta.status}`];
  });

  let ficha;
  await r.passo('jogador cria personagem: o dono é ele, versão 1', async () => {
    const resposta = await api(rede, '/api/personagens', { method: 'POST', cookie: ana, body: { nome: 'V', apelido: 'Merc', role: 'solo', stats: { INT: 6 }, dono: 'outro', versao: 99 } });
    ficha = resposta.dados?.personagem;
    return [resposta.status === 201 && ficha?.dono === conta1.id && ficha.versao === 1, `${resposta.status} · dono ${ficha?.dono === conta1.id ? 'Ana' : ficha?.dono} · v${ficha?.versao}`];
  });
  await r.passo('outro jogador só vê nome, apelido e Role, e não grava', async () => {
    const ver = await api(rede, `/api/personagens/${ficha.id}`, { cookie: bruno });
    const gravar = await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: bruno, body: { ...ficha, nome: 'Roubado' } });
    const p = ver.dados?.personagem || {};
    return [p.publico === true && p.nome === 'V' && p.stats === undefined && gravar.status === 403, `publico ${p.publico}, stats ${JSON.stringify(p.stats)}, PUT ${gravar.status}`];
  });
  await r.passo('a lista mostra os meus completos e os dos outros resumidos', async () => {
    const lista = (await api(rede, '/api/personagens', { cookie: bruno })).dados?.personagens || [];
    const daAna = lista.find(p => p.id === ficha.id);
    return [daAna && daAna.publico === true && daAna.donoNome === 'Ana' && !daAna.meu, JSON.stringify(daAna)];
  });
  await r.passo('salvar com versão velha dá 409 com a versão atual', async () => {
    const primeiro = await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...ficha, nome: 'V (1)' } });
    const velho = await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...ficha, nome: 'V (velho)' } });
    ficha = primeiro.dados?.personagem;
    return [primeiro.status === 200 && ficha.versao === 2 && velho.status === 409 && velho.dados?.personagem?.nome === 'V (1)', `${primeiro.status} v${ficha?.versao} · velho ${velho.status}`];
  });
  await r.passo('gravação sem JSON é recusada (personagens e Publicar)', async () => {
    const texto = await api(rede, '/api/personagens', { method: 'POST', cookie: ana, body: '{"nome":"x"}', headers: { 'Content-Type': 'text/plain' } });
    const publicar = await api(gm, '/api/jogadores', { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } });
    return [texto.status === 415 && publicar.status === 415, `${texto.status}/${publicar.status}`];
  });
  await r.passo('CORS só para o Foundry (localhost:30000)', async () => {
    const foundry = await api(gm, '/api/personagens', { method: 'OPTIONS', headers: { Origin: 'http://localhost:30000', 'Access-Control-Request-Method': 'PUT' } });
    const outro = await api(gm, '/api/personagens', { method: 'OPTIONS', headers: { Origin: 'http://site-qualquer.example' } });
    return [foundry.headers.get('access-control-allow-origin') === 'http://localhost:30000' && !outro.headers.get('access-control-allow-origin'), `${foundry.headers.get('access-control-allow-origin')} · outro: ${outro.headers.get('access-control-allow-origin')}`];
  });
  await r.passo('volta do Foundry: só o mestre grava, sem mudar a versão', async () => {
    const jogador = await api(rede, `/api/personagens/${ficha.id}/foundry`, { method: 'PUT', cookie: ana, body: { ator: 'x' } });
    const mestre = await api(gm, `/api/personagens/${ficha.id}/foundry`, { method: 'PUT', body: { ator: 'abc123', nomeAtor: 'V', versao: 2, entregues: ['u1'] } });
    const depois = (await api(gm, `/api/personagens/${ficha.id}`)).dados?.personagem;
    // O jogador salva de novo com a versão que tinha: a volta do Foundry continua lá.
    const salvo = (await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...ficha, foundry: null } })).dados?.personagem;
    return [jogador.status === 403 && mestre.status === 200 && depois.versao === 2 && salvo?.foundry?.ator === 'abc123', `${jogador.status}/${mestre.status} · v${depois?.versao} · foundry depois de salvar: ${salvo?.foundry?.ator}`];
  });
  await r.passo('os dados ficam na pasta temporária, não na da campanha', async () => {
    const naTemp = fs.existsSync(path.join(servidores.dados, 'personagens', `${ficha.id}.json`)) && fs.existsSync(path.join(servidores.dados, 'contas-jogadores.json'));
    const naCampanha = fs.existsSync(path.join(servidores.raiz, 'personagens', `${ficha.id}.json`));
    return [naTemp && !naCampanha, `temp ${naTemp} · campanha ${naCampanha}`];
  });
  await r.passo('código revogado deixa de valer', async () => {
    await api(gm, `/api/contas/${conta2.id}`, { method: 'DELETE' });
    const eu = await api(rede, '/api/eu', { cookie: bruno });
    return [eu.dados?.papel === 'visitante', eu.dados?.papel];
  });
  await r.passo('apagar move para personagens/apagados', async () => {
    const apagar = await api(rede, `/api/personagens/${ficha.id}`, { method: 'DELETE', cookie: ana });
    const lixeira = fs.readdirSync(path.join(servidores.dados, 'personagens', 'apagados'));
    return [apagar.status === 200 && lixeira.some(nome => nome.startsWith(ficha.id)), lixeira.join(', ')];
  });
  await r.passo('limite: 10 códigos errados seguidos do mesmo IP dão 429', async () => {
    const ip = { 'CF-Connecting-IP': '203.0.113.9' };
    const status = [];
    for (let i = 0; i < 11; i++) status.push((await api(rede, '/api/entrar', { method: 'POST', body: { codigo: `NC-ERRO-${i}` }, headers: ip })).status);
    return [status.slice(0, 10).every(s => s === 403) && status[10] === 429, status.join(',')];
  });
};
