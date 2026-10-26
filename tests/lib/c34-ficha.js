// C34.1: a aba Efeitos, o +1 à mão no Death Save e as listas que recolhem, na ficha real do personagem.
// Os ajudantes ficam no navegador do mestre (window.__c34Ficha) entre as etapas; o finally apaga o ator e devolve as flags
// dos dois usuários como estavam.
const AUXILIARES = `
  const S = 'cpr-fieldbook', FLAG = 'listasRecolhidas';
  const esperar = async (f, vezes = 70) => { for (let i = 0; i < vezes && !f(); i++) await new Promise(r => setTimeout(r, 100)); if (!f()) throw Error('C34 ficha: espera esgotada'); };
  const c = window.__c34Ficha, a = game.actors.get(c.ator), f = () => a.sheet.element;
  const efeito = nome => [...a.allApplicableEffects()].find(e => e.name === nome);
  const linha = nome => f()?.querySelector('.tab.efeitos li.efeito[data-efeito="' + efeito(nome)?.uuid + '"]');
  const grupoDe = nome => [...(linha(nome)?.closest('.lista-efeitos')?.classList ?? [])].find(classe => classe.startsWith('efeitos-'))?.slice(8) ?? '';
  const escondida = el => !el || el.hidden || getComputedStyle(el).display === 'none';
`;

module.exports = async function fichaC34(r, edge, jogador) {
  await r.passo('C34.1: a aba Efeitos (os do personagem e os dos itens, a origem e o estado; criar, ligar, desligar e apagar), o +1 do Death Save e as listas que recolhem por usuário', async () => {
    let preparo = null;
    try {
      // 1. O personagem com um efeito próprio e quatro itens com efeito: o manual desligado, o que vale carregado (favorito),
      //    o situacional e o cyberware fora de uso. A Evasão é a perícia favorita.
      preparo = await edge.evaluate(`(async () => {
        const S = 'cpr-fieldbook', FLAG = 'listasRecolhidas';
        const jogadorId = game.users.getName('Jogador').id;
        const mudanca = (key, value) => ({ key, type: 'add', value, phase: 'initial', priority: null });
        const efeitoDoItem = (name, disabled, system) => [{ name, type: 'base', transfer: true, disabled, system }];
        const a = await Actor.implementation.create({ name: 'C34 Efeitos', type: 'personagem', ownership: { [jogadorId]: 2 }, flags: { [S]: { periciasFavoritas: ['evasion'] } },
          effects: [{ name: 'Adrenalina C34', type: 'base', disabled: false, system: { changes: [mudanca('system.bonus.pericias.perception', '1')] } }],
          items: [
            { name: 'Inalador C34', type: 'equipamento', system: { ativacao: 'manual', uso: 'carregando' }, effects: efeitoDoItem('Foco C34', true, { changes: [mudanca('system.bonus.pericias.stealth', '2')] }) },
            { name: 'Medidor C34', type: 'equipamento', system: { ativacao: 'carregando', uso: 'carregando' }, flags: { [S]: { favorito: true } }, effects: efeitoDoItem('Leitura C34', false, { changes: [mudanca('system.bonus.pericias.perception', '1')] }) },
            { name: 'Sensor C34', type: 'equipamento', system: { ativacao: 'carregando', uso: 'carregando' }, effects: efeitoDoItem('Escuta C34', false, { situacional: { sim: true, ligadoPorPadrao: true, alvo: 'Percepção pela audição' }, changes: [mudanca('system.bonus.pericias.perception', '2')] }) },
            { name: 'Implante C34', type: 'cyberware', system: { instalado: false }, effects: efeitoDoItem('Reflexo C34', false, { changes: [mudanca('system.bonus.pericias.evasion', '1')] }) }
          ] });
        window.__c34Ficha = { ator: a.id, flag: foundry.utils.deepClone(game.user.getFlag(S, FLAG) ?? null) };
        return { ator: a.id };
      })()`);
      const aba = await edge.evaluate(`(async () => {
        ${AUXILIARES}
        await a.sheet.render({ force: true });
        a.sheet.changeTab('efeitos', 'primary');
        await esperar(() => f()?.querySelectorAll('.tab.efeitos li.efeito').length === 5);
        const linhas = Object.fromEntries([...f().querySelectorAll('.tab.efeitos .lista-efeitos')].map(secao => [[...secao.classList].find(x => x.startsWith('efeitos-')).slice(8),
          [...secao.querySelectorAll('li.efeito')].map(li => li.querySelector('.nome').textContent.trim().replace(' C34', '') + '=' + li.querySelector('.estado-efeito').textContent.trim()
            + '=' + (li.querySelector('[data-action="alternarEfeito"]') ? 'L' : '') + (li.querySelector('[data-action="apagarEfeito"]') ? 'A' : '')).sort().join()]));
        const origem = nome => linha(nome)?.querySelector('.origem').textContent.trim();
        return { linhas, origens: [origem('Adrenalina C34'), origem('Foco C34'), origem('Reflexo C34')], percepcao: a.system.pericia('perception').bonus };
      })()`);
      await edge.shot('ficha-efeitos');
      // 2. Os botões: ligar e desligar o efeito do item manual; criar, desligar, ligar e apagar um efeito no personagem;
      //    o nome abre a ficha do efeito.
      const botoes = await edge.evaluate(`(async () => {
        ${AUXILIARES}
        const clicar = async (nome, acao) => { await esperar(() => linha(nome)?.querySelector('[data-action="' + acao + '"]')); linha(nome).querySelector('[data-action="' + acao + '"]').click(); };
        const furtividade = () => a.system.pericia('stealth').bonus;
        await clicar('Foco C34', 'alternarEfeito');
        await esperar(() => !efeito('Foco C34').disabled && grupoDe('Foco C34') === 'valendo');
        const ligou = [grupoDe('Foco C34'), linha('Foco C34').querySelector('[data-action="alternarEfeito"]').getAttribute('aria-pressed'), furtividade()].join();
        await clicar('Foco C34', 'alternarEfeito');
        await esperar(() => efeito('Foco C34').disabled && grupoDe('Foco C34') === 'parado');
        const desligou = [grupoDe('Foco C34'), furtividade()].join();
        f().querySelector('.tab.efeitos [data-action="criarEfeito"]').click();
        await esperar(() => efeito('Efeito novo')?.sheet?.rendered && linha('Efeito novo'));
        const novo = efeito('Efeito novo');
        const criado = [novo.parent === a, novo.img, grupoDe('Efeito novo'), linha('Efeito novo').querySelector('.detalhe').textContent.trim()].join();
        await novo.sheet.close();
        await clicar('Efeito novo', 'alternarEfeito');
        await esperar(() => novo.disabled && grupoDe('Efeito novo') === 'parado');
        await clicar('Efeito novo', 'alternarEfeito');
        await esperar(() => !novo.disabled && grupoDe('Efeito novo') === 'valendo');
        await clicar('Efeito novo', 'apagarEfeito');
        const pergunta = () => [...document.querySelectorAll('.application.dialog:not(.minimizing)')].find(d => d.querySelector('.window-title')?.textContent === 'Apagar efeito');
        await esperar(pergunta);
        pergunta().querySelector('button[data-action="yes"]').click();
        await esperar(() => !a.effects.has(novo.id) && !f().querySelector('.tab.efeitos li.efeito[data-efeito="' + novo.uuid + '"]') && !pergunta());
        linha('Reflexo C34').querySelector('[data-action="editarEfeito"]').click();
        await esperar(() => efeito('Reflexo C34').sheet?.rendered);
        await efeito('Reflexo C34').sheet.close();
        return { ligou, desligou, criado, apagou: !a.effects.has(novo.id), efeitos: a.effects.size };
      })()`);
      // 3. O Death Save: o +1 da aba Combate e o do painel geral sobem a penalidade; o "zerar" aparece e volta a 0.
      const morte = await edge.evaluate(`(async () => {
        ${AUXILIARES}
        const penalidade = () => a.system.deathSave.penalidade;
        const zerar = () => f()?.querySelector('.tab.combate [data-action="zerarDeathSave"]');
        a.sheet.changeTab('combate', 'primary');
        const antes = [penalidade(), Boolean(zerar())].join();
        f().querySelector('.tab.combate [data-action="subirDeathSave"]').click();
        await esperar(() => penalidade() === 1 && zerar());
        f().querySelector('.tab.pericias [data-action="subirDeathSave"]').click();
        await esperar(() => penalidade() === 2 && f().querySelector('.tab.combate [data-action="deathSave"]')?.textContent.includes('(+2)'));
        const subiu = [penalidade(), f().querySelector('.tab.combate [data-action="deathSave"]').textContent.trim() === '< ' + a.system.deathSave.body + ' (+2)'].join();
        zerar().click();
        await esperar(() => penalidade() === 0 && !zerar());
        return { antes, subiu, zerou: [penalidade(), Boolean(zerar())].join() };
      })()`);
      // 4. Recolher: a lista EQUIPAMENTO (o favorito fica) e o grupo Luta (a Evasão, favorita, fica); a busca não abre o
      //    grupo; fechar e abrir a ficha mantém; nada grava no ator.
      const recolher = await edge.evaluate(`(async () => {
        ${AUXILIARES}
        let gravou = 0;
        const contar = ator => { if (ator === a) gravou++; };
        Hooks.on('updateActor', contar);
        try {
          const secao = lista => f()?.querySelector('[data-action="recolherLista"][data-lista="' + lista + '"]')?.closest('section.painel');
          const vistos = lista => [...(secao(lista)?.querySelectorAll('ol.itens > li[data-item-id]') ?? [])].filter(li => !escondida(li)).map(li => li.querySelector('.nome').textContent.trim()).join();
          const luta = () => ['melee-weapon', 'brawling', 'evasion'].filter(id => !escondida(f()?.querySelector('li.pericia[data-pericia="' + id + '"]'))).join();
          const minha = () => (game.user.getFlag(S, FLAG)?.[a.id] ?? []).join();
          a.sheet.changeTab('equipamento', 'primary');
          const antes = vistos('equipamento');
          f().querySelector('[data-action="recolherLista"][data-lista="equipamento"]').click();
          await esperar(() => secao('equipamento')?.classList.contains('recolhida'));
          const equipamento = [vistos('equipamento'), secao('equipamento').querySelector('[data-action="recolherLista"]').getAttribute('aria-expanded'), secao('arma').classList.contains('recolhida')].join('|');
          a.sheet.changeTab('pericias', 'primary');
          if (!f().querySelector('[data-lista="pericias-Luta"]')) f().querySelector('[data-action="alternarPericias"]').click();
          await esperar(() => f()?.querySelector('[data-lista="pericias-Luta"]'));
          const lutaAntes = luta();
          f().querySelector('[data-lista="pericias-Luta"]').click();
          await esperar(() => f()?.querySelector('li.pericia[data-pericia="brawling"]')?.classList.contains('recolhida'));
          const grupo = [luta(), minha()].join('|');
          // A busca "briga": o grupo Luta continua à vista (tem a Briga) e recolhido; o Atletismo some pela busca.
          const campo = () => f()?.querySelector('input.busca-da-ficha');
          const digitar = texto => { campo().value = texto; campo().dispatchEvent(new Event('input', { bubbles: true })); };
          digitar('briga');
          await esperar(() => f()?.querySelector('li.pericia[data-pericia="athletics"]')?.hidden === true);
          const cabecalho = f().querySelector('[data-lista="pericias-Luta"]').closest('li');
          const briga = f().querySelector('li.pericia[data-pericia="brawling"]');
          const busca = [cabecalho.hidden, briga.hidden, escondida(briga)].join();
          digitar('');
          await esperar(() => f()?.querySelector('li.pericia[data-pericia="athletics"]') && !f().querySelector('li.pericia[data-pericia="athletics"]').hidden);
          // Fechar e abrir de novo: a flag do usuário guarda as duas.
          await a.sheet.close();
          await a.sheet.render({ force: true });
          a.sheet.changeTab('equipamento', 'primary');
          await esperar(() => secao('equipamento'));
          const reaberta = [secao('equipamento').classList.contains('recolhida'), vistos('equipamento'), f().querySelector('[data-lista="pericias-Luta"]')?.getAttribute('aria-expanded'), luta()].join('|');
          return { antes, equipamento, lutaAntes, grupo, busca, reaberta, gravou };
        } finally { Hooks.off('updateActor', contar); }
      })()`);
      // 5. No navegador do jogador (observador): a ficha dele não vem recolhida; ele recolhe e expande a lista ARMAS na flag
      //    dele, sem mudar a do mestre nem o ator.
      const doJogador = jogador ? await jogador.evaluate(`(async () => {
        const S = 'cpr-fieldbook', FLAG = 'listasRecolhidas';
        const esperar = async (f, vezes = 70) => { for (let i = 0; i < vezes && !f(); i++) await new Promise(r => setTimeout(r, 100)); if (!f()) throw Error('C34 ficha: espera esgotada'); };
        await esperar(() => game.actors.get('${preparo.ator}'));
        const a = game.actors.get('${preparo.ator}'), f = () => a.sheet.element;
        window.__c34FichaJogador = foundry.utils.deepClone(game.user.getFlag(S, FLAG) ?? null);
        await a.sheet.render({ force: true });
        a.sheet.changeTab('equipamento', 'primary');
        const secao = lista => f()?.querySelector('[data-action="recolherLista"][data-lista="' + lista + '"]')?.closest('section.painel');
        await esperar(() => secao('equipamento'));
        const limpa = [a.isOwner, secao('equipamento').classList.contains('recolhida')].join();
        secao('arma').querySelector('[data-action="recolherLista"]').click();
        await esperar(() => secao('arma')?.classList.contains('recolhida'));
        const recolheu = (game.user.getFlag(S, FLAG)?.[a.id] ?? []).join();
        secao('arma').querySelector('[data-action="recolherLista"]').click();
        await esperar(() => secao('arma') && !secao('arma').classList.contains('recolhida'));
        const expandiu = game.user.getFlag(S, FLAG)?.[a.id] === undefined;
        await a.sheet.close();
        return { limpa, recolheu, expandiu };
      })()`) : null;
      // 6. O mestre expande as duas: o ator sai da flag dele, e as linhas voltam.
      const expandir = await edge.evaluate(`(async () => {
        ${AUXILIARES}
        const mestreAntes = (game.user.getFlag(S, FLAG)?.[a.id] ?? []).join();
        a.sheet.changeTab('equipamento', 'primary');
        f().querySelector('[data-action="recolherLista"][data-lista="equipamento"]').click();
        await esperar(() => !f()?.querySelector('[data-lista="equipamento"]')?.closest('section.painel').classList.contains('recolhida'));
        a.sheet.changeTab('pericias', 'primary');
        f().querySelector('[data-lista="pericias-Luta"]').click();
        await esperar(() => f()?.querySelector('li.pericia[data-pericia="brawling"]') && !f().querySelector('li.pericia[data-pericia="brawling"]').classList.contains('recolhida'));
        const vistos = [...f().querySelectorAll('[data-lista="equipamento"]')].map(b => [...b.closest('section.painel').querySelectorAll('ol.itens > li[data-item-id]')].filter(li => !escondida(li)).length).join();
        return { mestreAntes, saiu: game.user.getFlag(S, FLAG)?.[a.id] === undefined, vistos, brigaAVista: !escondida(f().querySelector('li.pericia[data-pericia="brawling"]')) };
      })()`);
      const info = { aba, botoes, morte, recolher, doJogador, expandir };
      const ok = aba.linhas.valendo === 'Adrenalina=VALENDO=LA,Leitura=VALENDO=' && aba.linhas.situacional === 'Escuta=SITUACIONAL: LIGADO NA JANELA='
        && aba.linhas.parado === 'Foco=DESLIGADO=L,Reflexo=FORA DE USO: VALE INSTALADO='
        && aba.origens.join('|') === 'C34 Efeitos|Inalador C34 · Equipamento, vale ligado à mão|Implante C34 · Cyberware, vale instalado' && aba.percepcao === 2
        && botoes.ligou === 'valendo,true,2' && botoes.desligou === 'parado,0' && botoes.criado === 'true,systems/cpr-fieldbook/icones/neon/efeito.svg,valendo,sem mudanças'
        && botoes.apagou && botoes.efeitos === 1
        && morte.antes === '0,false' && morte.subiu === '2,true' && morte.zerou === '0,false'
        && recolher.antes === 'Inalador C34,Medidor C34,Sensor C34' && recolher.equipamento === 'Medidor C34|false|false'
        && recolher.lutaAntes === 'melee-weapon,brawling,evasion' && recolher.grupo === 'evasion|equipamento,pericias-Luta' && recolher.busca === 'false,false,true'
        && recolher.reaberta === 'true|Medidor C34|false|evasion' && recolher.gravou === 0
        && (!jogador || (doJogador.limpa === 'false,false' && doJogador.recolheu === 'arma' && doJogador.expandiu))
        && expandir.mestreAntes === 'equipamento,pericias-Luta' && expandir.saiu && expandir.vistos === '3' && expandir.brigaAVista;
      return [ok, JSON.stringify(info)];
    } finally {
      if (jogador) await jogador.evaluate(`(async () => {
        if (!('__c34FichaJogador' in window)) return true;
        const S = 'cpr-fieldbook', FLAG = 'listasRecolhidas', antes = window.__c34FichaJogador;
        if (antes === null) await game.user.unsetFlag(S, FLAG); else await game.user.update({ ['flags.' + S + '.' + FLAG]: foundry.data.operators.ForcedReplacement.create(antes) });
        delete window.__c34FichaJogador;
        return true;
      })()`).catch(() => null);
      await edge.evaluate(`(async () => {
        const c = window.__c34Ficha;
        if (!c) return true;
        const S = 'cpr-fieldbook', FLAG = 'listasRecolhidas', a = game.actors.get(c.ator);
        for (const app of [...foundry.applications.instances.values()]) if (app.options.window?.title === 'Apagar efeito') await app.close();
        for (const e of a ? [...a.allApplicableEffects()] : []) if (e.sheet?.rendered) await e.sheet.close();
        if (a?.sheet.rendered) await a.sheet.close();
        await a?.delete();
        if (c.flag === null) await game.user.unsetFlag(S, FLAG); else await game.user.update({ ['flags.' + S + '.' + FLAG]: foundry.data.operators.ForcedReplacement.create(c.flag) });
        delete window.__c34Ficha;
        return true;
      })()`);
    }
  });
};
