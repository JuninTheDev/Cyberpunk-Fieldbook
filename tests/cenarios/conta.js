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
      // O nome do personagem é o título da página da ficha.
      await esperar(`/Rin/.test(document.querySelector('#content .page-head h2')?.textContent || '')`);
      const ficha = await texto('#content');
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
      // O "já visto" vai para a conta logo depois (no teste, o pedido que sai ao fechar a página não leva o cabeçalho do
      // túnel, então espera o envio normal).
      await edge.sleep(1200);
      await edge.ir(`${base}/jogadores.html`, 1200);
      const depois = await edge.evaluate(`!!document.querySelector('.nav-item[data-page="pvPeople"] .nav-badge')`);
      const vistos = JSON.stringify((await (await fetch(`${base}/api/eu/preferencias`, { headers: { ...TUNEL, Cookie: cookie } })).json()).valores);
      return [chegou && novos.join() === 'Mina Kuroda' && !selo && !depois, `selo chegou ${chegou} · novos: ${novos.join(', ')} · selo depois de abrir ${selo} · depois de recarregar ${depois} · já visto na conta: ${vistos.includes('mina')}`];
    });

    // ---------------- Sessões, mapa, pedidos ----------------
    const publicarTudo = ({ npcs = [], lugares = [], sessoes = [] }) => post('/api/campanhas/morana/publicar', { mestre: { resumo: 'Resumo do teste', npcs, lugares, noticias: [], sessoes } });
    const npcs = [{ id: 'vega', nome: 'Vega', revelado: true }, { id: 'mina', nome: 'Mina Kuroda', revelado: true }];
    const sessoes = [{ id: 's1', titulo: 'Sessão 01: A Maleta', data: 'outubro', texto: 'Primeira.', publicada: true }, { id: 's2', titulo: 'Sessão 02: O Hospital', texto: 'Segunda.', publicada: true }, { id: 's3', titulo: 'Rascunho do mestre', publicada: false }];
    await r.passo('sessões: o mestre publica em ordem; a página Sessões mostra só as publicadas; a última está no Resumo e leva até ela', async () => {
      await edge.evaluate(`wikiApp.openPage('pvHome')`);
      await publicarTudo({ npcs, sessoes });
      const selo = await esperar(`document.querySelector('.nav-item[data-page="pvSessions"] .nav-badge')?.textContent === '2'`, 90);
      const ultima = await texto('[data-toc="Última sessão"]');
      await edge.evaluate(`document.querySelector('[data-toc="Última sessão"] [data-page="pvSessions"]').click()`);
      await edge.sleep(600);
      const titulos = await edge.evaluate(`[...document.querySelectorAll('#content .section h3')].map(h => h.firstChild.textContent.trim())`);
      const endereco = await edge.evaluate('decodeURIComponent(location.hash)');
      return [selo && /Sessão 02: O Hospital/.test(ultima) && titulos.join() === 'Sessão 01: A Maleta,Sessão 02: O Hospital' && /pvSessions\/sessao-02/.test(endereco), `selo ${selo} · última "${ultima}" · ${titulos.join(' | ')} · ${endereco}`];
    });
    await r.passo('mapa: o lugar novo aparece em outra cor, com "(novo)" e a legenda explicando', async () => {
      await edge.evaluate(`wikiApp.openPage('pvHome')`);
      await publicarTudo({ npcs, sessoes, lugares: [{ id: 'pachinko', nome: 'Pachinko', distrito: 'Japantown', x: 2650, y: 1800, texto: '', revelado: true }] });
      await esperar(`document.querySelector('.nav-item[data-page="pvMap"] .nav-badge')?.textContent === '1'`, 90);
      await edge.evaluate(`wikiApp.openPage('pvMap')`);
      await edge.sleep(700);
      const mapa = await edge.evaluate(`({ categoria: window.playerMapData.markers[0].category, titulo: window.playerMapData.markers[0].title, legenda: document.getElementById('map-legend').textContent, cor: document.querySelector('.map-marker-dot')?.style.background })`);
      return [mapa.categoria === 'novo' && /\(novo\)/.test(mapa.titulo) && /Novo desde a sua última visita/.test(mapa.legenda), JSON.stringify(mapa)];
    });
    await r.passo('pedidos: o mestre aprova; o botão da conta mostra o número e avisa; abrir a Loja do personagem tira o número', async () => {
      // A Rin vai para o Foundry (a volta do importador): a loja dela vira a de pedidos.
      await fetch(`${base}/api/personagens/${rin.id}/foundry`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ator: 'atorRin', nomeAtor: 'Rin' }) });
      const pedido = (await (await post(`/api/personagens/${rin.id}/pedidos`, { itens: [{ id: 'core_weapons:heavy-pistol', qtd: 1 }] }, { ...TUNEL, Cookie: cookie })).json()).pedido;
      await edge.evaluate(`window.playerAccount.refresh()`);
      await edge.sleep(500);
      const antes = await edge.evaluate(`!!document.querySelector('.account-dot')`);
      await post(`/api/personagens/${rin.id}/pedidos/${pedido.id}/aprovar`, {});
      await edge.evaluate(`window.playerAccount.refresh()`);
      await esperar(`document.querySelector('.account-dot')?.textContent === '1'`);
      const numero = await texto('.account-dot');
      const aviso = await edge.evaluate(`[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')`);
      await abrirMenu();
      const noMenu = await texto(`[data-account-pick="${rin.id}"] .account-orders`);
      await edge.evaluate(`document.querySelector('.account-button').click()`);
      await edge.evaluate(`wikiApp.openPage('loja', { section: ${JSON.stringify(rin.id)} })`);
      await edge.sleep(500);
      const depois = await edge.evaluate(`!!document.querySelector('.account-dot')`);
      return [!antes && numero === '1' && /Rin: pedido aprovado/.test(aviso) && /pedido aprovado/.test(noMenu) && !depois, `antes ${antes} · número ${numero} · aviso "${aviso}" · menu "${noMenu}" · depois da Loja ${depois}`];
    });
    await r.passo('fixar: a página vai para Fixadas no topo da barra (nas duas abas), o aparelho lembra; tirar remove', async () => {
      await edge.evaluate(`wikiApp.openPage('combat')`);
      await edge.sleep(300);
      await edge.evaluate(`document.querySelector('[data-pin="combat"]').click()`);
      const naRegras = await edge.evaluate(`!!document.querySelector('.nav-pinned .nav-item[data-page="combat"]')`);
      await edge.evaluate(`document.querySelector('#tab-campaigns').click()`);
      const naCampanha = await edge.evaluate(`!!document.querySelector('.nav-pinned .nav-item[data-page="combat"]')`);
      await edge.ir(`${base}/jogadores.html#combat`, 1200);
      const lembrou = await edge.evaluate(`!!document.querySelector('.nav-pinned .nav-item[data-page="combat"]') && document.querySelector('[data-pin="combat"]').getAttribute('aria-pressed') === 'true'`);
      await edge.evaluate(`document.querySelector('[data-pin="combat"]').click()`);
      const tirou = await edge.evaluate(`!document.querySelector('.nav-pinned')`);
      return [naRegras && naCampanha && lembrou && tirou, `na aba Regras ${naRegras} · na aba Campanha ${naCampanha} · depois de recarregar ${lembrou} · tirou ${tirou}`];
    });

    await r.passo('preferências acompanham a conta: a página fixada num aparelho aparece em outro (aparelho limpo)', async () => {
      await edge.evaluate(`wikiApp.openPage('screen')`);
      await edge.sleep(300);
      await edge.evaluate(`document.querySelector('[data-pin="screen"]').click()`);
      await edge.sleep(1500); // o servidor recebe logo depois da mudança
      await edge.evaluate('localStorage.clear()');
      await edge.ir(`${base}/jogadores.html`, 1200);
      const voltou = await esperar(`!!document.querySelector('.nav-pinned .nav-item[data-page="screen"]')`);
      const servidor = (await (await fetch(`${base}/api/eu/preferencias`, { headers: { ...TUNEL, Cookie: cookie } })).json()).valores['night-city-jogadores:fixadas'];
      await edge.evaluate(`wikiApp.openPage('screen')`);
      await edge.sleep(300);
      await edge.evaluate(`document.querySelector('[data-pin="screen"]').click()`);
      return [voltou && /screen/.test(servidor || ''), `voltou do servidor ${voltou} · no servidor ${servidor}`];
    });
    await r.passo('ficha: as anotações salvam sozinhas no servidor (só o dono e o mestre)', async () => {
      await edge.evaluate(`wikiApp.openPage('ficha', { section: ${JSON.stringify(rin.id)} })`);
      await esperar(`!!document.querySelector('[data-cc-notes]')`);
      await edge.evaluate(`(() => { const t = document.querySelector('[data-cc-notes]'); t.value = 'Brakk quer 500eb até sexta.'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await esperar(`/Salvo às/.test(document.querySelector('[data-cc-notes-status]').textContent)`);
      const salvo = (await (await fetch(`${base}/api/personagens/${rin.id}/anotacoes`, { headers: { ...TUNEL, Cookie: cookie } })).json()).anotacoes;
      return [salvo && salvo.texto === 'Brakk quer 500eb até sexta.' && salvo.por === 'Ana', JSON.stringify(salvo)];
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
    await r.passo('mestre: relógios e bloco no servidor (iguais em outro aparelho); o relógio marcado aparece aos jogadores; o bloco vira rascunho de sessão', async () => {
      const mesa = async () => (await fetch(`${base}/api/campanhas/morana/mesa`)).json();
      await edge.ir(`${base}/#notes`, 1500);
      // Os relógios saem da base da campanha; depois do recomeço da história (2026-10-20), ela pode não ter nenhum: aí o
      // passo confere só o bloco.
      await esperar(`!!window.campaignBase.base && !document.getElementById('session-note').disabled`);
      const chave = await edge.evaluate(`(window.campaignBase.base.relogios[0] || {}).chave || ''`);
      if (chave) {
        await esperar(`!!document.querySelector('#clock-${chave} [data-clock-index]')`);
        await edge.evaluate(`document.querySelector('#clock-${chave} [data-clock-index="2"]').click()`);
        await edge.evaluate(`(() => { const c = document.querySelector('[data-clock-public="${chave}"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      }
      await edge.evaluate(`(() => { const t = document.getElementById('session-note'); t.value = 'Jay deve 500eb ao Brakk. O grupo achou a maleta.'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await esperar(`/Salvo no servidor/.test(document.getElementById('note-status').textContent)`);
      const gravada = await mesa();
      const visao = (await (await fetch(`${base}/api/visao`, { headers: { ...TUNEL, Cookie: cookie } })).json()).relogios;
      await edge.evaluate(`document.querySelector('[data-session-draft]').click()`);
      await esperar(`[...document.querySelectorAll('.toast')].some(t => /Rascunho/.test(t.textContent))`);
      const sessoesAgora = (await (await fetch(`${base}/api/campanhas/morana/publicar`)).json()).sessoes;
      const rascunho = sessoesAgora[sessoesAgora.length - 1];
      // Outro aparelho do mestre (navegador limpo): os relógios e o bloco vêm do servidor.
      await edge.evaluate('localStorage.clear()');
      await edge.ir(`${base}/#notes`, 1500);
      await esperar(`document.getElementById('session-note').value.length > 0`);
      const outro = await edge.evaluate(`({ marcados: document.querySelectorAll('#clock-${chave || 'nenhum'} [aria-pressed="true"]').length, bloco: document.getElementById('session-note').value, publico: !!document.querySelector('[data-clock-public="${chave}"]')?.checked })`);
      const relogio = !chave ? !visao.length : gravada.relogios[chave] === 3 && visao.length === 1 && visao[0].valor === 3 && outro.marcados === 3 && outro.publico;
      return [relogio && /maleta/.test(gravada.notas) && rascunho.publicada === false && /maleta/.test(rascunho.texto) && /maleta/.test(outro.bloco),
        `servidor: ${chave ? `${chave} ${gravada.relogios[chave]}` : 'sem relógio na base'}, bloco "${gravada.notas.slice(0, 20)}…" · jogadores veem ${JSON.stringify(visao.map(c => `${c.nome} ${c.valor}`))} · rascunho "${rascunho.titulo}" publicada ${rascunho.publicada} · outro aparelho ${JSON.stringify(outro).slice(0, 80)}`];
    });
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
