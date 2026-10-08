// A conta no canto de cima e a barra lateral: entrar pelo menu, o personagem em uso (o retrato no botão, a Ficha e a
// Loja abrem nele), novo personagem, sair; novidades com selo no menu; grupos que recolhem, barra compacta e a gaveta
// do celular; o menu do mestre. Servidor e pasta de dados só deste cenário; o jogador chega "pelo túnel".
const fs = require('fs');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, r }) => {
  const porta = 8773;
  const base = `http://127.0.0.1:${porta}`;
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-conta-'));
  const TUNEL = { 'CF-Connecting-IP': '203.0.113.8' };
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const post = async (caminho, body, headers = {}) => fetch(base + caminho, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)})?.textContent || '').replace(/\\s+/g, ' ').trim()`);
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao).catch(() => false)) return true; await edge.sleep(250); } return false; };
  const abrirMenu = async () => { if (await edge.evaluate(`document.querySelector('.account-menu').hidden`)) await edge.evaluate(`document.querySelector('.account-button').click()`); await edge.sleep(250); };
  let servidor = null;
  try {
    servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados });
    const conta = (await (await post('/api/contas', { nome: 'Ana' })).json()).conta;
    const cookie = (await post('/api/entrar', { codigo: conta.codigo }, TUNEL)).headers.get('set-cookie').split(';')[0];
    const criar = async nome => (await (await post('/api/personagens', { nome, role: nome === 'Rin' ? 'netrunner' : 'solo' }, { ...TUNEL, Cookie: cookie })).json()).personagem;
    const jay = await criar('Jay');
    const rin = await criar('Rin');
    await post(`/api/personagens/${rin.id}/retrato`, { imagem: PNG }, { ...TUNEL, Cookie: cookie });
    const publicar = npcs => post('/api/campanhas/morana/publicar', { mestre: { resumo: 'Resumo do teste', npcs: npcs.map(([id, nome]) => ({ id, nome, papel: '', texto: '', nota: '', revelado: true })), lugares: [], noticias: [] } });
    await publicar([['vega', 'Vega']]);

    // ---------------- Jogador ----------------
    await edge.send('Network.setBypassServiceWorker', { bypass: true });
    await edge.send('Network.setExtraHTTPHeaders', { headers: TUNEL });
    await edge.ir(`${base}/jogadores.html`, 1200);
    await r.passo('visitante: o botão diz Entrar; código errado avisa no menu; o certo entra e mostra o personagem', async () => {
      const antes = await texto('.account-button');
      await abrirMenu();
      const campo = await edge.evaluate(`!!document.querySelector('.account-menu input[name="codigo"]')`);
      await edge.evaluate(`(() => { const f = document.querySelector('[data-account-login]'); f.elements.codigo.value = 'NC-ERRO-0000'; f.requestSubmit(); })()`);
      await edge.sleep(600);
      const aviso = await texto('[data-account-msg]');
      await edge.evaluate(`(() => { const f = document.querySelector('[data-account-login]'); f.elements.codigo.value = ${JSON.stringify(conta.codigo)}; f.requestSubmit(); })()`);
      await edge.sleep(800);
      await esperar(`/Jay/.test(document.querySelector('.account-button')?.textContent || '')`);
      const depois = await texto('.account-button');
      return [/Entrar/.test(antes) && campo && /não encontrado/i.test(aviso) && /Jay/.test(depois) && /Ana/.test(depois), `antes "${antes}" · aviso "${aviso}" · depois "${depois}"`];
    });
    await r.passo('trocar de personagem no menu: o botão mostra o retrato do escolhido e lembra depois de recarregar', async () => {
      await abrirMenu();
      const lista = await edge.evaluate(`[...document.querySelectorAll('[data-account-pick]')].map(b => b.textContent.replace(/\\s+/g, ' ').trim())`);
      await edge.evaluate(`document.querySelector('[data-account-pick="${rin.id}"]').click()`);
      await edge.sleep(300);
      const agora = { nome: await texto('.account-button b'), retrato: await edge.evaluate(`!!document.querySelector('.account-button img')`) };
      await edge.ir(`${base}/jogadores.html`, 1200);
      await esperar(`/Rin/.test(document.querySelector('.account-button b')?.textContent || '')`);
      const recarregado = await texto('.account-button b');
      return [lista.length === 2 && agora.nome === 'Rin' && agora.retrato && recarregado === 'Rin', `lista ${lista.join(' | ')} · agora ${JSON.stringify(agora)} · depois de recarregar ${recarregado}`];
    });
    await r.passo('Ficha e Loja (no menu lateral) abrem no personagem em uso; o Resumo mostra "Seu personagem"', async () => {
      const resumo = await texto('#pv-me');
      await edge.evaluate(`document.querySelector('.nav-item[data-page="ficha"]').click()`);
      await esperar(`/Rin/.test(document.getElementById('cc-root')?.textContent || '')`);
      const ficha = await texto('#cc-root');
      await edge.evaluate(`document.querySelector('.nav-item[data-page="loja"]').click()`);
      await esperar(`!!document.querySelector('[data-shop-pc]')`);
      const loja = await edge.evaluate(`document.querySelector('[data-shop-pc]')?.value`);
      return [/Seu personagem/.test(resumo) && /Rin/.test(resumo) && /Rin/.test(ficha) && !/Jay/.test(ficha) && loja === rin.id, `resumo "${resumo.slice(0, 60)}" · ficha da Rin ${/Rin/.test(ficha) && !/Jay/.test(ficha)} · loja ${loja === rin.id ? 'Rin' : loja}`];
    });
    await r.passo('Personagens: o em uso fica marcado; Usar troca (e o botão de cima acompanha)', async () => {
      await edge.evaluate(`wikiApp.openPage('personagens')`);
      await esperar(`!!document.querySelector('[data-cc-card]')`);
      const marcado = await edge.evaluate(`document.querySelector('.cc-selected')?.dataset.ccCard`);
      await edge.evaluate(`document.querySelector('[data-cc-select="${jay.id}"]').click()`);
      await edge.sleep(300);
      const depois = { marcado: await edge.evaluate(`document.querySelector('.cc-selected')?.dataset.ccCard`), botao: await texto('.account-button b') };
      return [marcado === rin.id && depois.marcado === jay.id && depois.botao === 'Jay', `antes ${marcado === rin.id ? 'Rin' : marcado} · depois ${JSON.stringify(depois)}`];
    });
    await r.passo('novo personagem pelo menu: cria, abre o criador e fica em uso', async () => {
      await abrirMenu();
      await edge.evaluate(`document.querySelector('[data-account-new]').click()`);
      await esperar(`wikiApp.currentPage() === 'criador'`);
      await edge.sleep(800);
      const id = await edge.evaluate(`decodeURIComponent(location.hash).split('/')[1] || ''`);
      const emUso = await edge.evaluate(`window.playerAccount.selected()`);
      const lista = (await (await fetch(`${base}/api/personagens`, { headers: { ...TUNEL, Cookie: cookie } })).json()).personagens.length;
      return [/^[a-z0-9]{10}$/.test(id) && emUso === id && lista === 3, `criador #${id} · em uso ${emUso === id} · ${lista} personagens`];
    });
    await r.passo('novidades: pessoa nova publicada ganha selo no menu e "novo" na página; abrir tira o selo', async () => {
      await edge.evaluate(`wikiApp.openPage('pvHome')`);
      await publicar([['vega', 'Vega'], ['mina', 'Mina Kuroda']]);
      const chegou = await esperar(`document.querySelector('.nav-item[data-page="pvPeople"] .nav-badge')?.textContent === '1'`, 90);
      await edge.evaluate(`document.querySelector('.nav-item[data-page="pvPeople"]').click()`);
      await edge.sleep(400);
      const novos = await edge.evaluate(`[...document.querySelectorAll('#content .person')].filter(p => p.querySelector('.pv-new')).map(p => p.querySelector('h3').firstChild.textContent.trim())`);
      const selo = await edge.evaluate(`!!document.querySelector('.nav-item[data-page="pvPeople"] .nav-badge')`);
      await edge.ir(`${base}/jogadores.html`, 1200);
      const depois = await edge.evaluate(`!!document.querySelector('.nav-item[data-page="pvPeople"] .nav-badge')`);
      return [chegou && novos.join() === 'Mina Kuroda' && !selo && !depois, `selo chegou ${chegou} · novos: ${novos.join(', ')} · selo depois de abrir ${selo} · depois de recarregar ${depois}`];
    });

    // ---------------- Barra lateral ----------------
    await r.passo('grupo recolhido fica recolhido depois de recarregar; abrir uma página dele mostra o grupo', async () => {
      await edge.evaluate(`wikiApp.openPage('pvHome')`);
      await edge.evaluate(`[...document.querySelectorAll('.nav-group-toggle')].find(b => b.textContent.trim().startsWith('Personagens')).click()`);
      await edge.ir(`${base}/jogadores.html`, 1200);
      const recolhido = await edge.evaluate(`[...document.querySelectorAll('.nav-group')].find(g => g.querySelector('.nav-group-toggle').textContent.trim().startsWith('Personagens')).classList.contains('collapsed')`);
      const escondido = await edge.evaluate(`document.querySelector('.nav-item[data-page="loja"]').offsetParent === null`);
      await edge.evaluate(`wikiApp.openPage('loja')`);
      await edge.sleep(300);
      const aparece = await edge.evaluate(`document.querySelector('.nav-item[data-page="loja"]').offsetParent !== null`);
      return [recolhido && escondido && aparece, `recolhido ${recolhido} · loja escondida ${escondido} · aparece ao abrir ${aparece}`];
    });
    await r.passo('barra compacta: o ☰ alterna, a tecla [ também, e o aparelho lembra', async () => {
      const largura = () => edge.evaluate(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`);
      const cheia = await largura();
      await edge.evaluate(`document.querySelector('.nav-toggle').click()`);
      await edge.sleep(300);
      const compacta = await largura();
      const titulo = await edge.evaluate(`document.querySelector('.nav-item[data-page="pvPeople"]').title`);
      await edge.ir(`${base}/jogadores.html`, 1200);
      const lembrou = await edge.evaluate(`document.body.classList.contains('sidebar-compact')`);
      await edge.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true }))`);
      await edge.sleep(300);
      const voltou = await largura();
      await edge.shot('barra-compacta');
      return [cheia > 200 && compacta < 80 && titulo === 'Pessoas' && lembrou && voltou > 200, `cheia ${cheia}px · compacta ${compacta}px (dica "${titulo}") · lembrou ${lembrou} · com [ ${voltou}px`];
    });
    await r.passo('celular: o ☰ abre a gaveta; escolher uma página fecha; sem rolagem lateral', async () => {
      await edge.celular(true);
      await edge.ir(`${base}/jogadores.html`, 1200);
      const fora = await edge.evaluate(`document.querySelector('aside').getBoundingClientRect().right <= 0`);
      const conteudoNoTopo = await edge.evaluate(`document.getElementById('content').getBoundingClientRect().top < 120`);
      await edge.evaluate(`document.querySelector('.nav-toggle').click()`);
      await edge.sleep(400);
      const aberta = await edge.evaluate(`document.body.classList.contains('sidebar-open') && document.querySelector('aside').getBoundingClientRect().left >= 0`);
      await edge.shot('gaveta-celular');
      await edge.evaluate(`document.querySelector('.nav-item[data-page="pvPeople"]').click()`);
      await edge.sleep(400);
      const fechou = await edge.evaluate(`!document.body.classList.contains('sidebar-open') && wikiApp.currentPage() === 'pvPeople'`);
      const lateral = await semRolagemLateral(edge);
      await edge.celular(false);
      return [fora && conteudoNoTopo && aberta && fechou && lateral, `fechada no começo ${fora} · conteúdo logo abaixo da barra ${conteudoNoTopo} · abriu ${aberta} · fechou ao escolher ${fechou} · sem rolagem lateral ${lateral}`];
    });
    await r.passo('Sair (no menu da conta) volta a visitante', async () => {
      await abrirMenu();
      await edge.evaluate(`document.querySelector('[data-account-logout]').click()`);
      await esperar(`/Entrar/.test(document.querySelector('.account-button')?.textContent || '')`);
      const botao = await texto('.account-button');
      return [/Entrar/.test(botao), botao];
    });

    // ---------------- Mestre ----------------
    await edge.send('Network.setExtraHTTPHeaders', { headers: {} });
    await post('/api/campanhas', { nome: 'Mesa B' });
    await r.passo('mestre: o menu da conta troca de campanha e leva aos atalhos do mestre', async () => {
      await edge.ir(`${base}/`, 1500);
      await abrirMenu();
      const menu = await texto('.account-menu');
      await edge.evaluate(`document.querySelector('[data-account-campaign="mesa-b"]').click()`);
      await edge.sleep(800);
      const ativa = await edge.evaluate(`wikiApp.activeCampaign().id`);
      await abrirMenu();
      await edge.evaluate(`document.querySelector('[data-account-page="personagens"]').click()`);
      await edge.sleep(500);
      const pagina = await edge.evaluate(`wikiApp.currentPage()`);
      return [/Mestre/.test(await texto('.account-button')) && /Personagens e códigos/.test(menu) && /Mesa B/.test(menu) && ativa === 'mesa-b' && pagina === 'personagens', `menu "${menu.slice(0, 120)}" · ativa ${ativa} · página ${pagina}`];
    });
  } finally {
    await edge.send('Network.setExtraHTTPHeaders', { headers: {} }).catch(() => {});
    if (servidor) servidor.kill();
    await edge.sleep(400);
    try { fs.rmSync(dados, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
};
