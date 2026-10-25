// O NetWire de ponta a ponta: o jogador (selo, conversa, resposta assinada, canal só de leitura, a mensagem que chega
// na hora, as Não lidas do Início), as teclas e a paleta (Ctrl+K), e o mestre (Esperando você, rascunho e entrega sem a
// nota, a IA nos dois provedores com uma API falsa, excluir a mensagem do jogador). Servidor e pasta de dados só deste
// cenário; o jogador chega "pelo túnel"; a API de IA falsa responde no formato da Anthropic e no da Interactions do
// Google, nesta máquina (nada sai, nada é cobrado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { subir } = require('../lib/servidores');
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, r }) => {
  const porta = 8775;
  const portaIa = 8776;
  const base = `http://127.0.0.1:${porta}`;
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-netwire-'));
  const TUNEL = { 'CF-Connecting-IP': '203.0.113.20' };
  const post = (caminho, body, headers = {}) => fetch(base + caminho, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(resposta => resposta.json());
  const ev = expressao => edge.evaluate(expressao);
  const texto = seletor => ev(`(document.querySelector(${JSON.stringify(seletor)})?.textContent || '').replace(/\\s+/g, ' ').trim()`);
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { if (await ev(expressao).catch(() => false)) return true; await edge.sleep(250); } return false; };
  const tecla = (key, extra = {}) => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true, ...${JSON.stringify(extra)} }))`);
  const confirmar = async () => { await esperar(`!!document.querySelector('dialog[open] [data-popup-ok]')`, 20); await ev(`document.querySelector('dialog[open] [data-popup-ok]').click()`); };

  // A API de IA falsa: guarda o que recebe e responde com um rascunho no formato de quem foi chamado.
  const recebidos = [];
  const rascunho = quem => JSON.stringify({ mensagens: [{ autor: 'Wakako Okada', texto: `Rascunho do ${quem}: amanhã, 22h.`, nota_para_o_mestre: `NOTA-DA-IA-${quem}` }] });
  const ia = http.createServer((pedido, resposta) => {
    let corpo = '';
    pedido.on('data', parte => { corpo += parte; });
    pedido.on('end', () => {
      const json = JSON.parse(corpo);
      recebidos.push({ url: pedido.url, headers: pedido.headers, body: json });
      resposta.writeHead(200, { 'Content-Type': 'application/json' });
      resposta.end(JSON.stringify(pedido.url === '/v1beta/interactions'
        ? { id: 'x', model: json.model, status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: rascunho('Gemini') }] }], usage: { total_input_tokens: 7000, total_cached_tokens: 6000, total_output_tokens: 150, total_thought_tokens: 60 } }
        : { model: json.model, stop_reason: 'end_turn', content: [{ type: 'text', text: rascunho('Claude') }], usage: { input_tokens: 900, cache_creation_input_tokens: 6200, cache_read_input_tokens: 0, output_tokens: 180 } }));
    });
  });
  await new Promise(pronto => ia.listen(portaIa, '127.0.0.1', pronto));

  let servidor = null;
  try {
    servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados, ANTHROPIC_API_KEY: 'chave-de-teste', ANTHROPIC_BASE_URL: `http://127.0.0.1:${portaIa}`, GEMINI_API_KEY: 'chave-gemini-de-teste', GEMINI_BASE_URL: `http://127.0.0.1:${portaIa}` });
    const conta = (await post('/api/contas', { nome: 'Ana' })).conta;
    const entrar = await fetch(`${base}/api/entrar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...TUNEL }, body: JSON.stringify({ codigo: conta.codigo }) });
    const cookie = entrar.headers.get('set-cookie').split(';')[0];
    await post('/api/personagens', { nome: 'Ricky', apelido: 'Mão Boba', role: 'medtech', stats: { EMP: 6 } }, { ...TUNEL, Cookie: cookie });
    const kabuki = (await post('/api/netwire/canais?campanha=morana', { nome: 'kabuki', tipo: 'feed', contato: { nome: 'Kabuki', descricao: 'O bairro' } })).canal;
    const wakako = (await post('/api/netwire/canais?campanha=morana', { nome: 'wakako', tipo: 'direto', contato: { nome: 'Wakako Okada', descricao: 'Fixer · Japantown' }, aceitaResposta: true, para: [conta.id] })).canal;
    await post('/api/netwire/mensagens', { campanha: 'morana', canal: kabuki.id, texto: 'Viram o apagão?', estado: 'entregue', autor: { nome: 'Vendedor de rua' } });

    // ---------------- Jogador ----------------
    await edge.send('Network.setBypassServiceWorker', { bypass: true });
    await edge.send('Network.setExtraHTTPHeaders', { headers: TUNEL });
    await edge.ir(`${base}/jogadores.html`, 800);
    await ev(`fetch('api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: ${JSON.stringify(conta.codigo)} }) })`);
    await esperar(`fetch('api/eu').then(r => r.json()).then(eu => eu.papel === 'jogador')`);
    // Outro endereço: só trocar o "#" não recarregaria a página (e ela ficaria com a identidade de visitante).
    await edge.ir(`${base}/jogadores.html?entrou=1`, 1500);
    await esperar('!!window.netwire');
    await edge.sleep(1200); // a primeira leitura marca tudo como lido

    await r.passo('jogador: sem escolher nada, a wiki abre no tema 2077; o cartão do Início mostra a Humanidade', async () => {
      const tema = await ev('document.documentElement.dataset.tema');
      await esperar(`!!document.querySelector('#pv-me .pv-me-hum')`, 20);
      const humanidade = await texto('#pv-me .pv-me-hum');
      return [tema === '2077' && /60\/60/.test(humanidade), `tema ${tema} · "${humanidade}"`];
    });
    await r.passo('jogador: recado novo ganha selo no menu, na aba Mensagens do topo e no título da aba do navegador', async () => {
      await post('/api/netwire/mensagens', { campanha: 'morana', canal: wakako.id, texto: 'Tenho um trabalho em Japantown.', estado: 'entregue' });
      const menu = await esperar(`document.querySelector('.nav-item[data-page="pvMensagens"] .nav-badge')?.textContent === '1'`, 30);
      const aba = await texto('[data-top-tab="mensagens"] .top-tab-badge');
      const titulo = await ev('document.title');
      return [menu && aba === '1' && titulo.startsWith('(1) '), `menu ${menu} · aba "${aba}" · título "${titulo}"`];
    });
    await r.passo('jogador: a aba Mensagens abre a conversa com novidade, e abrir tira o selo', async () => {
      await ev(`document.querySelector('[data-top-tab="mensagens"]').click()`);
      await esperar(`!!document.querySelector('[data-nw-feed]')`);
      const titulo = await texto('.nw-feed .nw-title');
      const semSelo = await esperar(`!document.querySelector('.nav-item[data-page="pvMensagens"] .nav-badge')`, 20);
      return [/Wakako/.test(titulo) && semSelo, `"${titulo}" · selo saiu ${semSelo}`];
    });
    await r.passo('jogador: a resposta aparece na conversa, assinada pelo personagem', async () => {
      await ev(`(() => { const t = document.querySelector('[data-nw-texto]'); t.value = 'Topo. Quanto paga?'; t.form.requestSubmit(); })()`);
      const ok = await esperar(`[...document.querySelectorAll('.nw-msg.nw-mine')].some(m => /Topo/.test(m.textContent) && /Mão Boba/.test(m.textContent))`, 20);
      return [ok, ''];
    });
    await r.passo('jogador: canal da cidade só de leitura; o endereço guarda o canal', async () => {
      await ev(`document.querySelector('[data-nw-canal="${kabuki.id}"]').click()`);
      await edge.sleep(300);
      const semCampo = await ev(`!document.querySelector('[data-nw-texto]')`);
      const endereco = await ev('decodeURIComponent(location.hash)');
      return [semCampo && endereco === `#pvMensagens/${kabuki.id}`, endereco];
    });
    await r.passo('na hora (SSE): a mensagem entregue aparece na conversa aberta em poucos segundos', async () => {
      await ev(`document.querySelector('[data-nw-canal="${wakako.id}"]').click()`);
      await edge.sleep(500);
      const antes = Date.now();
      await post('/api/netwire/mensagens', { campanha: 'morana', canal: wakako.id, texto: 'Amanhã, 22h, no Lizzie\'s.', estado: 'entregue' });
      const chegou = await esperar(`/Lizzie/.test(document.querySelector('[data-nw-feed]')?.textContent || '')`, 24);
      const ms = Date.now() - antes;
      return [chegou && ms < 6000, `${ms} ms`];
    });
    await r.passo('Início: a conversa nova aparece nas Não lidas, abre a conversa e sai depois de lida', async () => {
      await ev(`wikiApp.openPage('pvHome')`);
      await edge.sleep(400);
      await post('/api/netwire/mensagens', { campanha: 'morana', canal: wakako.id, texto: 'E venha só.', estado: 'entregue' });
      const apareceu = await esperar(`/venha só/.test(document.querySelector('.pv-inbox')?.textContent || '')`, 24);
      await ev(`document.querySelector('.pv-inbox-item[data-page="pvMensagens"]').click()`);
      await edge.sleep(500);
      const abriu = await ev(`wikiApp.currentPage() === 'pvMensagens' && /Wakako/.test(document.querySelector('.nw-feed .nw-title')?.textContent || '')`);
      await ev(`wikiApp.openPage('pvHome')`);
      await edge.sleep(400);
      const saiu = !/venha só/.test(await texto('.pv-inbox'));
      return [apareceu && abriu && saiu, `apareceu ${apareceu} · abriu ${abriu} · saiu ${saiu}`];
    });
    await r.passo('teclas: 3 abre Mensagens; "/" continua indo para a busca', async () => {
      await tecla('3');
      await edge.sleep(400);
      const mensagens = await ev(`wikiApp.currentPage() === 'pvMensagens'`);
      await tecla('/');
      await edge.sleep(150);
      const busca = await ev(`document.activeElement === document.getElementById('search')`);
      await ev('document.activeElement.blur()');
      return [mensagens && busca, `Mensagens ${mensagens} · busca ${busca}`];
    });
    await r.passo('paleta (Ctrl+K): "comb" + Enter abre Combate; a última linha é a busca na wiki', async () => {
      await tecla('k', { ctrlKey: true });
      const abriu = await esperar(`document.querySelector('.nw-palette').open`, 10);
      await ev(`(() => { const i = document.querySelector('.nw-palette-input'); i.value = 'comb'; i.dispatchEvent(new Event('input')); })()`);
      const primeiro = await texto('.nw-palette-list [aria-selected="true"] span');
      const ultima = await ev(`[...document.querySelectorAll('.nw-palette-list li span')].pop()?.textContent || ''`);
      await ev(`document.querySelector('.nw-palette-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
      await edge.sleep(500);
      const pagina = await ev('wikiApp.currentPage()');
      return [abriu && primeiro === 'Combate' && /^Buscar na wiki/.test(ultima) && pagina === 'combat', `${primeiro} · ${ultima} · ${pagina}`];
    });
    await edge.celular(true);
    await r.passo('celular: Mensagens sem rolagem lateral, com a barra de baixo', async () => {
      await edge.ir(`${base}/jogadores.html?celular=1#pvMensagens/${wakako.id}`, 1500);
      await esperar(`!!document.querySelector('[data-nw-feed]')`);
      const barra = await ev(`document.querySelector('.top-tabs').getBoundingClientRect().bottom === innerHeight`);
      return [(await semRolagemLateral(edge)) && barra, `barra de baixo ${barra}`];
    });
    await edge.celular(false);
    // O jogador responde por último: a conversa passa a esperar o mestre.
    await post('/api/netwire/mensagens', { canal: wakako.id, texto: 'Fechado. Estarei lá.' }, { ...TUNEL, Cookie: cookie });

    // ---------------- Mestre ----------------
    await edge.send('Network.setExtraHTTPHeaders', { headers: {} });
    await edge.ir(`${base}/#caixa`, 1500);
    await esperar(`!!document.querySelector('[data-nw-view="esperando"]')`);
    await edge.sleep(400);
    await r.passo('mestre: a resposta do jogador põe a conversa em Esperando você', async () => {
      const selo = await texto('[data-nw-view="esperando"] .nw-badge');
      return [selo === '1', `selo "${selo}"`];
    });
    await r.passo('mestre: exclui a mensagem do jogador; some para todos e a conversa deixa de esperar', async () => {
      await ev(`document.querySelector('[data-nw-view="esperando"]').click()`);
      await edge.sleep(300);
      await ev(`[...document.querySelectorAll('.nw-waiting .nw-card')].find(c => /Fechado/.test(c.textContent)).querySelector('[data-nw-delete]').click()`);
      const aviso = await esperar(`/nem quem escreveu/.test(document.querySelector('dialog[open]')?.textContent || '')`, 20);
      await confirmar();
      const parou = await esperar(`!document.querySelector('[data-nw-view="esperando"] .nw-badge')`, 20);
      const visao = await (await fetch(`${base}/api/netwire`, { headers: { ...TUNEL, Cookie: cookie } })).text();
      return [aviso && parou && !/Fechado\. Estarei lá/.test(visao), `aviso ${aviso} · parou de esperar ${parou}`];
    });
    // O quadro da IA fica em Rascunhos.
    await ev(`document.querySelector('[data-nw-view="rascunhos"]').click()`);
    await esperar(`!!document.querySelector('[data-nw-ai]')`, 20);
    await r.passo('mestre: o seletor da IA tem os 3 modelos do Claude e os 3 do Gemini', async () => {
      const modelos = await ev(`[...document.querySelectorAll('[data-nw-ai-field="modelo"] option')].map(o => o.value)`);
      return [modelos.length === 6 && modelos.filter(id => id.startsWith('gemini-')).length === 3, modelos.join(', ')];
    });
    const pedirIa = async modelo => {
      const antes = await ev(`document.querySelectorAll('.nw-card').length`);
      await ev(`(() => { const f = document.querySelector('[data-nw-ai]'); f.querySelector('[data-nw-ai-field="modelo"]').value = ${JSON.stringify(modelo)}; f.querySelector('[data-nw-ai-field="quantidade"]').value = '1'; f.requestSubmit(); })()`);
      return esperar(`document.querySelectorAll('.nw-card').length > ${antes}`, 40);
    };
    await r.passo('IA: um rascunho pelo Gemini e outro pelo Claude, cada um na sua API, com a nota e o custo', async () => {
      const gemini = await pedirIa('gemini-3.8-flash');
      const claude = await pedirIa('claude-haiku-5-5');
      const caixa = await texto('.nw-gm-main');
      const [doGoogle, daAnthropic] = recebidos;
      const certo = doGoogle && doGoogle.url === '/v1beta/interactions' && doGoogle.headers['x-goog-api-key'] === 'chave-gemini-de-teste' && doGoogle.body.store === false
        && daAnthropic && daAnthropic.url === '/v1/messages' && daAnthropic.headers['x-api-key'] === 'chave-de-teste';
      return [gemini && claude && certo && /IA: gemini-3\.8-flash/.test(caixa) && /IA: claude-haiku-5-5/.test(caixa), `Gemini ${gemini} · Claude ${claude} · APIs ${Boolean(certo)}`];
    });
    await r.passo('IA: entregar o rascunho chega ao jogador sem a nota da IA', async () => {
      await ev(`[...document.querySelectorAll('.nw-card')].find(c => /Rascunho do Gemini/.test(c.textContent)).querySelector('[data-nw-deliver]').click()`);
      await edge.sleep(900);
      const visao = await (await fetch(`${base}/api/netwire`, { headers: { ...TUNEL, Cookie: cookie } })).text();
      return [/Rascunho do Gemini/.test(visao) && !/NOTA-DA-IA|IA: gemini/.test(visao), ''];
    });
    await edge.shot('caixa');
  } finally {
    if (servidor) servidor.kill();
    await new Promise(pronto => ia.close(pronto));
    await edge.sleep(300);
    fs.rmSync(dados, { recursive: true, force: true });
  }
};
