// A aba Narrar da sessão, no navegador: o mestre abre a sessão, lê a abertura, segue para a entrada, escolhe um caminho,
// fixa cartões, volta pelo Voltar do navegador, mexe na hora e no alarme (que mostram os gatilhos) e abre no celular. A
// aba Roteiro continua com o texto inteiro, sem as linhas de marcação. Servidor e pasta de dados só deste cenário; o
// roteiro é inventado (a trama de verdade fica no servidor).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');
const { semRolagemLateral } = require('../lib/wiki');

const ROTEIRO = [
  '# Sessão 01: O teste',
  '',
  '## Página de mesa',
  '',
  '### O relógio',
  '',
  '- **Consulta:** relogio',
  '',
  '| Hora | Na casa |',
  '|---|---|',
  '| 22:00 | A porta abre. |',
  '| 22:30 | O carro chega: [O carro](momento:carro). |',
  '',
  '### O alarme',
  '',
  '- **Consulta:** alarme',
  '',
  '| Degrau | O que faz subir | O que a casa faz |',
  '|---|---|---|',
  '| **Calmo** | — | Nada acontece. |',
  '| **Cerco** | Um tiro. | Todos acordam. [A fuga](momento:fuga) |',
  '',
  '### As válvulas',
  '',
  '- **Consulta:** valvulas',
  '',
  '- Se a mesa travar, o telefone toca.',
  '',
  '## 1. A abertura',
  '',
  '- **Momento:** abertura',
  '',
  '> A chuva cai no telhado da casa velha.',
  '',
  'Entregue o **H-01**. Depois: [A entrada](momento:entrada).',
  '',
  '## 2. A entrada',
  '',
  '- **Momento:** entrada',
  '',
  '**Escolha:** Por onde o grupo entra?',
  '',
  '- [A janela](momento:janela) · Atletismo DV13',
  '- [O telhado](momento:telhado) · sem câmeras',
  '',
  '### Caminho 1 · A janela',
  '',
  '- **Momento:** janela',
  '',
  '> Uma janela aberta, com a cortina batendo.',
  '',
  '- **Se der certo** → [O carro](momento:carro).',
  '',
  '### Caminho 2 · O telhado',
  '',
  '- **Momento:** telhado',
  '',
  'Telhas soltas. Vai para [o sótão](momento:sotao).',
  '',
  '## 3. O carro',
  '',
  '- **Momento:** carro',
  '',
  'O carro chega.',
  '',
  '## 4. A fuga',
  '',
  '- **Momento:** fuga',
  '',
  'Correm.',
  '',
  '## Handouts',
  '',
  '### H-01 · O bilhete',
  '',
  '> Venha sozinho.'
].join('\n');

module.exports = async ({ edge, r }) => {
  const porta = 8776;
  const base = `http://127.0.0.1:${porta}`;
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-narrar-'));
  const api = async (caminho, { method = 'GET', body } = {}) => {
    const resposta = await fetch(base + caminho, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const texto = await resposta.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* texto puro */ }
    return { status: resposta.status, json, texto };
  };
  let servidor = null;
  try {
    servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: dados });
    const campanha = (await api('/api/campanhas', { method: 'POST', body: { nome: 'Cena de teste' } })).json.campanha;
    await api(`/api/campanhas/${campanha.id}/roteiros/01-sessao`, { method: 'PUT', body: { texto: ROTEIRO } });
    // Um roteiro sem marcação: sem a aba Narrar.
    await api(`/api/campanhas/${campanha.id}/roteiros/02-sem-marcas`, { method: 'PUT', body: { texto: '# Sessão 02: Simples\n\nSó texto.\n\n### H-02 · Um papel\n\n> Oi.\n' } });
    const roteiro = `roteiro-${campanha.id}-01-sessao`;
    const narrarId = `${roteiro}--narrar`;
    const tela = () => edge.evaluate(`(() => {
      const cartao = document.querySelector('.narrar-cartao');
      return {
        hash: location.hash, titulo: cartao?.querySelector('.narrar-titulo')?.textContent || '', foco: document.activeElement?.classList.contains('narrar-titulo') || false,
        ler: [...document.querySelectorAll('.narrar-ler')].map(s => s.textContent.replace(/\\s+/g, ' ').trim()),
        botoes: [...document.querySelectorAll('.narrar-palco [data-narrar-ir]')].map(b => b.dataset.narrarIr),
        fixados: [...document.querySelectorAll('.narrar-fixados [data-narrar-ir]')].map(b => b.dataset.narrarIr),
        avisos: document.querySelector('.narrar-avisos')?.textContent.replace(/\\s+/g, ' ') || '',
        hora: document.querySelector('.narrar-hora')?.textContent || '', selo: document.querySelector('.narrar-selo')?.textContent || '',
        gatilhos: [...document.querySelectorAll('.narrar-gatilho')].map(b => b.dataset.narrarIr)
      };
    })()`);
    const esperarTitulo = async titulo => { for (let i = 0; i < 30 && (await tela()).titulo !== titulo; i++) await edge.sleep(150); return tela(); };
    const clicar = seletor => edge.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(seletor)}); if (!b) throw new Error('não achei ${seletor.replace(/'/g, '')}'); b.click(); return true; })()`);

    await edge.send('Network.setBypassServiceWorker', { bypass: true });
    await edge.ir(`${base}/`, 1200);
    await edge.evaluate(`(() => { const s = document.getElementById('campaign-picker'); s.value = ${JSON.stringify(campanha.id)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await edge.sleep(900);

    await r.passo('o menu: a sessão marcada tem Roteiro, Narrar e Handouts; a sem marcação, só Roteiro e Handouts', async () => {
      await edge.evaluate(`wikiApp.openPage(${JSON.stringify(roteiro)})`);
      await edge.sleep(600);
      const abas = await edge.evaluate(`[...document.querySelectorAll('.page-tabs .page-tab')].map(b => b.textContent).join()`);
      await edge.evaluate(`wikiApp.openPage(${JSON.stringify(`roteiro-${campanha.id}-02-sem-marcas`)})`);
      await edge.sleep(600);
      const simples = await edge.evaluate(`[...document.querySelectorAll('.page-tabs .page-tab')].map(b => b.textContent).join()`);
      return [abas === 'Roteiro,Narrar,Handouts' && simples === 'Roteiro,Handouts', `${abas} · ${simples}`];
    });

    await r.passo('a aba Narrar abre no primeiro momento: o texto para ler com o rótulo, o botão para a entrada e o aviso do link quebrado', async () => {
      await edge.evaluate(`wikiApp.openPage(${JSON.stringify(narrarId)})`);
      const t = await esperarTitulo('A abertura');
      await edge.shot('narrar-abertura');
      const ok = t.ler.length === 1 && /^Leia em voz alta\s*A chuva cai/.test(t.ler[0]) && t.botoes.join() === 'entrada' && /"sotao", que não existe/.test(t.avisos)
        && /data-narrar-handout="H-01"/.test(await edge.evaluate(`document.querySelector('.narrar-cartao').innerHTML`));
      return [ok, JSON.stringify(t)];
    });

    await r.passo('seguir para a entrada: o endereço guarda o momento, o foco vai ao título e a escolha mostra os dois caminhos', async () => {
      await clicar('.narrar-palco [data-narrar-ir="entrada"]');
      const t = await esperarTitulo('A entrada');
      const opcoes = await edge.evaluate(`[...document.querySelectorAll('.narrar-opcao')].map(b => b.dataset.narrarIr + ':' + b.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')`);
      return [t.hash === `#${narrarId}/entrada` && t.foco && /janela:A janela\s?Atletismo DV13/.test(opcoes) && /telhado:O telhado\s?sem câmeras/.test(opcoes), `${t.hash} · foco ${t.foco} · ${opcoes}`];
    });

    await r.passo('o grupo se divide: fixar a janela e a entrada, alternar pelos cartões fixados e voltar pelo Voltar do navegador', async () => {
      await clicar('.narrar-palco [data-narrar-fixar="entrada"]');
      await clicar('.narrar-opcao[data-narrar-ir="janela"]');
      await esperarTitulo('Caminho 1 · A janela');
      await clicar('.narrar-palco [data-narrar-fixar="janela"]');
      const fixados = (await tela()).fixados.join();
      await clicar('.narrar-fixados [data-narrar-ir="entrada"]');
      const pelaFaixa = (await esperarTitulo('A entrada')).titulo;
      await edge.evaluate('history.back()');
      const voltou = await esperarTitulo('Caminho 1 · A janela');
      await edge.shot('narrar-janela');
      return [fixados === 'entrada,janela' && pelaFaixa === 'A entrada' && voltou.titulo === 'Caminho 1 · A janela' && voltou.fixados.join() === 'entrada,janela' && voltou.hash === `#${narrarId}/janela`,
        `fixados ${fixados} · pela faixa: ${pelaFaixa} · depois do Voltar: ${voltou.titulo} (${voltou.hash}), fixados ${voltou.fixados}`];
    });

    await r.passo('recarregar: com o momento no endereço abre nele; sem, abre no último aberto; um momento que saiu cai no primeiro, com aviso', async () => {
      await edge.ir(`${base}/?recarregar#${narrarId}/telhado`, 600);
      const peloEndereco = (await esperarTitulo('Caminho 2 · O telhado')).titulo;
      await edge.ir(`${base}/?recarregar#${narrarId}`, 600);
      const peloUltimo = (await esperarTitulo('Caminho 2 · O telhado')).titulo;
      await edge.ir(`${base}/?recarregar#${narrarId}/nao-existe`, 600);
      const sumiu = await esperarTitulo('Caminho 2 · O telhado');
      return [peloEndereco === 'Caminho 2 · O telhado' && peloUltimo === 'Caminho 2 · O telhado' && /O momento "nao-existe" saiu do roteiro/.test(sumiu.avisos),
        `pelo endereço: ${peloEndereco} · pelo último: ${peloUltimo} · ${sumiu.titulo} / ${sumiu.avisos.slice(-80)}`];
    });

    await r.passo('a Mesa: a hora anda e mostra o gatilho das 22:30; o alarme em Cerco mostra o da fuga; a consulta abre num toque', async () => {
      const antes = (await tela()).hora;
      await clicar('[data-narrar-hora="30"]');
      await edge.sleep(300);
      const depois = await tela();
      await clicar('[data-narrar-alarme="1"]');
      await edge.sleep(300);
      const cerco = await tela();
      await clicar('.narrar-consulta[data-narrar-ir="valvulas"]');
      const valvulas = await esperarTitulo('As válvulas');
      return [antes === '22:00' && depois.hora === '22:30' && depois.gatilhos.includes('carro') && cerco.selo === 'Cerco' && cerco.gatilhos.includes('fuga') && valvulas.titulo === 'As válvulas',
        `${antes} → ${depois.hora} (gatilhos ${depois.gatilhos}) · alarme ${cerco.selo} (gatilhos ${cerco.gatilhos}) · consulta: ${valvulas.titulo}`];
    });

    await r.passo('a aba Roteiro continua com o texto inteiro, sem as linhas de marcação e com os links só como texto', async () => {
      await edge.evaluate(`wikiApp.openPage(${JSON.stringify(roteiro)})`);
      for (let i = 0; i < 25 && !/Telhas soltas/.test(await edge.evaluate(`document.getElementById('md-doc')?.textContent || ''`)); i++) await edge.sleep(200);
      const texto = (await edge.evaluate(`document.getElementById('md-doc').textContent`)).replace(/\s+/g, ' ');
      const ok = /A chuva cai no telhado/.test(texto) && /Telhas soltas/.test(texto) && /Escolha: Por onde o grupo entra\?/.test(texto) && !/Momento: /.test(texto) && !/Consulta: /.test(texto) && !/momento:/.test(texto);
      return [ok, texto.slice(0, 200)];
    });

    await r.passo('no celular: sem rolagem lateral, a Mesa fechada até o botão, e os botões com pelo menos 40 px', async () => {
      await edge.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await edge.ir(`${base}/?recarregar#${narrarId}/entrada`, 600);
      await esperarTitulo('A entrada');
      const cabe = await semRolagemLateral(edge);
      const fechada = await edge.evaluate(`getComputedStyle(document.getElementById('narrar-mesa')).display === 'none'`);
      await clicar('[data-narrar-mesa]');
      await edge.sleep(200);
      // Aberta de verdade: à vista, dentro da tela e com a hora (não só "display" diferente de none).
      const aberta = await edge.evaluate(`(() => { const mesa = document.getElementById('narrar-mesa'); const estilo = getComputedStyle(mesa); const caixa = mesa.getBoundingClientRect(); const hora = mesa.querySelector('.narrar-hora')?.getBoundingClientRect();
        return estilo.display !== 'none' && estilo.visibility === 'visible' && caixa.left >= 0 && caixa.right <= innerWidth && caixa.height > 100 && Boolean(hora) && hora.top >= 0 && hora.top < innerHeight; })()`);
      const menor = await edge.evaluate(`Math.min(...[...document.querySelectorAll('.narrar-opcao, .narrar-abrir, .narrar-ir')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height))`);
      await edge.shot('narrar-celular');
      await edge.send('Emulation.clearDeviceMetricsOverride');
      return [cabe && fechada && aberta && menor >= 40, `sem rolagem lateral: ${cabe} · Mesa fechada ${fechada}, aberta ${aberta} · menor botão ${menor} px`];
    });
  } finally {
    await edge.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    if (servidor) servidor.kill();
    await edge.sleep(400);
    try { fs.rmSync(dados, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
};
