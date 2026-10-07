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
    const publicar = await api(gm, '/api/campanhas/morana/publicar', { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } });
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
  await r.passo('regras da loja: os jogadores da campanha leem, só o mestre grava, com limpeza', async () => {
    const lidas = await api(rede, '/api/loja/regras', { cookie: ana });
    const jogador = await api(rede, '/api/loja/regras', { method: 'PUT', cookie: ana, body: { teto: 99999 } });
    const mestre = await api(gm, '/api/loja/regras', { method: 'PUT', body: { teto: '500', esconder: ['exotica', 'inventada'], liberados: ['core_weapons:sword-excellent', 'lixo!'], bloqueados: [] } });
    const depois = (await api(rede, '/api/loja/regras', { cookie: ana })).dados?.regras;
    await api(gm, '/api/loja/regras', { method: 'PUT', body: { teto: 1000, esconder: lidas.dados.etiquetas, liberados: [], bloqueados: [] } });
    return [lidas.dados?.regras?.teto === 1000 && jogador.status === 403 && mestre.status === 200 && depois.teto === 500 && depois.esconder.join() === 'exotica' && depois.liberados.join() === 'core_weapons:sword-excellent', `${jogador.status}/${mestre.status} · ${JSON.stringify(depois)}`];
  });
  await r.passo('enviar para o mestre: o dono pode, o outro jogador não; a versão não muda', async () => {
    const antes = (await api(gm, `/api/personagens/${ficha.id}`)).dados?.personagem;
    const outro = await api(rede, `/api/personagens/${ficha.id}/enviar`, { method: 'POST', cookie: bruno, body: {} });
    const dono = await api(rede, `/api/personagens/${ficha.id}/enviar`, { method: 'POST', cookie: ana, body: {} });
    const depois = (await api(gm, `/api/personagens/${ficha.id}`)).dados?.personagem;
    return [outro.status === 403 && dono.status === 200 && depois.envio?.versao === antes.versao && depois.versao === antes.versao, `${outro.status}/${dono.status} · envio v${depois.envio?.versao} · personagem v${depois.versao}`];
  });
  await r.passo('estado no Foundry: enviado, mudou depois, importado, STATs travados, mudou (Lifepath), avisado, atualizado', async () => {
    const estados = [];
    let doc = (await api(rede, '/api/personagens', { method: 'POST', cookie: ana, body: { nome: 'Estado', resultado: { stats: { INT: 5 }, pendencias: ['a'] } } })).dados.personagem;
    const salvar = async mudanca => { doc = (await api(rede, `/api/personagens/${doc.id}`, { method: 'PUT', cookie: ana, body: { ...doc, ...mudanca } })).dados.personagem; estados.push(doc.estadoFoundry); };
    const enviar = async () => estados.push((await api(rede, `/api/personagens/${doc.id}/enviar`, { method: 'POST', cookie: ana, body: {} })).dados.estadoFoundry);
    const voltaDoFoundry = async () => { const dados = (await api(gm, `/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: 'a1', nomeAtor: 'Estado' } })).dados; estados.push(dados.estadoFoundry); return dados.foundry; };
    await salvar({ passo: 2, donoNome: 'Falso', estadoFoundry: 'importado' }); // novo (campos calculados não colam)
    await enviar(); // enviado
    await salvar({ passo: 3, resultado: { stats: { INT: 5 }, pendencias: ['b'] } }); // enviado: só pendências e passo mudaram
    await salvar({ resultado: { stats: { INT: 6 } } }); // enviado-mudou
    const primeira = await voltaDoFoundry(); // importado
    await salvar({ resultado: { stats: { INT: 7 } } }); // importado: depois do Foundry, os STATs não mudam mais pela wiki
    await salvar({ resultado: { stats: { INT: 7 }, lifepath: { culturalOrigin: 'Nova origem' } } }); // mudou: o Lifepath ainda muda
    await enviar(); // avisado
    const segunda = await voltaDoFoundry(); // importado de novo (Atualizar da wiki no mesmo ator)
    const lista = ((await api(rede, '/api/personagens', { cookie: ana })).dados.personagens || []).find(p => p.id === doc.id);
    const arquivo = JSON.parse(fs.readFileSync(path.join(servidores.dados, 'personagens', `${doc.id}.json`), 'utf8'));
    const calculados = ['estadoFoundry', 'donoNome', 'publico'].filter(campo => campo in arquivo);
    const esperado = 'novo,enviado,enviado,enviado-mudou,importado,importado,mudou,avisado,importado';
    return [estados.join() === esperado && segunda.importado === primeira.importado && segunda.sincronizado >= primeira.sincronizado && lista?.estadoFoundry === 'importado' && !calculados.length, `${estados.join()} · data da importação mantida: ${segunda.importado === primeira.importado} · no arquivo: ${calculados.join() || 'nenhum calculado'}`];
  });
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  await r.passo('retrato: recusa o que não é imagem; aceita PNG e serve para quem é da campanha, com CORS para o Foundry', async () => {
    const falso = await api(rede, `/api/personagens/${ficha.id}/retrato`, { method: 'POST', cookie: ana, body: { imagem: 'data:image/png;base64,' + Buffer.from('<script>x</script>').toString('base64') } });
    const outro = await api(rede, `/api/personagens/${ficha.id}/retrato`, { method: 'POST', cookie: bruno, body: { imagem: PNG } });
    const ok = await api(rede, `/api/personagens/${ficha.id}/retrato`, { method: 'POST', cookie: ana, body: { imagem: PNG } });
    const imagem = await fetch(`${rede}/${ok.dados?.retrato}`, { headers: { Origin: 'http://localhost:30000', Cookie: bruno } });
    const bytes = Buffer.from(await imagem.arrayBuffer());
    const semCodigo = await fetch(`${rede}/${ok.dados?.retrato}`);
    return [falso.status === 400 && outro.status === 403 && ok.status === 200 && imagem.headers.get('content-type') === 'image/png' && bytes[1] === 0x50 && imagem.headers.get('access-control-allow-origin') === 'http://localhost:30000' && semCodigo.status === 401, `${falso.status}/${outro.status}/${ok.status} · outro jogador da campanha ${imagem.status} ${imagem.headers.get('content-type')} · sem código ${semCodigo.status}`];
  });
  await r.passo('retrato: o jogador não grava o campo direto pelo salvamento', async () => {
    const atual = (await api(rede, `/api/personagens/${ficha.id}`, { cookie: ana })).dados.personagem;
    const salvo = (await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...atual, retrato: 'javascript:alert(1)', retratoLink: 'http://inseguro.example/a.png' } })).dados?.personagem;
    ficha = salvo;
    return [/^api\/personagens\//.test(salvo?.retrato || '') && salvo.retratoLink === '', `${salvo?.retrato} · link "${salvo?.retratoLink}"`];
  });
  await r.passo('na mesa: só o mestre grava a ficha da mesa; o jogador não muda pelo salvamento', async () => {
    const jogador = await api(rede, `/api/personagens/${ficha.id}/mesa`, { method: 'PUT', cookie: ana, body: { hp: { atual: 99, max: 99 } } });
    const mestre = await api(gm, `/api/personagens/${ficha.id}/mesa`, { method: 'PUT', body: { hp: { atual: 20, max: 40 } } });
    const atual = (await api(rede, `/api/personagens/${ficha.id}`, { cookie: ana })).dados.personagem;
    const salvo = (await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...atual, mesa: { hp: { atual: 99, max: 99 } } } })).dados?.personagem;
    ficha = salvo;
    return [jogador.status === 403 && mestre.status === 200 && atual.mesa?.hp?.atual === 20 && salvo?.mesa?.hp?.atual === 20, `jogador ${jogador.status} · mestre ${mestre.status} · depois do salvamento HP ${salvo?.mesa?.hp?.atual}`];
  });
  await r.passo('pedidos da campanha: só depois do Foundry; catálogo conferido e total calculado no servidor', async () => {
    const novo = (await api(rede, '/api/personagens', { method: 'POST', cookie: ana, body: { nome: 'Compras' } })).dados.personagem;
    const pedir = (cookie, itens, base = rede) => api(base, `/api/personagens/${novo.id}/pedidos`, { method: 'POST', cookie, body: { itens } });
    const antes = await pedir(ana, [{ id: 'core_weapons:heavy-pistol', qtd: 1 }]);
    await api(gm, `/api/personagens/${novo.id}/foundry`, { method: 'PUT', body: { ator: 'x1', nomeAtor: 'Compras' } });
    const inexistente = await pedir(ana, [{ id: 'core_weapons:canhao-de-mentira', qtd: 1 }]);
    const outro = await pedir(bruno, [{ id: 'core_weapons:heavy-pistol', qtd: 1 }]);
    // O jogador manda um preço (1eb): não vale, o total sai do catálogo (pistola pesada 100eb + 50 balas a 10eb por 10).
    const ok = await pedir(ana, [{ id: 'core_weapons:heavy-pistol', qtd: 1, preco: 1 }, { id: 'core_ammo:heavy-pistol-basic', qtd: 50, municao: 'x' }]);
    const lista = ((await api(rede, '/api/personagens', { cookie: ana })).dados.personagens || []).find(p => p.id === novo.id);
    r.pedidoTeste = { id: novo.id, pedido: ok.dados?.pedido };
    return [antes.status === 400 && inexistente.status === 400 && outro.status === 403 && ok.status === 201 && ok.dados.pedido.total === 150 && ok.dados.pedido.status === 'pendente' && lista?.pedidos?.pendentes === 1,
      `antes ${antes.status} · inexistente ${inexistente.status} · outro jogador ${outro.status} · ok ${ok.status} total ${ok.dados?.pedido?.total} · pendentes na lista ${lista?.pedidos?.pendentes}`];
  });
  await r.passo('pedidos da campanha: só o mestre aprova; aprovado não se cancela; o Foundry marca entregue', async () => {
    const { id, pedido } = r.pedidoTeste;
    const acao = (cookie, nome, base = rede, body = {}) => api(base, `/api/personagens/${id}/pedidos/${pedido.id}/${nome}`, { method: 'POST', cookie, body });
    const jogadorAprova = await acao(ana, 'aprovar');
    const mestreAprova = await acao(undefined, 'aprovar', gm);
    const cancelaDepois = await acao(ana, 'cancelar');
    const entregue = await acao(undefined, 'entregue', gm, { avisos: ['tudo certo'] });
    const segundo = (await api(rede, `/api/personagens/${id}/pedidos`, { method: 'POST', cookie: ana, body: { itens: [{ id: 'core_gear:agent', qtd: 1 }] } })).dados.pedido;
    const cancela = await api(rede, `/api/personagens/${id}/pedidos/${segundo.id}/cancelar`, { method: 'POST', cookie: ana, body: {} });
    const doc = (await api(rede, `/api/personagens/${id}`, { cookie: ana })).dados.personagem;
    const estados = (doc.pedidos || []).map(item => item.status).join(',');
    return [jogadorAprova.status === 403 && mestreAprova.status === 200 && cancelaDepois.status === 400 && entregue.status === 200 && cancela.status === 200 && estados === 'entregue,cancelado',
      `jogador aprova ${jogadorAprova.status} · mestre ${mestreAprova.status} · cancelar aprovado ${cancelaDepois.status} · entregue ${entregue.status} · ${estados}`];
  });
  await r.passo('IP: só o mestre dá; gastar mais do que tem é recusado', async () => {
    const jogador = await api(rede, `/api/personagens/${ficha.id}/ip`, { method: 'POST', cookie: ana, body: { qtd: 500 } });
    const mestre = await api(gm, `/api/personagens/${ficha.id}/ip`, { method: 'POST', body: { qtd: 100, motivo: 'Sessão 1' } });
    const atual = (await api(rede, `/api/personagens/${ficha.id}`, { cookie: ana })).dados.personagem;
    const demais = await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...atual, avanco: [{ tipo: 'pericia', nome: 'Handgun', de: 4, para: 5, custo: 100 }, { tipo: 'pericia', nome: 'Brawling', de: 2, para: 3, custo: 60 }] } });
    const certo = await api(rede, `/api/personagens/${ficha.id}`, { method: 'PUT', cookie: ana, body: { ...atual, ip: { ganhos: [{ qtd: 9999 }] }, avanco: [{ tipo: 'pericia', nome: 'Handgun', de: 4, para: 5, custo: 100 }] } });
    ficha = certo.dados?.personagem;
    return [jogador.status === 403 && mestre.status === 200 && demais.status === 400 && certo.status === 200 && ficha.ip.ganhos.length === 1 && ficha.ip.ganhos[0].qtd === 100, `${jogador.status}/${mestre.status}/${demais.status}/${certo.status} · ganhos ${JSON.stringify(ficha?.ip?.ganhos?.map(g => g.qtd))}`];
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
