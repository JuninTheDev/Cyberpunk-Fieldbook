// A base da campanha (documentos/morana/base-da-campanha.md + campanha-base.js): um registro para cada pessoa, facção,
// lugar, peça, relógio e segredo. No Node: o arquivo é lido sem erro, bate com as fichas de NPC, o mapa e o elenco, as
// citações {{base:...}} e {{doc:...}} dos documentos existem e as cópias antigas saíram. Na wiki do mestre: Pessoas e
// facções, Lugares e peças e as notas da Sessão 01 saem da base e do diário; o endereço antigo de Quem é quem abre a
// tabela; os nomes viram links com cartão; o Estado da campanha grava no servidor e aparece nas páginas.
// Usa o servidor local de teste (o mestre) e devolve a mesa como estava.
const { validarBase } = require('../lib/base-estatica');

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  // ---------- Sem navegador ----------
  const base = await validarBase({ raiz, r });

  // ---------- Na wiki do mestre ----------
  const local = servidores.local;
  const mesa = `${local}/api/campanhas/morana/mesa`;
  const esperar = async (expressao, vezes = 40) => { for (let i = 0; i < vezes; i++) { const v = await edge.evaluate(expressao).catch(() => null); if (v) return v; await edge.sleep(250); } return null; };
  const limpar = () => fetch(mesa, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: { dan: null, 'a-maleta': null }, segredos: {} }) });
  await limpar();
  try {
    await r.passo('Pessoas e facções sai da base: a tabela Quem é quem, os cartões do elenco e das forças, e o aviso de onde editar', async () => {
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length >= ${base.pessoas.length + base.faccoes.length}`);
      const info = await edge.evaluate(`({
        linhas: document.querySelectorAll('#md-doc table')[0]?.querySelectorAll('tbody tr').length || 0,
        cartoes: document.querySelectorAll('#md-doc h4').length,
        endo: [...document.querySelectorAll('#md-doc h4')].some(h => h.textContent.trim() === 'Endo'),
        ficha: !!document.querySelector('#md-doc a[href="#npcs/wakako-okada"]'),
        fonte: /Gerado da base da campanha/.test(document.querySelector('#md-doc p')?.textContent || ''),
        literal: /\\{\\{/.test(document.querySelector('#md-doc').textContent)
      })`);
      await edge.shot('pessoas');
      return [info.linhas === base.pessoas.length && info.cartoes === base.pessoas.length + base.faccoes.length && info.endo && info.ficha && info.fonte && !info.literal, JSON.stringify(info)];
    });

    await r.passo('o endereço antigo #docQuemEQuem abre Pessoas e facções, na tabela Quem é quem', async () => {
      await edge.ir(`${local}/?recarregar#docQuemEQuem`, 1800);
      const estado = await edge.evaluate(`({ pagina: wikiApp.currentPage(), hash: location.hash, foco: document.querySelector('#content .flash')?.textContent.trim().slice(0, 20) || '' })`);
      return [estado.pagina === 'people' && /Quem é quem/.test(estado.foco), JSON.stringify(estado)];
    });

    await r.passo('Lugares e peças: a maleta e os lugares; "ver no mapa" abre o mapa já no ponto', async () => {
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc h4').length >= ${base.lugares.length + base.pecas.length}`);
      const titulos = await edge.evaluate(`[...document.querySelectorAll('#md-doc h4')].map(h => h.textContent.trim())`);
      await edge.shot('lugares');
      await edge.evaluate(`document.querySelector('#md-doc a[href="#campaignMap/kabuki-depot"]').click()`);
      const ponto = await esperar(`wikiApp.currentPage() === 'campaignMap' && document.querySelector('.map-pin.selected')?.dataset.mapMarker`);
      const ok = ['A maleta', 'Pachinko de Wakako', 'Armazém de Kabuki', 'Consultório do Ricky', 'Arasaka Industrial Docks'].every(nome => titulos.includes(nome)) && ponto === 'kabuki-depot';
      return [ok, `${titulos.length} cartões · ponto ${ponto}`];
    });

    await r.passo('Sessão 01 → O que aconteceu: as notas da sessão, com o modelo tirado do registro da Sessão 1 no diário', async () => {
      await edge.ir(`${local}/?recarregar#sessao01Notas`, 1500);
      const modelo = await esperar(`(() => { const t = document.querySelector('[data-sn-text]'); return t && t.placeholder !== 'Carregando…' ? t.placeholder : null; })()`);
      const aba = await edge.evaluate(`document.querySelector('#content .page-tab[aria-current="page"]')?.textContent`);
      const ok = aba === 'O que aconteceu' && /Quem jogou: Ricky/.test(modelo || '') && /Destino da maleta/.test(modelo || '');
      return [ok, `aba ${aba} · modelo ${(modelo || '').slice(0, 80)}`];
    });

    await r.passo('os nomes viram link nos documentos (uma vez por seção), com o cartão da base ao passar o mouse', async () => {
      await edge.ir(`${local}/?recarregar#docDiario`, 1500);
      await esperar(`document.querySelectorAll('#md-doc a.ent').length > 3`);
      const links = await edge.evaluate(`[...document.querySelectorAll('#md-doc a.ent')].map(a => a.dataset.ent)`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      await edge.shot('cartao-wakako');
      const href = await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').getAttribute('href')`);
      const ok = links.includes('wakako-okada') && links.includes('endo') && links.includes('dan') && href === '#people/wakako-okada' && /Fixer/.test(cartao || '') && /Pachinko/.test(cartao || '');
      return [ok, `${links.length} links (${[...new Set(links)].length} nomes) · cartão: ${(cartao || '').slice(0, 80)}`];
    });

    await r.passo('Estado da campanha: Dan capturado e a maleta com Wakako ficam no servidor e aparecem nas páginas e no cartão', async () => {
      await edge.ir(`${local}/?recarregar#notes`, 1500);
      await esperar(`document.querySelector('[data-bs-id="dan"] [data-bs-campo="situacao"]')`);
      await edge.evaluate(`(() => {
        const campo = (id, nome, valor) => { const c = document.querySelector('[data-bs-id="' + id + '"] [data-bs-campo="' + nome + '"]'); c.value = valor; c.dispatchEvent(new Event('change', { bubbles: true })); };
        campo('dan', 'situacao', 'Capturado');
        campo('dan', 'onde', 'Arasaka Industrial Docks');
        campo('a-maleta', 'onde', 'Com Wakako');
      })()`);
      let salvo = null;
      for (let i = 0; i < 20 && !salvo; i++) { await edge.sleep(300); const dados = await (await fetch(mesa)).json(); if (dados.estado && dados.estado['a-maleta'] && dados.estado.dan && dados.estado.dan.onde) salvo = dados; }
      await edge.shot('estado');
      await edge.ir(`${local}/?recarregar#people`, 1500);
      await esperar(`/Capturado/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const pessoas = await edge.evaluate(`(() => { const t = document.querySelector('#md-doc table'); const linha = [...t.querySelectorAll('tbody tr')].find(tr => tr.cells[0].textContent.trim() === 'Dan'); return linha ? linha.textContent.replace(/\\s+/g, ' ') : ''; })()`);
      await edge.ir(`${local}/?recarregar#docDiario`, 1500);
      await esperar(`/Com Wakako/.test(document.querySelector('#md-doc')?.textContent || '')`);
      const diario = await edge.evaluate(`/Com Wakako/.test(document.querySelector('#md-doc').textContent)`);
      await esperar(`document.querySelector('#md-doc a.ent[data-ent="dan"]')`);
      await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="dan"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
      const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
      const ok = salvo && salvo.estado.dan.situacao === 'Capturado' && /Arasaka Industrial Docks/.test(pessoas) && /Capturado/.test(pessoas) && diario && /Capturado/.test(cartao || '');
      return [ok, `servidor ${JSON.stringify(salvo && salvo.estado)} · tabela "${pessoas.slice(0, 120)}" · diário ${diario} · cartão ${(cartao || '').slice(0, 60)}`];
    });

    await r.passo('Lugares e peças mostra a maleta com o estado de agora, e a busca acha "Hideo Mori" no cartão de Endo', async () => {
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc table').length > 0`);
      const tabela = await edge.evaluate(`[...document.querySelectorAll('#md-doc table')].map(t => t.textContent).find(t => /A maleta/.test(t) && /Onde está agora/.test(t)) || ''`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'Hideo Mori'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await edge.sleep(600);
      const resultados = await edge.evaluate(`[...document.querySelectorAll('#content .result')].slice(0, 4).map(r => r.dataset.page + ':' + r.querySelector('strong').textContent)`);
      await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      return [/Com Wakako/.test(tabela) && resultados.some(item => item === 'people:Endo'), `tabela ${/Com Wakako/.test(tabela)} · ${resultados.join(' | ')}`];
    });

    // O "Citado em" de um cartão: os links da linha que fica no fim dele (antes do cartão seguinte).
    const citadoEm = nome => `(() => {
      const titulo = [...document.querySelectorAll('#md-doc > h4')].find(h => h.textContent.trim() === ${JSON.stringify(nome)});
      for (let n = titulo && titulo.nextElementSibling; n && !n.matches('h3, h4'); n = n.nextElementSibling) if (n.matches('.bs-citado')) return { texto: n.textContent, links: [...n.querySelectorAll('a')].map(a => a.getAttribute('href')), rotulos: [...n.querySelectorAll('a')].map(a => a.textContent) };
      return { texto: '', links: [], rotulos: [] };
    })()`;
    await r.passo('Citado em: o cartão diz onde o nome aparece (as seções dos documentos e os outros registros), e o link abre a seção', async () => {
      // O título de um documento de todas as campanhas chega em HTML (escapado): com um "&" nele, o link mostra o texto.
      const lore = '#doc-night-city-lore-dos-anos-2070';
      const injetado = await edge.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
        const original = window.fetch;
        window.fetch = (url, ...resto) => original(url, ...resto).then(resposta => (String(url).endsWith('api/campanhas') && resposta.ok ? resposta.clone().json().then(dados => {
          for (const doc of dados.compartilhados || []) doc.titulo = doc.titulo.replace('nos anos', '& os anos');
          return new Response(JSON.stringify(dados), { status: resposta.status, headers: resposta.headers });
        }) : resposta));
      })()` });
      try {
        // Outro endereço (não só outro #): a página carrega de novo, com o script.
        await edge.ir(`${local}/?citado#people`, 1500);
      } finally {
        await edge.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injetado.result.identifier });
      }
      await esperar(`document.querySelectorAll('#md-doc .bs-citado').length > 0`);
      const wakako = await edge.evaluate(citadoEm('Wakako Okada'));
      const mina = await edge.evaluate(citadoEm('Mina Kuroda'));
      // Os documentos citados (o link sem "/"; com "/", a seção ou o registro) são páginas inteiras da busca: nem as
      // visões da base (Pessoas e facções, Lugares e peças), nem a Base, nem o roteiro.
      const contagem = await edge.evaluate(`({ linhas: document.querySelectorAll('#md-doc .bs-citado').length, cartoes: document.querySelectorAll('#md-doc > h4').length,
        visoes: [...document.querySelectorAll('#md-doc .bs-citado a')].map(a => a.getAttribute('href')).filter(h => !h.includes('/')).map(h => h.slice(1))
          .filter(id => !wikiConfig.markdownDocs[id] || wikiConfig.markdownDocs[id].vista || wikiConfig.markdownDocs[id].semBusca) })`);
      await edge.evaluate(`document.querySelector('#md-doc .bs-citado').scrollIntoView({ block: 'center' })`);
      await edge.shot('citado-em');
      // A seção do Diário onde a Wakako aparece abre já no título dela.
      const alvo = wakako.links.find(href => /^#docDiario\/sessao-1/.test(href)) || '';
      if (alvo) await edge.evaluate(`document.querySelector('#md-doc .bs-citado a[href="${alvo}"]').click()`);
      const foco = alvo ? await esperar(`wikiApp.currentPage() === 'docDiario' && document.querySelector('#content .flash') ? campaignBase.slug(document.querySelector('#content .flash').textContent) : null`) : null;
      await edge.ir(`${local}/?recarregar#lugares`, 1500);
      await esperar(`document.querySelectorAll('#md-doc .bs-citado').length > 0`);
      const pachinko = await edge.evaluate(citadoEm('Pachinko de Wakako'));
      const tituloDaLore = wakako.rotulos[wakako.links.indexOf(lore)];
      const ok = wakako.links.includes('#docDiario') && Boolean(alvo) && foco === alvo.split('/')[1] && tituloDaLore === 'Night City & os anos 2070'
        && mina.links.includes('#people/wakako-okada') && /na base:/.test(mina.texto)
        && pachinko.links.includes('#people/wakako-okada')
        && contagem.linhas > 3 && contagem.linhas <= contagem.cartoes && !contagem.visoes.length;
      return [ok, `Wakako ${wakako.links.length} links · lore "${tituloDaLore}" · seção ${alvo} → ${foco} · Mina "${mina.texto.slice(0, 60)}" · Pachinko ${pachinko.links.join(' ')} · ${contagem.linhas}/${contagem.cartoes} cartões · visões ${contagem.visoes.join(' ')}`];
    });

    await r.passo('[[Nome]] nos documentos: o link do registro, com o cartão (pelo nome, pelo Também em minúsculas, um relógio, um nome com "&"); sem registro, só o texto; e o nome não ganha um segundo link na seção', async () => {
      // Só neste navegador: um lugar "Bar & Grill" no fim da base e uma seção de teste no fim da Sessão zero.
      const injetado = await edge.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
        const extra = {
          'base-da-campanha.md': '\\n## Lugares\\n### Bar & Grill\\n- **Distrito:** Watson\\n',
          'sessao-zero.md': '\\n## Teste dos links\\nCom [[Wakako Okada|a fixer]], depois Wakako Okada de novo; [[mina|a guarda]], [[Kabuki adoece]], [[Bar & Grill|o bar]], \`[[Wakako Okada]]\` e [[Ninguém aqui]].\\n'
        };
        const original = window.fetch;
        window.fetch = (url, ...resto) => original(url, ...resto).then(resposta => {
          const nome = Object.keys(extra).find(arquivo => String(url).endsWith(arquivo));
          return nome && resposta.ok ? resposta.text().then(texto => new Response(texto + extra[nome], { status: resposta.status, headers: resposta.headers })) : resposta;
        });
      })()` });
      try {
        await edge.ir(`${local}/?links#docSessaoZero`, 1500);
        await esperar(`document.querySelector('#md-doc a.ent[data-ent="bar-grill"]')`);
        const secao = await edge.evaluate(`(() => {
          const titulo = [...document.querySelectorAll('#md-doc > h3')].find(h => h.textContent.trim() === 'Teste dos links');
          const bloco = [];
          for (let n = titulo && titulo.nextElementSibling; n && !n.matches('h3'); n = n.nextElementSibling) bloco.push(n);
          const semCodigo = bloco.map(n => { const copia = n.cloneNode(true); copia.querySelectorAll('code').forEach(c => c.remove()); return copia.textContent; }).join(' ');
          return {
            links: bloco.flatMap(n => [...n.querySelectorAll('a.ent')]).map(a => [a.dataset.ent, a.getAttribute('href'), a.textContent].join(' ')),
            codigo: bloco.flatMap(n => [...n.querySelectorAll('code')]).map(c => c.textContent),
            semCodigo
          };
        })()`);
        await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').scrollIntoView({ block: 'center' })`);
        await edge.evaluate(`document.querySelector('#md-doc a.ent[data-ent="wakako-okada"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
        const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
        await edge.shot('links-explicitos');
        // O [[mina]] (minúsculo; o texto da Sessão zero não tem "Mina" assim) conta no Citado em da Mina. O "o bar" e o
        // "a guarda" não são nomes: só o [[...]] os liga (o link automático não salva um [[...]] que não achou o registro).
        await edge.ir(`${local}/?links#people`, 1500);
        await esperar(`document.querySelectorAll('#md-doc .bs-citado').length > 0`);
        const mina = await edge.evaluate(citadoEm('Mina Kuroda'));
        const esperados = ['wakako-okada #people/wakako-okada a fixer', 'mina-kuroda #people/mina-kuroda a guarda', 'kabuki-adoece #notes/kabuki-adoece Kabuki adoece', 'bar-grill #lugares/bar-grill o bar'];
        const ok = JSON.stringify(secao.links) === JSON.stringify(esperados)
          && JSON.stringify(secao.codigo) === '["[[Wakako Okada]]"]' && /Ninguém aqui/.test(secao.semCodigo) && !/\[\[|\]\]/.test(secao.semCodigo)
          && /Fixer/.test(cartao || '') && mina.links.includes('#docSessaoZero/teste-dos-links');
        return [ok, `links ${JSON.stringify(secao.links)} · código ${JSON.stringify(secao.codigo)} · texto "${secao.semCodigo.slice(0, 120)}" · cartão ${(cartao || '').slice(0, 40)} · Mina ${mina.links.join(' ')}`];
      } finally {
        await edge.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injetado.result.identifier });
      }
    });

    // Um campo do cartão (a linha "Rótulo: ..."): o texto e os links com o cartão.
    const campoDoCartao = (nome, rotulo) => `(() => {
      const titulo = [...document.querySelectorAll('#md-doc > h4')].find(h => h.textContent.trim() === ${JSON.stringify(nome)});
      for (let n = titulo && titulo.nextElementSibling; n && !n.matches('h3, h4'); n = n.nextElementSibling) {
        const li = [...n.querySelectorAll('li')].find(item => item.textContent.startsWith(${JSON.stringify(`${rotulo}:`)}));
        if (li) return { texto: li.textContent, links: [...li.querySelectorAll('a.ent')].map(a => [a.dataset.ent, a.getAttribute('href'), a.textContent].join(' ')) };
      }
      return null;
    })()`;
    await r.passo('Relações "Nome (papel)": em Pessoas e facções, o nome vira o link com o cartão e o papel ao lado, e o cartão do outro (a Mina, os Tyger Claws) mostra a relação de volta; o texto solto fica como está', async () => {
      // Só neste navegador: as Relações da Wakako no formato, com um nome que não existe e um texto solto.
      const injetado = await edge.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
        const original = window.fetch;
        window.fetch = (url, ...resto) => original(url, ...resto).then(resposta => (String(url).endsWith('base-da-campanha.md') && resposta.ok
          ? resposta.text().then(texto => new Response(texto.replace(/(### Wakako Okada[\\s\\S]*?- \\*\\*Relações:\\*\\*)[^\\r\\n]*/, '$1 Mina Kuroda (guarda); Tyger Claws (respeitam); Ninguém aqui (sócio); deve favores a todo mundo'), { status: resposta.status, headers: resposta.headers }))
          : resposta));
      })()` });
      try {
        await edge.ir(`${local}/?relacoes#people`, 1500);
        await esperar(`document.querySelector('#md-doc a.ent[data-ent="tyger-claws"]')`);
        const wakako = await edge.evaluate(campoDoCartao('Wakako Okada', 'Relações'));
        const mina = await edge.evaluate(campoDoCartao('Mina Kuroda', 'Relações de outros'));
        const claws = await edge.evaluate(campoDoCartao('Tyger Claws', 'Relações de outros'));
        const link = `[...document.querySelectorAll('#md-doc > ul li')].find(li => li.textContent.startsWith('Relações: Mina Kuroda')).querySelector('a.ent[data-ent="mina-kuroda"]')`;
        await edge.evaluate(`${link}.scrollIntoView({ block: 'center' })`);
        await edge.evaluate(`${link}.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
        const cartao = await esperar(`(() => { const c = document.querySelector('.ent-card'); return c && !c.hidden ? c.textContent : null; })()`);
        await edge.shot('relacoes');
        const ok = wakako && wakako.texto === 'Relações: Mina Kuroda (guarda); Tyger Claws (respeitam); Ninguém aqui (sócio); deve favores a todo mundo'
          && JSON.stringify(wakako.links) === '["mina-kuroda #people/mina-kuroda Mina Kuroda","tyger-claws #people/tyger-claws Tyger Claws"]'
          && mina && mina.texto === 'Relações de outros: Wakako Okada: guarda' && JSON.stringify(mina.links) === '["wakako-okada #people/wakako-okada Wakako Okada"]'
          && claws && claws.texto === 'Relações de outros: Wakako Okada: respeitam' && JSON.stringify(claws.links) === '["wakako-okada #people/wakako-okada Wakako Okada"]'
          && /Guarda de Wakako/.test(cartao || '');
        return [ok, `Wakako ${JSON.stringify(wakako)} · Mina ${JSON.stringify(mina)} · Claws ${JSON.stringify(claws)} · cartão ${(cartao || '').slice(0, 40)}`];
      } finally {
        await edge.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injetado.result.identifier });
      }
    });
  } finally {
    await limpar();
  }
};
