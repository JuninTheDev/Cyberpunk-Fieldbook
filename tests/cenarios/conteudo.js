// Conteúdo novo: Avanço, Lifepath, Night Market, Roles nos anos 2070, equipamento e Encontros de 2077 (só do mestre).
const { abrir, buscarEAbrir, ondeParou, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  await edge.ir(`${servidores.local}/`);
  // Clica num botão de rolar e devolve o texto do resultado que aparece logo abaixo (do botão ou do grupo).
  const rolar = seletor => edge.evaluate(`(() => {
    const botao = document.querySelector(${JSON.stringify(seletor)});
    botao.click();
    const saida = (botao.closest('.roll-buttons') || botao).nextElementSibling;
    return saida && saida.classList.contains('roll-result') ? saida.textContent.replace(/\\s+/g, ' ').trim() : '';
  })()`);
  const secoes = () => edge.evaluate(`[...document.querySelectorAll('#content .section')].map(s => s.dataset.toc)`);

  await r.passo('menu tem Lifepath, Avanço, Roles nos anos 2070 e Encontros', async () => {
    const ids = await edge.evaluate(`[...document.querySelectorAll('.nav-item')].map(b => b.dataset.page)`);
    const faltam = ['lifepath', 'advancement', 'roles2077', 'encounters'].filter(id => !ids.includes(id));
    return [!faltam.length, faltam.join(', ') || 'todos'];
  });

  await abrir(edge, 'advancement');
  await r.passo('Avanço: Rank 5 custa 300 IP, perícia difícil 10 custa 400', async () => {
    const linha = rotulo => edge.evaluate(`[...[...document.querySelectorAll('#content tr')].find(tr => tr.cells[0].textContent === ${JSON.stringify(rotulo)}).cells].map(c => c.textContent)`);
    const role = await linha('Rank de Role');
    const dificil = await linha('Perícia difícil (×2)');
    return [role[5] === '300' && dificil[10] === '400', `Role: ${role.slice(1).join(' ')} | difícil: ${dificil[10]}`];
  });
  await r.passo('questionário de estilo: 3 de Guerreiro e 2 de Explorador', async () => {
    const texto = await edge.evaluate(`(() => {
      const marcar = (estilo, n) => [...document.querySelectorAll('.playstyle-quiz input[data-style="' + estilo + '"]')].slice(0, n).forEach(i => i.click());
      marcar('Guerreiro', 3); marcar('Explorador', 2);
      return document.getElementById('playstyle-result').textContent;
    })()`);
    return [/5 de 5/.test(texto) && /Principal: Guerreiro/.test(texto) && /secundário: Explorador/.test(texto), texto];
  });

  await abrir(edge, 'lifepath');
  await r.passo('Lifepath: tabelas do livro com rolador', async () => {
    const s = await secoes();
    const botoes = await edge.evaluate(`document.querySelectorAll('#content [data-roll^="lp-"], #content [data-lifepath]').length`);
    return [s.includes('Origem cultural') && s.includes('Inimigos') && s.includes('Meta de vida') && botoes >= 18, `${s.length} seções, ${botoes} botões`];
  });
  await r.passo('rolar a Origem cultural mostra o dado e o resultado', async () => {
    const texto = await rolar('[data-roll="lp-origem"]');
    return [/^1d10: \d+ \S/.test(texto) && /—/.test(texto), texto.slice(0, 90)];
  });
  await r.passo('amigos: 1d10 − 7 dá a quantidade certa de itens (40 rolagens)', async () => {
    const erros = await edge.evaluate(`(() => {
      const botao = document.querySelector('[data-lifepath="amigos"]');
      const erros = [];
      for (let i = 0; i < 40; i += 1) {
        botao.click();
        const saida = botao.closest('.roll-buttons').nextElementSibling;
        const dado = Number(saida.textContent.match(/1d10 = (\\d+)/)[1]);
        const esperado = Math.max(0, dado - 7);
        const itens = saida.querySelectorAll('li').length;
        if (itens !== esperado) erros.push(dado + '→' + itens);
      }
      return erros;
    })()`);
    return [!erros.length, erros.join(' ') || 'ok'];
  });
  await r.passo('"Rolar o Lifepath inteiro" preenche tudo', async () => {
    const texto = await rolar('[data-lifepath="tudo"]');
    const faltam = ['Origem cultural:', 'Personalidade:', 'Família original:', 'Crise familiar:', 'Amigos (', 'Inimigos (', 'Amores trágicos (', 'Meta de vida:'].filter(item => !texto.includes(item));
    return [!faltam.length && !/undefined/.test(texto), faltam.join(', ') || texto.slice(0, 120)];
  });
  await edge.shot('lifepath');

  await abrir(edge, 'economy');
  await r.passo('Night Market: duas categorias diferentes, de 1 a 10 itens cada (20 rolagens)', async () => {
    const erros = await edge.evaluate(`(() => {
      const botao = document.querySelector('[data-night-market]');
      const erros = [];
      for (let i = 0; i < 20; i += 1) {
        botao.click();
        const saida = botao.closest('.roll-buttons').nextElementSibling;
        const categorias = [...saida.querySelectorAll('p b')].map(b => b.textContent);
        const listas = [...saida.querySelectorAll('ul')].map(ul => ul.querySelectorAll('li').length);
        if (categorias.length !== 2 || categorias[0] === categorias[1] || listas.some(n => n < 1 || n > 10)) erros.push(categorias.join('/') + ':' + listas.join('/'));
      }
      return erros;
    })()`);
    return [!erros.length, erros.join(' ') || 'ok'];
  });

  await abrir(edge, 'roles2077');
  await r.passo('Roles nos anos 2070: as 10 Roles do RED no resumo, o Netrunner, a compra direta e o Lawman do suplemento de fã', async () => {
    const s = await secoes();
    const linhas = await edge.evaluate(`[...[...document.querySelectorAll('#content .section')].find(x => x.dataset.toc === 'Resumo').querySelectorAll('tbody tr')].map(tr => tr.cells[0].textContent)`);
    const ok = ['Resumo', 'Netrunner', 'Comprar direto do fabricante', 'Lawman com Investigator (suplemento de fã)'].every(x => s.includes(x)) && !s.includes('Face') && !s.includes('Corpo')
      && linhas.length === 10 && ['Rockerboy', 'Exec', 'Fixer'].every(role => linhas.includes(role));
    return [ok, `${s.join(', ')} | ${linhas.join(', ')}`];
  });
  await r.passo('o resumo do suplemento leva às Roles nos anos 2070', async () => {
    await abrir(edge, 'supplement2077');
    await edge.evaluate(`document.querySelector('#content [data-page="roles2077"]').click()`);
    await edge.sleep(300);
    return [(await edge.evaluate('wikiApp.currentPage()')) === 'roles2077', ''];
  });

  await abrir(edge, 'gear');
  await r.passo('equipamento: munição (13 tipos), acessórios, médico e lista', async () => {
    const s = await secoes();
    const tipos = await edge.evaluate(`[...document.querySelectorAll('#content .section')].find(x => x.dataset.toc === 'Munição').querySelectorAll('tbody tr').length`);
    return [['Munição', 'Acessórios de arma', 'Equipamento médico', 'Lista de equipamento'].every(x => s.includes(x)) && tipos === 13, `${tipos} tipos | ${s.slice(-4).join(', ')}`];
  });
  // O termo exato tem cartão no glossário; o "Ver a regra" dele leva à seção Munição.
  await r.passo('busca "munição perfurante" → glossário → "Ver a regra" abre Munição', async () => {
    const { parou } = await buscarEAbrir(edge, 'munição perfurante');
    await edge.evaluate(`[...document.querySelectorAll('#content .glossary-entry')].find(e => e.dataset.toc === 'Munição perfurante').querySelector('button[data-section]').click()`);
    await edge.sleep(900);
    const regra = await ondeParou(edge);
    return [parou.foco === 'Munição perfurante' && regra.pagina === 'gear' && regra.foco === 'Munição', `${parou.pagina} "${parou.foco}" → ${regra.pagina} "${regra.foco}"`];
  });

  await abrir(edge, 'encounters');
  await r.passo('Encontros: dia, noite e madrugada cobrem 01–00 sem buracos', async () => {
    const faixas = await edge.evaluate(`[...document.querySelectorAll('#content .section')].filter(s => ['Dia', 'Noite', 'Madrugada'].includes(s.dataset.toc)).map(s => [...s.querySelectorAll('tbody tr')].map(tr => tr.cells[0].textContent))`);
    const valor = texto => texto === '00' ? 100 : Number(texto);
    const problemas = faixas.map((linhas, index) => {
      let proximo = 1;
      for (const linha of linhas) {
        const [de, ate = de] = linha.split('–');
        if (valor(de) !== proximo) return `tabela ${index + 1}: esperava ${proximo}, veio ${linha}`;
        proximo = valor(ate) + 1;
      }
      return proximo === 101 ? '' : `tabela ${index + 1}: termina em ${proximo - 1}`;
    }).filter(Boolean);
    return [faixas.length === 3 && !problemas.length, `${faixas.map(f => f.length).join('/')} linhas ${problemas.join('; ')}`];
  });
  await r.passo('cada rolagem mostra o encontro e links de ficha (60 rolagens)', async () => {
    const erros = await edge.evaluate(`(() => {
      const erros = [];
      for (const horario of ['dia', 'noite', 'madrugada']) {
        const botao = document.querySelector('[data-encounter="' + horario + '"]');
        for (let i = 0; i < 20; i += 1) {
          botao.click();
          const saida = botao.closest('.roll-buttons').nextElementSibling;
          if (!/d100: \\d+/.test(saida.textContent) || !saida.querySelector('a[href^="#npcs/"]') || /undefined/.test(saida.innerHTML)) erros.push(horario + ': ' + saida.textContent.slice(0, 60));
        }
      }
      return erros;
    })()`);
    return [!erros.length, erros.slice(0, 2).join(' | ') || 'ok'];
  });
  await edge.shot('encontros');
  await r.passo('o link de ficha abre a ficha do NPC', async () => {
    await edge.evaluate(`document.querySelector('#content tbody a[href="#npcs/operativo-de-seguranca"]').click()`);
    await edge.sleep(900);
    const parou = await ondeParou(edge);
    return [parou.pagina === 'npcs' && parou.foco === 'Operativo de segurança', `${parou.pagina} | foco "${parou.foco}"`];
  });
  await r.passo('o atalho "Encontros" está no início do mestre', async () => {
    await abrir(edge, 'home');
    const tem = await edge.evaluate(`!!document.querySelector('.desk-buttons [data-page="encounters"]')`);
    return [tem, ''];
  });
  await r.passo('celular: Lifepath e Encontros sem rolagem lateral', async () => {
    await edge.celular(true);
    await abrir(edge, 'lifepath', 400);
    const lifepath = await semRolagemLateral(edge);
    await abrir(edge, 'encounters', 400);
    const encontros = await semRolagemLateral(edge);
    await edge.celular(false);
    return [lifepath && encontros, `lifepath ${lifepath}, encontros ${encontros}`];
  });

  if (!servidores.rede) return;
  await r.passo('visão dos jogadores: Lifepath e Roles nos anos 2070 sim, Encontros não', async () => {
    await edge.ir(`${servidores.rede}/#encounters`, 2500);
    const pagina = await edge.evaluate('wikiApp.currentPage()');
    const ids = await edge.evaluate(`[...document.querySelectorAll('.nav-item')].map(b => b.dataset.page)`);
    const arquivo = (await fetch(`${servidores.rede}/mestre-npcs.js`)).status;
    const ok = pagina !== 'encounters' && !ids.includes('encounters') && ids.includes('lifepath') && ids.includes('roles2077') && ids.includes('advancement') && arquivo === 403;
    return [ok, `abriu ${pagina} | mestre-npcs.js HTTP ${arquivo}`];
  });
  await r.passo('visão dos jogadores: o rolador do Lifepath funciona', async () => {
    await abrir(edge, 'lifepath');
    const texto = await rolar('[data-lifepath="tudo"]');
    return [/Meta de vida:/.test(texto), texto.slice(0, 80)];
  });
};
