// Modo hospedado (MODO=hospedado), como no servidor da nuvem atrás do Caddy: "este computador" não é o mestre,
// o mestre entra pela tela /mestre, o Publicar grava na pasta de dados (fora do git) e a barra lateral mostra a mesa.
// Um Foundry de mentira responde o /api/status. Nada aqui mexe nos arquivos do projeto.
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');

module.exports = async ({ edge, servidores, r }) => {
  const SENHA = 'senha-longa-de-teste';
  const base = 'http://localhost:8768';
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-hospedado-'));
  const backups = path.join(dados, 'backups');
  fs.mkdirSync(backups);
  fs.writeFileSync(path.join(backups, 'backup-2026-10-04.tar.gz'), 'antigo');
  fs.writeFileSync(path.join(backups, 'backup-2026-10-05.tar.gz'), 'mais novo');
  // Registro de publicações e módulo esperando (como o servidor/atualizar.sh deixa).
  fs.writeFileSync(path.join(dados, 'atualizacoes.log'), ['2026-10-05 07:42:14 no ar: abc1234 Primeira', '2026-10-05 07:50:00 no ar: def5678 Segunda', ''].join('\n'));
  fs.writeFileSync(path.join(dados, '.modulo-pendente'), '');
  let mesa = { active: true, world: 'protocolo-morana', users: 2, version: '12.343' };
  // A troca de mesa (Foundry 12 ou 14): as unidades do systemd e um systemctl de mentira, que anota cada comando e "liga"
  // a versão que o Foundry de mentira responde.
  const systemd = path.join(dados, 'systemd');
  fs.mkdirSync(systemd);
  for (const unidade of ['foundry.service', 'foundry14.service']) fs.writeFileSync(path.join(systemd, unidade), '[Unit]\n');
  const versaoNoAr = path.join(dados, 'versao-no-ar.txt');
  const comandos = path.join(dados, 'systemctl.log');
  const systemctlFalso = path.join(dados, 'systemctl-falso.js');
  fs.writeFileSync(systemctlFalso, [
    "const fs = require('fs');",
    'const args = process.argv.slice(2);',
    `fs.appendFileSync(${JSON.stringify(comandos)}, args.join(' ') + '\\n');`,
    `if (args[0] === 'enable' && args[1] === '--now') fs.writeFileSync(${JSON.stringify(versaoNoAr)}, args[2] === 'foundry14.service' ? '14.369' : '12.343');`
  ].join('\n'));
  const foundry = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    const versao = fs.existsSync(versaoNoAr) ? fs.readFileSync(versaoNoAr, 'utf8') : null;
    response.end(JSON.stringify({ ...mesa, ...(versao ? { version: versao } : {}) }));
  }).listen(8769, '127.0.0.1');
  const publicadoNoGit = fs.readFileSync(path.join(servidores.raiz, 'jogadores.json'), 'utf8');
  let servidor = null;
  const status = async (caminho, options = {}) => (await fetch(base + caminho, { redirect: 'manual', ...options })).status;
  try {
    servidor = await subir(8768, { HOST: '127.0.0.1', MODO: 'hospedado', GM_KEY: SENHA, DADOS: dados, DADOS_PERSONAGENS: '', FOUNDRY_URL: 'https://mesa.exemplo.com', FOUNDRY_STATUS: 'http://127.0.0.1:8769/api/status', BACKUPS: backups, SYSTEMD_DIR: systemd, MESA_SYSTEMCTL: JSON.stringify([process.execPath, systemctlFalso]) });

    await r.passo('este computador sem senha é jogador: raiz dos jogadores, index.html bloqueado', async () => {
      const raiz = await (await fetch(`${base}/`)).text();
      const index = await status('/index.html');
      return [/Jogadores/.test(raiz.match(/<title>[^<]*/)?.[0] || '') && index === 403, `index.html ${index}`];
    });
    await r.passo('senha no endereço não vale: manda para a tela /mestre', async () => {
      const resposta = await fetch(`${base}/?mestre=${SENHA}`, { redirect: 'manual' });
      return [resposta.status === 302 && resposta.headers.get('location') === '/mestre' && !resposta.headers.get('set-cookie'), `${resposta.status} → ${resposta.headers.get('location')}`];
    });
    let cookie = '';
    await r.passo('login: senha errada recusa; certa dá cookie Secure assinado (sem a senha)', async () => {
      const entrar = senha => fetch(`${base}/api/mestre/entrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha }) });
      const errada = await entrar('chute');
      const certa = await entrar(SENHA);
      const setCookie = certa.headers.get('set-cookie') || '';
      cookie = setCookie.split(';')[0];
      const index = await status('/index.html', { headers: { cookie } });
      return [errada.status === 403 && certa.status === 200 && /Secure/.test(setCookie) && !setCookie.includes(SENHA) && index === 200, `errada ${errada.status} · certa ${certa.status} · index ${index} · ${setCookie.slice(0, 40)}…`];
    });
    await r.passo('Publicar grava na pasta de dados (o servidor novo começa com o do git); o jogadores.json do git não muda', async () => {
      const { atualizado: _data, ...mestre } = await (await fetch(`${base}/api/campanhas/morana/publicar`, { headers: { cookie } })).json();
      const comecou = mestre.resumo === JSON.parse(publicadoNoGit).resumo;
      const resposta = await fetch(`${base}/api/campanhas/morana/publicar`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ mestre: { ...mestre, resumo: 'Publicado no servidor de teste.' } }) });
      const servido = await (await fetch(`${base}/api/visao?campanha=morana`, { headers: { cookie } })).json();
      const gravado = fs.existsSync(path.join(dados, 'campanhas', 'morana', 'publicar.json'));
      const noGit = fs.readFileSync(path.join(servidores.raiz, 'jogadores.json'), 'utf8');
      return [comecou && resposta.status === 200 && servido.resumo === 'Publicado no servidor de teste.' && gravado && noGit === publicadoNoGit, `começou com o do git ${comecou} · HTTP ${resposta.status} · servido "${servido.resumo}" · gravado ${gravado}`];
    });
    await r.passo('backup: o mestre baixa o mais recente; jogador não', async () => {
      const jogador = await status('/api/backup');
      const mestre = await fetch(`${base}/api/backup`, { headers: { cookie } });
      const conteudo = await mestre.text();
      return [jogador === 403 && mestre.status === 200 && conteudo === 'mais novo' && /backup-2026-10-05/.test(mestre.headers.get('content-disposition') || ''), `jogador ${jogador} · mestre ${mestre.status} "${conteudo}"`];
    });
    await r.passo('saúde do servidor: o mestre vê backup, disco, módulo e publicações; o jogador não', async () => {
    const mestre = await (await fetch(`${base}/api/estado`, { headers: { cookie } })).json();
    const jogador = await (await fetch(`${base}/api/estado`)).json();
    const sv = mestre.servidor || {};
    return [sv.backup?.nome === 'backup-2026-10-05.tar.gz' && sv.disco?.total > 0 && sv.moduloPendente === true && /def5678 Segunda/.test(sv.registro?.[0] || '') && jogador.servidor === null,
      JSON.stringify({ backup: sv.backup?.nome, disco: Boolean(sv.disco), modulo: sv.moduloPendente, registro: sv.registro?.[0], jogador: jogador.servidor })];
  });
  await r.passo('troca de mesa (Foundry 12 ou 14): só o mestre; com 2 conectados pede confirmação; confirmada, liga o 14 (que fica habilitado) e desabilita o 12; o jogador não vê a versão', async () => {
      const trocar = (corpo, headers = { cookie }) => fetch(`${base}/api/mestre/mesa`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(corpo) })
        .then(async resposta => ({ status: resposta.status, dados: await resposta.json() }));
      const anotados = () => (fs.existsSync(comandos) ? fs.readFileSync(comandos, 'utf8').trim().split('\n') : []);
      const estado = async headers => (await fetch(`${base}/api/estado`, { headers })).json();
      const antes = await estado({ cookie });
      const jogador = await trocar({ foundry: 14 }, {});
      const invalida = await trocar({ foundry: 13 });
      const ocupada = await trocar({ foundry: 14 });
      const semComando = anotados().length;
      const forcada = await trocar({ foundry: 14, forcar: true });
      const depois = await estado({ cookie });
      const doJogador = (await estado({})).mesa;
      const denovo = await trocar({ foundry: 14 });
      const lista = anotados();
      // Volta ao 12 (os passos de tela abaixo começam nele).
      const volta = await trocar({ foundry: 12, forcar: true });
      const ok = antes.servidor?.mesas?.join() === '12,14' && antes.mesa?.foundry === 12 && jogador.status === 403 && invalida.status === 400
        && ocupada.status === 409 && ocupada.dados.confirmar === true && ocupada.dados.usuarios === 2 && /2 pessoas conectadas/.test(ocupada.dados.erro) && semComando === 0
        && forcada.status === 200 && forcada.dados.foundry === 14 && depois.mesa?.foundry === 14 && !('foundry' in (doJogador || {}))
        && denovo.status === 200 && denovo.dados.jaEstava === true && lista.join(' | ') === 'enable --now foundry14.service | disable foundry.service'
        && volta.status === 200 && anotados().slice(2).join(' | ') === 'enable --now foundry.service | disable foundry14.service';
      return [ok, JSON.stringify({ mesas: antes.servidor?.mesas, antes: antes.mesa?.foundry, jogador: jogador.status, invalida: invalida.status, ocupada: ocupada.dados, forcada: forcada.dados, depois: depois.mesa?.foundry, doJogador, denovo: denovo.dados, comandos: anotados() })];
    });
  await r.passo('/api/estado: mesa aberta com 2 conectados, versão no ar', async () => {
      const estado = await (await fetch(`${base}/api/estado`)).json();
      return [estado.modo === 'hospedado' && !estado.mestre && estado.mesa?.aberta && estado.mesa.usuarios === 2 && estado.mesa.url === 'https://mesa.exemplo.com' && /^[0-9a-f]{7,}$/.test(estado.versao?.commit || '') && !('mundo' in estado.mesa), JSON.stringify(estado)];
    });
    await r.passo('mesa de uma campanha: o mestre vê qual é; quem joga nela vê aberta; quem não joga (e o visitante) não fica sabendo; o cookie do jogador só vai por https', async () => {
      const json = { 'Content-Type': 'application/json', cookie };
      await fetch(`${base}/api/campanhas/morana`, { method: 'PUT', headers: json, body: JSON.stringify({ mundo: 'protocolo-morana' }) });
      const outra = (await (await fetch(`${base}/api/campanhas`, { method: 'POST', headers: json, body: JSON.stringify({ nome: 'Outra mesa' }) })).json()).campanha;
      let cookieInteiro = '';
      const entrar = async campanhas => {
        const conta = (await (await fetch(`${base}/api/contas`, { method: 'POST', headers: json, body: JSON.stringify({ nome: 'J', campanhas }) })).json()).conta;
        cookieInteiro = (await fetch(`${base}/api/entrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: conta.codigo }) })).headers.get('set-cookie');
        return cookieInteiro.split(';')[0];
      };
      const daMorana = await entrar(['morana']);
      const daOutra = await entrar([outra.id]);
      const ver = async headers => (await (await fetch(`${base}/api/estado`, { headers })).json()).mesa;
      const [mestre, jogador, estranho, visitante] = [await ver({ cookie }), await ver({ cookie: daMorana }), await ver({ cookie: daOutra }), await ver({})];
      // Devolve como estava: os passos de tela abaixo esperam a mesa aberta para o visitante.
      await fetch(`${base}/api/campanhas/morana`, { method: 'PUT', headers: json, body: JSON.stringify({ mundo: '' }) });
      await fetch(`${base}/api/contas`, { headers: { cookie } }).then(resposta => resposta.json()).then(({ contas }) => Promise.all(contas.map(conta => fetch(`${base}/api/contas/${conta.id}`, { method: 'DELETE', headers: { cookie } }))));
      await fetch(`${base}/api/campanhas/${outra.id}`, { method: 'DELETE', headers: { cookie } });
      return [mestre.campanha?.nome === 'Protocolo Morana' && mestre.mundo === 'protocolo-morana' && jogador.aberta && jogador.campanha?.nome === 'Night City, 2077' && !('mundo' in jogador) && !estranho.aberta && !estranho.campanha && !visitante.aberta && /;\s*Secure/i.test(cookieInteiro),
        JSON.stringify({ mestre: mestre.campanha?.nome, jogador: [jogador.aberta, jogador.campanha?.nome], estranho: [estranho.aberta, estranho.usuarios], visitante: visitante.aberta, cookieSeguro: /;\s*Secure/i.test(cookieInteiro) })];
    });
    await r.passo('Foundry do mestre: CORS com credenciais para mesa.exemplo.com, e o cookie conta como mestre', async () => {
      const resposta = await fetch(`${base}/api/personagens`, { headers: { Origin: 'https://mesa.exemplo.com', cookie } });
      const outra = await fetch(`${base}/api/personagens`, { headers: { Origin: 'https://site-estranho.example' } });
      const dadosLista = await resposta.json();
      return [resposta.headers.get('access-control-allow-origin') === 'https://mesa.exemplo.com' && resposta.headers.get('access-control-allow-credentials') === 'true' && dadosLista.papel === 'mestre' && !outra.headers.get('access-control-allow-origin'), `origem ${resposta.headers.get('access-control-allow-origin')} · papel ${dadosLista.papel}`];
    });

    // ---------- Na tela ----------
    // A barra lateral mostra a mesa (e, para o mestre, o servidor); entrar, sair e a versão ficam no menu da conta.
    const textoDe = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)})?.textContent || '').replace(/\\s+/g, ' ')`);
    const menuDaConta = async () => {
      await edge.evaluate(`document.querySelector('.account-button').click()`);
      await edge.sleep(300);
      const texto = await textoDe('.account-menu');
      await edge.evaluate(`document.querySelector('.account-button').click()`);
      return texto;
    };
    await r.passo('jogador: barra lateral mostra a mesa aberta e o link; o menu da conta tem "Entrar como mestre"', async () => {
      await edge.ir(`${base}/`, 1500);
      const texto = await textoDe('#side-status');
      const link = await edge.evaluate(`document.querySelector('#side-status .table-link')?.href || ''`);
      const menu = await menuDaConta();
      return [/Mesa aberta \/\/ 2 conectados/.test(texto) && link === 'https://mesa.exemplo.com/' && /Entrar como mestre/.test(menu), `${texto} · ${link} · menu: ${menu}`];
    });
    await edge.shot('barra-jogador');
    await r.passo('tela /mestre: com a senha, abre a wiki do mestre; o menu da conta tem "Sair" e a versão', async () => {
      await edge.send('Page.navigate', { url: `${base}/mestre` });
      await edge.sleep(1200);
      await edge.evaluate(`(() => { document.getElementById('senha').value = ${JSON.stringify(SENHA)}; document.getElementById('login').requestSubmit(); })()`);
      for (let i = 0; i < 40 && !(await edge.evaluate(`!!(window.wikiApp && document.querySelector('#content h2') && /Mestre/.test(document.querySelector('.account-button')?.textContent || '') && document.getElementById('side-status'))`).catch(() => false)); i++) await edge.sleep(200);
      const texto = await textoDe('#side-status');
      const menu = await menuDaConta();
      const titulo = await edge.evaluate('document.title');
      return [!/Jogadores/.test(titulo) && /Sair do modo mestre/.test(menu) && /No ar: [0-9a-f]{7,}/.test(menu) && /Baixar backup/.test(menu) && /Servidor: backup .*módulo esperando a mesa vazia/.test(texto), `${titulo} · ${texto} · menu: ${menu}`];
    });
    await edge.shot('barra-mestre');
    await r.passo('barra lateral do mestre: "Foundry 12 · 14" com o 12 aceso; o clique no 14 confirma, avisa dos 2 conectados e confirma de novo; a barra acende o 14', async () => {
      const botoes = () => edge.evaluate(`[...document.querySelectorAll('[data-table-switch]')].map(b => b.dataset.tableSwitch + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join()`);
      const antes = await botoes();
      const popup = async () => {
        for (let i = 0; i < 25 && !(await edge.evaluate(`!!document.querySelector('dialog.popup[open] [data-popup-ok]')`)); i++) await edge.sleep(200);
        const texto = await textoDe('dialog.popup[open]');
        await edge.evaluate(`document.querySelector('dialog.popup[open] [data-popup-ok]')?.click()`);
        await edge.sleep(400);
        return texto;
      };
      await edge.evaluate(`document.querySelector('[data-table-switch="14"]').click()`);
      const primeira = await popup();
      const segunda = await popup();
      for (let i = 0; i < 40 && !/14\*/.test(await botoes()); i++) await edge.sleep(500);
      const depois = await botoes();
      await edge.shot('barra-mestre-troca');
      // Volta ao 12 pela API (os passos abaixo não olham a versão).
      await fetch(`${base}/api/mestre/mesa`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ foundry: 12, forcar: true }) });
      return [antes === '12*,14' && /Foundry 12 desliga e o Foundry 14 liga/.test(primeira) && /2 pessoas conectadas/.test(segunda) && depois === '12,14*', JSON.stringify({ antes, primeira, segunda, depois })];
    });
    await r.passo('página Campanhas: oferece ligar o mundo aberto no Foundry à campanha, com um clique', async () => {
      await edge.evaluate(`wikiApp.openPage('campanhas')`);
      for (let i = 0; i < 25 && !(await edge.evaluate(`!!document.querySelector('[data-cp-world]')`)); i++) await edge.sleep(200);
      const botao = await edge.evaluate(`(document.querySelector('[data-cp-id="morana"] [data-cp-world]') || {}).textContent || ''`);
      await edge.evaluate(`document.querySelector('[data-cp-id="morana"] [data-cp-world]').click()`);
      for (let i = 0; i < 30 && !(await edge.evaluate(`!!(window.wikiApp && document.querySelector('#cp-list [data-cp-id]'))`).catch(() => false)); i++) await edge.sleep(250);
      await edge.sleep(600);
      const ligado = (await (await fetch(`${base}/api/campanhas/morana`, { headers: { cookie } })).json()).campanha?.mundo;
      await fetch(`${base}/api/campanhas/morana`, { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ mundo: '' }) });
      return [/protocolo-morana/.test(botao) && ligado === 'protocolo-morana', `botão "${botao}" · gravado: ${ligado}`];
    });
    await r.passo('mesa fechada: o Foundry sem mundo aparece como "sem mundo aberto"', async () => {
      mesa = { active: false, world: null, users: 0 };
      await edge.sleep(16000); // o servidor guarda o estado por 15 s
      await edge.evaluate(`fetch('api/estado').then(r => r.json())`);
      await edge.ir(`${base}/`, 1200);
      const texto = (await edge.evaluate(`document.getElementById('side-status')?.textContent || ''`)).replace(/\s+/g, ' ');
      return [/sem mundo aberto/.test(texto), texto];
    });
    await r.passo('"Sair do modo mestre" (no menu da conta) volta para a visão dos jogadores', async () => {
      await edge.evaluate(`document.querySelector('.account-button').click()`);
      await edge.sleep(300);
      await edge.evaluate(`document.querySelector('[data-gm-logout]').click()`);
      for (let i = 0; i < 30 && !/Jogadores/.test(await edge.evaluate('document.title').catch(() => '')); i++) await edge.sleep(200);
      return [/Jogadores/.test(await edge.evaluate('document.title')), await edge.evaluate('document.title')];
    });
  } finally {
    if (servidor) servidor.kill();
    foundry.close();
    await edge.sleep(400);
    try { fs.rmSync(dados, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
};
