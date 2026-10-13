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
  const popupAberto = () => edge.evaluate(`(() => { const d = document.querySelector('dialog.popup[open]:not(.popup-closing)'); return d ? d.textContent.replace(/\\s+/g, ' ').trim() : ''; })()`);
  const responder = (ok = true, espera = 350) => clicar(`dialog.popup[open]:not(.popup-closing) [data-popup-${ok ? 'ok' : 'cancel'}]`, espera);
  const apertarEsc = async () => {
    for (const type of ['keyDown', 'keyUp']) await edge.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await edge.sleep(350);
  };
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
  // Entrar recarrega a página (o menu passa a ter as campanhas do jogador): espera a lista voltar.
  const esperarLista = async () => { for (let i = 0; i < 40 && !/Meus personagens/.test(await texto('#cc-root').catch(() => '')); i++) await edge.sleep(200); };
  await r.passo('com o código certo, entra e vê "Meus personagens"', async () => {
    await digitar('#cc-code', conta.codigo);
    await edge.evaluate(`document.querySelector('[data-cc-login]').requestSubmit()`);
    await edge.sleep(400);
    await esperarLista();
    const t = await texto('#cc-root');
    for (let i = 0; i < 20 && !/Ana/.test(await texto('.account-button')); i++) await edge.sleep(200);
    const botao = await texto('.account-button');
    return [/Ana/.test(botao) && /Meus personagens/.test(t) && !/NC-XXXX/.test(await edge.evaluate(`document.getElementById('cc-root').innerHTML`)), `conta: ${botao} · ${t.slice(0, 60)}`];
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
  const pontosHab = () => texto('[data-cc-abilities] .cc-points');
  await r.passo('passo 1: Consciência de Combate do Solo, 4 pontos, e não passa do total', async () => {
    const antes = await pontosHab();
    for (let i = 0; i < 3; i++) await clicar('[data-hab-plus="Initiative Reaction"]', 120);
    for (let i = 0; i < 3; i++) await clicar('[data-hab-plus="Threat Detection"]', 120); // a terceira já não cabe
    const depois = await pontosHab();
    const niveis = await edge.evaluate(`['Initiative Reaction', 'Threat Detection'].map(n => document.querySelector('[data-hab-plus="' + n + '"]').parentElement.querySelector('b').textContent)`);
    return [/0 de 4/.test(antes) && /4 de 4/.test(depois) && niveis.join(',') === '3,1', `${antes} → ${depois} · ${niveis.join(',')}`];
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
  await r.passo('passo 4: "Rolar tudo" também responde o Lifepath da Role (Solo: 4 perguntas)', async () => {
    const respostas = await edge.evaluate(`[...document.querySelectorAll('[data-rlp]')].map(s => s.value)`);
    const titulo = await edge.evaluate(`[...document.querySelectorAll('#cc-step h3')].map(h => h.textContent).find(t => /Lifepath da Role/.test(t)) || ''`);
    return [respostas.length === 4 && respostas.every(Boolean) && /Solo/.test(titulo), `${titulo} · respostas ${respostas.join(',')}`];
  });
  await r.passo('passo 5: pacote do Solo; Neural Link já vem no Neuroport; EMP 5 → 4', async () => {
    await passo(5);
    const t = await texto('#cc-step');
    return [/já vem no Neuroport/.test(t) && /Humanidade 43\/50/.test(t) && /EMP 4/.test(t), (t.match(/Humanidade \d[^P]*/) || [])[0]];
  });
  // Montagem: o pacote já vem montado; descarregar uma arma e tirar a armadura aparecem na ficha.
  const abaMontagem = async aba => clicar(`[data-mont-tab="${aba}"]`, 200);
  await r.passo('montagem: armas do pacote já carregadas com a munição compatível', async () => {
    await abaMontagem('armas');
    const carregadas = await edge.evaluate(`[...document.querySelectorAll('[data-mont-municao]')].map(s => s.selectedOptions[0].textContent)`);
    return [carregadas.length >= 2 && carregadas.every(texto => !/descarregada/.test(texto)), carregadas.join(' | ')];
  });
  await r.passo('montagem: descarregar a arma e tirar a armadura do corpo; a ficha mostra', async () => {
    const primeira = await edge.evaluate(`document.querySelector('[data-mont-municao]').dataset.montMunicao`);
    await escolher(`[data-mont-municao="${primeira}"]`, '-');
    await abaMontagem('armadura');
    await edge.evaluate(`(() => { const r = [...document.querySelectorAll('[data-mont-armadura="corpo"]')].find(i => i.value === '-'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await edge.sleep(250);
    await edge.evaluate("document.querySelector('[data-cc-mount]').scrollIntoView()");
    await edge.shot('montagem-armadura');
    await passo(7);
    const ficha = (await texto('#cc-step')).replace(/\s+/g, ' ');
    return [/descarregada/.test(ficha) && /SP corpo 0/.test(ficha) && /SP cabeça 11/.test(ficha), (ficha.match(/SP cabeça \d+ ?SP corpo \d+/) || [''])[0]];
  });
  await r.passo('montagem: voltar a armadura e a munição deixa tudo como antes', async () => {
    await passo(5);
    await abaMontagem('armadura');
    const armadura = await edge.evaluate(`[...document.querySelectorAll('[data-mont-armadura="corpo"]')].find(i => i.value !== '-').value`);
    await edge.evaluate(`(() => { const r = document.querySelector('[data-mont-armadura="corpo"][value="${armadura}"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await edge.sleep(250);
    await abaMontagem('armas');
    const primeira = await edge.evaluate(`document.querySelector('[data-mont-municao]').dataset.montMunicao`);
    const opcao = await edge.evaluate(`[...document.querySelector('[data-mont-municao="${primeira}"]').options].find(o => o.value !== '-').value`);
    await escolher(`[data-mont-municao="${primeira}"]`, opcao);
    await passo(7);
    const ficha = (await texto('#cc-step')).replace(/\s+/g, ' ');
    return [!/descarregada/.test(ficha) && /SP corpo 11/.test(ficha), (ficha.match(/SP cabeça \d+ ?SP corpo \d+/) || [''])[0]];
  });
  const escolherRadio = async seletor => { await edge.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(seletor)}); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`); await edge.sleep(250); };
  const totalMoradia = async () => (await texto('.cc-housing-total')).replace(/\s+/g, ' ');
  await r.passo('passo 6: o padrão é grátis; quitinete cobra a diferença (500eb) no 1º mês', async () => {
    await passo(6);
    const padrao = await totalMoradia();
    await escolherRadio('[data-moradia="quitinete"]');
    const melhor = await totalMoradia();
    await edge.shot('moradia');
    return [/Por mês 1\.100eb/.test(padrao) && /1º mês grátis/.test(padrao) && /Por mês 1\.600eb/.test(melhor) && /1º mês 500eb/.test(melhor) && /depois disso 0eb/.test(melhor), `${padrao} → ${melhor}`];
  });
  await r.passo('passo 6: Trauma Team Prata paga o 1º mês inteiro e o dinheiro fica negativo', async () => {
    await escolherRadio('[data-trauma="prata"]');
    const t = await totalMoradia();
    const resumo = (await texto('#cc-summary')).replace(/\s+/g, ' ');
    return [/Por mês 2\.100eb/.test(t) && /1º mês 1\.000eb/.test(t) && /-500eb/.test(resumo), `${t} · resumo: ${resumo.match(/Dinheiro[^A-Z]*/)?.[0]}`];
  });
  await r.passo('passo 6: hotel cápsula (mais barato) não devolve dinheiro; volta ao padrão', async () => {
    await escolherRadio('[data-trauma="nenhum"]');
    await escolherRadio('[data-moradia="capsula"]');
    const barato = await totalMoradia();
    await escolherRadio('[data-moradia="conteiner"]');
    await escolherRadio('[data-estilo-vida="kibble"]');
    const final = await totalMoradia();
    return [/Por mês 600eb/.test(barato) && /depois disso 500eb/.test(barato) && /1º mês grátis/.test(final), `${barato} · ${final}`];
  });
  await r.passo('salva sozinho e, recarregando, continua igual', async () => {
    const ok = await salvo();
    await edge.ir(`${rede}/#criador/${soloId}`, 2500);
    await passo(1);
    const nome = await edge.evaluate(`document.querySelector('[data-campo="nome"]').value`);
    return [ok && nome === 'Jay', `salvo ${ok} · nome "${nome}"`];
  });
  // Retrato: uma imagem de 1024×768 feita na hora, posta no campo de arquivo como se o jogador escolhesse.
  const retratoNaTela = () => edge.evaluate(`(() => { const i = document.querySelector('#cc-step img.cc-portrait'); return i && i.complete ? [i.naturalWidth, i.naturalHeight] : null; })()`);
  await r.passo('retrato: a imagem enviada chega reduzida a 512 px e aparece no passo 1', async () => {
    await passo(1);
    await edge.evaluate(`(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
      const g = canvas.getContext('2d'); g.fillStyle = '#d5f36b'; g.fillRect(0, 0, 1024, 768);
      const blob = await new Promise(ok => canvas.toBlob(ok, 'image/png'));
      const lista = new DataTransfer(); lista.items.add(new File([blob], 'rosto.png', { type: 'image/png' }));
      const campo = document.querySelector('[data-portrait-file]'); campo.files = lista.files;
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    let tamanho = null;
    for (let i = 0; i < 25 && !(tamanho && tamanho[0]); i++) { await edge.sleep(200); tamanho = await retratoNaTela(); }
    const arquivo = await fetch(`${gm}/api/personagens/${soloId}/retrato`);
    return [tamanho?.join('x') === '512x384' && /^image\/(webp|jpeg)$/.test(arquivo.headers.get('content-type')), `na tela ${tamanho?.join('x')} · servido como ${arquivo.headers.get('content-type')}`];
  });
  await r.passo('retrato: aparece na ficha e em miniatura na lista', async () => {
    await salvo();
    await clicar('[data-cc-sheet]', 1200);
    const naFicha = await edge.evaluate(`!!document.querySelector('.cc-identity img.cc-portrait')`);
    await edge.shot('ficha-retrato');
    await abrir(edge, 'personagens', 900);
    const miniatura = await edge.evaluate(`[...document.querySelectorAll('.cc-card')].some(card => /Jay/.test(card.textContent) && card.querySelector('img.cc-thumb'))`);
    return [naFicha && miniatura, `ficha ${naFicha} · lista ${miniatura}`];
  });
  await r.passo('retrato: "Tirar retrato" apaga a imagem do servidor', async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(soloId)} })`);
    await edge.sleep(1200);
    await passo(1);
    await clicar('[data-portrait-remove]', 800);
    const vazio = await edge.evaluate(`!!document.querySelector('#cc-step .cc-portrait-empty')`);
    const arquivo = await fetch(`${gm}/api/personagens/${soloId}/retrato`);
    return [vazio && arquivo.status === 404, `quadro vazio ${vazio} · servidor ${arquivo.status}`];
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
  await r.passo('ficha: o Lifepath da Role aparece no Lifepath', async () => {
    const t = (await texto('#cc-root')).replace(/\s+/g, ' ');
    return [/Lifepath da Role ?Que tipo de Solo você é\? \S/.test(t), (t.match(/Lifepath da Role.{0,90}/) || [''])[0]];
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
    await clicar('[data-skill-suggest]');
    const pergunta = await popupAberto();
    await responder();
    const [usados, total] = await pontos();
    const atletismo = await edge.evaluate(`document.querySelector('[data-skill-plus="Athletics"]').parentElement.querySelector('b').textContent`);
    return [/Distribuir o sugerido/i.test(pergunta) && usados === 86 && total === 86 && atletismo === '2', `pop-up "${pergunta.slice(0, 50)}" · ${usados}/${total} · Atletismo ${atletismo}`];
  });

  // ---------- Oficina da Família do Nomad ----------
  const opcoesOficina = linha => edge.evaluate(`[...document.querySelectorAll('[data-oficina="${linha}"] option')].map(o => o.value).filter(Boolean)`);
  await r.passo('Nomad: 4 escolhas na Oficina; a Capacidade de alojamento só aparece depois do Chassis pesado', async () => {
    await novo();
    await clicar('[data-role="nomad"]');
    await clicar('[data-method="ratoderua"]');
    await escolher('[data-oficina="0"]', 'v:Compact Groundcar');
    const semChassis = await opcoesOficina(1);
    await escolher('[data-oficina="1"]', 'u:0:Heavy Chassis');
    const comChassis = await opcoesOficina(2);
    await escolher('[data-oficina="2"]', 'u:0:Housing Capacity');
    await escolher('[data-oficina="3"]', 'v:Roadbike');
    const frota = (await texto('[data-cc-motorpool] .cc-items')).replace(/\s+/g, ' ');
    await edge.evaluate(`document.querySelector('[data-cc-motorpool]').scrollIntoView()`);
    await edge.shot('oficina');
    const pend = await edge.evaluate(`document.querySelector('#cc-summary').textContent`);
    return [!semChassis.includes('u:0:Housing Capacity') && comChassis.includes('u:0:Housing Capacity') && !comChassis.includes('v:Compact Groundcar') && /Groundcar Compacto: Chassis pesado, Capacidade de alojamento/.test(frota) && /Moto Estradeira/.test(frota), frota];
  });
  await r.passo('Nomad: trocar o Chassis por NOS invalida a Capacidade de alojamento (vira pendência)', async () => {
    await escolher('[data-oficina="1"]', 'u:0:NOS');
    const invalida = await edge.evaluate(`document.querySelector('[data-oficina="2"]').selectedOptions[0].textContent`);
    await passo(7);
    const pend = await texto('#cc-step .cc-warn');
    return [/não vale mais/.test(invalida) && /Oficina da Família: falta 1 escolha/.test(pend), `${invalida} · ${pend.slice(0, 120)}`];
  });

  // ---------- Netrunner de 2077 ----------
  await r.passo('Netrunner (Rato de Rua): o kit de 2077 troca o cyberdeck e os programas pelo Hunter e 3 quickhacks', async () => {
    await novo();
    await clicar('[data-role="netrunner"]');
    await clicar('[data-method="ratoderua"]');
    await passo(5);
    const red = await texto('#cc-step');
    await edge.evaluate("(() => { const r = document.querySelector('[data-kitnet=\"2077\"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await edge.sleep(250);
    for (const id of ['weapon-glitch', 'request-backup', 'bait']) {
      await edge.evaluate(`(() => { const c = document.querySelector('[data-quickhack="netrunning-2077:${id}"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await edge.sleep(200);
    }
    const travado = await edge.evaluate("document.querySelector('[data-quickhack=\"netrunning-2077:reboot-optics\"]').disabled");
    const itens = await edge.evaluate("[...document.querySelectorAll('.cc-items li')].map(li => li.textContent)");
    const pacote = itens.join(' | ');
    return [/Cyberdeck/.test(red) && /Militech Hunter MK\.1/.test(pacote) && /Weapon Glitch/.test(pacote) && /Bait/.test(pacote) && !/Cyberdeck/.test(pacote) && !/Worm/.test(pacote) && travado, `quarto travado: ${travado} · ${pacote.slice(0, 160)}`];
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
    await responder();
    const [usados] = await pontos();
    await edge.shot('criador-pericias');
    const resumo = (await texto('#cc-summary')).replace(/\s+/g, ' ');
    return [primeiras.slice(0, 20).every(Boolean) && !primeiras[20] && descricoes >= 60 && usados === 86 && /Perícias ?86 de 86/.test(resumo), `sugeridas no topo: ${primeiras.filter(Boolean).length} · descrições: ${descricoes} · pontos ${usados}`];
  });
  const carteira = () => texto('.cc-wallet');
  const abrirPainel = async id => {
    if (await edge.evaluate(`document.querySelector('[data-painel="${id}"]').hidden`)) await clicar(`[data-shop-painel="${id}"]`);
    return edge.evaluate(`!document.querySelector('[data-painel="${id}"]').hidden && document.querySelector('[data-painel="${id}"]').offsetHeight > 0`);
  };
  const buscarNaLoja = async termo => { await edge.evaluate(`(() => { const s = document.querySelector('[data-shop-busca]'); s.value = ${JSON.stringify(termo)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`); await edge.sleep(200); };
  await r.passo('Lifepath da Role do Netrunner: "Trabalha sozinho" esconde a pergunta do parceiro', async () => {
    await passo(4);
    const antes = await edge.evaluate(`document.querySelectorAll('[data-rlp]').length`);
    await clicar('[data-rlp-pick="parceiro:1"]');
    const comParceiro = await edge.evaluate(`!!document.querySelector('[data-rlp="quemParceiro"]')`);
    await clicar('[data-rlp-pick="parceiro:2"]');
    const sozinho = await edge.evaluate(`!!document.querySelector('[data-rlp="quemParceiro"]')`);
    await edge.evaluate(`document.querySelector('.cc-rlp').scrollIntoView()`);
    await edge.shot('criador-lifepath-role');
    const ativo = await edge.evaluate(`(document.querySelector('[data-rlp-pick].active') || {}).textContent || ''`);
    return [antes === 5 && comParceiro && !sozinho && ativo === 'Trabalha sozinho', `${antes} perguntas de lista · com parceiro: ${comParceiro} · sozinho: ${sozinho} · marcado: ${ativo}`];
  });
  await r.passo('loja no passo 5: 2.550eb; Sandevistan (500eb) desconta', async () => {
    await passo(5);
    await buscarNaLoja('sandevistan');
    await clicar('[data-shop-buy="core_cyberware:sandevistan"]');
    const c = await carteira();
    return [/2\.050eb de 2\.550eb/.test(c), c];
  });
  // Devolve o item pelo nome no painel "Comprados".
  const devolver = async nome => {
    await abrirPainel('comprado');
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
    const botao = (await texto('[data-shop-painel="comprado"]')).replace(/\s+/g, ' ');
    const fechado = await edge.evaluate(`document.querySelector('[data-painel="comprado"]').hidden`);
    const aberto = await abrirPainel('comprado');
    const lista = await texto('[data-cc-bought]');
    await devolver('Mão de ferramentas');
    const depois = await carteira();
    await clicar('[data-shop-painel="comprado"]');
    return [/precisa da base/.test(aviso) && /1\.950eb/.test(antes) && /2\.050eb/.test(depois) && /Comprados 3/i.test(botao) && fechado && aberto && /Mão de ferramentas/.test(lista),
      `${aviso} · ${antes.match(/[\d.]+eb/)} → ${depois.match(/[\d.]+eb/)} · botão "${botao}", painel fechado ${fechado} → aberto ${aberto}`];
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
  await r.passo('loja de criação: o Black Chrome fica à venda e marcado (o Cyberdedo laser sim; a Weeping Reaver, acima do teto, não)', async () => {
    await buscarNaLoja('cyberdedo laser');
    const dedo = await edge.evaluate(`document.querySelectorAll('[data-shop-buy="black-chrome_cyberware:laser-pointer-cyberfinger"]').length`);
    const marca = await edge.evaluate(`(document.querySelector('[data-shop-row="black-chrome_cyberware:laser-pointer-cyberfinger"] .cc-shop-sub') || {}).textContent || ''`);
    await buscarNaLoja('weeping reaver');
    // A katana passa do teto; os três fluidos dela (100eb) aparecem.
    const katana = await edge.evaluate(`document.querySelectorAll('[data-shop-buy="black-chrome_weapons:arasaka-weeping-reaver-katana"]').length`);
    const fluidos = await edge.evaluate(`document.querySelectorAll('[data-shop-buy^="black-chrome_ammo:arasaka-"]').length`);
    await buscarNaLoja('');
    return [dedo === 1 && /Black Chrome/.test(marca) && katana === 0 && fluidos === 3, `cyberdedo: ${dedo} · "${marca}" · katana: ${katana} · fluidos: ${fluidos}`];
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
    const antes = await edge.evaluate(`document.querySelectorAll('.cc-items li').length`);
    await clicar('[data-shop-kit]', 300);
    const cancelado = await popupAberto();
    await responder(false);
    const semCompra = await edge.evaluate(`document.querySelectorAll('.cc-items li').length`);
    await clicar('[data-shop-kit]', 300);
    const itensNoPopup = await edge.evaluate(`document.querySelectorAll('dialog.popup[open] .popup-list li').length`);
    await edge.shot('popup-kit');
    await responder(true, 500);
    const depois = await edge.evaluate(`document.querySelectorAll('.cc-items li').length`);
    const msg = await texto('#cc-shop-msg');
    const c = (await carteira()).replace(/\s+/g, ' ');
    return [/Comprar o kit sugerido/i.test(cancelado) && semCompra === antes && itensNoPopup > 5 && depois > antes + 5 && /Kit comprado\. Sobram/.test(msg) && !/cc-bad/.test(await edge.evaluate(`document.querySelector('.cc-wallet').innerHTML`)),
      `${antes} → ${depois} itens (cancelar: ${semCompra}) · pop-up com ${itensNoPopup} itens · ${msg} · ${c}`];
  });
  await r.passo('montagem do Netrunner: o cyberdeck do kit com os programas dentro', async () => {
    await clicar('[data-mont-tab="net"]', 250);
    const t = (await texto('[data-cc-mount] .cc-mount')).replace(/\s+/g, ' ');
    await edge.evaluate("document.querySelector('[data-cc-mount]').scrollIntoView()");
    await edge.shot('montagem-net');
    // Armor, See Ya, Worm e dois Swords: 5 programas de 1 slot.
    return [/Cyberdeck/.test(t) && /5 de 7 slots/.test(t) && /deck ativo/.test(t), t.slice(0, 200)];
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
  await r.passo('depois que vai para o Foundry, a Loja vira a loja da campanha (sem a loja inicial)', async () => {
    await post(gm, `/api/personagens/${pacoteId}/foundry`, { ator: 'abc', nomeAtor: 'Lin', versao: 1 }, 'PUT');
    await abrir(edge, 'personagens', 600);
    await edge.evaluate(`wikiApp.openPage('loja', { section: ${JSON.stringify(pacoteId)} })`);
    await edge.sleep(1200);
    const t = await texto('#cc-shop');
    const inicial = await edge.evaluate(`document.querySelectorAll('[data-shop-buy]').length`);
    const campanha = await edge.evaluate(`document.querySelectorAll('[data-pedido-por]').length`);
    return [/Seu pedido/.test(t) && inicial === 0 && campanha > 0, `loja inicial ${inicial} botões · campanha ${campanha}`];
  });
  await r.passo('loja da campanha: pistola e munição no pedido, carregada com a munição do pedido; vai para o mestre', async () => {
    await buscarNaLoja('pistola pesada');
    await clicar('[data-pedido-por="core_weapons:heavy-pistol"]');
    await buscarNaLoja('munição de pistola pesada · básica');
    await clicar('[data-pedido-por="core_ammo:heavy-pistol-basic"]');
    const botao = (await texto('[data-shop-painel="pedido"]')).replace(/\s+/g, ' ');
    const marcado = await texto('[data-shop-row="core_ammo:heavy-pistol-basic"] .cc-badge');
    const aberto = await abrirPainel('pedido');
    await escolher('[data-pedido-municao="0"]', '@1');
    const total = (await texto('[data-pedido-enviar]')).replace(/\s+/g, ' ');
    await clicar('[data-pedido-enviar]', 800);
    const msg = await texto('[data-pedido-msg]');
    const pedidos = (await texto('[data-cc-orders]')).replace(/\s+/g, ' ');
    const enviados = await edge.evaluate(`!document.querySelector('[data-cc-orders]').hidden`);
    const doc = (await (await fetch(`${gm}/api/personagens/${pacoteId}`)).json()).personagem;
    const p = (doc.pedidos || [])[0] || {};
    await buscarNaLoja('');
    await edge.shot('loja-campanha');
    return [/Pedido enviado/.test(msg) && /esperando o mestre/.test(pedidos) && p.total === 110 && p.itens?.[0]?.municao === `pedido:${p.id}:1` && /Seu pedido 2 · 110eb/i.test(botao) && /no pedido 10/i.test(marcado) && aberto && enviados,
      `botão "${botao}" · ${total} · ${msg} · total ${p.total} · munição da pistola ${p.itens?.[0]?.municao} · painel do pedido ${aberto}, dos enviados ${enviados}`];
  });
  // ---------- Depois do Foundry: o Foundry manda ----------
  await r.passo('depois do Foundry: o criador avisa e trava o que é regra; o nome continua aberto', async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(pacoteId)} })`);
    await edge.sleep(1200);
    const aviso = await texto('.cc-locked-note');
    await passo(1);
    const nomeLivre = await edge.evaluate(`!document.querySelector('[data-campo="nome"]').closest('fieldset[disabled]')`);
    const roleTravada = await edge.evaluate(`!!document.querySelector('[data-role]').closest('fieldset[disabled]')`);
    await passo(2);
    const statsTravados = await edge.evaluate(`!!document.querySelector('#cc-step fieldset.cc-locked[disabled]')`);
    return [/já está no Foundry/.test(aviso) && nomeLivre && roleTravada && statsTravados, `aviso ${Boolean(aviso)} · nome livre ${nomeLivre} · Role travada ${roleTravada} · STATs travados ${statsTravados}`];
  });
  await r.passo('depois do Foundry: o servidor não aceita do jogador STATs nem itens; aceita notas e Lifepath', async () => {
    const res = await edge.evaluate(`(async () => {
      const atual = (await (await fetch('api/personagens/${pacoteId}')).json()).personagem;
      const body = { ...atual, stats: { ...atual.stats, INT: 1 }, itens: [], notas: 'nota depois do Foundry',
        resultado: { ...atual.resultado, stats: { ...atual.resultado.stats, INT: 1 }, lifepath: { ...atual.resultado.lifepath, culturalOrigin: 'Origem mudada' } } };
      const salvo = (await (await fetch('api/personagens/${pacoteId}', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()).personagem;
      return { int: salvo.stats.INT, antes: atual.stats.INT, itens: salvo.itens.length, antesItens: atual.itens.length, rint: salvo.resultado.stats.INT, notas: salvo.notas, origem: salvo.resultado.lifepath.culturalOrigin };
    })()`);
    return [res.int === res.antes && res.itens === res.antesItens && res.rint !== 1 && res.notas === 'nota depois do Foundry' && res.origem === 'Origem mudada', JSON.stringify(res)];
  });
  await r.passo('ficha da mesa: mostra o estado do Foundry (HP ferido, pente, lesão, Pontos de Melhoria, ataque)', async () => {
    await post(gm, `/api/personagens/${pacoteId}/mesa`, {
      ator: 'abc', quando: new Date().toISOString(), stats: { INT: 7, REF: 8, DEX: 6, TECH: 6, COOL: 5, WILL: 5, LUCK: 5, MOVE: 6, BODY: 5, EMP: 5 },
      hp: { atual: 20, max: 40 }, humanidade: { atual: 50, max: 60 }, sorte: { atual: 3, max: 5 }, sp: { cabeca: 11, corpo: 11 }, dinheiro: 123, ip: 10, reputacao: 1,
      pericias: [{ nome: 'Handgun', nivel: 6, stat: 'REF' }, { nome: 'Language (Streetslang)', nivel: 2, stat: 'INT' }], lesoes: ['Costela quebrada'],
      itens: [{ nome: 'Heavy Pistol', tipo: 'weapon', uso: 'equipped', dano: '3d6', cdt: 2, pericia: 'Handgun', distancia: true, maos: 1, pente: { atual: 4, max: 8 }, municao: 'Heavy Pistol (Basic)', dentro: ['Heavy Pistol (Basic)'] }],
      role: { nome: 'Netrunner', rank: 4, habilidades: [] }, moradia: { housing: { custo: 1000, descricao: 'Contêiner de carga' }, lifeStyle: { custo: 100, descricao: 'Prepak genérico' }, traumaTeam: { custo: 0, descricao: '' } }
    }, 'PUT');
    await edge.evaluate(`wikiApp.openPage('ficha', { section: ${JSON.stringify(pacoteId)} })`);
    await edge.sleep(1200);
    const t = (await texto('#cc-root')).replace(/\s+/g, ' ');
    await edge.shot('ficha-mesa');
    return [/Na mesa/.test(t) && /HP 20\/40/.test(t) && /4\/8/.test(t) && /carregada com Heavy Pistol \(Basic\)/.test(t) && /Costela quebrada/.test(t) && /Pontos de Melhoria 10/.test(t) && /14 REF \+ Armas de uma Mão/.test(t),
      (t.match(/Vitais.{0,160}/) || [''])[0]];
  });
  await r.passo('apagar personagem pede num pop-up: Cancelar e Esc não apagam; Apagar apaga e avisa', async () => {
    const id = await novo();
    await digitar('[data-campo="nome"]', 'Descartável');
    await salvo();
    await abrir(edge, 'personagens', 900);
    const existe = () => edge.evaluate(`!!document.querySelector('[data-cc-delete="${id}"]')`);
    await clicar(`[data-cc-delete="${id}"]`, 300);
    const pergunta = await popupAberto();
    const foco = await edge.evaluate(`document.activeElement && document.activeElement.hasAttribute('data-popup-cancel')`);
    await responder(false);
    const depoisCancelar = await existe();
    await clicar(`[data-cc-delete="${id}"]`, 300);
    await apertarEsc();
    const depoisEsc = await existe() && !(await popupAberto());
    await clicar(`[data-cc-delete="${id}"]`, 300);
    await edge.shot('popup-apagar');
    await responder(true, 900);
    const aviso = await texto('.toast-stack');
    const sumiu = !(await existe());
    return [/Apagar Descartável\?/.test(pergunta) && foco && depoisCancelar && depoisEsc && sumiu && /Personagem Descartável apagado/.test(aviso),
      `pop-up "${pergunta.slice(0, 60)}" · foco no Cancelar ${foco} · cancelar ${depoisCancelar} · Esc ${depoisEsc} · apagado ${sumiu} · aviso "${aviso}"`];
  });
  await r.passo('pop-up de texto: Enter devolve o que foi escrito; Esc devolve nada', async () => {
    await edge.evaluate(`window.__resposta = 'esperando'; wikiPopup.prompt({ title: 'Recusar o pedido', label: 'Motivo' }).then(v => { window.__resposta = v; }); 0`);
    await edge.sleep(250);
    await edge.evaluate(`(() => { const i = document.querySelector('dialog.popup[open] input'); i.value = 'sem estoque'; i.form.requestSubmit(); })()`);
    await edge.sleep(300);
    const escrito = await edge.evaluate('window.__resposta');
    await edge.evaluate(`window.__resposta = 'esperando'; wikiPopup.prompt({ title: 'Outro' }).then(v => { window.__resposta = v; }); 0`);
    await edge.sleep(250);
    await apertarEsc();
    const cancelado = await edge.evaluate('window.__resposta');
    const sobrou = await edge.evaluate(`document.querySelectorAll('dialog.popup').length`);
    return [escrito === 'sem estoque' && cancelado === null && sobrou === 0, `Enter: ${JSON.stringify(escrito)} · Esc: ${JSON.stringify(cancelado)} · pop-ups sobrando ${sobrou}`];
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
    // A lista compacta no celular: um toque na linha abre a descrição inteira.
    await clicar('[data-shop-cat="cyberware"]');
    await edge.evaluate("document.querySelector('.cc-shop-bar').scrollIntoView()");
    await clicar('.cc-shop-item.cc-has-desc .cc-shop-info b');
    const abriu = await edge.evaluate("document.querySelector('.cc-shop-item.cc-has-desc').classList.contains('cc-open')");
    const lista = await semRolagemLateral(edge);
    await edge.shot('loja-celular-lista');
    // Pop-up no celular: sobe de baixo, com os botões largos.
    await edge.evaluate("wikiPopup.confirm({ title: 'Apagar personagem', html: '<p>Apagar <b>Jay</b>? Sai da lista de personagens.</p>', ok: 'Apagar', danger: true }); 0");
    await edge.sleep(300);
    const popupCabe = await edge.evaluate("(() => { const r = document.querySelector('dialog.popup[open] .popup-box').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1; })()");
    await edge.shot('popup-celular');
    await apertarEsc();
    await edge.celular(false);
    return [criador && loja && lista && abriu && popupCabe, `criador ${criador} · loja ${loja} · lista ${lista} · descrição abre com um toque ${abriu} · pop-up cabe na tela ${popupCabe}`];
  });
  await r.passo('outro jogador não abre o criador da Ana', async () => {
    // Sai pelo menu da conta (canto de cima), como o jogador: a página recarrega.
    await edge.evaluate(`document.querySelector('.account-button').click()`);
    await edge.sleep(300);
    await edge.evaluate(`document.querySelector('[data-account-logout]').click()`);
    for (let i = 0; i < 40 && !/Entrar/.test(await texto('.account-button').catch(() => '')); i++) await edge.sleep(200);
    await abrir(edge, 'personagens', 800);
    await digitar('#cc-code', outra.codigo);
    await edge.evaluate(`document.querySelector('[data-cc-login]').requestSubmit()`);
    await edge.sleep(400);
    await esperarLista();
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
    // Lin foi para o Foundry e depois o jogador mudou o Lifepath: o selo avisa que mudou, e o cartão mostra o HP da mesa.
    const hpDoLin = await edge.evaluate(`(() => { const card = [...document.querySelectorAll('.cc-card')].find(c => c.querySelector('strong')?.textContent === 'Lin'); const hp = card?.querySelector('.cc-card-numbers div'); return hp ? hp.textContent.replace(/\\s+/g, ' ').trim() : ''; })()`);
    return [/Jay \(de Ana\): importar/.test(esperando) && /Importar da wiki/.test(esperando) && !/Lin/.test(esperando) && selos.includes('esperando o mestre') && selos.includes('mudou depois de importar') && hpDoLin === 'HP na mesa20/40', `${esperando.slice(0, 100)} · selos: ${[...new Set(selos)].join(', ')} · HP do Lin: ${hpDoLin}`];
  });
  await r.passo('mestre: o quadro "Pedidos da campanha" mostra o pedido; aprovado na Loja, fica esperando o Foundry', async () => {
    const quadro = (await texto('[data-cc-orders-gm]')).replace(/\s+/g, ' ');
    await edge.evaluate(`wikiApp.openPage('loja', { section: ${JSON.stringify(pacoteId)} })`);
    await edge.sleep(1200);
    const jaAberto = await edge.evaluate(`!document.querySelector('[data-cc-orders]').hidden`);
    const alerta = await texto('[data-shop-painel="pedidos"] .cc-tab-alert');
    await clicar('[data-pedido-aprovar]', 800);
    const pedidos = (await texto('[data-cc-orders]')).replace(/\s+/g, ' ');
    await abrir(edge, 'personagens', 1000);
    return [/Lin.*1 esperando você/.test(quadro) && /aprovado, esperando o Foundry entregar/.test(pedidos) && jaAberto && /1 para aprovar/.test(alerta), `${quadro.slice(0, 120)} · ${pedidos.slice(0, 120)} · abriu nos pedidos ${jaAberto} (${alerta})`];
  });
  await r.passo('loja do mestre: pedidos, regras e catálogo à vista; baixar o teto para 500eb esconde os de 1.000eb', async () => {
    await abrir(edge, 'loja', 1500);
    const quadros = await edge.evaluate(`({ regras: !document.querySelector('[data-cc-rules]').hidden && document.querySelector('[data-rule-teto]').offsetHeight > 0, pedidos: !!document.querySelector('[data-gm-orders]'), titulo: document.querySelector('#content h2').textContent })`);
    await edge.shot('loja-mestre');
    await edge.evaluate(`(() => { const t = document.querySelector('[data-rule-teto]'); t.value = '500'; })()`);
    await clicar('[data-rule-save]', 1500);
    const salvo = await texto('#cc-rules-msg');
    await buscarNaLoja('medscanner');
    const situacao = await texto('[data-shop-row="core_gear:medscanner"] .shop-status');
    await edge.evaluate(`(() => { const t = document.querySelector('[data-rule-teto]'); t.value = '1000'; })()`);
    await clicar('[data-rule-save]', 1500);
    const depois = await texto('[data-shop-row="core_gear:medscanner"] .shop-status');
    const teto = (await (await fetch(`${gm}/api/loja/regras`)).json()).regras.teto;
    await abrir(edge, 'personagens', 1200);
    return [quadros.regras && quadros.pedidos && /mestre/i.test(quadros.titulo) && /Regras salvas/.test(salvo) && /acima de 500eb/i.test(situacao) && /Visível/i.test(depois) && teto === 1000,
      `${JSON.stringify(quadros)} · ${salvo} · medscanner com 500: "${situacao}", com 1.000: "${depois}" · teto final ${teto}`];
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
