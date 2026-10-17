// A aba Cyberware da ficha, no jeito da tela do Cyberpunk 2077 e com os grupos do RED: os slots de cada base, a ficha do
// implante, o + que abre a loja só com o que serve no slot, a revisão do criador, a ficha da mesa (o que o Foundry
// mandou, com e sem o tipo de cada peça) e o celular. Pelo mestre (local), com um personagem criado pela API.
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const js = value => JSON.stringify(value);
  const clicar = async (seletor, espera = 300) => { await edge.evaluate(`document.querySelector(${js(seletor)}).click()`); await edge.sleep(espera); };
  const espere = async (expressao, vezes = 30) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao)) return true; await edge.sleep(200); } return false; };
  // Os grupos da tela: nome, contagem e, em cada base, o nome, a contagem e os quadrados (sigla e largura).
  const grupos = () => edge.evaluate(`[...document.querySelectorAll('[data-cc-panel="cyberware"] .cy-group')].map(g => ({
    id: g.dataset.cyGrupo, nome: g.querySelector('.cy-group-head span').textContent, conta: g.querySelector('.cy-group-head small').textContent,
    bases: [...g.querySelectorAll('.cy-unit')].map(u => ({ nome: (u.querySelector('.cy-unit-head') || {}).textContent?.replace(/\\s+/g, ' ').trim() || '', natural: u.classList.contains('cy-natural'),
      cheios: [...u.querySelectorAll('.cy-cheio')].map(s => s.textContent + ':' + (s.style.getPropertyValue('--t') || '1')), livres: u.querySelectorAll('.cy-livre:not(.cy-base)').length,
      nomes: [...u.querySelectorAll('.cy-nome')].map(b => b.textContent) }))
  }))`);
  const abrirFicha = async id => {
    await edge.evaluate(`wikiApp.openPage('ficha', { section: ${js(id)} })`);
    await espere(`!!document.querySelector('[data-cc-tab="cyberware"]')`);
    await clicar('[data-cc-tab="cyberware"]', 500);
  };

  // Pacote Completo: um cyberbraço cheio (Gorilla Arm e lança-granadas, 2 slots cada), um cyberolho com Low Light/IR/UV
  // (2 de 3), o Sandevistan no Neuroport de graça, uma peça de cada no corpo e o Wolvers solto (o braço não tem lugar).
  const itens = [['braco', 'core_cyberware:cyberarm'], ['gorila', 'cyberware-2077:gorilla-arm'], ['lanca', 'core_cyberware:popup-grenade-launcher'],
    ['olho', 'core_cyberware:cybereye'], ['visao', 'core_cyberware:low-light-ir-uv'], ['sande', 'core_cyberware:sandevistan'],
    ['filtros', 'core_cyberware:nasal-filters'], ['bolso', 'core_cyberware:subdermal-pocket'], ['cabelo', 'core_cyberware:techhair'], ['wolvers', 'core_cyberware:wolvers']]
    .map(([uid, id]) => ({ uid: `loja:${uid}`, id, qtd: 1 }));
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Kaito', apelido: 'Cromo', role: 'solo', metodo: 'pacote', lingua: 'Japanese', casa: 'Watson',
    stats: { INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 7, EMP: 7 }, itens, montagem: { 'loja:wolvers': { em: '-' } } });
  const id = personagem.id;

  await edge.ir(`${wiki}/#personagens`, 1200);
  await abrirFicha(id);
  await r.passo('aba Cyberware: os 9 grupos do RED, na ordem (cabeça e braços à esquerda, corpo e pernas à direita)', async () => {
    const lista = await grupos();
    const lados = await edge.evaluate(`[...document.querySelectorAll('.cy-col-esq .cy-group')].length + '|' + [...document.querySelectorAll('.cy-col-dir .cy-group')].length`);
    const nomes = lista.map(g => g.nome).join(', ');
    return [nomes === 'Neuralware, Cyberolhos, Cyberaudio, Borgware, Cyberbraços, Cyberware interno, Cyberware externo, Fashionware, Cyberpernas' && lados === '5|4', `${nomes} · ${lados}`];
  });
  await r.passo('Neuroport de graça com o Sandevistan (1/5); a barra de cima tem a Humanidade da ficha', async () => {
    const neural = (await grupos()).find(g => g.id === 'neural');
    const topo = await edge.evaluate(`document.querySelector('.cy-hum b').textContent`);
    const vitais = await edge.evaluate(`[...document.querySelectorAll('.cc-vital')].find(v => /Humanidade/.test(v.textContent)).querySelector('b').textContent`);
    const base = neural.bases[0];
    return [neural.conta === '1/5' && base.nome === 'Neuroport' && base.cheios.join() === 'SAN:1' && base.livres === 4 && topo === vitais, `${JSON.stringify(base)} · topo ${topo} · vitais ${vitais}`];
  });
  await r.passo('cyberbraço cheio: Gorilla Arm e lança-granadas (2 slots cada, 4/4); o outro braço é natural, com o + da base', async () => {
    const bracos = (await grupos()).find(g => g.id === 'bracos');
    const [cheio, natural] = bracos.bases;
    const botao = await edge.evaluate(`document.querySelector('[data-cy-grupo="bracos"] .cy-natural .cy-base')?.textContent || ''`);
    return [bracos.conta === '4/4' && cheio.nome === 'Cyberbraço' && cheio.cheios.join() === 'GA:2,LGE:2' && cheio.livres === 0 && natural.natural && /Braço natural/.test(natural.nome) && /\+ Cyberbraço/.test(botao),
      JSON.stringify(bracos)];
  });
  await r.passo('cyberolho 2/3 com um + livre; o corpo: uma peça em cada (1/7); o Wolvers fica "sem base, fora do corpo"', async () => {
    const lista = await grupos();
    const olhos = lista.find(g => g.id === 'olhos');
    const corpo = ['interno', 'externo', 'moda'].map(g => lista.find(x => x.id === g)).map(g => `${g.conta}:${g.bases[0].nomes.join('')}`);
    const solto = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-extra')?.textContent.replace(/\\s+/g, ' ') || ''`);
    return [olhos.conta === '2/3' && olhos.bases[0].nome === 'Cyberolho' && olhos.bases[0].livres === 1 && olhos.bases[1].natural && corpo.join() === '1/7:Filtros nasais,1/7:Bolso subdérmico,1/7:Techhair' && /Sem base, fora do corpo\s*Wolvers/.test(solto),
      `${JSON.stringify(olhos.bases)} · ${corpo.join(' | ')} · ${solto.slice(0, 80)}`];
  });
  await r.passo('o corpo acende o que tem cromo (um braço, um olho, a cabeça, o corpo) e as linhas ligam os 9 grupos a ele', async () => {
    await espere(`document.querySelectorAll('.cy-links path').length === 9`, 20);
    const acesas = await edge.evaluate(`[...document.querySelectorAll('.cy-parte.cy-on')].map(p => p.dataset.cyParte).sort().join()`);
    const linhas = await edge.evaluate(`(() => {
      const corpo = document.querySelector('.cy-body').getBoundingClientRect();
      const palco = document.querySelector('.cy-stage').getBoundingClientRect();
      return [...document.querySelectorAll('.cy-links path')].filter(p => {
        const [x, y] = p.getAttribute('d').split('L').pop().split(' ').map(Number);
        return x + palco.left >= corpo.left && x + palco.left <= corpo.right && y + palco.top >= corpo.top && y + palco.top <= corpo.bottom;
      }).length;
    })()`);
    await edge.shot('cyberware');
    return [acesas === 'braco-1,interno,moda,neural,olho-1,pele' && linhas === 9, `acesas: ${acesas} · linhas que chegam no corpo: ${linhas}`];
  });
  await r.passo('toque no slot do Gorilla Arm: a ficha abre embaixo (Humanidade, slots, descrição); de novo, fecha', async () => {
    await clicar('[data-cy-grupo="bracos"] .cy-cheio', 300);
    const aberta = await edge.evaluate(`(() => { const f = document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])'); return f ? f.textContent.replace(/\\s+/g, ' ').trim() : ''; })()`);
    const marcado = await edge.evaluate(`document.querySelectorAll('[data-cy-grupo="bracos"] .cy-sel').length`);
    await edge.shot('cyberware-ficha');
    await clicar('[data-cy-grupo="bracos"] .cy-cheio', 300);
    const fechou = await edge.evaluate(`!document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])')`);
    return [/^Gorilla Arm/.test(aberta) && /Cyberbraços · em Cyberbraço/.test(aberta) && /Humanidade ?14/.test(aberta) && /Ocupa ?2 slots/.test(aberta) && marcado === 2 && fechou, `${aberta.slice(0, 160)} · marcados ${marcado} · fechou ${fechou}`];
  });

  // A loja: o + do slot livre e o + da base.
  const naLoja = () => edge.evaluate(`({ pagina: wikiApp.currentPage(), chip: document.querySelector('[data-shop-slot]')?.textContent.replace(/\\s+/g, ' ').trim() || '',
    ids: [...document.querySelectorAll('[data-shop-row]')].map(c => c.dataset.shopRow) })`);
  const catalogo = await edge.evaluate(`Object.fromEntries(shopCatalog.itens.filter(i => i.cyber).map(i => [i.id, i.cyber.tipo + (i.cyber.base ? ':base' : '')]))`);
  await r.passo('o + livre do cyberolho abre a loja do Kaito só com as opções de cyberolho', async () => {
    await clicar('[data-cy-grupo="olhos"] .cy-livre:not(.cy-base)', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    await edge.shot('cyberware-loja');
    return [loja.pagina === 'loja' && /Para o slot: Opções de Cyberolhos/.test(loja.chip) && loja.ids.length > 3 && loja.ids.every(item => catalogo[item] === 'cyberEye'),
      `${loja.pagina} · "${loja.chip}" · ${loja.ids.length} itens · fora: ${loja.ids.filter(item => catalogo[item] !== 'cyberEye').join(', ') || 'nenhum'}`];
  });
  await r.passo('o ✕ do chip volta ao catálogo inteiro do cyberware', async () => {
    await clicar('[data-shop-slot]', 400);
    const loja = await naLoja();
    return [!loja.chip && loja.ids.some(item => catalogo[item] && catalogo[item] !== 'cyberEye'), `${loja.ids.length} itens · chip "${loja.chip}"`];
  });
  await r.passo('o + da base no olho natural mostra só as bases de cyberolho', async () => {
    await abrirFicha(id);
    await clicar('[data-cy-grupo="olhos"] .cy-natural .cy-base', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    return [/Para o slot: Base: Cyberolho/.test(loja.chip) && loja.ids.length > 0 && loja.ids.every(item => catalogo[item] === 'cyberEye:base'), `"${loja.chip}" · ${loja.ids.join(', ')}`];
  });
  // Na revisão a coluna é estreita (o resumo fica do lado): a tela empilha, com o corpo em cima.
  await r.passo('revisão do criador: a mesma tela (empilhada na coluna estreita), e o + leva à loja do personagem', async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${js(id)} })`);
    await espere(`!!document.querySelector('.cc-steps [data-step="7"]')`);
    await clicar('.cc-steps [data-step="7"]', 600);
    const tela = await edge.evaluate(`document.querySelectorAll('#cc-step .cy-screen .cy-group').length`);
    await edge.evaluate(`document.querySelector('#cc-step .cy-screen').scrollIntoView()`);
    await edge.shot('cyberware-revisao');
    await clicar('#cc-step [data-cy-grupo="audio"] .cy-base', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    return [tela === 9 && /Base: Cyberaudio Suite/.test(loja.chip) && loja.ids.length > 0 && loja.ids.every(item => catalogo[item] === 'cyberAudioSuite:base'), `${tela} grupos · "${loja.chip}" · ${loja.ids.join(', ')}`];
  });

  // A mesa: o Foundry manda o que está instalado em cada base. Um braço e os filtros sem o tipo (o módulo antigo): valem
  // os do catálogo, pelo nome do Foundry. O Skin Weave chegou pela loja e espera o mestre instalar.
  await r.passo('ficha da mesa: dois cyberbraços com o que o Foundry instalou, o Neuroport de graça e o Skin Weave esperando', async () => {
    await api(`/api/personagens/${id}/foundry`, 'PUT', { ator: 'kaito1', nomeAtor: 'Kaito', versao: 1 });
    const cw = (nome, extra) => ({ nome, tipo: 'cyberware', qtd: 1, uso: '', uid: '', instalado: true, base: false, ...extra });
    await api(`/api/personagens/${id}/mesa`, 'PUT', {
      ator: 'kaito1', quando: new Date().toISOString(), stats: { INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 7, EMP: 3 },
      hp: { atual: 40, max: 40 }, humanidade: { atual: 31, max: 70 }, sorte: { atual: 5, max: 5 }, sp: { cabeca: 11, corpo: 11 }, dinheiro: 4200, ip: 0, reputacao: 0, pericias: [], lesoes: [],
      role: { nome: 'Solo', rank: 4, habilidades: [] },
      itens: [
        cw('Neuroport', { base: true, uid: 'gratis:cyberware-2077:neuroport', dentro: ['Sandevistan'], cyber: { tipo: 'neuralWare', tamanho: 0, slots: 5 } }),
        cw('Sandevistan', { cyber: { tipo: 'neuralWare', tamanho: 1, slots: 0 } }),
        cw('Cyberarm', { base: true, dentro: ['Gorilla Arm'], cyber: { tipo: 'cyberArm', tamanho: 0, slots: 4 } }),
        cw('Cyberarm', { base: true, dentro: ['Popup Grenade Launcher', 'Wolvers'] }),
        cw('Gorilla Arm', { cyber: { tipo: 'cyberArm', tamanho: 2, slots: 0 } }),
        cw('Popup Grenade Launcher', { cyber: { tipo: 'cyberArm', tamanho: 2, slots: 0 } }),
        cw('Wolvers', { cyber: { tipo: 'cyberArm', tamanho: 1, slots: 0 } }),
        cw('Nasal Filters'),
        cw('Skin Weave', { instalado: false, cyber: { tipo: 'cyberwareExternal', tamanho: 1, slots: 0 } })
      ]
    });
    await abrirFicha(id);
    const lista = await grupos();
    const bracos = lista.find(g => g.id === 'bracos');
    const interno = lista.find(g => g.id === 'interno');
    const esperando = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-extra')?.textContent.replace(/\\s+/g, ' ') || ''`);
    const acesas = await edge.evaluate(`[...document.querySelectorAll('[data-cc-panel="cyberware"] .cy-parte.cy-on')].map(p => p.dataset.cyParte).sort().join()`);
    const fonte = await edge.evaluate(`document.querySelector('.cy-fonte').textContent`);
    await clicar('[data-cy-grupo="neural"] .cy-unit-name', 300);
    const neuroport = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])')?.textContent.replace(/\\s+/g, ' ') || ''`);
    await edge.shot('cyberware-mesa');
    return [/^Na mesa/.test(fonte) && bracos.bases.map(b => b.nome).join() === 'Cyberarm 2/4,Cyberarm 3/4' && bracos.conta === '5/8' && interno.conta === '1/7' && /Esperando o mestre instalar\s*Skin Weave/.test(esperando)
      && acesas === 'braco-1,braco-2,interno,neural' && /Humanidade ?nenhuma \(de graça\)/.test(neuroport),
      `${bracos.bases.map(b => `${b.nome} [${b.cheios}]`).join(' | ')} · interno ${interno.conta} · ${esperando.slice(0, 70)} · acesas ${acesas} · Neuroport: ${neuroport.slice(0, 90)}`];
  });
  await r.passo('celular: a aba Cyberware sem rolagem lateral, o corpo em cima e sem as linhas', async () => {
    await edge.celular(true);
    await abrirFicha(id);
    await edge.sleep(400);
    const cabe = await semRolagemLateral(edge);
    const forma = await edge.evaluate(`(() => {
      const corpo = document.querySelector('[data-cc-panel="cyberware"] .cy-body').getBoundingClientRect();
      const grupo = document.querySelector('[data-cc-panel="cyberware"] .cy-group').getBoundingClientRect();
      return { corpoEmCima: corpo.bottom <= grupo.top + 1, linhas: getComputedStyle(document.querySelector('.cy-links')).display };
    })()`);
    await edge.shot('cyberware-celular');
    await edge.evaluate(`document.querySelector('[data-cy-grupo="pernas"]').scrollIntoView()`);
    await edge.shot('cyberware-celular-2');
    await edge.celular(false);
    return [cabe && forma.corpoEmCima && forma.linhas === 'none', `sem rolagem ${cabe} · ${JSON.stringify(forma)}`];
  });
};
