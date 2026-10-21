// O combate na mesa da wiki: ataque com a arma da ficha, defesa às cegas, dano na ficha com a armadura, lesões
// críticas, Death Save e desfazer. As regras ficam em mesa-regras.js (as mesmas do Fluxo de Combate do Foundry); aqui
// fica o caminho: quem pode, o que rola, quem é perguntado e o que vai para a ficha.
//
// Como no Fluxo de Combate:
//   · quem ataca rola na hora (o servidor rola); o total fica com o mestre e com quem atacou até a defesa;
//   · o alvo decide sem ver o total: a pergunta vai só para quem controla o token (o jogador dono, ou o mestre para os
//     NPCs), com a DV e a esquiva média. Sem resposta em 60 segundos, aguenta;
//   · com tudo decidido, o servidor rola o dano e aplica na ficha. O mestre pode desfazer.
'use strict';
const R = require('./mesa-regras');

const PRAZO = 60_000;

module.exports = function createCombat(ctx) {
  const { die, pool, regras, ptOf, critTables, readCharacter, sheetOf, writeSheet, tokenFor, sceneById, tokenArg, canControl, isGm,
    addEntry, connections, sendEvent, broadcast, save, tableOf, fail, int } = ctx;
  const prazo = ctx.prazo || PRAZO;
  const timers = new Map();

  // ---------------- Números de quem rola ----------------
  const mesmaPericia = (a, b) => String(a || '').replace(/s$/i, '').toLowerCase() === String(b || '').replace(/s$/i, '').toLowerCase();
  // A base de uma rolagem: STAT + perícia (personagem) ou a base da ficha do livro (NPC). Sem a perícia, só o STAT.
  function numerosDe(campaignId, token) {
    if (token.tipo === 'pj') {
      const doc = readCharacter(campaignId, token.personagem);
      const sheet = doc ? sheetOf(doc) : { stats: {}, pericias: [] };
      return {
        stats: sheet.stats,
        base(pericia, stat) {
          const achada = sheet.pericias.find(item => mesmaPericia(item.nome, pericia));
          return { valor: (sheet.stats[stat] || 0) + (achada ? achada.nivel : 0), rotulo: `${stat} + ${achada ? achada.pt : ptOf(pericia)}` };
        }
      };
    }
    const stats = token.stats || {};
    return {
      stats,
      base(pericia, stat) {
        const achada = (token.pericias || []).find(item => mesmaPericia(item.nome, pericia));
        if (achada) return { valor: achada.base, rotulo: `${achada.pt} (base)` };
        const valor = token.tipo === 'npc' ? stats[stat] || 0 : Number(token.ref) || 0;
        return { valor, rotulo: token.tipo === 'npc' ? stat : 'Base' };
      }
    };
  }
  const ferimento = token => {
    if (!token.hp || !token.hp.max) return null;
    if (token.hp.atual < 1) return { rotulo: 'Mortalmente Ferido', valor: -4 };
    if (token.hp.atual < Math.ceil(token.hp.max / 2)) return { rotulo: 'Gravemente Ferido', valor: -2 };
    return null;
  };
  // Teste do RED: 10 natural soma mais 1d10; 1 natural tira 1d10 (uma vez só).
  function rolar(partes) {
    const dado = die(10);
    const extra = dado === 10 ? die(10) : dado === 1 ? -die(10) : 0;
    return { partes, dado, extra, critico: dado === 10 ? 'sucesso' : dado === 1 ? 'falha' : null, total: partes.reduce((soma, parte) => soma + parte.valor, 0) + dado + extra };
  }
  // Sorte gasta numa rolagem: só personagem, até o que tem. Sai da ficha.
  function gastarSorte(token, pedida, mudancas) {
    const quanto = int(pedida, 0, 20, 0);
    if (!quanto) return null;
    if (token.tipo !== 'pj' || !token.sorte) throw fail(400, 'Só personagem gasta Sorte.');
    if (quanto > token.sorte.atual) throw fail(400, `Sorte insuficiente (tem ${token.sorte.atual}).`);
    token.sorte = { ...token.sorte, atual: token.sorte.atual - quanto };
    mudancas.sorte = token.sorte.atual;
    return { rotulo: 'Sorte', valor: quanto };
  }
  const distancia = (scene, a, b) => {
    const g = scene.grade;
    if (g.tipo === 'nenhuma') return Math.round(Math.hypot(b.x - a.x, b.y - a.y) / g.tamanho * g.metros * 10) / 10;
    return Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / g.tamanho) * g.metros;
  };
  // Lesões: as da tabela da wiki; a que o alvo já tem não repete.
  const penalidadeDeLesoes = lesoes => lesoes.filter(nome => [...critTables().corpo, ...critTables().cabeca].some(linha => linha[1] === nome && /Death Save base \+1/i.test(linha[2]))).length;
  function rolarLesao(token, tabela) {
    const linhas = tabela === 'cabeca' ? critTables().cabeca : critTables().corpo;
    let dados = pool(2, 6);
    let linha = linhas.find(item => item[0] === dados[0] + dados[1]);
    for (let tentativa = 0; tentativa < 12 && linha && (token.lesoes || []).includes(linha[1]); tentativa += 1) {
      dados = pool(2, 6);
      linha = linhas.find(item => item[0] === dados[0] + dados[1]);
    }
    return linha ? { nome: linha[1], efeito: linha[2], dados } : { nome: 'Lesão crítica', efeito: 'Veja a tabela.', dados };
  }
  const armaDe = (token, id, stats) => {
    if (id === 'briga') {
      const body = Number(stats.BODY) || 0;
      return { id: 'briga', nome: 'Desarmado (briga)', classe: 'briga', pericia: 'Brawling', dano: R.danoDeBriga(body), cdt: 2, distancia: false, pente: null };
    }
    return (token.armas || []).find(arma => arma.id === id) || null;
  };
  const retrato = token => ({ hp: token.hp ? { ...token.hp } : null, sp: token.sp ? JSON.parse(JSON.stringify(token.sp)) : null, lesoes: [...(token.lesoes || [])], deathSave: token.deathSave || 0, morto: Boolean(token.morto), suprimido: token.suprimido || null });
  const mudancasDoRetrato = token => ({ hp: token.hp ? token.hp.atual : 0, sp: token.sp ? { cabeca: token.sp.cabeca.atual, corpo: token.sp.corpo.atual } : undefined, lesoes: token.lesoes || [], deathSave: token.deathSave || 0, morto: Boolean(token.morto) });

  // ---------------- O dano na ficha ----------------
  // opcoes: { dados, total, local, metadeDoSp, autofogo, tabelaDaCabeca, pernaQuebrada }
  function aplicarDano(token, opcoes) {
    const local = opcoes.local === 'cabeca' ? 'cabeca' : 'corpo';
    const sp = token.sp && token.sp[local] ? token.sp[local].atual : 0;
    const conta = R.contaDoDano({ dados: opcoes.dados, total: opcoes.total, sp, local, metadeDoSp: opcoes.metadeDoSp, autofogo: opcoes.autofogo });
    const hpAntes = token.hp ? token.hp.atual : null;
    const jaMortal = Boolean(token.hp && token.hp.atual < 1);
    const lesoes = [];
    if (conta.lesao) lesoes.push(rolarLesao(token, opcoes.tabelaDaCabeca ? 'cabeca' : 'corpo'));
    // Mortalmente Ferido: todo dano de ataque traz mais uma lesão crítica (p. 186).
    if (jaMortal) lesoes.push(rolarLesao({ lesoes: [...(token.lesoes || []), ...lesoes.map(item => item.nome)] }, 'corpo'));
    if (opcoes.pernaQuebrada && conta.passou > 0) {
      const perna = critTables().corpo.find(linha => /perna quebrada/i.test(linha[1]));
      if (perna && !(token.lesoes || []).includes(perna[1])) lesoes.push({ nome: perna[1], efeito: perna[2], dados: [] });
    }
    const perda = conta.hp + lesoes.length * 5;
    if (token.hp) token.hp = { ...token.hp, atual: token.hp.atual - perda };
    if (token.sp && token.sp[local]) token.sp = { ...token.sp, [local]: { ...token.sp[local], atual: Math.max(0, token.sp[local].atual - conta.ablacao) } };
    token.lesoes = [...(token.lesoes || []), ...lesoes.map(item => item.nome)];
    return { ...conta, local, sp: { antes: sp, depois: token.sp && token.sp[local] ? token.sp[local].atual : 0 }, hp: { antes: hpAntes, depois: token.hp ? token.hp.atual : null }, lesoes, perda };
  }

  // ---------------- Ataque ----------------
  // A pergunta para quem defende: sem o total do ataque (só o mestre vê).
  function perguntaPara(viewer, registro, alvo) {
    return {
      ataque: registro.id, alvo: alvo.token, alvoNome: alvo.nome, atacante: registro.atacanteNome, arma: registro.arma.nome,
      modo: R.descreverAtaque(registro), metros: alvo.metros, dv: alvo.dv, opcoes: alvo.opcoes, esquivaMedia: alvo.esquivaMedia, prazo: registro.prazo,
      ...(isGm(viewer) ? { total: registro.ataque.total } : {})
    };
  }
  const controla = (viewer, campaignId, registro, alvo) => {
    if (isGm(viewer)) return true;
    const scene = sceneById(tableOf(campaignId).state, registro.cena);
    const token = scene && scene.tokens.find(item => item.id === alvo.token);
    return Boolean(token && token.dono && token.dono === viewer.conta);
  };
  function perguntasPara(viewer, campaignId) {
    const lista = [];
    for (const registro of tableOf(campaignId).pendentes.values()) {
      for (const alvo of registro.alvos) if (!alvo.escolha && controla(viewer, campaignId, registro, alvo)) lista.push(perguntaPara(viewer, registro, alvo));
    }
    return lista;
  }
  function avisarDefensores(campaignId, registro) {
    for (const connection of connections.values()) {
      if (connection.campanha !== campaignId) continue;
      for (const alvo of registro.alvos) if (!alvo.escolha && controla(connection.viewer, campaignId, registro, alvo)) sendEvent(connection, 'defesa', perguntaPara(connection.viewer, registro, alvo));
    }
  }
  const fecharPerguntas = (campaignId, registro) => {
    for (const connection of connections.values()) if (connection.campanha === campaignId) sendEvent(connection, 'defesa.fim', { ataque: registro.id });
  };

  // A defesa de um alvo: esquiva (DEX + Evasão + 1d10), Concentração (WILL + Concentração + 1d10) ou aguentar.
  function defender(campaignId, registro, alvo, escolha, { sorte = 0, mod = 0 } = {}) {
    const scene = sceneById(tableOf(campaignId).state, registro.cena);
    const token = scene && scene.tokens.find(item => item.id === alvo.token);
    alvo.escolha = escolha;
    if (token && (escolha === 'esquivar' || escolha === 'concentrar')) {
      const numeros = numerosDe(campaignId, token);
      const base = escolha === 'esquivar' ? numeros.base('Evasion', 'DEX') : numeros.base('Concentration', 'WILL');
      const partes = [{ rotulo: base.rotulo, valor: base.valor }];
      const dor = ferimento(token);
      if (dor) partes.push(dor);
      if (mod) partes.push({ rotulo: 'Modificador', valor: int(mod, -30, 30, 0) });
      const mudancas = {};
      const gasto = gastarSorte(token, sorte, mudancas);
      if (gasto) { partes.push(gasto); alvo.sorte = mudancas; }
      alvo.defesa = rolar(partes);
    }
    alvo.acertou = R.acertou({ modo: registro.modo, escolha, ataque: registro.ataque.total, defesa: alvo.defesa ? alvo.defesa.total : null, dv: alvo.dv });
  }

  async function concluir(campaignId, registro) {
    const table = tableOf(campaignId);
    clearTimeout(timers.get(registro.id));
    timers.delete(registro.id);
    table.pendentes.delete(registro.id);
    fecharPerguntas(campaignId, registro);
    const state = table.state;
    const scene = sceneById(state, registro.cena);
    const desfazer = registro.desfazer;
    const escritas = [];
    let danoDaArea = null;
    const classe = registro.arma.classe;
    for (const alvo of registro.alvos) {
      const token = scene && scene.tokens.find(item => item.id === alvo.token);
      if (!token) continue;
      if (alvo.sorte) escritas.push([token, alvo.sorte]);
      if (registro.modo === 'supressivo') {
        if (alvo.acertou) {
          desfazer.push({ token: token.id, antes: retrato(token) });
          token.suprimido = { desde: state.combate ? state.combate.turnos || 0 : 0 };
        }
        continue;
      }
      if (!alvo.acertou) continue;
      let dados;
      let total;
      if (registro.modo === 'autofogo') {
        dados = pool(2, 6);
        alvo.multiplicador = R.multiplicadorDeAutofogo(registro.ataque.total, alvo.escolha === 'esquivar' ? alvo.defesa.total : alvo.dv, classe);
        total = (dados[0] + dados[1]) * alvo.multiplicador;
      } else if (registro.modo === 'explosivo' && danoDaArea) {
        ({ dados, total } = danoDaArea);
      } else {
        const spec = R.lerDados(registro.arma.dano) || { quantos: 1, faces: 6, bonus: 0 };
        dados = pool(spec.quantos, spec.faces);
        total = dados.reduce((soma, valor) => soma + valor, 0) + spec.bonus;
        if (registro.modo === 'explosivo') danoDaArea = { dados, total };
      }
      desfazer.push({ token: token.id, antes: retrato(token) });
      alvo.dano = aplicarDano(token, {
        dados, total, local: registro.local, autofogo: registro.modo === 'autofogo',
        metadeDoSp: R.ehCorpoACorpo(classe) && classe !== 'briga', tabelaDaCabeca: registro.local === 'cabeca', pernaQuebrada: registro.local === 'perna'
      });
      escritas.push([token, mudancasDoRetrato(token)]);
    }
    for (const [token, mudancas] of escritas) await writeSheet(campaignId, token, mudancas);
    // O registro: o cartão pendente vira o resultado, para todos.
    const entrada = state.registro.find(item => item.id === registro.entrada);
    if (entrada) Object.assign(entrada, { pendente: false, ataque: resumoDoAtaque(registro), desfazer });
    save(table);
    broadcast(campaignId, { tokens: true, combate: Boolean(state.combate), registroTroca: entrada });
  }
  function resumoDoAtaque(registro) {
    return {
      id: registro.id, atacante: registro.atacanteNome, arma: registro.arma.nome, modo: registro.modo, descricao: R.descreverAtaque(registro),
      rolagem: registro.ataque, errou: registro.errou || false, dv: registro.dv ?? null, metros: registro.metros ?? null,
      alvos: registro.alvos.map(alvo => ({ token: alvo.token, nome: alvo.nome, tipo: alvo.tipo, dono: alvo.dono, metros: alvo.metros, dv: alvo.dv, escolha: alvo.escolha, defesa: alvo.defesa || null, acertou: alvo.acertou, multiplicador: alvo.multiplicador || null, dano: alvo.dano || null }))
    };
  }

  const operations = {
    // { atacante, arma (id ou 'briga'), modo, alvo, local (mirado), mod, sorte }
    ataque: { async run({ state, viewer, body, campaignId, table, color }) {
      const { scene, token: atacante } = tokenArg(state, viewer, body.atacante);
      if (!canControl(viewer, atacante)) throw fail(403, 'Esse token não é seu.');
      if (atacante.morto) throw fail(400, `${atacante.nome} está morto.`);
      const numeros = numerosDe(campaignId, atacante);
      const arma = armaDe(atacante, String(body.arma || 'briga'), numeros.stats);
      if (!arma) throw fail(400, 'Arma não encontrada na ficha.');
      const classe = R.classeDaArma(arma);
      const modos = R.modosDaArma({ ...arma, classe });
      const modo = modos.includes(body.modo) ? body.modo : modos[0];
      const local = modo === 'mirado' ? (['cabeca', 'perna', 'item'].includes(body.local) ? body.local : 'cabeca') : 'corpo';
      const visivel = token => isGm(viewer) || Boolean(tokenFor(viewer, scene, token, campaignId));
      let alvos;
      let alvoPrincipal = null;
      if (modo === 'supressivo') {
        alvos = scene.tokens.filter(token => token !== atacante && !token.morto && distancia(scene, atacante, token) <= R.RAIO_SUPRESSAO);
        if (!alvos.length) throw fail(400, 'Ninguém a até 25 m.');
      } else {
        alvoPrincipal = scene.tokens.find(token => token.id === String(body.alvo || ''));
        if (!alvoPrincipal || alvoPrincipal === atacante || !visivel(alvoPrincipal)) throw fail(400, 'Escolha um alvo na cena.');
        alvos = [alvoPrincipal];
      }
      const metros = alvoPrincipal ? distancia(scene, atacante, alvoPrincipal) : null;
      if (modo === 'corpo' && metros > Math.max(2, scene.grade.metros)) throw fail(400, `Longe demais para corpo a corpo (${metros} m; o alcance é 2 m).`);
      // Munição: 1 por tiro, 10 no autofogo e no fogo supressivo. Os NPCs do livro não contam bala.
      const balas = arma.pente ? (['autofogo', 'supressivo'].includes(modo) ? R.BALAS_AUTOFOGO : 1) : 0;
      if (arma.pente && arma.pente.atual < balas) throw fail(400, balas > 1 ? 'Autofogo e fogo supressivo precisam de 10 balas no pente.' : `${arma.nome} está sem balas: recarregue.`);

      const pericia = ['autofogo', 'supressivo'].includes(modo) ? 'Autofire' : arma.pericia || (R.ehCorpoACorpo(classe) ? 'Melee Weapon' : 'Handgun');
      const base = numeros.base(pericia, R.ehCorpoACorpo(classe) ? 'DEX' : 'REF');
      const partes = [{ rotulo: base.rotulo, valor: base.valor }];
      if (modo === 'mirado') partes.push({ rotulo: 'Mirado', valor: R.MIRADO });
      const dor = ferimento(atacante);
      if (dor) partes.push(dor);
      const mod = int(body.mod, -30, 30, 0);
      if (mod) partes.push({ rotulo: 'Modificador', valor: mod });
      const mudancas = {};
      const gasto = gastarSorte(atacante, body.sorte, mudancas);
      if (gasto) partes.push(gasto);
      const municao = arma.pente ? { token: atacante.id, arma: arma.id, antes: arma.pente.atual } : null;
      if (arma.pente) { arma.pente = { ...arma.pente, atual: arma.pente.atual - balas }; mudancas.armas = { [arma.id]: { pente: arma.pente.atual } }; }
      const registro = {
        id: ctx.newId(), cena: scene.id, atacante: atacante.id, atacanteNome: atacante.nome, arma: { id: arma.id, nome: arma.nome, classe, dano: arma.dano }, modo, local,
        ataque: rolar(partes), alvos: [], desfazer: [{ token: atacante.id, antes: retrato(atacante), municao }], prazo: new Date(Date.now() + prazo).toISOString()
      };
      if (modo === 'explosivo') {
        registro.metros = metros;
        registro.dv = R.dvPelaDistancia(regras(), classe, metros);
        if (registro.dv === null || registro.ataque.total <= registro.dv) {
          registro.errou = true;
          alvos = [];
        } else {
          // A área: 10 × 10 m em volta do alvo.
          const metade = (R.AREA_EXPLOSIVO / 2) / scene.grade.metros * scene.grade.tamanho;
          alvos = scene.tokens.filter(token => !token.morto && Math.abs(token.x - alvoPrincipal.x) <= metade + 0.5 && Math.abs(token.y - alvoPrincipal.y) <= metade + 0.5);
        }
      }
      for (const token of alvos) {
        const numerosDoAlvo = numerosDe(campaignId, token);
        const ref = Number(numerosDoAlvo.stats.REF) || 0;
        const esquiva = R.podeEsquivar({ modo, ref, semPerna: (token.lesoes || []).some(nome => /perna desmembrada/i.test(nome)) });
        const metrosDoAlvo = distancia(scene, atacante, token);
        const evasao = numerosDoAlvo.base('Evasion', 'DEX');
        const alvo = {
          token: token.id, nome: token.nome, tipo: token.tipo, dono: token.dono || null, metros: metrosDoAlvo, opcoes: R.opcoesDeDefesa({ modo, esquiva }),
          dv: ['tiro', 'mirado', 'autofogo'].includes(modo) ? R.dvPelaDistancia(regras(), classe, metrosDoAlvo, modo === 'autofogo') : null,
          esquivaMedia: evasao.valor + R.MEDIA_D10, escolha: null, defesa: null
        };
        registro.alvos.push(alvo);
        // Só uma escolha (corpo a corpo, REF abaixo de 8, fogo supressivo): rola já.
        if (alvo.opcoes.length === 1) defender(campaignId, registro, alvo, alvo.opcoes[0]);
      }
      if (gasto || municao) await writeSheet(campaignId, atacante, mudancas);
      const entrada = addEntry(state, {
        tipo: 'ataque', autor: ctx.authorOf(viewer, color), quem: atacante.nome, pendente: true,
        ataque: { atacante: atacante.nome, arma: arma.nome, modo, descricao: R.descreverAtaque(registro), alvos: registro.alvos.map(alvo => ({ nome: alvo.nome })), rolagem: registro.ataque }
      });
      registro.entrada = entrada.id;
      table.pendentes.set(registro.id, registro);
      if (registro.alvos.every(alvo => alvo.escolha)) {
        broadcast(campaignId, { tokens: true, registro: entrada });
        await concluir(campaignId, registro);
        return { resultado: { ataque: registro.id, concluido: true } };
      }
      timers.set(registro.id, setTimeout(() => {
        for (const alvo of registro.alvos) if (!alvo.escolha) defender(campaignId, registro, alvo, R.escolhaPadrao(alvo.opcoes));
        concluir(campaignId, registro).catch(error => console.error('Mesa: ataque', error));
      }, Math.max(50, Date.parse(registro.prazo) - Date.now())));
      timers.get(registro.id).unref();
      avisarDefensores(campaignId, registro);
      return { tokens: true, registro: entrada, resultado: { ataque: registro.id, concluido: false } };
    } },

    // { ataque, alvo, escolha, sorte, mod }: quem controla o alvo (ou o mestre) decide.
    'ataque.defender': { async run({ viewer, body, campaignId, table }) {
      const registro = table.pendentes.get(String(body.ataque || ''));
      if (!registro) throw fail(404, 'Esse ataque já foi resolvido.');
      const alvo = registro.alvos.find(item => item.token === String(body.alvo || '') && !item.escolha);
      if (!alvo) throw fail(404, 'Esse alvo já se defendeu.');
      if (!controla(viewer, campaignId, registro, alvo)) throw fail(403, 'Esse token não é seu.');
      if (!alvo.opcoes.includes(body.escolha)) throw fail(400, 'Escolha uma das opções.');
      defender(campaignId, registro, alvo, body.escolha, { sorte: body.sorte, mod: body.mod });
      for (const connection of connections.values()) if (connection.campanha === campaignId) sendEvent(connection, 'defesa.fim', { ataque: registro.id, alvo: alvo.token });
      if (registro.alvos.every(item => item.escolha)) await concluir(campaignId, registro);
      return {};
    } },

    // O mestre volta como estava antes de um ataque, de um dano ou de um Death Save.
    'ataque.desfazer': { mestre: true, async run({ state, body, campaignId }) {
      const entrada = state.registro.find(item => item.id === String(body.entrada || ''));
      if (!entrada || !Array.isArray(entrada.desfazer) || entrada.pendente) throw fail(404, 'Nada a desfazer aqui.');
      if (entrada.desfeito) throw fail(409, 'Já foi desfeito.');
      for (const { token: id, antes, municao } of entrada.desfazer) {
        let token = null;
        for (const scene of state.cenas) token = token || scene.tokens.find(item => item.id === id);
        if (!token) continue;
        Object.assign(token, { hp: antes.hp, sp: antes.sp, lesoes: antes.lesoes, deathSave: antes.deathSave, morto: antes.morto, suprimido: antes.suprimido });
        const mudancas = mudancasDoRetrato(token);
        if (municao) {
          const arma = (token.armas || []).find(item => item.id === municao.arma);
          if (arma && arma.pente) { arma.pente = { ...arma.pente, atual: municao.antes }; mudancas.armas = { [arma.id]: { pente: municao.antes } }; }
        }
        await writeSheet(campaignId, token, mudancas);
      }
      entrada.desfeito = true;
      return { tokens: true, combate: Boolean(state.combate), registroTroca: entrada };
    } },

    // Dano sem ataque (queda, fogo, um tiro resolvido à mão): { token, expressao ou valor, local, metade, semArmadura }.
    'dano.aplicar': { mestre: true, async run({ state, viewer, body, campaignId, color }) {
      const { token } = tokenArg(state, viewer, body.token);
      let dados;
      let total;
      if (body.expressao) {
        const spec = R.lerDados(body.expressao);
        if (!spec || spec.quantos > 20) throw fail(400, 'Use o formato NdM, como 3d6.');
        dados = pool(spec.quantos, spec.faces);
        total = dados.reduce((soma, valor) => soma + valor, 0) + spec.bonus;
      } else {
        total = int(body.valor, 0, 999, 0);
        dados = [];
      }
      const antes = retrato(token);
      const salvo = token.sp;
      if (body.semArmadura) token.sp = null;
      const dano = aplicarDano(token, { dados, total, local: body.local, metadeDoSp: Boolean(body.metade) });
      if (body.semArmadura) token.sp = salvo;
      await writeSheet(campaignId, token, mudancasDoRetrato(token));
      const entrada = addEntry(state, { tipo: 'dano', autor: ctx.authorOf(viewer, color), quem: token.nome, alvoTipo: token.tipo, alvoDono: token.dono || null, dano, desfazer: [{ token: token.id, antes }] });
      return { tokens: true, registro: entrada };
    } },

    // Death Save: 1d10 + penalidade menor que o BODY; 10 natural falha. Quem controla o token (ou o mestre) rola.
    deathsave: { async run({ state, viewer, body, campaignId, color }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      if (token.morto) throw fail(400, `${token.nome} já morreu.`);
      if (!token.hp || token.hp.atual >= 1) throw fail(400, `${token.nome} não está Mortalmente Ferido.`);
      const body_ = Number(numerosDe(campaignId, token).stats.BODY) || 0;
      const base = penalidadeDeLesoes(token.lesoes || []);
      const penalidade = base + (token.deathSave || 0);
      const dado = die(10);
      const vive = R.sobreviveu({ dado, penalidade, body: body_ });
      const antes = retrato(token);
      if (vive) token.deathSave = (token.deathSave || 0) + 1;
      else token.morto = true;
      if (state.combate && state.combate.deathSave === token.id) state.combate.deathSave = null;
      await writeSheet(campaignId, token, mudancasDoRetrato(token));
      const entrada = addEntry(state, { tipo: 'deathsave', autor: ctx.authorOf(viewer, color), quem: token.nome, deathSave: { dado, penalidade, body: body_, vive }, desfazer: [{ token: token.id, antes }] });
      return { tokens: true, combate: true, registro: entrada };
    } },
    // Estabilizado (o teste de Primeiros Socorros ou Medicina passou): volta a 1 HP e o Death Save zera.
    estabilizar: { mestre: true, async run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!token.hp) throw fail(400, 'Este token não tem HP.');
      token.hp = { ...token.hp, atual: Math.max(1, token.hp.atual) };
      token.deathSave = 0;
      await writeSheet(campaignId, token, mudancasDoRetrato(token));
      return { tokens: true, registro: ctx.systemEntry(state, `${token.nome} foi estabilizado (1 HP).`) };
    } },
    // O mestre marca ou tira: morto, suprimido.
    'token.estado': { mestre: true, async run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (body.morto !== undefined) token.morto = Boolean(body.morto);
      if (body.suprimido === false) token.suprimido = null;
      await writeSheet(campaignId, token, mudancasDoRetrato(token));
      return { tokens: true, combate: Boolean(state.combate) };
    } },
    'arma.recarregar': { async run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      const arma = (token.armas || []).find(item => item.id === String(body.arma || ''));
      if (!arma || !arma.pente) throw fail(400, 'Essa arma não tem pente.');
      arma.pente = { ...arma.pente, atual: arma.pente.max };
      await writeSheet(campaignId, token, { armas: { [arma.id]: { pente: arma.pente.atual } } });
      return { tokens: true };
    } }
  };

  // No começo da vez de alguém: o Suprimido de quem acabou a vez sai; o Mortalmente Ferido precisa do Death Save.
  function aoPassarAVez(state, anterior) {
    const combat = state.combate;
    if (!combat) return;
    const scene = sceneById(state, combat.cena);
    const achar = id => scene && scene.tokens.find(item => item.id === id);
    const saiu = anterior && achar(anterior);
    if (saiu && saiu.suprimido && (saiu.suprimido.desde || 0) < (combat.inicioDaVez || 0)) saiu.suprimido = null;
    combat.turnos = (combat.turnos || 0) + 1;
    combat.inicioDaVez = combat.turnos;
    const atual = combat.ordem[combat.vez] && achar(combat.ordem[combat.vez].token);
    combat.deathSave = atual && atual.hp && atual.hp.atual < 1 && !atual.morto ? atual.id : null;
  }
  // Na volta do servidor, ataque que ficou pela metade não continua: o cartão diz que foi cancelado.
  function cancelarPendentes(state) {
    for (const entrada of state.registro) if (entrada.pendente) Object.assign(entrada, { pendente: false, cancelado: true });
  }
  return { operations, perguntasPara, aoPassarAVez, cancelarPendentes };
};
