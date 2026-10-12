// Agenda das mesas, histórico de versões e a página de Humanidade (ciberpsicose). O mestre marca sessões de duas
// campanhas (com aviso de horário cruzado); o jogador vê a próxima no Resumo e baixa o .ics; o mestre restaura uma
// versão antiga de um personagem pela Ficha. Servidor e pasta de dados só deste cenário; o jogador chega "pelo túnel".
const fs = require('fs');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');
const { abrir, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, r }) => {
  const porta = 8774;
  const base = `http://127.0.0.1:${porta}`;
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-agenda-'));
  const TUNEL = { 'CF-Connecting-IP': '203.0.113.8' };
  const pedir = async (caminho, { method = 'GET', body, headers = {} } = {}) => {
    const resposta = await fetch(base + caminho, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: resposta.status, dados: await resposta.json().catch(() => null), headers: resposta.headers };
  };
  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)})?.textContent || '').replace(/\\s+/g, ' ').trim()`);
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao).catch(() => false)) return true; await edge.sleep(250); } return false; };
  const responder = async (ok = true) => { await edge.evaluate(`document.querySelector('dialog.popup[open]:not(.popup-closing) [data-popup-${ok ? 'ok' : 'cancel'}]').click()`); await edge.sleep(500); };
  // Daqui a 3 dias às 19h (horário deste computador) e a mesma hora, uma hora depois.
  const dia = new Date();
  dia.setDate(dia.getDate() + 3);
  dia.setHours(19, 0, 0, 0);
  const emHoras = horas => new Date(dia.getTime() + horas * 3600000).toISOString();
  let servidor = null;
  try {
    servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados });
    const outra = (await pedir('/api/campanhas', { method: 'POST', body: { nome: 'Mesa B', nomeJogadores: 'Mesa B' } })).dados.campanha;
    const conta = (await pedir('/api/contas', { method: 'POST', body: { nome: 'Ana', campanhas: ['morana'] } })).dados.conta;
    const cookie = (await pedir('/api/entrar', { method: 'POST', body: { codigo: conta.codigo }, headers: TUNEL })).headers.get('set-cookie').split(';')[0];
    const contaB = (await pedir('/api/contas', { method: 'POST', body: { nome: 'Bia', campanhas: [outra.id] } })).dados.conta;
    const cookieB = (await pedir('/api/entrar', { method: 'POST', body: { codigo: contaB.codigo }, headers: TUNEL })).headers.get('set-cookie').split(';')[0];

    // ---------------- Agenda pela API ----------------
    let morana;
    let mesaB;
    await r.passo('agenda: o mestre marca; horários cruzados de campanhas diferentes viram aviso nas duas; o jogador não marca', async () => {
      morana = (await pedir('/api/agenda', { method: 'POST', body: { campanha: 'morana', inicio: emHoras(0), duracao: 240, titulo: 'Sessão 3: o hospital', nota: 'No Discord, tragam a ficha.' } })).dados.sessao;
      const criada = await pedir('/api/agenda', { method: 'POST', body: { campanha: outra.id, inicio: emHoras(2), duracao: 180 } });
      mesaB = criada.dados.sessao;
      const lista = criada.dados.sessoes;
      const jogador = await pedir('/api/agenda', { method: 'POST', body: { campanha: 'morana', inicio: emHoras(24) }, headers: { ...TUNEL, Cookie: cookie } });
      const semData = await pedir('/api/agenda', { method: 'POST', body: { campanha: 'morana', inicio: 'amanhã' } });
      const conflitos = Object.fromEntries(lista.map(item => [item.campanha, item.conflitos]));
      return [criada.status === 201 && lista.length === 2 && conflitos.morana[0] === mesaB.id && conflitos[outra.id][0] === morana.id && jogador.status === 403 && semData.status === 400,
        `marcadas ${lista.length} · conflitos ${JSON.stringify(conflitos)} · jogador ${jogador.status} · data inválida ${semData.status}`];
    });
    await r.passo('agenda: mudar o horário tira o aviso; cada jogador vê só as da campanha dele, sem o id da campanha', async () => {
      const mudou = (await pedir(`/api/agenda/${mesaB.id}`, { method: 'PUT', body: { inicio: emHoras(24) } })).dados.sessoes;
      const visaoAna = (await pedir('/api/visao', { headers: { ...TUNEL, Cookie: cookie } })).dados;
      const visaoBia = (await pedir('/api/visao', { headers: { ...TUNEL, Cookie: cookieB } })).dados;
      const semAviso = mudou.every(item => !item.conflitos.length);
      return [semAviso && visaoAna.agenda.length === 1 && visaoAna.agenda[0].titulo === 'Sessão 3: o hospital' && !('campanha' in visaoAna.agenda[0]) && visaoBia.agenda.length === 1 && visaoBia.agenda[0].id === mesaB.id,
        `sem aviso ${semAviso} · Ana ${JSON.stringify(visaoAna.agenda.map(item => item.titulo))} · Bia ${visaoBia.agenda.map(item => item.id).join()}`];
    });

    // ---------------- Agenda na tela do mestre ----------------
    await edge.send('Network.setBypassServiceWorker', { bypass: true });
    await edge.ir(`${base}/#agenda`, 1500);
    await r.passo('página Agenda das mesas: as próximas com a cor da campanha; marcar pelo formulário (sugere a semana seguinte)', async () => {
      await esperar(`document.querySelectorAll('#ag-list [data-ag-id]').length === 2`);
      const antes = await edge.evaluate(`document.querySelectorAll('#ag-list [data-ag-id]').length`);
      const sugerida = await edge.evaluate(`document.querySelector('#ag-new').elements.inicio.value`);
      await edge.evaluate(`(() => { const f = document.querySelector('#ag-new'); f.elements.titulo.value = 'Sessão 4'; f.requestSubmit(); })()`);
      await esperar(`document.querySelectorAll('#ag-list [data-ag-id]').length === 3`);
      const depois = await edge.evaluate(`[...document.querySelectorAll('#ag-list [data-ag-id]')].map(f => f.querySelector('.pv-row-head').textContent.replace(/\\s+/g, ' ').trim())`);
      const esperada = new Date(dia.getTime() + 7 * 86400000);
      const pad = n => String(n).padStart(2, '0');
      const local = `${esperada.getFullYear()}-${pad(esperada.getMonth() + 1)}-${pad(esperada.getDate())}T19:00`;
      return [antes === 2 && sugerida === local && depois.length === 3 && depois.some(linha => /Mesa B/.test(linha)), `antes ${antes} · sugerida ${sugerida} (esperada ${local}) · ${depois.join(' | ')}`];
    });
    await r.passo('agenda na tela: horário cruzado mostra o aviso; desmarcar pergunta antes', async () => {
      // Põe a da Mesa B de novo em cima da do Morana.
      await pedir(`/api/agenda/${mesaB.id}`, { method: 'PUT', body: { inicio: emHoras(1) } });
      await edge.ir(`${base}/?recarregar#agenda`, 1500);
      await esperar(`!!document.querySelector('.ag-clash')`);
      const aviso = await texto('.ag-clash');
      await edge.evaluate(`document.querySelector('#ag-list [data-ag-id="${mesaB.id}"] [data-ag-delete]').click()`);
      await edge.sleep(400);
      const pergunta = await edge.evaluate(`(document.querySelector('dialog.popup[open]') || {}).textContent || ''`);
      await responder(true);
      await esperar(`!document.querySelector('#ag-list [data-ag-id="${mesaB.id}"]')`);
      const restam = (await pedir('/api/agenda')).dados.sessoes.length;
      return [/Mesa B/.test(aviso) && /um mundo por vez/.test(aviso) && /Desmarcar/.test(pergunta) && restam === 2, `aviso "${aviso.slice(0, 90)}" · restam ${restam}`];
    });
    await edge.shot('agenda-mestre');

    // ---------------- Histórico de versões na Ficha do mestre ----------------
    await r.passo('Ficha do mestre: Histórico de versões lista a versão de antes; Restaurar volta e mantém as anotações', async () => {
      const criado = (await pedir('/api/personagens', { method: 'POST', body: { nome: 'Vera', role: 'solo', notas: 'versão original' }, headers: { ...TUNEL, Cookie: cookie } })).dados.personagem;
      const salvo = (await pedir(`/api/personagens/${criado.id}`, { method: 'PUT', body: { ...criado, nome: 'Vera (estragada)', notas: '' }, headers: { ...TUNEL, Cookie: cookie } })).dados.personagem;
      await pedir(`/api/personagens/${criado.id}/anotacoes`, { method: 'PUT', body: { texto: 'Deve 200eb ao Brakk.' }, headers: { ...TUNEL, Cookie: cookie } });
      await abrir(edge, 'ficha');
      await edge.evaluate(`wikiApp.openPage('ficha', { section: ${JSON.stringify(criado.id)} })`);
      await esperar(`!!document.querySelector('[data-cc-restore]')`);
      const caixa = await texto('[data-cc-history]');
      await edge.evaluate(`document.querySelector('[data-cc-restore]').click()`);
      await edge.sleep(400);
      await responder(true);
      await esperar(`/Vera/.test(document.querySelector('.cc-identity h3')?.textContent || '') && !/estragada/.test(document.querySelector('.cc-identity h3')?.textContent || '')`);
      const nome = await texto('.cc-identity h3');
      const doc = (await pedir(`/api/personagens/${criado.id}`)).dados.personagem;
      const depois = await texto('[data-cc-history]');
      return [/v1/.test(caixa) && /muda: nome/.test(caixa) && nome === 'Vera' && doc.notas === 'versão original' && doc.versao === salvo.versao + 1 && doc.anotacoes?.texto === 'Deve 200eb ao Brakk.' && /v2/.test(depois),
        `caixa "${caixa.slice(0, 90)}" · nome ${nome} · notas "${doc.notas}" · v${doc.versao} · anotação ${Boolean(doc.anotacoes)} · depois "${depois.slice(0, 60)}"`];
    });

    // ---------------- Humanidade: a tabela da ciberpsicose ----------------
    await r.passo('Humanidade: a tabela da ciberpsicose (EMP 2, 1, 0 e Humanidade negativa) e os traços', async () => {
      await abrir(edge, 'humanity', 500);
      const secoes = await edge.evaluate(`[...document.querySelectorAll('#content .section')].map(s => s.dataset.toc)`);
      const tabela = await edge.evaluate(`[...document.querySelectorAll('#content .section[data-toc="Ciberpsicose"] tbody tr')].map(tr => tr.cells[0].textContent)`);
      const tracos = await edge.evaluate(`document.querySelectorAll('#content .section[data-toc="Ciberpsicose"] ul')[0]?.children.length || 0`);
      return [secoes.includes('Ciberpsicose') && secoes.includes('Perda de Humanidade por trauma') && tabela.join('|') === '3 ou mais|2|1|0|0, com Humanidade negativa' && tracos === 9, `${secoes.join(', ')} · ${tabela.join('|')} · ${tracos} traços`];
    });

    // ---------------- Jogador: Próxima sessão no Resumo ----------------
    await edge.send('Network.setExtraHTTPHeaders', { headers: TUNEL });
    await edge.evaluate(`fetch('api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: ${JSON.stringify(conta.codigo)} }) })`);
    await edge.sleep(400);
    await edge.ir(`${base}/jogadores.html`, 1500);
    await r.passo('jogador: o Resumo mostra a próxima sessão (data, horário, título, nota) e as seguintes numa linha', async () => {
      await esperar(`!!document.querySelector('.pv-next')`);
      const cartao = await texto('.pv-next');
      return [/Próxima sessão/.test(cartao) && /19:00–23:00/.test(cartao) && /em 3 dias/.test(cartao) && /Sessão 3: o hospital/.test(cartao) && /No Discord/.test(cartao) && /Depois:/.test(cartao), cartao.slice(0, 160)];
    });
    await r.passo('jogador: Adicionar ao calendário baixa um .ics com o horário certo e lembrete', async () => {
      await edge.evaluate(`(() => { const original = URL.createObjectURL; URL.createObjectURL = blob => { window.__ics = blob; return original(blob); }; HTMLAnchorElement.prototype.click = function () { window.__icsNome = this.download; }; })()`);
      await edge.evaluate(`document.querySelector('[data-pv-ics]').click()`);
      await edge.sleep(300);
      const ics = await edge.evaluate(`window.__ics ? window.__ics.text() : ''`);
      const nome = await edge.evaluate(`window.__icsNome || ''`);
      const inicio = new Date(emHoras(0)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      return [/BEGIN:VEVENT/.test(ics) && ics.includes(`DTSTART:${inicio}`) && /SUMMARY:Night City\\, 2077: Sessão 3: o hospital/.test(ics) && /TRIGGER:-PT1H/.test(ics) && /\r\n/.test(ics) && /^sessao-\d{4}-\d\d-\d\d\.ics$/.test(nome), `${nome} · ${ics.split('\r\n').filter(linha => /^(DTSTART|SUMMARY|TRIGGER)/.test(linha)).join(' / ')}`];
    });
    await r.passo('jogador: a página Como jogamos explica o sistema, a carta X e a experiência, sem nada da campanha', async () => {
      await abrir(edge, 'pvGuia', 500);
      const pagina = await texto('#content');
      const menu = await edge.evaluate(`!!document.querySelector('.nav-item[data-page="pvGuia"]')`);
      return [menu && /carta X/.test(pagina) && /Pontos de Melhoria/.test(pagina) && /Mission Kit/.test(pagina) && /suplemento comunitário/.test(pagina) && !/Morana|Wakako|Sato/.test(pagina), `no menu ${menu} · ${pagina.slice(0, 90)}`];
    });
    await r.passo('jogador no celular: o cartão da próxima sessão cabe sem rolagem lateral', async () => {
      await edge.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await edge.sleep(500);
      const cabe = await semRolagemLateral(edge);
      await edge.shot('agenda-jogador-celular');
      await edge.send('Emulation.clearDeviceMetricsOverride');
      return [cabe, `sem rolagem lateral: ${cabe}`];
    });
  } finally {
    await edge.send('Network.setExtraHTTPHeaders', { headers: {} }).catch(() => {});
    await edge.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    if (servidor) servidor.kill();
    await edge.sleep(400);
    try { fs.rmSync(dados, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
};
