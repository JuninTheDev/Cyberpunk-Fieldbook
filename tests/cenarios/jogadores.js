// Visão dos jogadores: notas do mestre, painel de publicação, página dos jogadores e controle de acesso.
// O Publicar do Protocolo Morana começa com o jogadores.json e o jogadores-mestre.json do projeto (de antes das
// campanhas) e grava na pasta temporária dos servidores de teste: os arquivos do projeto não mudam.
const fs = require('fs');
const net = require('net');
const path = require('path');
const vm = require('vm');
const { abrir, buscar, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const arquivos = ['jogadores.json', 'jogadores-mestre.json'].map(nome => path.join(servidores.raiz, nome));
  const copias = arquivos.map(arquivo => fs.readFileSync(arquivo, 'utf8'));
  const pastaPublicar = path.join(servidores.dados, 'campanhas', 'morana');
  const lerPublicar = async () => (await fetch(`${servidores.local}/api/campanhas/morana/publicar`)).json();
  const publicar = mestre => fetch(`${servidores.local}/api/campanhas/morana/publicar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mestre }) });
  try {
    await edge.ir(`${servidores.local}/`);
    // As páginas com nota de campanha saem da configuração da wiki (as de Morana voltam com a trama nova).
    const comNota = await edge.evaluate(`[...new Set(window.wikiConfig.gmNotes.map(nota => nota.page))]`);
    for (const pagina of comNota) {
      await r.passo(`mestre: notas de campanha em ${pagina}`, async () => {
        await abrir(edge, pagina, 150);
        const n = await edge.evaluate(`document.querySelectorAll('#content .gm-note').length`);
        return [n > 0, `${n} notas`];
      });
    }
    await r.passo('mestre: Armas de 2077 tem as 41 armas (13 do Kit e 28 do suplemento de fã)', async () => {
      await abrir(edge, 'weapons2077');
      const n = await edge.evaluate(`document.querySelectorAll('#content .entry').length`);
      return [n === 41, `${n} cartões`];
    });

    await abrir(edge, 'playerView', 1200);
    await r.passo('painel: carrega pessoas, lugares e notícias', async () => {
      const n = await edge.evaluate(`['npcs', 'lugares', 'noticias'].map(k => document.querySelectorAll('#pv-' + k + ' .pv-row').length)`);
      return [n[0] > 0 && n[1] > 0, n.join(' / ')];
    });
    await r.passo('painel: publicar revela um NPC sem vazar a nota do mestre', async () => {
      const resultado = await edge.evaluate(`(async () => {
        const row = [...document.querySelectorAll('#pv-npcs .pv-row')].find(row => !row.classList.contains('on'));
        const nome = row.querySelector('input[data-field="nome"]').value;
        row.querySelector('input[data-field="revelado"]').click();
        const nota = row.querySelector('textarea[data-field="nota"]');
        nota.value = 'SEGREDO-DE-TESTE'; nota.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('pv-save').click();
        await new Promise(r => setTimeout(r, 1200));
        const pub = await (await fetch('api/visao?campanha=morana', { cache: 'no-store' })).text();
        return { nome, publicado: JSON.parse(pub).npcs.some(n => n.nome === nome), vazou: pub.includes('SEGREDO-DE-TESTE') };
      })()`);
      return [resultado.publicado && !resultado.vazou, JSON.stringify(resultado)];
    });

    // A Visão dos jogadores lê da base (B6 do worldbuilding): o "Adicionar da base" de Pessoas e de Lugares no mapa, o
    // item digitado ligado ao registro pelo nome, e o que o servidor manda (o mesmo que o painel mostra).
    const B = require(path.join(servidores.raiz, 'campanha-base.js'));
    const base = B.ler(fs.readFileSync(path.join(servidores.raiz, 'documentos', 'morana', 'base-da-campanha.md'), 'utf8'));
    const mapa = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(servidores.raiz, 'campaign-map.js'), 'utf8'), mapa);
    const ponto = id => mapa.window.campaignMapData.markers.find(marker => marker.id === id);
    await r.passo('painel: Pessoas e Lugares no mapa oferecem os registros da base que a lista não tem; o item digitado com o nome de um registro fica ligado a ele', async () => {
      const lido = await edge.evaluate(`(() => {
        const opcoes = kind => [...document.querySelectorAll('[data-pv-base="' + kind + '"]:not([hidden]) option')].map(option => option.value).filter(Boolean);
        const ligados = kind => [...document.querySelectorAll('#pv-' + kind + ' [data-pv-ligado] a.ent')].map(link => link.dataset.ent + ' ' + link.getAttribute('href') + ' ' + link.target);
        return { pessoas: opcoes('npcs'), lugares: opcoes('lugares'), ligadosPessoas: ligados('npcs'), ligadosLugares: ligados('lugares') };
      })()`);
      const publicado = await lerPublicar();
      const ligadosDe = (lista, tipos) => lista.map(item => B.registroDoLink(base, item.nome || '')).filter(item => item && tipos.includes(item.tipo)).map(item => item.id);
      const livres = (lista, tipos) => [...base.todos.values()].filter(item => tipos.includes(item.tipo) && !ligadosDe(lista, tipos).includes(item.id)).map(item => item.id);
      // O nome ligado tem o cartão ao passar o mouse e abre a página do registro em outra aba (o painel guarda as alterações).
      const comLink = ids => ids.map(id => `${id} #${B.PAGINA_DO_TIPO[base.todos.get(id).tipo]}/${id} _blank`);
      const esperado = { pessoas: livres(publicado.npcs, ['pessoa', 'faccao']), lugares: livres(publicado.lugares, ['lugar']), ligadosPessoas: comLink(ligadosDe(publicado.npcs, ['pessoa', 'faccao'])), ligadosLugares: comLink(ligadosDe(publicado.lugares, ['lugar'])) };
      const casos = esperado.ligadosPessoas.some(texto => texto.startsWith('wakako-okada ')) && esperado.ligadosLugares.some(texto => texto.startsWith('pachinko-de-wakako ')) && ['endo', 'arasaka'].every(id => esperado.pessoas.includes(id)) && ['armazem-de-kabuki', 'consultorio-do-ricky'].every(id => esperado.lugares.includes(id));
      return [casos && JSON.stringify(lido) === JSON.stringify(esperado), JSON.stringify(lido)];
    });
    await r.passo('painel: o item da base mostra o que vai; o Publicar manda aos jogadores o nome, o "Para os jogadores" e a posição do ponto, sem a nota nem o texto do mestre', async () => {
      const resultado = await edge.evaluate(`(async () => {
        const campos = row => [...row.querySelectorAll('[data-field]')].map(input => input.dataset.field);
        const escolher = (kind, id) => { const pick = document.querySelector('[data-pv-base="' + kind + '"]'); pick.value = id; pick.dispatchEvent(new Event('change', { bubbles: true })); return document.querySelector('#pv-' + kind + ' .pv-row[data-base="' + id + '"]'); };
        const escrever = (row, field, value) => { const input = row.querySelector('[data-field="' + field + '"]'); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
        // Uma pessoa digitada com o nome de um lugar da base não se liga a ele (a lista de Pessoas é de pessoas e facções).
        document.querySelector('[data-pv-add="npcs"]').click();
        const linhas = document.querySelectorAll('#pv-npcs .pv-row');
        escrever(linhas[linhas.length - 1], 'nome', 'Pachinko de Wakako');
        const endo = escolher('npcs', 'endo');
        const outroTipo = [...document.querySelectorAll('#pv-npcs .pv-row')].find(row => (row.querySelector('[data-field="nome"]') || {}).value === 'Pachinko de Wakako');
        const painel = { nome: endo.querySelector('.pv-row-head a.ent').textContent, placeholder: endo.querySelector('[data-field="nome"]').placeholder, texto: endo.querySelector('[data-pv-sent] p').textContent, campos: campos(endo), aindaNaLista: [...document.querySelectorAll('[data-pv-base="npcs"] option')].some(option => option.value === 'endo'), outroTipoLigado: !outroTipo || Boolean(outroTipo.querySelector('[data-pv-ligado]')) };
        escrever(endo, 'nome', 'Hideo Mori');
        escrever(endo, 'nota', 'NOTA-DA-BASE');
        endo.querySelector('input[data-field="revelado"]').click();
        // Cada escolha desenha a lista de novo: o lugar é marcado antes de escolher o próximo.
        const armazem = escolher('lugares', 'armazem-de-kabuki');
        painel.armazem = { campos: campos(armazem), onde: armazem.querySelector('[data-pv-sent] .note-status').textContent, semTexto: Boolean(armazem.querySelector('[data-pv-sent] p i')), semPino: !armazem.querySelector('[data-pv-pin]') };
        armazem.querySelector('input[data-field="revelado"]').click();
        const ricky = escolher('lugares', 'consultorio-do-ricky');
        painel.ricky = { campos: campos(ricky) };
        escrever(ricky, 'x', '2360');
        escrever(ricky, 'y', '1500');
        ricky.querySelector('input[data-field="revelado"]').click();
        document.getElementById('pv-save').click();
        await new Promise(r => setTimeout(r, 1200));
        const visao = await (await fetch('api/visao?campanha=morana', { cache: 'no-store' })).text();
        const mestre = await (await fetch('api/campanhas/morana/publicar', { cache: 'no-store' })).json();
        return { painel, visao, guardado: mestre.npcs.find(item => item.base === 'endo'), guardadoLugar: mestre.lugares.find(item => item.base === 'armazem-de-kabuki') };
      })()`);
      const endo = base.todos.get('endo');
      const armazem = base.todos.get('armazem-de-kabuki');
      const ricky = base.todos.get('consultorio-do-ricky');
      const doArmazem = ponto(armazem.campos.mapa);
      const visao = JSON.parse(resultado.visao);
      const semId = item => item && (({ id: _id, ...resto }) => resto)(item);
      const { painel, guardado, guardadoLugar } = resultado;
      const casos = {
        'o painel da pessoa': painel.nome === endo.nome && painel.placeholder === endo.nome && painel.texto === endo.campos.publico && JSON.stringify(painel.campos) === JSON.stringify(['revelado', 'nome', 'papel', 'nota']) && !painel.aindaNaLista,
        'a pessoa com o nome de um lugar fica sem ligação': painel.outroTipoLigado === false,
        'o lugar com ponto, sem X e Y nem a cópia de um pino': JSON.stringify(painel.armazem.campos) === JSON.stringify(['revelado', 'nome', 'nota']) && painel.armazem.onde === `${armazem.campos.distrito} · no ponto ${doArmazem.code} do mapa do mestre` && painel.armazem.semTexto === !armazem.campos.publico && painel.armazem.semPino,
        // O lugar guarda a posição do ponto (para quando o registro perder o ponto), e o id dele sai do registro.
        'o mestre guarda a posição do ponto': Boolean(guardadoLugar) && guardadoLugar.x === doArmazem.x && guardadoLugar.y === doArmazem.y && /^armazem-de-kabuki-[a-z0-9]+$/.test(guardadoLugar.id),
        'o lugar sem ponto, com X e Y': JSON.stringify(painel.ricky.campos) === JSON.stringify(['revelado', 'nome', 'x', 'y', 'nota']),
        'a pessoa para os jogadores': JSON.stringify(semId(visao.npcs.find(item => item.nome === 'Hideo Mori'))) === JSON.stringify({ nome: 'Hideo Mori', papel: '', texto: endo.campos.publico }),
        'o lugar com ponto': JSON.stringify(semId(visao.lugares.find(item => item.nome === armazem.nome))) === JSON.stringify({ nome: armazem.nome, distrito: armazem.campos.distrito, x: doArmazem.x, y: doArmazem.y, texto: armazem.campos.publico || '' }),
        'o lugar sem ponto': JSON.stringify(semId(visao.lugares.find(item => item.nome === ricky.nome))) === JSON.stringify({ nome: ricky.nome, distrito: ricky.campos.distrito, x: 2360, y: 1500, texto: ricky.campos.publico }),
        'o mestre guarda o id e a nota': Boolean(guardado) && guardado.nome === 'Hideo Mori' && guardado.nota === 'NOTA-DA-BASE' && guardado.revelado === true,
        'nada vaza': !['NOTA-DA-BASE', '"base"', JSON.stringify(endo.texto).slice(1, -1), JSON.stringify(armazem.texto).slice(1, -1)].some(texto => resultado.visao.includes(texto))
      };
      const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
      return [!errados.length, errados.length ? `${errados.join(', ')}: ${JSON.stringify(painel)}` : `${Object.keys(casos).length} casos`];
    });
    await r.passo('painel: o item de um registro que saiu da base avisa que não vai, e o servidor não manda', async () => {
      const { atualizado: _data, ...mestre } = await lerPublicar();
      const antes = mestre.npcs;
      const resposta = await publicar({ ...mestre, npcs: [...antes, { id: 'saiu-da-base-1', base: 'registro-que-saiu', nome: '', papel: '', nota: '', revelado: true }] });
      // Sai da página e volta: o painel lê o Publicar de novo.
      await abrir(edge, 'notes', 300);
      await abrir(edge, 'playerView', 1200);
      const lido = await edge.evaluate(`(async () => {
        const row = document.querySelector('#pv-npcs .pv-row[data-base="registro-que-saiu"]');
        const visao = await (await fetch('api/visao?campanha=morana', { cache: 'no-store' })).json();
        return { cabeca: row ? row.querySelector('.pv-row-head .note-status').textContent : '', aviso: row ? row.querySelector('[data-pv-sent]').textContent : '', campos: row ? [...row.querySelectorAll('[data-field]')].map(input => input.dataset.field) : [], foi: visao.npcs.some(item => item.id === 'saiu-da-base-1') };
      })()`);
      await publicar({ ...mestre, npcs: antes });
      await abrir(edge, 'notes', 300);
      await abrir(edge, 'playerView', 1200);
      const ok = resposta.status === 200 && lido.cabeca === 'Da base: registro-que-saiu' && lido.aviso.startsWith('Este registro não está mais na base') && JSON.stringify(lido.campos) === JSON.stringify(['revelado', 'nota']) && !lido.foi;
      return [ok, JSON.stringify(lido)];
    });
    await r.passo('painel: o Publicar grava na pasta de dados; os arquivos do projeto não mudam', async () => {
      const gravado = fs.existsSync(path.join(pastaPublicar, 'publicar.json'));
      const iguais = arquivos.every((arquivo, i) => fs.readFileSync(arquivo, 'utf8') === copias[i]);
      return [gravado && iguais, `publicar.json na pasta de dados: ${gravado} · projeto igual: ${iguais}`];
    });

    if (!servidores.rede) return;
    await edge.ir(`${servidores.rede}/`, 2500);
    await r.passo('visitante (sem código): a página inicial pede o código e não mostra nada da campanha', async () => {
      const estado = await edge.evaluate(`({ titulo: document.title, pagina: wikiApp.currentPage(), login: !!document.querySelector('[data-pv-login]'), texto: document.getElementById('content').textContent })`);
      return [/Jogadores/.test(estado.titulo) && estado.pagina === 'pvHome' && estado.login && !/Wakako|pachinko/i.test(estado.texto), `${estado.pagina} · login ${estado.login}`];
    });
    // Um código no Protocolo Morana (a campanha de antes), para ver o que foi publicado.
    const conta = (await (await fetch(`${servidores.local}/api/contas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Jogador da visão' }) })).json()).conta;
    await r.passo('jogador: entra pela página inicial e vê o resumo publicado', async () => {
      await edge.evaluate(`(() => { document.getElementById('pv-code').value = ${JSON.stringify(conta.codigo)}; document.querySelector('[data-pv-login]').requestSubmit(); })()`);
      for (let i = 0; i < 40 && !(await edge.evaluate(`!!(window.wikiApp && !document.querySelector('[data-pv-login]') && /Wakako/.test(document.getElementById('content').textContent))`).catch(() => false)); i++) await edge.sleep(250);
      const estado = await edge.evaluate(`({ pagina: wikiApp.currentPage(), wakako: /Wakako/.test(document.getElementById('content').textContent), topo: document.querySelector('.top-meta').textContent })`);
      // O nome do mestre ("Protocolo Morana") entrega o vírus: o jogador vê o "nome para os jogadores".
      return [estado.pagina === 'pvHome' && estado.wakako && /NIGHT CITY, 2077/.test(estado.topo) && !/MORANA/.test(estado.topo), JSON.stringify(estado)];
    });
    await r.passo('jogador: mapa mostra os lugares revelados', async () => {
      await abrir(edge, 'pvMap', 900);
      const n = await edge.evaluate(`document.querySelectorAll('.map-pin').length`);
      return [n > 0, `${n} pinos`];
    });
    await r.passo('jogador: a pessoa e os lugares da base aparecem com o nome que o mestre escolheu, sem o nome do registro', async () => {
      const pinos = await edge.evaluate(`[...document.querySelectorAll('.map-pin title')].map(title => title.textContent)`);
      await abrir(edge, 'pvPeople', 400);
      const pessoas = await edge.evaluate(`[...document.querySelectorAll('#content .person')].map(card => ({ nome: card.querySelector('h3').firstChild.textContent.trim(), texto: card.querySelector('.md-doc').textContent.trim() }))`);
      const endo = base.todos.get('endo');
      const hideo = pessoas.find(item => item.nome === 'Hideo Mori');
      const ok = Boolean(hideo) && hideo.texto === endo.campos.publico && !pessoas.some(item => item.nome === endo.nome) && ['armazem-de-kabuki', 'consultorio-do-ricky'].every(id => pinos.some(title => title.startsWith(base.todos.get(id).nome)));
      return [ok, `${pessoas.length} pessoas; pinos: ${pinos.join(', ')}`];
    });

    // O arquivo dos jogadores (B7 do worldbuilding): o resumo, uma sessão e uma notícia de teste citam os nomes revelados
    // (a pessoa da base e os lugares) e um não revelado (Mina Kuroda, digitada e escondida no Publicar). Wakako Okada só
    // está no título da sessão, e o texto dela no Arquivo cita Hideo Mori.
    const SESSAO = { id: 'sessao-do-arquivo', titulo: 'Sessão do arquivo: Wakako Okada', data: 'hoje', texto: 'Hideo Mori levou o grupo ao Armazém de Kabuki. Mina Kuroda olhava de longe. Hideo Mori voltou sozinho.', publicada: true };
    const NOTICIA = { id: 'noticia-do-arquivo', titulo: 'Boletim do arquivo', data: 'hoje', texto: 'Tiros perto do Consultório do Ricky.', publicada: true };
    await r.passo('jogador: os nomes revelados viram link no resumo, nas sessões e nas notícias, com o cartão do que o grupo sabe; o nome não revelado fica como texto', async () => {
      const { atualizado: _data, ...mestre } = await lerPublicar();
      const mina = mestre.npcs.find(item => item.nome === 'Mina Kuroda');
      const npcs = mestre.npcs.map(item => (item.nome === 'Wakako Okada' ? { ...item, texto: `${item.texto} Confia em Hideo Mori.` } : item));
      const resposta = await publicar({ ...mestre, npcs, resumo: `${mestre.resumo}\n\nNo Pachinko de Wakako, Hideo Mori deixou um recado.`, sessoes: [...(mestre.sessoes || []), SESSAO], noticias: [...mestre.noticias, NOTICIA] });
      // Outro endereço, para a página ler o Publicar de novo na hora.
      await edge.ir(`${servidores.rede}/?arquivo#pvSessions`, 1500);
      for (let i = 0; i < 40 && !(await edge.evaluate(`/Sessão do arquivo/.test(document.getElementById('content').textContent) && !!window.wikiNomes`).catch(() => false)); i++) await edge.sleep(250);
      const lido = await edge.evaluate(`(async () => {
        const links = secao => [...secao.querySelectorAll('a.ent')].map(link => [link.textContent, link.getAttribute('href'), link.className]);
        const secao = (toc) => [...document.querySelectorAll('#content .section')].find(item => item.dataset.toc === toc);
        const aberto = () => Boolean(document.querySelector('.ent-card:not([hidden])'));
        const sessao = secao(${JSON.stringify(SESSAO.titulo)});
        const naSessao = links(sessao);
        const minaComoTexto = sessao.textContent.includes('Mina Kuroda') && ![...sessao.querySelectorAll('a')].some(link => link.textContent.includes('Mina'));
        const primeiro = sessao.querySelector('a.ent');
        primeiro.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        const cartao = document.querySelector('.ent-card:not([hidden])');
        const textoDoCartao = cartao ? cartao.textContent : '';
        primeiro.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
        const escondeu = !aberto();
        // Com o teclado: o foco no link mostra o cartão, e sair dele esconde.
        primeiro.focus();
        const comFoco = aberto();
        primeiro.blur();
        const semFoco = !aberto();
        // Rolar a página também esconde.
        primeiro.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        const antesDeRolar = aberto();
        window.dispatchEvent(new Event('scroll'));
        const rolouEscondeu = antesDeRolar && !aberto();
        // Trocar de página esconde o cartão aberto.
        primeiro.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        const antesDeTrocar = aberto();
        wikiApp.openPage('pvNews');
        const trocouEscondeu = antesDeTrocar && !aberto();
        await new Promise(r => setTimeout(r, 300));
        const naNoticia = links(secao('Boletim do arquivo'));
        wikiApp.openPage('pvHome');
        await new Promise(r => setTimeout(r, 300));
        const noResumo = links(secao('Resumo'));
        // Uma vez por nome em cada seção: Wakako Okada também está na Última sessão (no título dela).
        const naUltimaSessao = links(secao('Última sessão')).map(([nome]) => nome);
        // O link leva ao Arquivo, na seção do nome.
        wikiApp.openPage('pvSessions');
        await new Promise(r => setTimeout(r, 300));
        secao(${JSON.stringify(SESSAO.titulo)}).querySelector('a.ent').click();
        await new Promise(r => setTimeout(r, 500));
        return { naSessao, minaComoTexto, textoDoCartao, escondeu, comFoco, semFoco, rolouEscondeu, trocouEscondeu, naNoticia, noResumo, naUltimaSessao, pagina: wikiApp.currentPage(), endereco: location.hash };
      })()`);
      const endo = base.todos.get('endo');
      const casos = {
        'o Publicar de teste': resposta.status === 200 && Boolean(mina) && !mina.revelado,
        'na sessão, uma vez por nome': JSON.stringify(lido.naSessao) === JSON.stringify([['Hideo Mori', '#pvArquivo/hideo-mori', 'ent ent-pessoa'], ['Armazém de Kabuki', '#pvArquivo/armazem-de-kabuki', 'ent ent-lugar']]),
        'o nome não revelado fica como texto': lido.minaComoTexto,
        'o cartão mostra o que o grupo sabe': lido.textoDoCartao.startsWith('PessoaHideo Mori') && lido.textoDoCartao.includes(endo.campos.publico.slice(0, 60)) && !lido.textoDoCartao.includes(endo.nome) && lido.escondeu,
        'o cartão com o foco; rolar e trocar de página esconde': lido.comFoco && lido.semFoco && lido.rolouEscondeu && lido.trocouEscondeu,
        'na notícia': JSON.stringify(lido.naNoticia) === JSON.stringify([['Consultório do Ricky', '#pvArquivo/consultorio-do-ricky', 'ent ent-lugar']]),
        // O resumo de partida já cita Wakako Okada (revelada no começo do cenário), em negrito.
        'no resumo': JSON.stringify(lido.noResumo.map(([nome]) => nome)) === JSON.stringify(['Wakako Okada', 'Pachinko de Wakako', 'Hideo Mori']),
        'de novo na seção seguinte': JSON.stringify(lido.naUltimaSessao) === JSON.stringify(['Wakako Okada']),
        'o link abre o Arquivo': lido.pagina === 'pvArquivo' && lido.endereco === '#pvArquivo/hideo-mori'
      };
      const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
      return [!errados.length, errados.length ? `${errados.join(', ')}: ${JSON.stringify(lido)}` : `${Object.keys(casos).length} casos`];
    });
    await r.passo('jogador: o Arquivo mostra as pessoas, as facções e os lugares revelados, com o "Citado em" nas sessões e nas notícias', async () => {
      await abrir(edge, 'pvArquivo', 400);
      await edge.shot('arquivo-jogador');
      const lido = await edge.evaluate(`[...document.querySelectorAll('#content .section')].map(secao => ({ nome: secao.dataset.toc, tipo: (secao.querySelector('.pv-news-date') || {}).textContent || '', citado: [...secao.querySelectorAll('.bs-citado a')].map(link => link.getAttribute('href')), links: [...secao.querySelectorAll('a.ent')].map(link => link.textContent) }))`);
      const menu = await edge.evaluate(`({ item: Boolean(document.querySelector('.nav-item[data-page="pvArquivo"]')), aba: (document.querySelector('.top-tab[aria-current="page"]') || { dataset: {} }).dataset.topTab })`);
      const visao = await (await fetch(`${servidores.local}/api/visao?campanha=morana`)).json();
      const de = nome => lido.find(item => item.nome === nome) || {};
      const armazem = base.todos.get('armazem-de-kabuki');
      const naSessao = JSON.stringify(['#pvSessions/sessao-do-arquivo-wakako-okada']);
      const casos = {
        'no menu e na aba Campanha': menu.item && menu.aba === 'campanha',
        'os revelados, as pessoas antes': JSON.stringify(lido.map(item => item.nome)) === JSON.stringify([...visao.npcs, ...visao.lugares].map(item => item.nome)),
        'sem o não revelado': !lido.some(item => item.nome === 'Mina Kuroda'),
        'a pessoa': de('Hideo Mori').tipo === 'Pessoa' && JSON.stringify(de('Hideo Mori').citado) === naSessao,
        // O nome no próprio cartão não vira link (o texto do Hideo Mori diz "Hideo Mori"), nem o nome dentro de um link
        // (o "Citado em" do Hideo Mori leva à sessão com Wakako Okada no título); o de outro, no texto, sim.
        'sem link para si mesmo nem dentro de link': JSON.stringify(de('Hideo Mori').links) === '[]',
        'o nome de outro vira link': JSON.stringify(de('Wakako Okada').links) === JSON.stringify(['Hideo Mori']),
        // Wakako Okada está só no título da sessão.
        'o nome no título da sessão': JSON.stringify(de('Wakako Okada').citado) === naSessao,
        'o lugar da sessão': de(armazem.nome).tipo === `Lugar · ${armazem.campos.distrito}` && JSON.stringify(de(armazem.nome).citado) === naSessao,
        'o lugar da notícia': JSON.stringify(de('Consultório do Ricky').citado) === JSON.stringify(['#pvNews/boletim-do-arquivo']),
        'quem não aparece fica sem a linha': JSON.stringify(de('Pachinko de Wakako').citado) === '[]'
      };
      const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
      return [!errados.length, errados.length ? `${errados.join(', ')}: ${JSON.stringify(lido)}` : `${lido.length} no Arquivo`];
    });
    await r.passo('jogador: regras sem notas de campanha nem segredos', async () => {
      await edge.evaluate(`document.querySelector('#tab-system').click()`);
      const vazamentos = [];
      for (const pagina of ['humanity', 'netrunning', 'creation', 'cyberware', 'netArsenal', 'quickhacks', 'weapons2077', 'cyberware2077', 'supplement2077', 'economy', 'screen']) {
        await abrir(edge, pagina, 120);
        const v = await edge.evaluate(`document.querySelectorAll('#content .gm-note').length + '/' + /morana|kobo|iskra|sato\\b|na campanha/i.test(document.getElementById('content').textContent)`);
        if (v !== '0/false') vazamentos.push(`${pagina}:${v}`);
      }
      return [!vazamentos.length, vazamentos.join(' ') || 'nenhum'];
    });
    await r.passo('jogador: busca por "Morana" não acha nada', async () => {
      const n = (await buscar(edge, 'Morana')).length;
      await buscar(edge, '');
      return [n === 0, `${n} resultados`];
    });
    await r.passo('jogador: notícia publicada pelo mestre aparece sozinha (até 20 s)', async () => {
      await edge.evaluate(`document.querySelector('#tab-campaigns').click()`);
      await abrir(edge, 'pvNews', 200);
      const antes = await edge.evaluate(`document.querySelectorAll('#content .section h3').length`);
      const { atualizado: _data, ...mestre } = await lerPublicar();
      mestre.noticias.push({ id: 'teste-automatico', titulo: 'Notícia de teste', data: 'agora', texto: 'Teste.', publicada: true });
      const resposta = await publicar(mestre);
      for (let i = 0; i < 40; i++) {
        await edge.sleep(500);
        const depois = await edge.evaluate(`document.querySelectorAll('#content .section h3').length`);
        if (depois > antes) return [resposta.status === 200, `apareceu em ~${(i + 1) / 2} s`];
      }
      return [false, 'não apareceu'];
    });
    // Com .pipe, conexões que caíam no meio deixavam arquivos abertos, e o Publicar dava 500 (EPERM).
    await r.passo('publicar funciona depois de 300 conexões que caem no meio', async () => {
      const { hostname, port } = new URL(servidores.local);
      for (let i = 0; i < 300; i += 1) {
        await new Promise(resolve => {
          const socket = net.connect(Number(port), hostname, () => {
            socket.write(`GET ${i % 2 ? '/api/visao?campanha=morana' : '/jogadores.html'} HTTP/1.1\r\nHost: x\r\n\r\n`);
            setTimeout(() => { socket.destroy(); resolve(); }, i % 3);
          });
          socket.on('error', resolve);
        });
      }
      await edge.sleep(500);
      const temporarios = () => fs.readdirSync(pastaPublicar).filter(nome => /\.tmp$/.test(nome));
      const antes = temporarios();
      const { atualizado: _data, ...mestre } = await lerPublicar();
      const resposta = await publicar(mestre);
      const sobras = temporarios().filter(nome => !antes.includes(nome));
      return [resposta.status === 200 && !sobras.length, `HTTP ${resposta.status}${resposta.status === 200 ? '' : `: ${await resposta.text()}`}${sobras.length ? ` | sobrou ${sobras.join(', ')}` : ''}`];
    });
    await edge.celular(true);
    await r.passo('jogador no celular: sem rolagem lateral', async () => {
      const com = [];
      for (const pagina of ['pvPeople', 'pvArquivo']) { await abrir(edge, pagina, 400); if (!(await semRolagemLateral(edge))) com.push(pagina); }
      return [!com.length, com.join(', ')];
    });
    await edge.celular(false);

    // ---------------- Controle de acesso (sem navegador) ----------------
    const status = async (url, options = {}) => (await fetch(url, { redirect: 'manual', ...options })).status;
    const liberados = ['/', '/jogadores.html', '/wiki-app.js', '/wiki.css', '/system-2077.js', '/nightcity-map-base.webp', '/cyberpunk-css-main/cyberpunk-css-main/fonts/Oxanium.woff2', '/netwire.css', '/netwire.js', '/wiki-nomes.js', '/cyberpunk-css-main/cyberpunk-css-main/fonts/VT323.woff2'];
    // O jogadores.json de antes das campanhas não é mais público: o que o mestre publica vem pela API, por campanha.
    const bloqueados = ['/index.html', '/jogadores.json', '/jogadores-mestre.json', '/jogadores-painel.js', '/campanhas-painel.js', '/mestre-npcs.js', '/campaign-map.js', '/server.js', '/api-campanhas.js', '/documentos/morana/base-da-campanha.md', '/.git/config', '/cyberpunk-css-main/cyberpunk-css-main/fonts/..%5C..%5C..%5Cindex.html', '/%2e%2e/%2e%2e/Windows/win.ini'];
    await r.passo('acesso: arquivos dos jogadores liberados pela rede', async () => {
      const ruins = [];
      for (const caminho of liberados) { const s = await status(servidores.rede + caminho); if (s !== 200) ruins.push(`${caminho}=${s}`); }
      return [!ruins.length, ruins.join(' ') || `${liberados.length} ok`];
    });
    await r.passo('acesso: arquivos do mestre bloqueados pela rede', async () => {
      const ruins = [];
      for (const caminho of bloqueados) { const s = await status(servidores.rede + caminho); if (s !== 403) ruins.push(`${caminho}=${s}`); }
      return [!ruins.length, ruins.join(' ') || `${bloqueados.length} bloqueados`];
    });
    await r.passo('acesso: jogador não publica nem lê o rascunho do mestre; sem código não vê a campanha', async () => {
      const json = { 'Content-Type': 'application/json' };
      const publica = await status(`${servidores.rede}/api/campanhas/morana/publicar`, { method: 'POST', headers: json, body: '{"mestre":{"npcs":[],"lugares":[],"noticias":[]}}' });
      const rascunho = await status(`${servidores.rede}/api/campanhas/morana/publicar`);
      const mural = await status(`${servidores.rede}/api/night-city`, { method: 'POST', headers: json, body: '{"noticias":[]}' });
      const visao = await status(`${servidores.rede}/api/visao?campanha=morana`);
      return [publica === 403 && rascunho === 403 && mural === 403 && visao === 401, `publicar ${publica} · rascunho ${rascunho} · Night City ${mural} · visão sem código ${visao}`];
    });
    await r.passo('acesso: senha do mestre libera a wiki do mestre por cookie', async () => {
      const errada = await status(`${servidores.rede}/?mestre=errada`);
      const login = await fetch(`${servidores.rede}/?mestre=${servidores.senhaMestre}`, { redirect: 'manual' });
      const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
      const pagina = await (await fetch(`${servidores.rede}/`, { headers: { cookie } })).text();
      const falso = await status(`${servidores.rede}/index.html`, { headers: { cookie: 'gm=chute' } });
      return [errada === 403 && login.status === 302 && pagina.includes('jogadores-painel.js') && falso === 403, `errada ${errada} | login ${login.status} | cookie falso ${falso}`];
    });
    await r.passo('acesso: quem chega pelo túnel do Cloudflare é jogador', async () => {
      const headers = { 'CF-Connecting-IP': '203.0.113.5' };
      const raiz = await (await fetch(`${servidores.local}/`, { headers })).text();
      const index = await status(`${servidores.local}/index.html`, { headers });
      return [/Jogadores/.test(raiz.match(/<title>[^<]*/)?.[0] || '') && index === 403, `index.html ${index}`];
    });
  } finally {
    // Garantia: se algo gravou nos arquivos do projeto, volta como estavam.
    arquivos.forEach((arquivo, i) => { if (fs.readFileSync(arquivo, 'utf8') !== copias[i]) fs.writeFileSync(arquivo, copias[i]); });
  }
};
