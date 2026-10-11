// Páginas com abas na wiki do mestre: a barra lateral só com as entradas, cada assunto reunido em abas (Sessão 01:
// Resumo, Roteiro completo, Handouts, NPCs, Notas); os endereços de antes continuam valendo; as fichas e as notas
// escolhidas ficam na mesa do servidor. Usa o servidor local de teste (o mestre) e devolve a mesa como estava.
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const base = servidores.local;
  const mesa = `${base}/api/campanhas/morana/mesa`;
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao).catch(() => false)) return true; await edge.sleep(250); } return false; };
  const lerMesa = async () => (await (await fetch(mesa)).json()).paginas || {};
  const limpar = () => fetch(mesa, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paginas: { sessao01: null, elenco: null } }) });
  await limpar();
  try {
    await edge.ir(`${base}/?recarregar#home`, 1500);
    await r.passo('barra lateral do Protocolo Morana: só as entradas; os documentos viraram abas', async () => {
      const itens = await edge.evaluate(`[...document.querySelectorAll('#navigation .nav-item')].map(b => b.dataset.page)`);
      const esperados = ['home', 'campaign', 'people', 'campaignMap', 'docSessaoZero', 'session1', 'docSessao02', 'docSessao03', 'docHandouts', 'notes', 'playerView', 'agenda', 'campanhas', 'personagens', 'loja'];
      const viraramAba = ['docSessao01', 'docFundacao', 'docRoteiro', 'docDiario', 'docBase', 'docPersonagens', 'lugares', 'docGuia', 'docArquiteturas', 'docGanchos'];
      const faltam = esperados.filter(id => !itens.includes(id));
      const sobram = viraramAba.filter(id => itens.includes(id));
      return [!faltam.length && !sobram.length && itens.length === esperados.length, `${itens.length} entradas · faltam ${faltam.join(', ') || 'nenhuma'} · ainda no menu ${sobram.join(', ') || 'nenhuma'}`];
    });

    await r.passo('o endereço de antes (#docSessao01/secao) abre a aba certa, com a barra de abas e a Sessão 01 acesa no menu', async () => {
      await edge.ir(`${base}/?recarregar#docSessao01/cena-3-o-mensageiro`, 2000);
      const estado = await edge.evaluate(`({
        abas: [...document.querySelectorAll('#content .page-tabs .page-tab')].map(b => b.textContent),
        atual: document.querySelector('#content .page-tab[aria-current="page"]')?.dataset.page,
        menu: document.querySelector('#navigation .nav-item.active')?.dataset.page,
        foco: document.querySelector('#content .flash')?.textContent.trim().slice(0, 30) || ''
      })`);
      return [estado.abas.join() === 'Resumo,Roteiro completo,Handouts,NPCs,Notas' && estado.atual === 'docSessao01' && estado.menu === 'session1' && /Cena 3/.test(estado.foco), JSON.stringify(estado)];
    });

    await r.passo('aba Handouts: só os da sessão (H-01 a H-07), com os botões de entregar', async () => {
      await edge.evaluate(`document.querySelector('#content .page-tab[data-page="sessao01Handouts"]').click()`);
      await esperar(`document.querySelectorAll('#md-doc [data-handout]').length > 0`);
      const estado = await edge.evaluate(`({
        titulos: [...document.querySelectorAll('#md-doc > h3')].map(h => h.textContent.split(' ·')[0]),
        botoes: document.querySelectorAll('#md-doc [data-handout-deliver]').length,
        menu: document.querySelector('#navigation .nav-item.active')?.dataset.page
      })`);
      return [estado.titulos.join() === 'H-01,H-02,H-03,H-04,H-05,H-06,H-07' && estado.botoes === 8 && estado.menu === 'session1', JSON.stringify(estado)];
    });

    await r.passo('a busca não repete o handout da aba (só a página Handouts e textos)', async () => {
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'comunicador de Kobo'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await edge.sleep(500);
      const paginas = await edge.evaluate(`[...document.querySelectorAll('#content .result')].map(r => r.dataset.page)`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      return [paginas.includes('docHandouts') && !paginas.some(id => /^sessao\d+Handouts$/.test(id)), paginas.slice(0, 6).join(', ')];
    });

    await r.passo('aba NPCs: a sugestão da sessão; o seletor acrescenta uma ficha, o × tira, e a escolha fica no servidor', async () => {
      await edge.ir(`${base}/?recarregar#sessao01Npcs`, 1500);
      await esperar(`document.querySelectorAll('[data-np-cards] > article.entry').length > 0`);
      const antes = await edge.evaluate(`[...document.querySelectorAll('[data-np-cards] > article.entry')].map(c => c.dataset.toc)`);
      await edge.evaluate(`(() => { const s = document.querySelector('[data-np-select]'); s.value = 'Pyro'; document.querySelector('[data-np-add]').click(); })()`);
      await edge.sleep(700);
      const salvo = (await lerMesa()).sessao01?.npcs || [];
      await edge.ir(`${base}/?recarregar#sessao01Npcs`, 1500);
      await esperar(`document.querySelectorAll('[data-np-cards] > article.entry').length > 0`);
      const depois = await edge.evaluate(`[...document.querySelectorAll('[data-np-cards] > article.entry')].map(c => c.dataset.toc)`);
      await edge.evaluate(`[...document.querySelectorAll('[data-np-cards] > article.entry')].find(c => c.dataset.toc === 'Pyro').querySelector('[data-np-remove]').click()`);
      await edge.sleep(700);
      const tirado = (await lerMesa()).sessao01?.npcs || [];
      const ok = antes.length === 9 && antes[0] === 'Wakako Okada' && antes.filter(n => n === 'Operativo de segurança').length === 2 && salvo.includes('Pyro') && depois.includes('Pyro') && !tirado.includes('Pyro') && tirado.length === 9;
      return [ok, `sugestão ${antes.length} · salvo ${salvo.length} (Pyro ${salvo.includes('Pyro')}) · depois de recarregar ${depois.length} · tirado ${tirado.length}`];
    });

    await r.passo('aba Notas: salva sozinha no servidor e oferece o modelo do diário da sessão', async () => {
      await edge.evaluate(`document.querySelector('#content .page-tab[data-page="sessao01Notas"]').click()`);
      await esperar(`!document.querySelector('[data-sn-template]')?.hidden`);
      await edge.evaluate(`document.querySelector('[data-sn-template]').click()`);
      await edge.evaluate(`(() => { const a = document.querySelector('[data-sn-text]'); a.value += '\\nO grupo poupou a Vega.'; a.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await edge.sleep(1400);
      const notas = (await lerMesa()).sessao01?.notas || '';
      const status = await edge.evaluate(`document.querySelector('[data-sn-status]').textContent`);
      return [/Destino da maleta/.test(notas) && /poupou a Vega/.test(notas) && /Salvo/.test(status), `${notas.split('\n').length} linhas · ${status}`];
    });

    await r.passo('Elenco → Fichas: as 9 fichas do elenco; Night City e A campanha têm as abas dos documentos', async () => {
      await edge.ir(`${base}/?recarregar#elencoFichas`, 1500);
      await esperar(`document.querySelectorAll('[data-np-cards] > article.entry').length > 0`);
      const fichas = await edge.evaluate(`document.querySelectorAll('[data-np-cards] > article.entry').length`);
      const menuElenco = await edge.evaluate(`document.querySelector('#navigation .nav-item.active')?.dataset.page`);
      await edge.ir(`${base}/?recarregar#docGuia`, 1500);
      const night = await edge.evaluate(`[...document.querySelectorAll('#content .page-tab')].map(b => b.textContent).join()`);
      await edge.ir(`${base}/?recarregar#docFundacao`, 1500);
      const campanha = await edge.evaluate(`[...document.querySelectorAll('#content .page-tab')].map(b => b.textContent).join()`);
      return [fichas === 9 && menuElenco === 'people' && night === 'Mapa,Lugares e peças,Guia de 2077,Arquiteturas NET' && campanha === 'Dossiê,Fundação,Roteiro,Diário,Base', `fichas ${fichas} · menu ${menuElenco} · Night City: ${night} · A campanha: ${campanha}`];
    });

    await r.passo('fixar uma aba: entra nas Fixadas com o nome da entrada e da aba', async () => {
      await edge.ir(`${base}/?recarregar#sessao01Handouts`, 1500);
      await edge.evaluate(`document.querySelector('[data-pin="sessao01Handouts"]').click()`);
      await edge.sleep(300);
      const rotulo = await edge.evaluate(`document.querySelector('.nav-pinned .nav-item[data-page="sessao01Handouts"]')?.textContent || ''`);
      await edge.evaluate(`document.querySelector('[data-pin="sessao01Handouts"]').click()`);
      return [/Sessão 01: A Maleta › Handouts/.test(rotulo), rotulo];
    });

    await r.passo('no celular, a barra de abas cabe sem rolagem lateral', async () => {
      await edge.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await edge.ir(`${base}/?recarregar#session1`, 1500);
      const cabe = await semRolagemLateral(edge);
      await edge.shot('abas-celular');
      await edge.send('Emulation.clearDeviceMetricsOverride');
      return [cabe, `sem rolagem lateral: ${cabe}`];
    });
    await edge.ir(`${base}/?recarregar#session1`, 1500);
    await edge.shot('abas-sessao01');
  } finally {
    await edge.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    await limpar();
  }
};
