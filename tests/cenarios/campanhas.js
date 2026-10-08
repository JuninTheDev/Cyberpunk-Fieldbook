// Campanhas ao mesmo tempo no mesmo universo: o que existia vira o Protocolo Morana sem os jogadores perceberem; cada
// jogador só vê as campanhas em que joga (nem pelo endereço direto); as Notícias de Night City são de todas; o mestre
// cria campanhas, publica em cada uma e leva personagens de uma para outra (crossover).
// Servidor e pasta de dados só deste cenário. Os jogadores chegam "pelo túnel" (cabeçalho CF-Connecting-IP).
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');

module.exports = async ({ edge, r }) => {
  const porta = 8772;
  const base = `http://127.0.0.1:${porta}`;
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-campanhas-'));
  // Antes das campanhas: um código, um personagem e as regras da loja sem campanha nenhuma.
  fs.writeFileSync(path.join(dados, 'contas-jogadores.json'), JSON.stringify({ contas: [{ id: 'legado2345', nome: 'Antigo', codigo: 'NC-LEGA-DO22', criado: '2026-01-01T00:00:00.000Z' }] }));
  fs.mkdirSync(path.join(dados, 'personagens'));
  fs.writeFileSync(path.join(dados, 'personagens', 'velho23456.json'), JSON.stringify({ id: 'velho23456', nome: 'Velho', dono: 'legado2345', versao: 1, criado: '2026-01-01T00:00:00.000Z', atualizado: '2026-01-01T00:00:00.000Z', foundry: null }));
  fs.writeFileSync(path.join(dados, 'regras-loja.json'), JSON.stringify({ teto: 777, esconder: ['exotica'], liberados: [], bloqueados: [] }));

  const TUNEL = { 'CF-Connecting-IP': '203.0.113.7' };
  const api = async (caminho, { method = 'GET', body, cookie, jogador = Boolean(cookie) } = {}) => {
    const resposta = await fetch(base + caminho, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jogador ? TUNEL : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const texto = await resposta.text();
    let dadosResposta = null;
    try { dadosResposta = JSON.parse(texto); } catch { /* texto puro */ }
    return { status: resposta.status, dados: dadosResposta, texto };
  };
  const idPublico = id => crypto.createHash('sha1').update(`fieldbook-campanha:${id}`).digest('hex').slice(0, 12);
  const entrar = async codigo => {
    const resposta = await fetch(`${base}/api/entrar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...TUNEL }, body: JSON.stringify({ codigo }) });
    return (resposta.headers.get('set-cookie') || '').split(';')[0];
  };
  let servidor = null;
  try {
    servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados });

    // ---------------- Migração ----------------
    await r.passo('sem campanhas.json: só o Protocolo Morana, com o Publicar, as regras da loja, o código e o personagem de antes', async () => {
      const lista = (await api('/api/campanhas')).dados.campanhas;
      const visao = (await api('/api/visao?campanha=morana')).dados;
      const regras = (await api('/api/loja/regras?campanha=morana')).dados.regras;
      const antigo = await entrar('NC-LEGA-DO22');
      const eu = (await api('/api/eu', { cookie: antigo })).dados;
      const seus = (await api('/api/personagens', { cookie: antigo })).dados.personagens.map(p => p.nome);
      const ok = lista.length === 1 && lista[0].id === 'morana' && lista[0].nome === 'Protocolo Morana' && lista[0].personagens === 1 && lista[0].jogadores === 1
        && visao.lugares.some(lugar => lugar.nome === 'Pachinko de Wakako') && regras.teto === 777
        && eu.papel === 'jogador' && eu.campanhas.length === 1 && eu.campanhas[0].nome === 'Night City, 2077' && seus.join() === 'Velho';
      return [ok, `${lista.map(c => `${c.id}: ${c.personagens}p/${c.jogadores}j`).join(', ')} · teto ${regras.teto} · o antigo vê "${eu.campanhas.map(c => c.nome)}" e ${seus.join(', ')}`];
    });

    let B;
    await r.passo('mestre cria uma campanha: começa com as regras da loja do Morana, e as regras passam a ser próprias', async () => {
      B = (await api('/api/campanhas', { method: 'POST', body: { nome: 'Sombras de Pacífica', nomeJogadores: 'Pacifica' } })).dados.campanha;
      const copiadas = (await api(`/api/loja/regras?campanha=${B.id}`)).dados.regras.teto;
      await api(`/api/loja/regras?campanha=${B.id}`, { method: 'PUT', body: { teto: 300, esconder: [], liberados: [], bloqueados: [] } });
      const [daB, doMorana] = [(await api(`/api/loja/regras?campanha=${B.id}`)).dados.regras.teto, (await api('/api/loja/regras?campanha=morana')).dados.regras.teto];
      return [B.id === 'sombras-de-pacifica' && /^#[0-9a-f]{6}$/.test(B.cor) && copiadas === 777 && daB === 300 && doMorana === 777, `${B.id} ${B.cor} · copiadas ${copiadas} · depois: B ${daB}, Morana ${doMorana}`];
    });

    // ---------------- Jogadores e personagens ----------------
    const conta = async (nome, campanhas) => (await api('/api/contas', { method: 'POST', body: { nome, campanhas } })).dados.conta;
    const ana = await conta('Ana', ['morana']);
    const bia = await conta('Bia', [B.id]);
    const caio = await conta('Caio', ['morana', B.id]);
    const [cAna, cBia, cCaio] = [await entrar(ana.codigo), await entrar(bia.codigo), await entrar(caio.codigo)];
    const criar = async (cookie, nome, campanha) => (await api('/api/personagens', { method: 'POST', cookie, body: { nome, ...(campanha ? { campanha } : {}) } }));
    let pAna;
    let pBia;
    let pCaioB;
    await r.passo('cada um cria na sua campanha; quem joga em duas escolhe (pelo id público)', async () => {
      pAna = (await criar(cAna, 'Kiroshi da Ana')).dados.personagem;
      pBia = (await criar(cBia, 'Pacifista da Bia')).dados.personagem;
      const eu = (await api('/api/eu', { cookie: cCaio })).dados.campanhas;
      const publicoB = eu.find(c => c.nome === 'Pacifica').id;
      pCaioB = (await criar(cCaio, 'Caio em Pacifica', publicoB)).dados.personagem;
      const pCaioM = (await criar(cCaio, 'Caio em Night City')).dados.personagem;
      const outra = await criar(cBia, 'Intrusa', idPublico('morana'));
      const gm = Object.fromEntries((await api('/api/personagens')).dados.personagens.map(p => [p.nome, p.campanha]));
      return [publicoB === idPublico(B.id) && pBia.campanha === publicoB && pCaioB.campanha === publicoB && pCaioM.campanha === idPublico('morana') && outra.status === 404
        && gm['Kiroshi da Ana'] === 'morana' && gm['Pacifista da Bia'] === B.id && gm['Caio em Pacifica'] === B.id && gm['Caio em Night City'] === 'morana',
        `Caio vê ${eu.map(c => `${c.nome}=${c.id}`).join(', ')} · Bia cria no Morana: ${outra.status} · mestre: ${JSON.stringify(gm)}`];
    });

    // ---------------- Isolamento ----------------
    const respostasDaBia = [];
    const comoBia = async (caminho, opcoes = {}) => { const resposta = await api(caminho, { ...opcoes, cookie: cBia }); respostasDaBia.push(`${caminho} ${resposta.texto}`); return resposta; };
    await r.passo('Bia (só Pacifica) não lê nada do Morana, nem pelo endereço direto', async () => {
      const lista = (await comoBia('/api/personagens')).dados.personagens.map(p => p.nome).sort();
      const filtrada = (await comoBia(`/api/personagens?campanha=${idPublico('morana')}`)).dados.personagens.length;
      const direto = {
        ficha: (await comoBia(`/api/personagens/${pAna.id}`)).status,
        velho: (await comoBia('/api/personagens/velho23456')).status,
        gravar: (await comoBia(`/api/personagens/${pAna.id}`, { method: 'PUT', body: { ...pAna, nome: 'Roubado' } })).status,
        retrato: (await comoBia(`/api/personagens/${pAna.id}/retrato`)).status,
        pedidos: (await comoBia(`/api/personagens/${pAna.id}/pedidos`)).status,
        enviar: (await comoBia(`/api/personagens/${pAna.id}/enviar`, { method: 'POST', body: {} })).status,
        visao: (await comoBia('/api/visao?campanha=morana')).status,
        visaoPublica: (await comoBia(`/api/visao?campanha=${idPublico('morana')}`)).status,
        loja: (await comoBia(`/api/loja/regras?campanha=${idPublico('morana')}`)).status,
        publicar: (await comoBia('/api/campanhas/morana/publicar')).status
      };
      const campanhas = (await comoBia('/api/campanhas')).dados.campanhas;
      const eu = (await comoBia('/api/eu')).dados.campanhas;
      const ok = lista.join() === ['Caio em Pacifica', 'Pacifista da Bia'].join() && filtrada === 0
        && Object.entries(direto).every(([nome, status]) => status === (nome === 'publicar' ? 403 : 404))
        && campanhas.length === 1 && campanhas[0].nome === 'Pacifica' && eu.length === 1 && eu[0].id === idPublico(B.id);
      return [ok, `lista: ${lista.join(', ')} · direto: ${JSON.stringify(direto)} · campanhas: ${campanhas.map(c => c.nome)}`];
    });
    await r.passo('visitante (sem código): nenhum personagem, nenhuma campanha', async () => {
      const lista = (await api('/api/personagens', { jogador: true })).dados;
      const ficha = (await api(`/api/personagens/${pAna.id}`, { jogador: true })).status;
      const visao = (await api('/api/visao', { jogador: true })).status;
      const campanhas = (await api('/api/campanhas', { jogador: true })).dados.campanhas;
      const eu = (await api('/api/eu', { jogador: true })).dados;
      return [lista.personagens.length === 0 && lista.papel === 'visitante' && ficha === 401 && visao === 401 && campanhas.length === 0 && eu.campanhas.length === 0, `lista ${lista.personagens.length} · ficha ${ficha} · visão ${visao} · campanhas ${campanhas.length}`];
    });
    await r.passo('Caio (nas duas) vê as duas, separadas pelo filtro', async () => {
      const eu = (await api('/api/eu', { cookie: cCaio })).dados.campanhas.map(c => c.nome).sort();
      const todas = (await api('/api/personagens', { cookie: cCaio })).dados.personagens.map(p => p.nome).sort();
      const soB = (await api(`/api/personagens?campanha=${idPublico(B.id)}`, { cookie: cCaio })).dados.personagens.map(p => p.nome).sort();
      const fichaDaAna = (await api(`/api/personagens/${pAna.id}`, { cookie: cCaio })).dados.personagem;
      return [eu.join() === 'Night City, 2077,Pacifica' && todas.length === 5 && soB.join() === 'Caio em Pacifica,Pacifista da Bia' && fichaDaAna.publico === true,
        `campanhas ${eu.join(' | ')} · todas ${todas.join(', ')} · só Pacifica ${soB.join(', ')}`];
    });

    // ---------------- Publicar e Notícias de Night City ----------------
    await r.passo('Publicar de cada campanha só para ela; Notícias de Night City para todas; notas do mestre nunca', async () => {
      const lista = (itens, flag) => itens.map(([nome, ligado]) => ({ nome, papel: '', texto: '', nota: 'NOTA-DO-MESTRE', [flag]: ligado }));
      await api('/api/campanhas/morana/publicar', { method: 'POST', body: { mestre: { resumo: 'Resumo do Morana', npcs: lista([['Segredo do Morana', true], ['Escondido', false]], 'revelado'), lugares: [], noticias: [] } } });
      await api(`/api/campanhas/${B.id}/publicar`, { method: 'POST', body: { mestre: { resumo: 'Resumo de Pacifica', npcs: lista([['Gente de Pacifica', true]], 'revelado'), lugares: [], noticias: [] } } });
      await api('/api/night-city', { method: 'POST', body: { noticias: [{ titulo: 'Eleição em Night City', texto: 'Votem.', nota: 'NOTA-NC', publicada: true }, { titulo: 'Rascunho NC', publicada: false }] } });
      const daBia = (await comoBia('/api/visao')).dados;
      const daAna = (await api('/api/visao', { cookie: cAna })).dados;
      const textoBia = JSON.stringify(daBia);
      const ok = daBia.campanha.nome === 'Pacifica' && daBia.resumo === 'Resumo de Pacifica' && daBia.npcs.map(n => n.nome).join() === 'Gente de Pacifica' && daBia.nightCity.map(n => n.titulo).join() === 'Eleição em Night City'
        && daAna.resumo === 'Resumo do Morana' && daAna.npcs.map(n => n.nome).join() === 'Segredo do Morana' && daAna.nightCity.length === 1
        && !/NOTA-|Rascunho|Escondido/.test(textoBia + JSON.stringify(daAna));
      return [ok, `Bia: ${daBia.npcs.map(n => n.nome)} + ${daBia.nightCity.map(n => n.titulo)} · Ana: ${daAna.npcs.map(n => n.nome)} + ${daAna.nightCity.map(n => n.titulo)}`];
    });
    await r.passo('nada do Morana em nenhuma resposta que a Bia recebeu', async () => {
      // O endereço que a própria Bia pediu (com "morana") não conta: só o que o servidor respondeu.
      const palavras = ['morana', 'Morana', 'Protocolo', 'Kiroshi da Ana', 'Velho', 'Resumo do Morana', 'Night City, 2077'];
      const vazou = respostasDaBia.map(linha => [linha.split(' ')[0], linha.slice(linha.indexOf(' ') + 1)]).flatMap(([caminho, texto]) => palavras.filter(palavra => texto.includes(palavra)).map(palavra => `"${palavra}" em ${caminho}: ${texto.slice(Math.max(0, texto.indexOf(palavra) - 60), texto.indexOf(palavra) + 40)}`));
      return [!vazou.length, vazou.join(' | ') || `${respostasDaBia.length} respostas limpas`];
    });

    // ---------------- Campanha do personagem ----------------
    await r.passo('o jogador não muda a campanha do personagem pelo salvamento', async () => {
      const atual = (await api(`/api/personagens/${pAna.id}`, { cookie: cAna })).dados.personagem;
      await api(`/api/personagens/${pAna.id}`, { method: 'PUT', cookie: cAna, body: { ...atual, campanha: idPublico(B.id) } });
      const depois = (await api(`/api/personagens/${pAna.id}`)).dados.personagem.campanha;
      return [depois === 'morana', depois];
    });
    await r.passo('crossover: só o mestre move; o dono entra na campanha nova; o Foundry da campanha nova sabe que ele veio de outra mesa', async () => {
      await api(`/api/personagens/${pAna.id}/foundry`, { method: 'PUT', body: { ator: 'atorMorana', nomeAtor: 'Kiroshi', campanha: 'morana' } });
      const pelaDona = (await api(`/api/personagens/${pAna.id}/campanha`, { method: 'POST', cookie: cAna, body: { campanha: B.id } })).status;
      const pelaBia = (await comoBia(`/api/personagens/${pAna.id}/campanha`, { method: 'POST', body: { campanha: B.id } })).status;
      const mover = (await api(`/api/personagens/${pAna.id}/campanha`, { method: 'POST', body: { campanha: B.id } })).dados;
      const estadoMestre = (await api(`/api/personagens/${pAna.id}`)).dados.personagem;
      const anaAgora = (await api('/api/eu', { cookie: cAna })).dados.campanhas.map(c => c.nome).sort();
      const biaVe = (await comoBia('/api/personagens')).dados.personagens.some(p => p.id === pAna.id);
      const daAna = (await api(`/api/personagens/${pAna.id}`, { cookie: cAna })).dados.personagem;
      // No mundo da campanha nova, o Foundry importa de novo e manda a campanha dele.
      const noMundoNovo = (await api(`/api/personagens/${pAna.id}/foundry`, { method: 'PUT', body: { ator: 'atorPacifica', nomeAtor: 'Kiroshi', campanha: B.id } })).dados.estadoFoundry;
      const ok = pelaDona === 403 && pelaBia === 404 && mover.donoEntrou === 'Ana' && mover.personagem.campanha === B.id && estadoMestre.estadoFoundry === 'outra-mesa' && estadoMestre.transferencias.length === 1
        && anaAgora.join() === 'Night City, 2077,Pacifica' && biaVe && !('transferencias' in daAna) && daAna.campanha === idPublico(B.id) && noMundoNovo === 'importado';
      return [ok, `dona ${pelaDona} · Bia ${pelaBia} · ${mover.donoEntrou} entrou · estado ${estadoMestre.estadoFoundry} · Ana agora em ${anaAgora.join(' | ')} · Bia vê: ${biaVe} · no mundo novo: ${noMundoNovo}`];
    });
    await r.passo('tirar um jogador de uma campanha tira o acesso aos personagens dele lá; sem campanha nenhuma, só revogando', async () => {
      await api(`/api/contas/${caio.id}`, { method: 'PUT', body: { campanhas: ['morana'] } });
      const fichaB = (await api(`/api/personagens/${pCaioB.id}`, { cookie: cCaio })).status;
      const vazia = (await api(`/api/contas/${caio.id}`, { method: 'PUT', body: { campanhas: [] } })).status;
      const noMestre = (await api(`/api/personagens?campanha=${B.id}`)).dados.personagens.some(p => p.id === pCaioB.id);
      return [fichaB === 404 && vazia === 400 && noMestre, `ficha em Pacifica ${fichaB} · sem campanha ${vazia} · continua salvo para o mestre ${noMestre}`];
    });
    await r.passo('apagar campanha: só vazia', async () => {
      const cheia = (await api(`/api/campanhas/${B.id}`, { method: 'DELETE' })).status;
      const vazia = (await api('/api/campanhas', { method: 'POST', body: { nome: 'Vazia' } })).dados.campanha;
      const apagou = (await api(`/api/campanhas/${vazia.id}`, { method: 'DELETE' })).status;
      const depois = (await api(`/api/campanhas/${vazia.id}`)).status;
      return [cheia === 400 && apagou === 200 && depois === 404, `com personagens ${cheia} · vazia ${apagou} · depois ${depois}`];
    });
    await r.passo('arquivos de dados nunca são servidos para os jogadores', async () => {
      const caminhos = ['/campanhas.json', '/campanhas/morana/publicar.json', '/contas-jogadores.json', '/noticias-night-city.json', '/jogadores.json', '/jogadores-mestre.json'];
      const status = await Promise.all(caminhos.map(async caminho => `${caminho}=${(await api(caminho, { cookie: cBia })).status}`));
      return [status.every(item => item.endsWith('=403')), status.join(' ')];
    });

    // ---------------- Na tela: mestre ----------------
    await edge.send('Network.setBypassServiceWorker', { bypass: true });
    await edge.ir(`${base}/`, 1500);
    await r.passo('mestre: o seletor tem as campanhas; trocar muda o menu, a cor e o topo', async () => {
      const opcoes = await edge.evaluate(`[...document.querySelectorAll('#campaign-picker option')].map(o => o.textContent)`);
      await edge.evaluate(`(() => { const s = document.getElementById('campaign-picker'); s.value = ${JSON.stringify(B.id)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await edge.sleep(900);
      const estado = await edge.evaluate(`({ rotulo: document.querySelector('.nav-campaign').textContent, cor: getComputedStyle(document.documentElement).getPropertyValue('--campanha-cor').trim(), topo: document.querySelector('.top-meta').textContent, pagina: wikiApp.currentPage(), itens: [...document.querySelectorAll('.nav-item')].map(b => b.dataset.page) })`);
      await edge.shot('mestre-pacifica');
      return [opcoes.join() === 'Protocolo Morana,Sombras de Pacífica' && estado.rotulo === 'Sombras de Pacífica' && estado.cor === B.cor && /SOMBRAS DE PACÍFICA/.test(estado.topo) && estado.pagina === `inicio-${B.id}` && !estado.itens.includes('campaign') && estado.itens.includes('playerView'),
        `${opcoes.join(' | ')} → ${JSON.stringify(estado)}`];
    });
    await r.passo('mestre: a visão geral da campanha nova conta personagens e jogadores', async () => {
      for (let i = 0; i < 20 && !(await edge.evaluate(`!!document.querySelector('#cp-overview .tile')`)); i++) await edge.sleep(200);
      const texto = (await edge.evaluate(`document.getElementById('cp-overview').textContent`)).replace(/\s+/g, ' ');
      return [/3 personagens/.test(texto) && /2 jogadores/.test(texto) && /documentos\/sombras-de-pacifica\//.test(texto), texto.slice(0, 160)];
    });
    await r.passo('mestre: Personagens e códigos mostra só os da campanha escolhida', async () => {
      await edge.evaluate(`wikiApp.openPage('personagens')`);
      for (let i = 0; i < 25 && !(await edge.evaluate(`!!document.querySelector('#cc-accounts tbody')`)); i++) await edge.sleep(200);
      const estado = await edge.evaluate(`({ nomes: [...document.querySelectorAll('.cc-card strong')].map(s => s.textContent), titulo: [...document.querySelectorAll('.cc-box h3')].map(h => h.textContent), contas: [...document.querySelectorAll('#cc-accounts tbody tr td:first-child')].map(td => td.textContent), mover: document.querySelectorAll('[data-cc-move]').length, juntar: [...document.querySelectorAll('#cc-join option')].map(o => o.textContent) })`);
      const ok = estado.nomes.sort().join() === 'Caio em Pacifica,Kiroshi da Ana,Pacifista da Bia' && estado.titulo.includes('Personagens de Sombras de Pacífica') && estado.contas.sort().join() === 'Ana,Bia' && estado.mover === 3 && estado.juntar.some(nome => /^Caio/.test(nome));
      return [ok, JSON.stringify(estado)];
    });
    await r.passo('mestre: o Publicar da campanha nova lê o dela e as Notícias de Night City', async () => {
      await edge.evaluate(`wikiApp.openPage('playerView')`);
      for (let i = 0; i < 25 && !(await edge.evaluate(`document.querySelectorAll('#pv-npcs .pv-row').length > 0`)); i++) await edge.sleep(200);
      const estado = await edge.evaluate(`({ eyebrow: document.querySelector('#content .eyebrow').textContent, npcs: [...document.querySelectorAll('#pv-npcs input[data-field="nome"]')].map(i => i.value), nc: [...document.querySelectorAll('#pv-nightCity input[data-field="titulo"]')].map(i => i.value), link: document.getElementById('pv-open').getAttribute('href') })`);
      return [/Sombras de Pacífica/.test(estado.eyebrow) && estado.npcs.join() === 'Gente de Pacifica' && estado.nc.join() === 'Eleição em Night City,Rascunho NC' && estado.link === `jogadores.html?campanha=${B.id}`, JSON.stringify(estado)];
    });
    await r.passo('mestre: trocar de campanha com o Publicar por publicar pergunta antes', async () => {
      await edge.evaluate(`(() => { const t = document.getElementById('pv-resumo'); t.value = 'Mudança não publicada'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      const trocar = () => edge.evaluate(`(() => { const s = document.getElementById('campaign-picker'); s.value = 'morana'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await trocar();
      await edge.sleep(500);
      const pergunta = await edge.evaluate(`(document.querySelector('dialog.popup[open]') || {}).textContent || ''`);
      await edge.evaluate(`document.querySelector('dialog.popup[open] [data-popup-cancel]').click()`);
      await edge.sleep(400);
      const ficou = await edge.evaluate(`({ ativa: wikiApp.activeCampaign().id, seletor: document.getElementById('campaign-picker').value, texto: document.getElementById('pv-resumo').value })`);
      await trocar();
      await edge.sleep(500);
      await edge.evaluate(`document.querySelector('dialog.popup[open]:not(.popup-closing) [data-popup-ok]').click()`);
      await edge.sleep(900);
      const trocou = await edge.evaluate(`wikiApp.activeCampaign().id`);
      return [/não publicadas/.test(pergunta) && ficou.ativa === B.id && ficou.seletor === B.id && ficou.texto === 'Mudança não publicada' && trocou === 'morana', `${pergunta.replace(/\s+/g, ' ').slice(0, 80)} · ficou ${JSON.stringify(ficou)} · depois de confirmar: ${trocou}`];
    });
    await r.passo('mestre: cria uma campanha pela página Campanhas e cai nela', async () => {
      await edge.evaluate(`wikiApp.openPage('campanhas')`);
      for (let i = 0; i < 20 && !(await edge.evaluate(`document.querySelectorAll('#cp-list [data-cp-id]').length > 0`)); i++) await edge.sleep(200);
      const linhas = await edge.evaluate(`document.querySelectorAll('#cp-list [data-cp-id]').length`);
      await edge.evaluate(`(() => { const f = document.getElementById('cp-new'); f.elements.nome.value = 'Terceira Mesa'; f.requestSubmit(); })()`);
      for (let i = 0; i < 40 && !(await edge.evaluate(`window.wikiApp && wikiApp.activeCampaign().id === 'terceira-mesa'`).catch(() => false)); i++) await edge.sleep(250);
      const estado = await edge.evaluate(`({ ativa: wikiApp.activeCampaign().id, pagina: wikiApp.currentPage(), opcoes: document.querySelectorAll('#campaign-picker option').length })`).catch(() => ({}));
      await api('/api/campanhas/terceira-mesa', { method: 'DELETE' });
      return [linhas === 2 && estado.ativa === 'terceira-mesa' && estado.pagina === 'inicio-terceira-mesa' && estado.opcoes === 3, `${linhas} linhas antes · ${JSON.stringify(estado)}`];
    });

    // ---------------- Na tela: jogadores ----------------
    // Os próximos pedidos do navegador chegam "pelo túnel": são de jogador, não do mestre.
    await edge.send('Network.setExtraHTTPHeaders', { headers: TUNEL });
    const entrarNaTela = async codigo => {
      await edge.ir(`${base}/jogadores.html`, 800);
      await edge.evaluate(`fetch('api/sair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(() => fetch('api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: ${JSON.stringify(codigo)} }) }))`);
      await edge.sleep(400);
      await edge.ir(`${base}/jogadores.html`, 1200);
    };
    await r.passo('jogador nas duas: escolhe a campanha no menu; cada uma mostra o seu, e Night City aparece nas duas', async () => {
      await api(`/api/contas/${caio.id}`, { method: 'PUT', body: { campanhas: ['morana', B.id] } });
      await entrarNaTela(caio.codigo);
      const opcoes = await edge.evaluate(`[...document.querySelectorAll('#campaign-picker option')].map(o => o.textContent)`);
      const pessoas = async () => { await edge.evaluate(`wikiApp.openPage('pvPeople')`); await edge.sleep(900); return edge.evaluate(`[...document.querySelectorAll('#content .person h3')].map(h => h.textContent).join()`); };
      const escolher = async nome => { await edge.evaluate(`(() => { const s = document.getElementById('campaign-picker'); s.value = [...s.options].find(o => o.textContent === ${JSON.stringify(nome)}).value; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await edge.sleep(1200); };
      await escolher('Night City, 2077');
      const noMorana = await pessoas();
      await escolher('Pacifica');
      const emPacifica = await pessoas();
      await edge.evaluate(`wikiApp.openPage('pvNightCity')`);
      await edge.sleep(500);
      const cidade = await edge.evaluate(`[...document.querySelectorAll('#content .section h3')].map(h => h.textContent).join()`);
      const tela = await edge.evaluate(`document.body.innerText`);
      await edge.shot('jogador-duas-campanhas');
      return [opcoes.sort().join() === 'Night City, 2077,Pacifica' && noMorana === 'Segredo do Morana' && emPacifica === 'Gente de Pacifica' && cidade === 'Eleição em Night City' && !/Morana|Protocolo|Sombras/.test(tela.replace('Segredo do Morana', '')),
        `menu ${opcoes.join(' | ')} · Night City, 2077: ${noMorana} · Pacifica: ${emPacifica} · cidade: ${cidade}`];
    });
    await r.passo('jogadora só de Pacifica: sem seletor, só a campanha dela, e a lista de personagens sem os do Morana', async () => {
      await entrarNaTela(bia.codigo);
      const estado = await edge.evaluate(`({ seletor: !!document.getElementById('campaign-picker'), rotulo: document.querySelector('.nav-campaign').textContent, topo: document.querySelector('.top-meta').textContent })`);
      await edge.evaluate(`wikiApp.openPage('personagens')`);
      for (let i = 0; i < 25 && !/Meus personagens/.test(await edge.evaluate(`document.getElementById('cc-root').textContent`)); i++) await edge.sleep(200);
      const nomes = await edge.evaluate(`[...document.querySelectorAll('.cc-card strong')].map(s => s.textContent).sort().join()`);
      const tela = await edge.evaluate(`document.body.innerText`);
      const vazou = tela.match(/.{0,60}(Velho|Caio em Night City|Morana|Protocolo|Night City, 2077).{0,30}/);
      return [!estado.seletor && estado.rotulo === 'Pacifica' && /PACIFICA/.test(estado.topo) && nomes === 'Caio em Pacifica,Kiroshi da Ana,Pacifista da Bia' && !vazou,
        `${JSON.stringify(estado)} · personagens: ${nomes}${vazou ? ` · na tela: "${vazou[0].replace(/\s+/g, ' ')}"` : ''}`];
    });
    await edge.send('Network.setExtraHTTPHeaders', { headers: {} });
  } finally {
    if (servidor) servidor.kill();
    await edge.sleep(400);
    try { fs.rmSync(dados, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
};
