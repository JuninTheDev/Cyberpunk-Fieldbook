// A aba Arsenal da ficha (o C70 do plano das modificações de armas): a bancada de cada arma, no jeito da aba Cyberware (o
// esboço "Bancada da arma" de 2026-11-24, aprovado pelo usuário). Pela ficha da mesa (a bancada e a identidade que o
// Foundry 14 manda: os acessórios nas posições, as modificações, o defeito, o teto e a história) e pela criação (os
// acessórios da Montagem); o que cabe num slot livre, a ficha da peça, a loja que abre na categoria e o celular. Pelo
// mestre (local), com personagens da API.
const { semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const js = value => JSON.stringify(value);
  const clicar = async (seletor, espera = 300) => { await edge.evaluate(`document.querySelector(${js(seletor)}).click()`); await edge.sleep(espera); };
  const espere = async (expressao, vezes = 30) => { for (let i = 0; i < vezes; i++) { if (await edge.evaluate(expressao)) return true; await edge.sleep(200); } return false; };
  const texto = seletor => edge.evaluate(`(document.querySelector(${js(seletor)})?.textContent || '').replace(/\\s+/g, ' ').trim()`);
  const abrirArsenal = async id => {
    await edge.evaluate(`wikiApp.openPage('ficha', { section: ${js(id)} })`);
    await espere(`!!document.querySelector('[data-cc-tab="arsenal"]')`);
    await clicar('[data-cc-tab="arsenal"]', 500);
  };
  // A bancada na tela: as chamadas (a posição e a peça ou o livre), as modificações, o defeito, os números e a história.
  const bancada = () => edge.evaluate(`(() => {
    const t = el => (el?.textContent || '').replace(/\\s+/g, ' ').trim();
    const s = document.querySelector('[data-cc-panel="arsenal"] .ar-screen');
    return {
      armas: [...s.querySelectorAll('[data-ar-arma]')].map(b => t(b)),
      numeros: [...s.querySelectorAll('.ar-num')].map(n => t(n.querySelector('small')) + ':' + t(n.querySelector('b'))),
      fonte: t(s.querySelector('.ar-fonte')),
      chamadas: [...s.querySelectorAll('.ar-chamada')].map(c => c.className.match(/ar-pos-(\\w+)/)[1] + ':' + (c.querySelector('.ar-sigla') ? t(c.querySelector('.ar-sigla')) : 'livre')),
      acesas: [...s.querySelectorAll('.ar-parte.ar-on')].length,
      mods: [...s.querySelectorAll('.ar-grupos .ar-group:first-child :is(.ar-chip, .ar-livre-slot)')].map(b => b.querySelector('.ar-sigla') ? t(b.querySelector('.ar-sigla')) : 'livre'),
      defeito: [...s.querySelectorAll('.ar-grupos .ar-group:last-child .ar-chip :is(.ar-sigla, .ar-nome)')].map(t).join(' '),
      contas: [...s.querySelectorAll('.ar-contas div')].map(t),
      frase: t(s.querySelector('.ar-frase')), diario: [...s.querySelectorAll('.ar-diario li')].map(t),
      ficha: t(s.querySelector('.ar-ficha-nome')), onde: t(s.querySelector('.ar-ficha-onde'))
    };
  })()`);

  const stats = { INT: 6, REF: 8, DEX: 7, TECH: 5, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 6, EMP: 5 };
  const itens = [['pistola', 'core_weapons:very-heavy-pistol'], ['pente', 'core_upgrades:extended-magazine-very-heavy-pistol'], ['fuzil', 'core_weapons:assault-rifle']].map(([uid, id]) => ({ uid: `loja:${uid}`, id, qtd: 1 }));
  const { personagem: criado } = await api('/api/personagens', 'POST', { nome: 'Arsenal Criação', role: 'solo', metodo: 'pacote', lingua: 'Japanese', casa: 'Watson', stats, itens, montagem: { 'loja:pente': { em: 'loja:pistola' } } });
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Arsenal Mesa', role: 'solo', metodo: 'pacote', lingua: 'Japanese', casa: 'Watson', stats, itens });
  const dia = i => new Date(Date.UTC(2026, 10, 1 + i, 15)).toISOString();
  await api(`/api/personagens/${personagem.id}/foundry`, 'PUT', { ator: 'atorArsenal', nomeAtor: 'Arsenal Mesa', versao: personagem.versao, entregues: [], geracao: 14 });
  const peca = (id, nome, catalogo) => ({ id, nome, tipo: 'itemUpgrade', qtd: 1, uso: '', uid: '', catalogo, instaladoEm: 'arma1' });
  await api(`/api/personagens/${personagem.id}/mesa`, 'PUT', {
    ator: 'atorArsenal', nomeAtor: 'Arsenal Mesa', quando: new Date().toISOString(), geracao: 14, stats, hp: { atual: 40, max: 40 }, humanidade: { atual: 48, max: 50 }, sorte: { atual: 5, max: 5 },
    sp: { cabeca: 11, corpo: 11 }, dinheiro: 800, ip: 10, reputacao: 1, role: { nome: 'Solo', rank: 4, habilidades: [] }, pericias: [{ nome: 'Handgun', nivel: 6, stat: 'REF' }], lesoes: [],
    itens: [
      { id: 'arma1', nome: 'Very Heavy Pistol', tipo: 'weapon', qtd: 1, uso: 'equipped', uid: 'loja:pistola', catalogo: 'core_weapons:very-heavy-pistol', dano: '4d6', cdt: 1, pericia: 'Handgun', distancia: true, maos: 1,
        pente: { atual: 14, max: 14 }, municao: '', carregada: '', dentro: [], dentroIds: ['p1', 'p2', 'm1', 'm2', 'd1'],
        identidade: { apelido: 'Velha Senhora', frase: 'Nunca falhou quando importava.', aparencia: '', feitaPor: '', dono: 'Arsenal Mesa', abates: 7, criticos: 3, sessoes: 5, primeiroSangue: { data: dia(1), alvo: 'Capanga' },
          diario: [{ tipo: 'origem', data: dia(0), texto: 'Veio da wiki com Arsenal Mesa' }, { tipo: 'sessao', data: dia(1) }, { tipo: 'abate', data: dia(1), alvo: 'Capanga' }, { tipo: 'marco', data: dia(8), texto: 'O tiro no Afterlife', por: 'mestre' }] },
        bancada: {
          acessorios: { usados: 3, total: 3 }, modificacoes: { usados: 2, total: 3 }, aDistancia: true, tipo: 'vHeavyPistol', qualidade: 'standard', classe: null,
          pecas: [
            { id: 'p1', nome: 'Extended Magazine (Very Heavy Pistol)', catalogo: 'core_upgrades:extended-magazine-very-heavy-pistol', tipo: 'acessorio', tamanho: 1 },
            { id: 'p2', nome: 'Smartgun Link', catalogo: 'core_upgrades:smartgun-link', tipo: 'acessorio', tamanho: 2 },
            { id: 'm1', nome: 'Mira holográfica', mod: 'mira-holografica', tipo: 'tatica', tamanho: 1 },
            { id: 'm2', nome: 'Nome gravado', mod: 'nome-gravado', tipo: 'sabor', tamanho: 1 },
            { id: 'd1', nome: 'Gatilho sensível', mod: 'gatilho-sensivel', tipo: 'defeito', tamanho: 0 }
          ],
          ataque: { fixos: [{ rotulo: 'Smartgun Link', valor: 1 }], situacionais: [{ rotulo: 'Mira holográfica: tiro único ou mirado a até 12 m', valor: 1 }], teto: 3 }
        } },
      { id: 'arma2', nome: 'Assault Rifle', tipo: 'weapon', qtd: 1, uso: 'carried', uid: 'loja:fuzil', catalogo: 'core_weapons:assault-rifle', dano: '5d6', cdt: 1, pericia: 'Shoulder Arms', distancia: true, maos: 2, pente: { atual: 25, max: 25 }, municao: '', carregada: '',
        bancada: { acessorios: { usados: 0, total: 3 }, modificacoes: { usados: 0, total: 2 }, aDistancia: true, tipo: 'assaultRifle', qualidade: 'standard', classe: null, pecas: [], ataque: { fixos: [], situacionais: [], teto: 3 } } },
      { id: 'arma3', nome: 'Knife', tipo: 'weapon', qtd: 1, uso: 'carried', uid: '', catalogo: '', dano: '1d6', cdt: 2, pericia: 'Melee Weapon', distancia: false, maos: 1, pente: null, municao: '', carregada: '',
        bancada: { acessorios: { usados: 0, total: 0 }, modificacoes: { usados: 0, total: 2 }, aDistancia: false, tipo: 'lightMelee', qualidade: 'standard', classe: null, pecas: [], ataque: { fixos: [], situacionais: [], teto: 3 } } },
      { id: 'arma4', nome: 'Brawling', tipo: 'weapon', qtd: 1, uso: 'carried', uid: '', catalogo: '', dano: '1d6', cdt: 2, pericia: 'Brawling', distancia: false, maos: 1, pente: null, municao: '', carregada: '' },
      peca('p1', 'Extended Magazine (Very Heavy Pistol)', 'core_upgrades:extended-magazine-very-heavy-pistol'), peca('p2', 'Smartgun Link', 'core_upgrades:smartgun-link'),
      peca('m1', 'Mira holográfica', 'mods-armas:mira-holografica'), peca('m2', 'Nome gravado', 'mods-armas:nome-gravado'), peca('d1', 'Gatilho sensível', 'mods-armas:gatilho-sensivel')
    ]
  });

  await edge.ir(`${wiki}/#personagens`, 1200);
  await abrirArsenal(personagem.id);
  await r.passo('aba Arsenal da ficha da mesa: entre Equipamento e Cyberware; a arma com o nome próprio, os números (acessórios, modificações, defeito e o teto) e o dono', async () => {
    const abas = await edge.evaluate(`[...document.querySelectorAll('[data-cc-tab]')].map(b => b.dataset.ccTab).join()`);
    const b = await bancada();
    const ok = abas === 'resumo,pericias,equipamento,arsenal,cyberware,compras,anotacoes'
      // A Briga (sem bancada) fica de fora; a faca, sem catálogo, entra pelo que o Foundry mandou.
      && b.armas.join('|') === 'Velha Senhora · Very Heavy Pistol|Assault Rifle|Knife'
      && b.numeros.join('|') === 'Arma:4d6 · CDT 1|Acessórios:3 / 3|Modificações:2 / 3|Defeito:1 / 1|Teto na rolagem:+2 / +3'
      && /dono: Arsenal Mesa/.test(b.fonte) && /Smartgun Link \+1/.test(b.fonte) && (await texto('.ar-top h3')) === 'Velha Senhora · Very Heavy Pistol';
    return [ok, JSON.stringify({ abas, ...b })];
  });

  await r.passo('a bancada: os acessórios nas posições (o pente embaixo, o link no trilho) e acesos no holograma; as modificações com o slot do defeito; o defeito em amarelo; a história com o diário', async () => {
    const b = await bancada();
    const ok = b.chamadas.join() === 'pente:EMV,trilho:SLI' && b.acesas === 2 && b.mods.join() === 'MHO,NGR,livre' && b.defeito === 'GSE Gatilho sensível'
      && b.contas.join('|') === '7abates|3críticos|5sessões' && b.frase === '"Nunca falhou quando importava."'
      && b.diario.length === 4 && /O tiro no Afterlife \(mestre\)$/.test(b.diario[0]) && /Veio da wiki com Arsenal Mesa$/.test(b.diario[3])
      && b.ficha === 'Mira holográfica' && /Modificação · Táticas de situação/i.test(b.onde)
      && (await texto('.ar-livre-slot[data-ar-sel="livre:modificacao:0"]')).includes('veio do defeito');
    return [ok, JSON.stringify(b)];
  });

  await r.passo('a ficha da peça: o acessório (trocável) e o defeito (só o mestre tira, o C72); o slot livre de modificação lista o que cabe pela regra da casa (a segunda de ataque não cabe)', async () => {
    await clicar('[data-ar-sel="peca:p2"]');
    const acessorio = [await texto('.ar-ficha-nome'), await texto('.ar-ficha-onde'), await texto('.ar-nums')];
    await clicar('[data-ar-sel="peca:d1"]');
    const defeito = [await texto('.ar-ficha-nome'), await texto('.ar-nums')];
    await clicar('[data-ar-sel="livre:modificacao:0"]');
    const lista = await edge.evaluate(`({ cabem: [...document.querySelectorAll('.ar-ficha .ar-cabe b')].map(b => b.textContent), naoCabem: [...document.querySelectorAll('.ar-ficha .ar-nao-cabe')].map(li => li.querySelector('b').textContent + ': ' + li.querySelector('small').textContent), foco: document.querySelector('.ar-livre-slot.ar-foco')?.dataset.arSel })`);
    const ok = acessorio[0] === 'Smartgun Link' && /Acessório · No trilho/i.test(acessorio[1]) && /2 slots de acessório/.test(acessorio[2])
      && defeito[0] === 'Gatilho sensível' && /nenhum: dá \+1/.test(defeito[1]) && /Para tirar\s*só o mestre/.test(defeito[1]) && !/só o Tech/.test(defeito[1])
      && lista.cabem.includes('Supressor') && !lista.cabem.includes('Mira de médio alcance') && lista.naoCabem.includes('Mira de médio alcance: só cabe uma modificação de ataque por arma')
      && !lista.cabem.some(nome => /Gatilho|Coice/.test(nome)) && lista.foco === 'livre:modificacao:0';
    return [ok, JSON.stringify({ acessorio, defeito, lista })];
  });

  await r.passo('outra arma: o fuzil com os três slots de acessório livres (no trilho, no pente e no cano) e os acessórios que cabem nele; a faca sem slot de acessório', async () => {
    await clicar('[data-ar-arma="foundry:arma2"]');
    const fuzil = await bancada();
    await clicar('[data-ar-sel="livre:acessorio:1"]');
    const cabem = await edge.evaluate(`[...document.querySelectorAll('.ar-ficha .ar-cabe b')].map(b => b.textContent)`);
    await clicar('[data-ar-arma="foundry:arma3"]');
    const faca = await bancada();
    const hud = await texto('.ar-hud-topo');
    const ok = fuzil.chamadas.join() === 'trilho:livre,pente:livre,cano:livre' && fuzil.acesas === 0 && fuzil.mods.join() === 'livre,livre' && /^Nenhum/.test(fuzil.defeito || 'Nenhum')
      && cabem.includes('Carregador estendido (Rifle de assalto)') && !cabem.includes('Carregador estendido (Espingarda)') && cabem.includes('Lança-granadas sob o cano')
      && faca.chamadas.length === 0 && faca.mods.join() === 'livre,livre' && /sem slots de acessório/.test(hud) && faca.contas.length === 0;
    return [ok, JSON.stringify({ fuzil, cabem: cabem.length, faca, hud })];
  });

  await r.passo('a ficha da criação: os acessórios da Montagem na bancada, as modificações livres e o teto que vem da mesa; o "Abrir na loja" abre nas modificações', async () => {
    await abrirArsenal(criado.id);
    const b = await bancada();
    const ok1 = /Da criação/.test(b.fonte) && b.chamadas[0] === 'pente:CEP' && b.chamadas.length === 3 && b.numeros.includes('Acessórios:1 / 3') && b.numeros.includes('Modificações:0 / 2')
      && b.numeros.includes('Teto na rolagem:—') && b.contas.length === 0;
    await clicar('[data-ar-sel="livre:modificacao:0"]');
    await clicar('[data-ar-loja]', 1500);
    const loja = await edge.evaluate(`({ hash: location.hash, cat: document.querySelector('[data-shop-cat].active')?.dataset.shopCat || '' })`);
    const ok = ok1 && loja.hash === `#loja/${criado.id}` && loja.cat === 'modificacoes';
    return [ok, JSON.stringify({ ...b, loja })];
  });

  await r.passo('celular: a aba Arsenal sem rolagem lateral, o holograma em cima e as peças numa lista, e a ficha da peça abaixo (não presa na tela)', async () => {
    await edge.celular(true);
    await abrirArsenal(personagem.id);
    const cabe = await semRolagemLateral(edge);
    const info = await edge.evaluate(`(() => {
      const caixa = s => document.querySelector(s).getBoundingClientRect();
      const chamada = getComputedStyle(document.querySelector('.ar-chamada')).position;
      return { chamada, lado: getComputedStyle(document.querySelector('.ar-lado')).position, abaixo: caixa('.ar-lado').top >= caixa('.ar-bancada').bottom - 1 };
    })()`);
    await edge.shot('arsenal-celular');
    await edge.celular(false);
    return [cabe && info.chamada === 'static' && info.lado === 'static' && info.abaixo, JSON.stringify({ cabe, ...info })];
  });
  await r.passo('C72: o teto da campanha avisa na bancada e no pedido; a loja da campanha mostra as Caras fora do Night Market; o presente do mestre sai sem cobrar; o mestre sorteia a vitrine, com a data, e ela abre', async () => {
    const antes = (await api('/api/loja/regras')).regras;
    try {
      // O teto +1 (a pistola soma +2: o Smartgun Link e a mira holográfica) e o Night Market fechado.
      await api('/api/loja/regras', 'PUT', { ...antes, tetoDaArma: 1, lendariasPorArma: 1, nightMarket: { itens: [], ate: '' } });
      await abrirArsenal(personagem.id);
      const naBancada = await texto('[data-ar-teto]');
      // A loja da campanha, pelo mestre: as Caras com o selo; o presente da mira holográfica (uma de ataque).
      await edge.evaluate(`wikiApp.openPage('loja', { section: ${js(personagem.id)} })`);
      await espere(`!!document.querySelector('[data-shop-cat="modificacoes"]')`);
      await clicar('[data-shop-cat="modificacoes"]', 500);
      const selo = id => texto(`[data-shop-row="${id}"] .cc-shop-info`);
      const fechado = { supressor: await selo('mods-armas:supressor'), bipe: await selo('mods-armas:bipe') };
      await clicar('[data-pedido-por="mods-armas:mira-holografica"]', 400);
      const caixa = await edge.evaluate(`!!document.querySelector('[data-pedido-presente]')`);
      await clicar('[data-pedido-presente]', 200);
      await clicar('[data-pedido-enviar]', 1200);
      const pedidos = (await api(`/api/personagens/${personagem.id}/pedidos`)).pedidos;
      const presente = pedidos.at(-1);
      const naLista = await texto('.cc-orders .cc-order:first-child');
      const tetoNoPedido = await texto('[data-pedido-teto]');
      // As regras do mestre: sortear duas Caras (com a data de uma semana) e salvar.
      await edge.evaluate(`wikiApp.openPage('loja')`);
      await espere(`document.querySelectorAll('[data-nm-item]').length > 0`);
      const caras = await edge.evaluate(`document.querySelectorAll('[data-nm-item]').length`);
      await clicar('[data-nm-sortear]', 200);
      const sorteio = await edge.evaluate(`({ ids: [...document.querySelectorAll('[data-nm-item][aria-pressed="true"]')].map(b => b.dataset.nmItem), ate: document.querySelector('[data-nm-ate]').value })`);
      await clicar('[data-rule-save]', 1000);
      const estado = await texto('[data-nm-estado]');
      const gravada = (await api('/api/loja/regras')).regras.nightMarket;
      // A loja da campanha de novo: as sorteadas com o selo do Night Market.
      await edge.evaluate(`wikiApp.openPage('loja', { section: ${js(personagem.id)} })`);
      await espere(`!!document.querySelector('[data-shop-cat="modificacoes"]')`);
      await clicar('[data-shop-cat="modificacoes"]', 500);
      const abertas = await Promise.all(sorteio.ids.map(id => selo(id)));
      const dd = sorteio.ate ? `${sorteio.ate.slice(8, 10)}/${sorteio.ate.slice(5, 7)}` : '?';
      const ok = naBancada === 'Passa do teto da campanha: +2 na rolagem, e a campanha vai até +1.'
        && /fora do Night Market/.test(fechado.supressor) && !/Night Market/.test(fechado.bipe) && caixa
        && presente?.presente === true && presente.total === 0 && presente.valor === 100 && presente.por === 'mestre' && presente.itens[0].id === 'mods-armas:mira-holografica'
        && /presente do mestre \(100eb, sem cobrar\)/.test(naLista) && tetoNoPedido === 'Teto da campanha (+1): em Velha Senhora, ela passaria do teto.'
        && caras === 6 && sorteio.ids.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(sorteio.ate)
        && estado === `Aberto até ${dd}: 2 modificações Caras à venda.` && JSON.stringify(gravada) === JSON.stringify({ itens: sorteio.ids, ate: sorteio.ate })
        && abertas.every(t => t.includes(`Night Market até ${dd}`));
      return [ok, JSON.stringify({ naBancada, fechado, caixa, presente, naLista, tetoNoPedido, caras, sorteio, estado, gravada, abertas })];
    } finally {
      await api('/api/loja/regras', 'PUT', antes);
    }
  });
};
