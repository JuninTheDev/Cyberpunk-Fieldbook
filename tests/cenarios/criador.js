// Criador de personagem pela tela, como um jogador pela rede: entrar com o código, criar pelos três
// métodos, salvar sozinho, recarregar, ficha, loja e o que o outro jogador e o mestre veem.
// Os dados ficam na pasta temporária dos servidores de teste.
const { abrir, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  if (!servidores.rede) { await r.passo('rede: sem IP de rede nesta máquina, cenário pulado', async () => [true, '']); return; }
  const gm = servidores.local;
  const rede = servidores.rede;
  const post = async (base, caminho, body, method = 'POST') => (await fetch(`${base}${caminho}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  const conta = (await post(gm, '/api/contas', { nome: 'Ana' })).conta;
  const outra = (await post(gm, '/api/contas', { nome: 'Bruno' })).conta;

  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)}) || {}).textContent || ''`);
  const clicar = async (seletor, espera = 250) => { await edge.evaluate(`document.querySelector(${JSON.stringify(seletor)}).click()`); await edge.sleep(espera); };
  const escolher = async (seletor, valor) => { await edge.evaluate(`(() => { const s = document.querySelector(${JSON.stringify(seletor)}); s.value = ${JSON.stringify(String(valor))}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await edge.sleep(200); };
  const digitar = async (seletor, valor) => { await edge.evaluate(`(() => { const s = document.querySelector(${JSON.stringify(seletor)}); s.value = ${JSON.stringify(valor)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`); };
  const passo = n => clicar(`.cc-steps [data-step="${n}"]`);
  const salvo = async () => { for (let i = 0; i < 30; i++) { if (/Salvo/.test(await texto('#cc-save'))) return true; await edge.sleep(200); } return false; };
  const idAtual = () => edge.evaluate(`decodeURIComponent(location.hash).split('/')[1] || ''`);
  // d10 fixo: Math.random = 0.55 → 1 + floor(5.5) = 6.
  const dadoFixo = valor => edge.evaluate(`Math.random = () => ${valor}`);

  await edge.ir(`${rede}/#personagens`, 2500);
  await r.passo('jogador vê o campo do código; código errado avisa', async () => {
    const temCampo = await edge.evaluate(`!!document.querySelector('#cc-code')`);
    await digitar('#cc-code', 'NC-ERRO-0000');
    await edge.evaluate(`document.querySelector('[data-cc-login]').requestSubmit()`);
    await edge.sleep(500);
    return [temCampo && /não encontrado/i.test(await texto('#cc-login-msg')), await texto('#cc-login-msg')];
  });
  await r.passo('com o código certo, entra e vê "Meus personagens"', async () => {
    await digitar('#cc-code', conta.codigo);
    await edge.evaluate(`document.querySelector('[data-cc-login]').requestSubmit()`);
    await edge.sleep(800);
    const t = await texto('#cc-root');
    return [/Você entrou como Ana/.test(t) && /Meus personagens/.test(t), t.slice(0, 80)];
  });

  let soloId;
  await r.passo('"Novo personagem" abre o criador com o id no endereço', async () => {
    await clicar('[data-cc-new]', 900);
    soloId = await idAtual();
    const pagina = await edge.evaluate('wikiApp.currentPage()');
    return [pagina === 'criador' && /^[a-z0-9]{10}$/.test(soloId), `${pagina} #${soloId}`];
  });
  await r.passo('passo 1: nome, Solo e Rato de Rua', async () => {
    await digitar('[data-campo="nome"]', 'Jay');
    await clicar('[data-role="solo"]');
    await clicar('[data-method="ratoderua"]');
    const ativos = await edge.evaluate(`[...document.querySelectorAll('.cc-choice.active')].map(b => b.querySelector('b').textContent)`);
    return [ativos.includes('Solo') && ativos.includes('Rato de Rua'), ativos.join(', ')];
  });
  await r.passo('passo 2: rolar 1d10 pega a linha 6 da tabela do Solo', async () => {
    await passo(2);
    await dadoFixo(0.55);
    await clicar('[data-roll-row]');
    const linha = await edge.evaluate(`[...document.querySelectorAll('tr.cc-picked td')].map(td => td.textContent)`);
    return [linha.join(',') === '6,7,7,6,5,7,6,6,7,7,5', linha.join(',')];
  });
  await r.passo('passo 3: língua e bairro', async () => {
    await passo(3);
    await escolher('[data-lingua]', 'Portuguese');
    await escolher('[data-casa]', 'Heywood');
    const linhas = await edge.evaluate(`document.querySelectorAll('#cc-step tbody tr').length`);
    return [linhas === 20, `${linhas} perícias`];
  });
  await r.passo('passo 4: "Rolar tudo" preenche o Lifepath', async () => {
    await passo(4);
    await edge.evaluate('Math.random = (() => { let i = 0; const v = [0.1, 0.35, 0.62, 0.88, 0.47]; return () => v[i++ % v.length]; })()');
    await clicar('[data-lp-all]');
    const vazios = await edge.evaluate(`[...document.querySelectorAll('[data-lp]')].filter(s => !s.value).length`);
    return [vazios === 0, `${vazios} vazios`];
  });
  await r.passo('passo 5: pacote do Solo; Neural Link já vem grátis; EMP 5 → 4', async () => {
    await passo(5);
    const t = await texto('#cc-step');
    return [/já vem grátis em 2077/.test(t) && /Humanidade 43\/50/.test(t) && /EMP 4/.test(t), t.match(/Humanidade[^P]*/)?.[0]];
  });
  await r.passo('salva sozinho e, recarregando, continua igual', async () => {
    const ok = await salvo();
    await edge.ir(`${rede}/#criador/${soloId}`, 2500);
    await passo(1);
    const nome = await edge.evaluate(`document.querySelector('[data-campo="nome"]').value`);
    return [ok && nome === 'Jay', `salvo ${ok} · nome "${nome}"`];
  });
  await edge.shot('criador');
  await r.passo('revisão: sem pendências', async () => {
    await passo(7);
    const t = await texto('#cc-step');
    return [/Tudo certo/.test(t), t.slice(0, 160)];
  });
  const quadro = async () => (await texto('[data-cc-foundry]')).replace(/\s+/g, ' ').trim();
  await r.passo('revisão: "Enviar para o mestre" marca como enviado', async () => {
    const antes = await quadro();
    await clicar('[data-cc-send]', 1500);
    const depois = await quadro();
    return [/Ainda não foi enviado/.test(antes) && /Enviado em .*Esperando o mestre importar/.test(depois), depois.slice(0, 120)];
  });
  await r.passo('mudou depois de enviar: o quadro avisa e oferece enviar de novo', async () => {
    await passo(3);
    await escolher('[data-casa]', 'Watson');
    await passo(7);
    for (let i = 0; i < 25 && !/mudou depois/.test(await quadro()); i++) await edge.sleep(200);
    const t = await quadro();
    return [/mudou depois disso/.test(t) && /Enviar de novo/.test(t), t.slice(0, 120)];
  });
  await r.passo('ficha: HP, Humanidade e perícias com base', async () => {
    await clicar('[data-cc-sheet]', 1200);
    const t = (await texto('#cc-root')).replace(/\s+/g, ' ');
    // BODY 7 e WILL 6: média 6,5 → 7 → HP 45.
    return [/HP 45/.test(t) && /Humanidade 43\/50/.test(t) && /Linguagem \(Streetslang\)/.test(t) && /português/i.test(t), t.slice(0, 140)];
  });
  await r.passo('ficha: o quadro "Levar para o Foundry" envia de novo', async () => {
    const antes = await quadro();
    await clicar('[data-cc-send]', 1500);
    const depois = await quadro();
    return [/Enviar de novo/.test(antes) && /Enviado em .*Esperando o mestre/.test(depois) && !/mudou/.test(depois), depois.slice(0, 120)];
  });

  // ---------- Edgerunner ----------
  const novo = async () => { await abrir(edge, 'personagens', 900); await clicar('[data-cc-new]', 900); return idAtual(); };
  const pontos = () => edge.evaluate(`((document.querySelector('#cc-step').textContent.match(/Pontos: (\\d+) de (\\d+)/) || []).slice(1).map(Number))`);
  await r.passo('Edgerunner: rola cada STAT e começa com 2 em cada perícia (40 pontos)', async () => {
    await novo();
    await clicar('[data-role="tech"]');
    await clicar('[data-method="edgerunner"]');
    await passo(2);
    await dadoFixo(0.05); // d10 = 1
    await clicar('[data-roll-each]');
    const valores = await edge.evaluate(`[...document.querySelectorAll('.cc-stat b')].map(b => b.textContent).join(',')`);
    await passo(3);
    const [usados, total] = await pontos();
    // Tech, linha 1: 6 7 7 8 4 4 5 5 7 6. Eletrônica/Segurança é ×2: 19 × 2 + 4 = 42.
    return [valores === '6,7,7,8,4,4,5,5,7,6' && usados === 42 && total === 86, `${valores} · ${usados}/${total}`];
  });
  await r.passo('Edgerunner: não passa de 6 nem fica abaixo de 2', async () => {
    for (let i = 0; i < 6; i++) await clicar('[data-skill-plus="Basic Tech"]', 60);
    for (let i = 0; i < 4; i++) await clicar('[data-skill-minus="Athletics"]', 60);
    const niveis = await edge.evaluate(`['Basic Tech', 'Athletics'].map(n => document.querySelector('[data-skill-plus="' + n + '"]').parentElement.querySelector('b').textContent)`);
    return [niveis.join(',') === '6,2', niveis.join(',')];
  });
  await r.passo('Edgerunner: "Distribuir sugerido" põe os níveis do Rato de Rua (86 pontos)', async () => {
    await edge.evaluate('window.confirm = () => true');
    await clicar('[data-skill-suggest]');
    const [usados, total] = await pontos();
    const atletismo = await edge.evaluate(`document.querySelector('[data-skill-plus="Athletics"]').parentElement.querySelector('b').textContent`);
    return [usados === 86 && total === 86 && atletismo === '2', `${usados}/${total} · Atletismo ${atletismo}`];
  });

  // ---------- Pacote Completo e loja ----------
  let pacoteId;
  await r.passo('Pacote Completo: 62 pontos de STAT (começa em 60)', async () => {
    pacoteId = await novo();
    await digitar('[data-campo="nome"]', 'Lin');
    await clicar('[data-role="netrunner"]');
    await clicar('[data-method="pacote"]');
    await passo(2);
    const antes = await texto('#cc-step');
    await clicar('[data-stat-plus="INT"]');
    await clicar('[data-stat-plus="REF"]');
    const depois = await texto('#cc-step');
    return [/Usados: 60/.test(antes) && /Usados: 62/.test(depois), `${antes.match(/Usados: \d+/)} → ${depois.match(/Usados: \d+/)}`];
  });
  await r.passo('resumo fixo acompanha; ajuda do passo com as STATs; termos com link do glossário', async () => {
    const resumo = (await texto('#cc-summary')).replace(/\s+/g, ' ');
    const ajuda = await texto('#cc-help');
    const glossario = await edge.evaluate(`document.querySelectorAll('#cc-step a.gloss').length`);
    const aberto = await edge.evaluate(`document.querySelector('#cc-summary').open`);
    return [/Lin/.test(resumo) && /STATs ?62 de 62/.test(resumo) && /HP ?\d+/.test(resumo) && /Reflexos/.test(ajuda) && /RED p\. 72/.test(ajuda) && glossario > 0 && aberto, `${resumo.slice(0, 110)} · glossário: ${glossario} links · aberto: ${aberto}`];
  });
  await r.passo('Pacote Completo: básicas começam em 2 (26 pontos) e ×2 custa o dobro', async () => {
    await passo(3);
    const [antes] = await pontos();
    await clicar('[data-skill-plus="Electronics/Security Tech"]');
    const [depois] = await pontos();
    await clicar('[data-extra-add="Martial Arts"]');
    const [comArte] = await pontos();
    return [antes === 26 && depois === 28 && comArte === 30, `${antes} → ${depois} → ${comArte}`];
  });
  await r.passo('Pacote Completo: as 20 da Role vêm primeiro, com descrição; "Distribuir sugerido" fecha 86', async () => {
    const primeiras = await edge.evaluate(`[...document.querySelectorAll('#cc-step tbody tr')].slice(0, 21).map(tr => tr.classList.contains('cc-suggested'))`);
    const descricoes = await edge.evaluate(`document.querySelectorAll('#cc-step tbody .cc-desc').length`);
    await clicar('[data-skill-suggest]');
    const [usados] = await pontos();
    await edge.shot('criador-pericias');
    const resumo = (await texto('#cc-summary')).replace(/\s+/g, ' ');
    return [primeiras.slice(0, 20).every(Boolean) && !primeiras[20] && descricoes >= 60 && usados === 86 && /Perícias ?86 de 86/.test(resumo), `sugeridas no topo: ${primeiras.filter(Boolean).length} · descrições: ${descricoes} · pontos ${usados}`];
  });
  const carteira = () => texto('.cc-wallet');
  const buscarNaLoja = async termo => { await edge.evaluate(`(() => { const s = document.querySelector('[data-shop-busca]'); s.value = ${JSON.stringify(termo)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`); await edge.sleep(200); };
  await r.passo('loja no passo 5: 2.550eb; Sandevistan (500eb) desconta', async () => {
    await passo(5);
    await buscarNaLoja('sandevistan');
    await clicar('[data-shop-buy="core_cyberware:sandevistan"]');
    const c = await carteira();
    return [/2\.050eb de 2\.550eb/.test(c), c];
  });
  // Devolve o item pelo nome na lista "Comprado na loja".
  const devolver = async nome => {
    await edge.evaluate(`[...document.querySelectorAll('[data-shop-return]')].find(b => b.closest('li').textContent.includes(${JSON.stringify(nome)})).click()`);
    await edge.sleep(250);
  };
  await r.passo('moda sai dos 800eb próprios', async () => {
    await buscarNaLoja('jaqueta asia pop');
    await clicar('[data-shop-buy="core_clothing:asia-pop-jacket"]');
    const c = (await carteira()).replace(/\s+/g, ' ');
    // A jaqueta Asia Pop custa 100eb: sai da moda, o dinheiro continua em 2.050eb.
    return [/2\.050eb de 2\.550eb/.test(c) && /Moda: 100eb de 800eb/.test(c), c];
  });
  await r.passo('opção sem base avisa; devolver reembolsa', async () => {
    await buscarNaLoja('mão de ferramentas');
    await clicar('[data-shop-buy="core_cyberware:tool-hand"]');
    const aviso = await texto('#cc-shop-msg');
    const antes = await carteira();
    await devolver('Mão de ferramentas');
    const depois = await carteira();
    return [/precisa da base/.test(aviso) && /1\.950eb/.test(antes) && /2\.050eb/.test(depois), `${aviso} · ${antes.match(/[\d.]+eb/)} → ${depois.match(/[\d.]+eb/)}`];
  });
  await r.passo('passo 5 lista o cyberware sem base', async () => {
    await clicar('[data-shop-buy="core_cyberware:tool-hand"]');
    await passo(5);
    const aviso = await texto('.cc-warn');
    await devolver('Mão de ferramentas');
    return [/Mão de ferramentas precisa da base/.test(aviso), aviso];
  });
  await r.passo('loja de criação esconde o avançado: Linear Frame, Malorian, versões excelentes', async () => {
    const achados = {};
    for (const termo of ['linear frame', 'malorian arms', 'rifle de assalto (excelente)', 'medscanner']) {
      await buscarNaLoja(termo);
      achados[termo] = await edge.evaluate(`document.querySelectorAll('[data-shop-buy]').length`);
    }
    const aviso = await texto('#cc-shop .note-status');
    return [achados['linear frame'] === 0 && achados['malorian arms'] === 0 && achados['rifle de assalto (excelente)'] === 0 && achados.medscanner > 0 && /itens avançados ficam fora/.test(aviso), JSON.stringify(achados)];
  });
  await r.passo('comprar sem dinheiro deixa o saldo negativo e avisa', async () => {
    await buscarNaLoja('medscanner');
    for (let i = 0; i < 3; i++) await clicar('[data-shop-buy="core_gear:medscanner"]', 150);
    const aviso = await texto('#cc-shop-msg');
    for (let i = 0; i < 3; i++) await devolver('Medscanner');
    return [/Sem dinheiro/.test(aviso) && /2\.050eb/.test(await carteira()), aviso];
  });
  await r.passo('o mestre libera um item e ele aparece para o jogador', async () => {
    const regras = (await (await fetch(`${gm}/api/loja/regras`)).json()).regras;
    await post(gm, '/api/loja/regras', { ...regras, liberados: ['core_gear:linear-frame-beta'] }, 'PUT');
    await passo(4); await passo(5); // redesenha a loja com as regras novas
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(pacoteId)} }, 'replace')`);
    await edge.sleep(1200);
    await passo(5);
    await buscarNaLoja('linear frame');
    const botoes = await edge.evaluate(`[...document.querySelectorAll('[data-shop-buy]')].map(b => b.dataset.shopBuy)`);
    await post(gm, '/api/loja/regras', regras, 'PUT');
    return [botoes.includes('core_gear:linear-frame-beta') && !botoes.includes('core_gear:linear-frame-sigma'), botoes.join(', ')];
  });
  await r.passo('kit sugerido da Role: compra de uma vez e cabe no dinheiro', async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(pacoteId)} }, 'replace')`);
    await edge.sleep(1200);
    await passo(5);
    await edge.evaluate('window.confirm = () => true');
    const antes = await edge.evaluate(`document.querySelectorAll('.cc-items li').length`);
    await clicar('[data-shop-kit]', 400);
    const depois = await edge.evaluate(`document.querySelectorAll('.cc-items li').length`);
    const msg = await texto('#cc-shop-msg');
    const c = (await carteira()).replace(/\s+/g, ' ');
    return [depois > antes + 5 && /Kit comprado\. Sobram/.test(msg) && !/cc-bad/.test(await edge.evaluate(`document.querySelector('.cc-wallet').innerHTML`)), `${antes} → ${depois} itens · ${msg} · ${c}`];
  });
  await r.passo('a compra fica salva no personagem, com o saldo da tela', async () => {
    const naTela = Number(((await carteira()).match(/Dinheiro: ([\d.]+)eb/) || [])[1]?.replace(/\./g, ''));
    const ok = await salvo();
    const doc = await (await fetch(`${gm}/api/personagens/${pacoteId}`)).json();
    const ids = (doc.personagem.itens || []).map(i => i.id);
    const resultado = doc.personagem.resultado || {};
    return [ok && ids.includes('core_cyberware:sandevistan') && resultado.dinheiro?.saldo === naTela && resultado.itens.some(i => i.foundry?.nome === 'Sandevistan'), `${ids.length} itens · saldo salvo ${resultado.dinheiro?.saldo} · na tela ${naTela}`];
  });

  // ---------- Outros jogadores, conflito, mestre ----------
  await r.passo('outro aparelho salvou antes: a tela avisa do conflito', async () => {
    const atual = (await (await fetch(`${gm}/api/personagens/${pacoteId}`)).json()).personagem;
    await post(gm, `/api/personagens/${pacoteId}`, { ...atual, notas: 'mudado pelo mestre' }, 'PUT');
    await passo(1);
    await digitar('[data-campo="apelido"]', 'Zero');
    for (let i = 0; i < 20; i++) { if (/outro lugar/.test(await texto('#cc-save'))) break; await edge.sleep(200); }
    return [/outro lugar/.test(await texto('#cc-save')), await texto('#cc-save')];
  });
  await r.passo('depois que vai para o Foundry, a loja inicial fecha', async () => {
    await post(gm, `/api/personagens/${pacoteId}/foundry`, { ator: 'abc', nomeAtor: 'Lin', versao: 1 }, 'PUT');
    await abrir(edge, 'personagens', 600);
    await edge.evaluate(`wikiApp.openPage('loja', { section: ${JSON.stringify(pacoteId)} })`);
    await edge.sleep(1200);
    const t = await texto('#cc-shop');
    const botoes = await edge.evaluate(`document.querySelectorAll('[data-shop-buy]').length`);
    return [/a loja inicial fechou/.test(t) && botoes === 0, `${botoes} botões de comprar`];
  });
  await r.passo('celular: criador e loja sem rolagem lateral', async () => {
    await edge.celular(true);
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(soloId)} })`);
    await edge.sleep(1200);
    const criador = await semRolagemLateral(edge);
    await edge.shot('criador-celular');
    await edge.evaluate(`wikiApp.openPage('loja', { section: ${JSON.stringify(soloId)} })`);
    await edge.sleep(1200);
    const loja = await semRolagemLateral(edge);
    await edge.shot('loja-celular');
    await edge.celular(false);
    return [criador && loja, `criador ${criador} · loja ${loja}`];
  });
  await r.passo('outro jogador não abre o criador da Ana', async () => {
    await edge.evaluate(`fetch('api/sair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })`);
    await edge.sleep(300);
    await abrir(edge, 'personagens', 800);
    await digitar('#cc-code', outra.codigo);
    await edge.evaluate(`document.querySelector('[data-cc-login]').requestSubmit()`);
    await edge.sleep(900);
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(soloId)} })`);
    await edge.sleep(1000);
    const t = await texto('#cc-root');
    const grupo = await texto('#cc-root');
    return [/só pode editar os seus/.test(t), t.slice(0, 90)];
  });
  await r.passo('mestre vê todos os personagens e o quadro de códigos', async () => {
    await edge.ir(`${gm}/#personagens`, 2500);
    await edge.sleep(800);
    const t = await texto('#cc-root');
    // Outros cenários usam a mesma pasta de dados: confere os nomes deste, não o total.
    const nomes = await edge.evaluate(`[...document.querySelectorAll('#cc-accounts tbody tr td:first-child')].map(td => td.textContent)`);
    return [/Todos os personagens/.test(t) && /Jay/.test(t) && /Lin/.test(t) && nomes.includes('Ana') && nomes.includes('Bruno'), nomes.join(', ')];
  });
  await r.passo('mestre vê quem está esperando no Foundry, e o selo na lista', async () => {
    const esperando = (await texto('[data-cc-waiting]')).replace(/\s+/g, ' ');
    const selos = await edge.evaluate(`[...document.querySelectorAll('.cc-card small b')].map(b => b.textContent)`);
    return [/Jay \(de Ana\): importar/.test(esperando) && /Importar da wiki/.test(esperando) && !/Lin/.test(esperando) && selos.includes('esperando o mestre') && selos.includes('no Foundry'), `${esperando.slice(0, 100)} · selos: ${[...new Set(selos)].join(', ')}`];
  });
  await r.passo('quadro do mestre na Loja: baixar o teto para 500eb esconde os de 1.000eb', async () => {
    await abrir(edge, 'loja', 1500);
    const temQuadro = await edge.evaluate(`!!document.querySelector('[data-rule-teto]')`);
    await edge.evaluate(`(() => { const t = document.querySelector('[data-rule-teto]'); t.value = '500'; })()`);
    await clicar('[data-rule-save]', 1500);
    await buscarNaLoja('medscanner');
    const comprar = await edge.evaluate(`document.querySelectorAll('[data-shop-buy="core_gear:medscanner"]').length`);
    await edge.evaluate(`(() => { const t = document.querySelector('[data-rule-teto]'); t.value = '1000'; })()`);
    await clicar('[data-rule-save]', 1500);
    const teto = (await (await fetch(`${gm}/api/loja/regras`)).json()).regras.teto;
    await abrir(edge, 'personagens', 1200);
    return [temQuadro && comprar === 0 && teto === 1000, `quadro ${temQuadro} · medscanner à venda com 500: ${comprar} · teto final ${teto}`];
  });
  await r.passo('mestre cria um código pela tela', async () => {
    await digitar('#cc-account-name', 'Caio');
    await edge.evaluate(`document.querySelector('[data-cc-account]').requestSubmit()`);
    await edge.sleep(800);
    const nomes = await edge.evaluate(`[...document.querySelectorAll('#cc-accounts tbody tr td:first-child')].map(td => td.textContent)`);
    return [nomes.includes('Caio'), nomes.join(', ')];
  });
  await r.passo('página Perícias: as 66 com descrição, e a busca acha pela descrição', async () => {
    await abrir(edge, 'skills', 900);
    const descricoes = await edge.evaluate(`document.querySelectorAll('#skill-table .skill-desc').length`);
    await digitar('#skill-filter', 'fechaduras');
    await edge.sleep(200);
    const visiveis = await edge.evaluate(`[...document.querySelectorAll('#skill-table tbody tr')].filter(tr => !tr.hidden).map(tr => tr.querySelector('b').textContent)`);
    return [descricoes === 66 && visiveis.join() === 'Arrombamento', `${descricoes} descrições · "fechaduras": ${visiveis.join(', ')}`];
  });
};
