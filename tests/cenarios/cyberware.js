// A aba Cyberware da ficha, no jeito da tela do Cyberpunk 2077 e com os grupos do RED: os slots de cada base, os lados
// (esquerdo e direito) de braços, pernas e olhos, a peça única no membro natural, a base sem lado, a ficha do implante, o
// + que abre a loja só com o que serve no slot, a revisão do criador, a ficha da mesa (o que o Foundry mandou, com e sem
// o tipo de cada peça, e a base Meat Arm/Meat Leg do CORE) e o celular. Pelo mestre (local), com um personagem da API.
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const js = value => JSON.stringify(value);
  const clicar = async (seletor, espera = 300) => { await edge.evaluate(`document.querySelector(${js(seletor)}).click()`); await edge.sleep(espera); };
  const espere = async (expressao, vezes = 30) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao)) return true; await edge.sleep(200); } return false; };
  // Os grupos da tela: nome, contagem e, em cada unidade (base ou membro natural), o cabeçalho, os quadrados (sigla e
  // largura), os + livres (e os da peça única) e os nomes.
  const grupos = () => edge.evaluate(`[...document.querySelectorAll('[data-cc-panel="cyberware"] .cy-group')].map(g => ({
    id: g.dataset.cyGrupo, nome: g.querySelector('.cy-group-head span').textContent, conta: g.querySelector('.cy-group-head small').textContent,
    bases: [...g.querySelectorAll('.cy-unit')].map(u => ({ nome: (u.querySelector('.cy-unit-head') || {}).textContent?.replace(/\\s+/g, ' ').trim() || '', natural: u.classList.contains('cy-natural'),
      semLado: u.classList.contains('cy-unassigned'), local: u.dataset.cyLocal || '',
      cheios: [...u.querySelectorAll('.cy-cheio')].map(s => s.textContent + ':' + (s.style.getPropertyValue('--t') || '1')), livres: u.querySelectorAll('.cy-livre:not(.cy-base)').length,
      pecaUnica: u.querySelectorAll('[data-cy-natural]').length, nomes: [...u.querySelectorAll('.cy-nome')].map(b => b.textContent) }))
  }))`);
  const acesas = () => edge.evaluate(`[...document.querySelectorAll('[data-cc-panel="cyberware"] .cy-parte.cy-on')].map(p => p.dataset.cyParte + (p.classList.contains('cy-indef') ? '?' : '')).sort().join()`);
  const abrirFicha = async id => {
    await edge.evaluate(`wikiApp.openPage('ficha', { section: ${js(id)} })`);
    await espere(`!!document.querySelector('[data-cc-tab="cyberware"]')`);
    await clicar('[data-cc-tab="cyberware"]', 500);
  };

  // Pacote Completo:
  // - um cyberbraço no braço esquerdo, cheio (Gorilla Arm e lança-granadas, 2 slots cada); no direito, natural, o Wolvers
  //   (peça única);
  // - um cyberolho no olho direito com Low Light/IR/UV (2 de 3) e a Visão microscópica sem base (tirada na Montagem);
  // - uma cyberperna sem lado (fica na vaga da perna esquerda) e a perna direita natural, vazia;
  // - o Sandevistan no Neuroport de graça e uma peça de cada no corpo.
  const itens = [['braco', 'core_cyberware:cyberarm'], ['gorila', 'cyberware-2077:gorilla-arm'], ['lanca', 'core_cyberware:popup-grenade-launcher'], ['wolvers', 'core_cyberware:wolvers'],
    ['olho', 'core_cyberware:cybereye'], ['visao', 'core_cyberware:low-light-ir-uv'], ['micro', 'core_cyberware:microoptics'], ['perna', 'core_cyberware:cyberleg'],
    ['sande', 'core_cyberware:sandevistan'], ['filtros', 'core_cyberware:nasal-filters'], ['bolso', 'core_cyberware:subdermal-pocket'], ['cabelo', 'core_cyberware:techhair']]
    .map(([uid, id]) => ({ uid: `loja:${uid}`, id, qtd: 1 }));
  const montagem = { 'loja:braco': { local: 'braco-esquerdo' }, 'loja:wolvers': { local: 'braco-direito' }, 'loja:olho': { local: 'olho-direito' }, 'loja:micro': { em: '-' } };
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Kaito', apelido: 'Cromo', role: 'solo', metodo: 'pacote', lingua: 'Japanese', casa: 'Watson',
    stats: { INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 7, EMP: 7 }, itens, montagem });
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
  await r.passo('braço esquerdo: cyberbraço cheio (Gorilla Arm e lança-granadas, 4/4); braço direito natural com o Wolvers (peça única)', async () => {
    const bracos = (await grupos()).find(g => g.id === 'bracos');
    const [esquerdo, direito] = bracos.bases;
    const botao = await edge.evaluate(`document.querySelector('[data-cy-grupo="bracos"] .cy-natural .cy-base')?.textContent || ''`);
    return [bracos.conta === '4/4' && bracos.bases.length === 2 && esquerdo.local === 'braco-esquerdo' && /Braço esquerdo ?Cyberbraço/.test(esquerdo.nome) && esquerdo.cheios.join() === 'GA:2,LGE:2' && esquerdo.livres === 0
      && direito.natural && direito.local === 'braco-direito' && /Braço natural/.test(direito.nome) && /peça única/.test(direito.nome) && direito.cheios.join() === 'WOL:1' && direito.pecaUnica === 0 && /\+ Cyberbraço/.test(botao),
      JSON.stringify(bracos)];
  });
  await r.passo('cyberolho no olho direito (2/3, um + livre); o esquerdo natural, sem peça única; a Visão microscópica fica sem base', async () => {
    const lista = await grupos();
    const olhos = lista.find(g => g.id === 'olhos');
    const corpo = ['interno', 'externo', 'moda'].map(g => lista.find(x => x.id === g)).map(g => `${g.conta}:${g.bases[0].nomes.join('')}`);
    const solto = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-extra')?.textContent.replace(/\\s+/g, ' ') || ''`);
    const [esquerdo, direito] = olhos.bases;
    return [olhos.conta === '2/3' && esquerdo.natural && esquerdo.local === 'olho-esquerdo' && esquerdo.pecaUnica === 0 && direito.local === 'olho-direito' && direito.livres === 1
      && corpo.join() === '1/7:Filtros nasais,1/7:Bolso subdérmico,1/7:Techhair' && /Sem base, fora do corpo\s*Visão microscópica/.test(solto) && !/Wolvers/.test(solto),
      `${JSON.stringify(olhos.bases)} · ${corpo.join(' | ')} · ${solto.slice(0, 80)}`];
  });
  await r.passo('a cyberperna sem lado ocupa a vaga da perna esquerda (não aparece uma terceira perna); a direita natural tem o + da peça única', async () => {
    const pernas = (await grupos()).find(g => g.id === 'pernas');
    const [semLado, direita] = pernas.bases;
    return [pernas.bases.length === 2 && semLado.semLado && /Local não definido ?Cyberperna/.test(semLado.nome) && semLado.livres === 3
      && direita.natural && direita.local === 'perna-direita' && direita.pecaUnica === 1 && direita.cheios.length === 0,
      JSON.stringify(pernas.bases)];
  });
  await r.passo('o corpo acende o que tem cromo (o braço esquerdo, o olho direito, a cabeça, o corpo; a perna sem lado tracejada) e as linhas ligam os 9 grupos', async () => {
    await espere(`document.querySelectorAll('.cy-links path').length === 9`, 20);
    const partes = await acesas();
    const linhas = await edge.evaluate(`(() => {
      const corpo = document.querySelector('.cy-body').getBoundingClientRect();
      const palco = document.querySelector('.cy-stage').getBoundingClientRect();
      return [...document.querySelectorAll('.cy-links path')].filter(p => {
        const [x, y] = p.getAttribute('d').split('L').pop().split(' ').map(Number);
        return x + palco.left >= corpo.left && x + palco.left <= corpo.right && y + palco.top >= corpo.top && y + palco.top <= corpo.bottom;
      }).length;
    })()`);
    await edge.shot('cyberware');
    return [partes === 'braco-2,interno,moda,neural,olho-1,pele,perna-1?' && linhas === 9, `acesas: ${partes} · linhas que chegam no corpo: ${linhas}`];
  });
  await r.passo('toque no Wolvers: a ficha abre embaixo (braço direito, braço natural, Humanidade); de novo, fecha', async () => {
    await clicar('[data-cy-grupo="bracos"] .cy-natural .cy-cheio', 300);
    const aberta = await edge.evaluate(`(() => { const f = document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])'); return f ? f.textContent.replace(/\\s+/g, ' ').trim() : ''; })()`);
    const marcado = await edge.evaluate(`document.querySelectorAll('[data-cy-grupo="bracos"] .cy-sel').length`);
    await edge.shot('cyberware-ficha');
    await clicar('[data-cy-grupo="bracos"] .cy-natural .cy-cheio', 300);
    const fechou = await edge.evaluate(`!document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])')`);
    return [/^Wolvers/.test(aberta) && /Cyberbraços · Braço direito · braço natural/.test(aberta) && /Humanidade ?7/.test(aberta) && marcado === 2 && fechou, `${aberta.slice(0, 160)} · marcados ${marcado} · fechou ${fechou}`];
  });

  // A loja: o + do slot livre, o + da base e o + da peça única.
  const naLoja = () => edge.evaluate(`({ pagina: wikiApp.currentPage(), chip: document.querySelector('[data-shop-slot]')?.textContent.replace(/\\s+/g, ' ').trim() || '',
    ids: [...document.querySelectorAll('[data-shop-row]')].map(c => c.dataset.shopRow), msg: document.querySelector('#cc-shop-msg')?.textContent || '' })`);
  const catalogo = await edge.evaluate(`Object.fromEntries(shopCatalog.itens.filter(i => i.cyber).map(i => [i.id, i.cyber.tipo + (i.cyber.base ? ':base' : '')]))`);
  await r.passo('o + livre do cyberolho abre a loja do Kaito só com as opções de cyberolho, no olho direito', async () => {
    await clicar('[data-cy-grupo="olhos"] .cy-livre:not(.cy-base)', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    await edge.shot('cyberware-loja');
    return [loja.pagina === 'loja' && /Para o slot: Opções de Cyberolhos · Olho direito/.test(loja.chip) && loja.ids.length > 3 && loja.ids.every(item => catalogo[item] === 'cyberEye'),
      `${loja.pagina} · "${loja.chip}" · ${loja.ids.length} itens · fora: ${loja.ids.filter(item => catalogo[item] !== 'cyberEye').join(', ') || 'nenhum'}`];
  });
  await r.passo('o ✕ do chip volta ao catálogo inteiro do cyberware', async () => {
    await clicar('[data-shop-slot]', 400);
    const loja = await naLoja();
    return [!loja.chip && loja.ids.some(item => catalogo[item] && catalogo[item] !== 'cyberEye'), `${loja.ids.length} itens · chip "${loja.chip}"`];
  });
  await r.passo('o + da base no olho natural mostra só as bases de cyberolho, para o olho esquerdo', async () => {
    await abrirFicha(id);
    await clicar('[data-cy-grupo="olhos"] .cy-natural .cy-base', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    return [/Para o slot: Cyberolho · Olho esquerdo/.test(loja.chip) && loja.ids.length > 0 && loja.ids.every(item => catalogo[item] === 'cyberEye:base'), `"${loja.chip}" · ${loja.ids.join(', ')}`];
  });
  await r.passo('o + da perna natural mostra só as peças únicas de perna; o Pé de garra comprado ali vai na perna direita natural', async () => {
    await abrirFicha(id);
    await clicar('[data-cy-grupo="pernas"] [data-cy-natural]', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    const pecas = ['core_cyberware:talon-foot', 'cyberware-2077:lynx-paws'];
    // O Kaito já gastou mais que os 2.550eb do pacote: a mensagem é a do dinheiro; o lugar se confere no salvo.
    await clicar('[data-shop-buy="core_cyberware:talon-foot"]', 400);
    await espere(`/Salvo/.test(document.querySelector('#cc-save')?.textContent || '')`, 40);
    const salvo = (await api(`/api/personagens/${id}`)).personagem;
    const linha = (salvo.itens || []).find(item => item.id === 'core_cyberware:talon-foot');
    const noResultado = (salvo.resultado?.itens || []).find(item => item.id === 'core_cyberware:talon-foot') || {};
    await abrirFicha(id);
    const direita = (await grupos()).find(g => g.id === 'pernas').bases[1];
    return [/Para o slot: Peça única · Perna direita/.test(loja.chip) && loja.ids.includes('core_cyberware:talon-foot') && loja.ids.every(item => pecas.includes(item))
      && linha && salvo.montagem?.[linha.uid]?.local === 'perna-direita' && noResultado.natural === true && noResultado.local === 'perna-direita' && !noResultado.em
      && direita.natural && direita.cheios.join() === 'PG:1' && direita.pecaUnica === 0 && /Pé de garra/.test(direita.nomes.join()),
      `"${loja.chip}" · ${loja.ids.join(', ')} · montagem ${JSON.stringify(linha && salvo.montagem?.[linha.uid])} · resultado ${JSON.stringify({ natural: noResultado.natural, local: noResultado.local, em: noResultado.em })} · ${JSON.stringify(direita)}`];
  });
  await r.passo('a segunda peça no mesmo membro natural: a loja recusa', async () => {
    await clicar('[data-cy-grupo="bracos"] .cy-natural .cy-base', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    await clicar('[data-shop-slot]', 400);
    await edge.evaluate(`(() => { const s = document.querySelector('[data-shop-busca]'); s.value = 'rippers'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await edge.sleep(300);
    await edge.evaluate(`(() => { const s = document.querySelector('[data-shop-local="core_cyberware:rippers"]'); s.value = 'braco-direito'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await edge.sleep(300);
    await clicar('[data-shop-buy="core_cyberware:rippers"]', 400);
    const msg = (await naLoja()).msg;
    const doc = (await api(`/api/personagens/${id}`)).personagem;
    return [/Já há uma peça no braço natural \(braço direito\)/.test(msg) && !(doc.itens || []).some(item => item.id === 'core_cyberware:rippers'), msg];
  });
  // Na revisão a coluna é estreita (o resumo fica do lado): a tela empilha, com o corpo em cima.
  await r.passo('revisão do criador: a mesma tela (empilhada na coluna estreita), e o + leva à loja do personagem', async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${js(id)} })`);
    await espere(`!!document.querySelector('.cc-steps [data-step="7"]')`);
    await clicar('.cc-steps [data-step="7"]', 600);
    const tela = await edge.evaluate(`document.querySelectorAll('#cc-step .cy-screen .cy-group').length`);
    const pendencias = await edge.evaluate(`document.querySelector('#cc-step .cc-warn')?.textContent || ''`);
    await edge.evaluate(`document.querySelector('#cc-step .cy-screen').scrollIntoView()`);
    await edge.shot('cyberware-revisao');
    await clicar('#cc-step [data-cy-grupo="audio"] .cy-base', 300);
    await espere(`!!document.querySelector('[data-shop-slot]')`);
    const loja = await naLoja();
    return [tela === 9 && /Escolha o local de Cyberperna/.test(pendencias) && !/Wolvers|Pé de garra/.test(pendencias) && /Base: Cyberaudio Suite/.test(loja.chip) && loja.ids.length > 0 && loja.ids.every(item => catalogo[item] === 'cyberAudioSuite:base'),
      `${tela} grupos · pendências "${pendencias.slice(0, 160)}" · "${loja.chip}" · ${loja.ids.join(', ')}`];
  });

  // A mesa: o Foundry manda o que está instalado em cada base. Um braço sem lado e os filtros sem o tipo (o módulo
  // antigo): valem os do catálogo, pelo nome do Foundry. O Pé de garra numa base Meat Leg do CORE (o membro natural). O
  // Skin Weave chegou pela loja e espera o mestre instalar.
  await r.passo('ficha da mesa: um cyberbraço com lado e outro sem (na vaga do direito), o Pé de garra na Meat Leg e o Skin Weave esperando', async () => {
    await api(`/api/personagens/${id}/foundry`, 'PUT', { ator: 'kaito1', nomeAtor: 'Kaito', versao: 1 });
    const cw = (nome, extra) => ({ nome, tipo: 'cyberware', qtd: 1, uso: '', uid: '', instalado: true, base: false, ...extra });
    await api(`/api/personagens/${id}/mesa`, 'PUT', {
      ator: 'kaito1', quando: new Date().toISOString(), stats: { INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 7, EMP: 3 },
      hp: { atual: 40, max: 40 }, humanidade: { atual: 31, max: 70 }, sorte: { atual: 5, max: 5 }, sp: { cabeca: 11, corpo: 11 }, dinheiro: 4200, ip: 0, reputacao: 0, pericias: [], lesoes: [],
      role: { nome: 'Solo', rank: 4, habilidades: [] },
      itens: [
        cw('Neuroport', { base: true, uid: 'gratis:cyberware-2077:neuroport', dentro: ['Sandevistan'], cyber: { tipo: 'neuralWare', tamanho: 0, slots: 5 } }),
        cw('Sandevistan', { cyber: { tipo: 'neuralWare', tamanho: 1, slots: 0 } }),
        cw('Cyberarm — Braço esquerdo', { base: true, local: 'braco-esquerdo', dentro: ['Gorilla Arm'], cyber: { tipo: 'cyberArm', tamanho: 0, slots: 4 } }),
        cw('Cyberarm', { base: true, dentro: ['Popup Grenade Launcher', 'Wolvers'] }),
        cw('Gorilla Arm', { cyber: { tipo: 'cyberArm', tamanho: 2, slots: 0 } }),
        cw('Popup Grenade Launcher', { cyber: { tipo: 'cyberArm', tamanho: 2, slots: 0 } }),
        cw('Wolvers', { cyber: { tipo: 'cyberArm', tamanho: 1, slots: 0 } }),
        cw('Meat Leg — Perna direita', { base: true, uid: 'natural:perna-direita', local: 'perna-direita', dentro: ['Talon Foot'], cyber: { tipo: 'cyberLeg', tamanho: 0, slots: 3 } }),
        cw('Talon Foot', { cyber: { tipo: 'cyberLeg', tamanho: 1, slots: 0 } }),
        cw('Nasal Filters'),
        cw('Skin Weave', { instalado: false, cyber: { tipo: 'cyberwareExternal', tamanho: 1, slots: 0 } })
      ]
    });
    await abrirFicha(id);
    const lista = await grupos();
    const bracos = lista.find(g => g.id === 'bracos');
    const pernas = lista.find(g => g.id === 'pernas');
    const interno = lista.find(g => g.id === 'interno');
    const esperando = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-extra')?.textContent.replace(/\\s+/g, ' ') || ''`);
    const partes = await acesas();
    const fonte = await edge.evaluate(`document.querySelector('.cy-fonte').textContent`);
    await clicar('[data-cy-grupo="neural"] .cy-unit-name', 300);
    const neuroport = await edge.evaluate(`document.querySelector('[data-cc-panel="cyberware"] .cy-ficha:not([hidden])')?.textContent.replace(/\\s+/g, ' ') || ''`);
    await edge.shot('cyberware-mesa');
    const [esquerdo, semLado] = bracos.bases;
    const [pernaEsquerda, pernaDireita] = pernas.bases;
    return [/^Na mesa/.test(fonte) && bracos.bases.length === 2 && esquerdo.local === 'braco-esquerdo' && /2\/4/.test(esquerdo.nome) && semLado.semLado && /3\/4/.test(semLado.nome) && bracos.conta === '5/8'
      && pernaEsquerda.natural && pernaEsquerda.pecaUnica === 1 && pernaDireita.natural && pernaDireita.cheios.join() === 'TF:1' && !/Meat Leg/.test(JSON.stringify(pernas))
      && interno.conta === '1/7' && /Esperando o mestre instalar\s*Skin Weave/.test(esperando) && partes === 'braco-1?,braco-2,interno,neural' && /Humanidade ?nenhuma \(de graça\)/.test(neuroport),
      `${bracos.bases.map(b => `${b.nome} [${b.cheios}]`).join(' | ')} · pernas ${JSON.stringify(pernas.bases.map(b => [b.local, b.cheios, b.pecaUnica]))} · interno ${interno.conta} · ${esperando.slice(0, 70)} · acesas ${partes} · Neuroport: ${neuroport.slice(0, 90)}`];
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
