// O combate na mesa da wiki: ataque com a arma da ficha, defesa às cegas, dano na ficha com a armadura, lesões
// críticas, Death Save e desfazer. As regras ficam em mesa-regras.js (as mesmas do Fluxo de Combate do Foundry); aqui
// fica o caminho: quem pode, o que rola, quem é perguntado e o que vai para a ficha.
//
// Como no Fluxo de Combate:
//   · quem ataca rola na hora (o servidor rola); o total fica com o mestre e com quem atacou até a defesa;
//   · o alvo decide sem ver o total: a pergunta vai só para quem controla o token (o jogador dono, ou o mestre para os
//     NPCs), com a DV e a esquiva média. Sem resposta em 60 segundos, aguenta;
//   · com tudo decidido, o servidor rola o dano e aplica na ficha. O mestre pode desfazer.
//
// As armas de 2077 (o perfil em arma.kit, de mesa-2077.js) entram no mesmo caminho, como o módulo do Foundry
// (foundry-2077/scripts/armas2077.mjs) e o Fluxo de Combate fazem: as travas antes do tiro, os ajustes do ataque, as
// balas, o dano, a segunda chance da munição Smart melhorada, os dois alvos da Kappa e o estado da arma depois do tiro
// (a carga Tech, o ferrolho).
'use strict';
const R = require('./mesa-regras');
const V = require('./mesa-visao');

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
  // opcoes: { dados, total, local, metadeDoSp, autofogo, tabelaDaCabeca, pernaQuebrada, bonusDaLesao }
  // bonusDaLesao: o dano bônus da lesão dos dois 6 (5; 10 com arma Power). As outras lesões causam 5.
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
    const bonusDosDados = conta.lesao ? opcoes.bonusDaLesao || 5 : 0;
    const perda = conta.hp + bonusDosDados + (lesoes.length - (conta.lesao ? 1 : 0)) * 5;
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
    alvo.acertou = R.acertou({ modo: registro.modo, escolha, ataque: totalDoAtaque(registro), defesa: alvo.defesa ? alvo.defesa.total : null, dv: alvo.dv });
    // Munição Smart melhorada: errou a DV (ou a esquiva) por 5 ou menos, a segunda chance contra este alvo.
    if (!alvo.acertou && registro.segundaChance && ['tiro', 'mirado', 'ricochete', 'autofogo'].includes(registro.modo)) {
      const contra = escolha === 'esquivar' && alvo.defesa ? alvo.defesa.total : alvo.dv;
      if (R.temSegundaChance({ ataque: registro.ataque.total, contra })) {
        alvo.segundaChance = rolarSegundaChance(registro);
        alvo.acertou = alvo.segundaChance.total > contra;
      }
    }
  }
  // O total que vale contra a defesa: o do ataque ou o da segunda chance (no cartucho, contra a DV 13).
  const totalDoAtaque = registro => (registro.segunda ? registro.segunda.total : registro.ataque.total);
  // 14 + 1d10, com as penalidades do primeiro tiro (Mission Kit p. 32).
  const rolarSegundaChance = registro => rolar([{ rotulo: 'Smart melhorada', valor: R.KIT.segundaChance.base },
    ...(registro.penalidades ? [{ rotulo: 'Penalidades do tiro', valor: registro.penalidades }] : [])]);

  // A pergunta de um alvo (a DV pela distância de quem atira, a esquiva, as opções). Só uma opção: rola já.
  function novoAlvo(campaignId, scene, registro, atacante, token) {
    const numerosDoAlvo = numerosDe(campaignId, token);
    const ref = Number(numerosDoAlvo.stats.REF) || 0;
    const esquiva = R.podeEsquivar({ modo: registro.modo, ref, semPerna: (token.lesoes || []).some(nome => /perna desmembrada/i.test(nome)) });
    const metros = distancia(scene, atacante, token);
    const alvo = {
      token: token.id, nome: token.nome, tipo: token.tipo, dono: token.dono || null, metros, opcoes: R.opcoesDeDefesa({ modo: registro.modo, esquiva }),
      dv: ['tiro', 'mirado', 'ricochete', 'autofogo'].includes(registro.modo) ? R.dvPelaDistancia(regras(), registro.arma.classe, metros, registro.modo === 'autofogo') : null,
      esquivaMedia: numerosDoAlvo.base('Evasion', 'DEX').valor + R.MEDIA_D10, escolha: null, defesa: null
    };
    registro.alvos.push(alvo);
    if (alvo.opcoes.length === 1) defender(campaignId, registro, alvo, alvo.opcoes[0]);
    return alvo;
  }
  // Sem resposta no prazo: quem não decidiu aguenta (ou rola sozinho, se for a única opção).
  function armarPrazo(campaignId, registro) {
    clearTimeout(timers.get(registro.id));
    registro.prazo = new Date(Date.now() + prazo).toISOString();
    timers.set(registro.id, setTimeout(() => {
      for (const alvo of registro.alvos) if (!alvo.escolha) defender(campaignId, registro, alvo, R.escolhaPadrao(alvo.opcoes));
      concluir(campaignId, registro).catch(error => console.error('Mesa: ataque', error));
    }, Math.max(50, prazo)));
    timers.get(registro.id).unref();
  }

  // Arma Smart que trava dois alvos (a Tsunami Kappa): o primeiro não foi atingido, as balas vão para o segundo, que se
  // defende agora. true: o ataque espera essa defesa.
  function redirecionar(campaignId, registro) {
    if (!registro.segundoAlvo || registro.redirecionado || !registro.alvos[0] || registro.alvos[0].acertou) return false;
    registro.redirecionado = true;
    const scene = sceneById(tableOf(campaignId).state, registro.cena);
    const atacante = scene && scene.tokens.find(item => item.id === registro.atacante);
    const token = scene && scene.tokens.find(item => item.id === registro.segundoAlvo);
    if (!atacante || !token || token.morto) return false;
    const alvo = novoAlvo(campaignId, scene, registro, atacante, token);
    alvo.redirecionado = true;
    if (alvo.escolha) return false;
    armarPrazo(campaignId, registro);
    avisarDefensores(campaignId, registro);
    return true;
  }

  // Resolve o ataque: o dano em quem foi atingido, na ficha. false: ainda espera a defesa do segundo alvo.
  async function concluir(campaignId, registro) {
    if (redirecionar(campaignId, registro)) return false;
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
      const naArea = registro.modo === 'explosivo' || registro.modo === 'cartucho';
      if (registro.modo === 'autofogo') {
        dados = pool(2, 6);
        const contra = alvo.escolha === 'esquivar' ? alvo.defesa.total : alvo.dv;
        alvo.multiplicador = R.multiplicadorDeAutofogo(alvo.segundaChance ? alvo.segundaChance.total : registro.ataque.total, contra, classe, registro.autofogoMax);
        total = (dados[0] + dados[1]) * alvo.multiplicador;
      } else if (naArea && danoDaArea) {
        ({ dados, total } = danoDaArea);
      } else {
        const spec = R.lerDados(registro.arma.dano) || { quantos: 1, faces: 6, bonus: 0 };
        dados = pool(spec.quantos, spec.faces);
        total = dados.reduce((soma, valor) => soma + valor, 0) + spec.bonus;
        if (naArea) danoDaArea = { dados, total };
      }
      desfazer.push({ token: token.id, antes: retrato(token) });
      alvo.dano = aplicarDano(token, {
        dados, total, local: registro.local, autofogo: registro.modo === 'autofogo', bonusDaLesao: registro.bonusDaLesao,
        metadeDoSp: (R.ehCorpoACorpo(classe) && classe !== 'briga') || Boolean(registro.metadeDoSp), tabelaDaCabeca: registro.local === 'cabeca', pernaQuebrada: registro.local === 'perna'
      });
      escritas.push([token, mudancasDoRetrato(token)]);
    }
    for (const [token, mudancas] of escritas) await writeSheet(campaignId, token, mudancas);
    // O registro: o cartão pendente vira o resultado, para todos.
    const entrada = state.registro.find(item => item.id === registro.entrada);
    if (entrada) Object.assign(entrada, { pendente: false, ataque: resumoDoAtaque(registro), desfazer });
    save(table);
    broadcast(campaignId, { tokens: true, combate: Boolean(state.combate), registroTroca: entrada });
    return true;
  }
  function resumoDoAtaque(registro) {
    return {
      id: registro.id, atacante: registro.atacanteNome, arma: registro.arma.nome, modo: registro.modo, descricao: R.descreverAtaque(registro),
      rolagem: registro.ataque, errou: registro.errou || false, dv: registro.dv ?? null, metros: registro.metros ?? null,
      ...(registro.notas && registro.notas.length ? { notas: registro.notas } : {}), ...(registro.segunda ? { segunda: registro.segunda } : {}),
      alvos: registro.alvos.map(alvo => ({
        token: alvo.token, nome: alvo.nome, tipo: alvo.tipo, dono: alvo.dono, metros: alvo.metros, dv: alvo.dv, escolha: alvo.escolha, defesa: alvo.defesa || null, acertou: alvo.acertou,
        multiplicador: alvo.multiplicador || null, dano: alvo.dano || null, ...(alvo.segundaChance ? { segundaChance: alvo.segundaChance } : {}), ...(alvo.redirecionado ? { redirecionado: true } : {})
      }))
    };
  }

  // ---------------- As armas de 2077 ----------------
  // O que impede o tiro (as mesmas mensagens do Foundry). cromo null: a ficha não diz o cromo, e a mesa não cobra.
  function travasDe2077(atacante, arma, kit) {
    if (!kit) return;
    if (kit.classe === 'smart' && arma.distancia && atacante.cromo && !atacante.cromo.conexaoSmart) throw fail(400, `${arma.nome} é uma arma Smart: só dispara conectada (o Personal Link do Neuroport, Interface Plugs ou Subdermal Grip).`);
    if (kit.ferrolho && arma.ferrolho) throw fail(400, `${arma.nome}: gaste uma Ação para manejar o ferrolho antes de atirar de novo.`);
    if (kit.minimoDeBalas && arma.pente && arma.pente.atual < kit.minimoDeBalas) throw fail(400, `${arma.nome} só dispara com ${kit.minimoDeBalas} no pente (tem ${arma.pente.atual}): é a trava de segurança.`);
    if (kit.soSmartMelhorada && arma.municao && !arma.smartMelhorada) throw fail(400, `${arma.nome} só aceita munição Smart melhorada.`);
  }
  // As notas do cartão: as regras da arma que valeram neste ataque. pente: o que tinha antes do tiro.
  function notasDe2077({ arma, kit, modo, pente, usaCarga, doisCanos, segundoAlvo, alvoPrincipal }) {
    const notas = [];
    if (!kit) return notas;
    if (modo === 'ricochete') notas.push('Ricochete: o alcance é a distância até o alvo, e precisa de um caminho livre do ponto do ricochete até ele.');
    if (kit.classe === 'smart' && arma.smartMelhorada) notas.push(`Munição Smart melhorada: ignora escuridão, fumaça e neblina. Errou por ${R.KIT.segundaChance.margem} ou menos: tenta de novo com ${R.KIT.segundaChance.base} + 1d10.`);
    if (segundoAlvo) notas.push(`Trava em dois alvos: se errar ${alvoPrincipal.nome}, as balas Smart vão para ${segundoAlvo.nome}.`);
    if (kit.balas > 1 && R.TIRO_UNICO.has(modo) && arma.pente) {
      notas.push(kit.danoComMenos && pente < kit.balas ? `Só ${pente} ${pente === 1 ? 'bala' : 'balas'} no pente: dispara o que tem e causa ${kit.danoComMenos}.` : `Gasta ${kit.balas} balas no tiro.`);
    }
    if (kit.danoMirado && modo === 'mirado') notas.push(`Tiro mirado: ${kit.danoMirado} de dano.`);
    if (doisCanos) notas.push(`Os dois canos de uma vez: ${R.KIT.doisCanos.dano}.`);
    if (usaCarga) {
      const cdt = kit.cdtNaCarga ? `continua CDT ${kit.cdtNaCarga}${kit.balasNaCarga ? ` e gasta até ${kit.balasNaCarga} balas por ataque` : ''}` : 'CDT 1';
      notas.push(`Carregada: ${cdt}; atravessa ${kit.cargaGrossa ? 'cobertura fina e grossa' : 'cobertura fina'} (a cobertura não perde HP) e ignora metade do SP do alvo.`);
    }
    if (kit.ferrolho) notas.push('Depois do tiro, gaste uma Ação para manejar o ferrolho antes de atirar de novo.');
    return notas;
  }
  // Quem não aguenta o coice (a Carnage sem BODY 10, a Burya sem o braço reforçado) sofre a lesão crítica, se ainda não
  // tem. Só a lesão: o dano bônus é das lesões dos dados de dano. O desfazer tira.
  const nomeDaLesao = livro => {
    const pt = R.LESOES_DO_KIT[livro] || livro;
    const linha = critTables().corpo.find(item => String(item[1]).toLowerCase() === pt.toLowerCase());
    return linha ? linha[1] : pt;
  };
  function lesoesDoAtirador(atacante, kit, stats, mudancas, notas) {
    if (!kit) return;
    const body = Number(stats.BODY) || 0;
    const pedidas = [];
    if (kit.exigeBody && kit.lesao && body < kit.exigeBody) pedidas.push([kit.lesao, `tem BODY ${body} (a arma pede ${kit.exigeBody})`]);
    if (kit.lesaoSemCromo && atacante.cromo && !atacante.cromo.bracoForte) pedidas.push([kit.lesaoSemCromo, 'não tem Grafted Muscle and Bone Lace nem cyberbraço']);
    for (const [livro, motivo] of pedidas) {
      const nome = nomeDaLesao(livro);
      if ((atacante.lesoes || []).includes(nome)) continue;
      atacante.lesoes = [...(atacante.lesoes || []), nome];
      mudancas.lesoes = atacante.lesoes;
      notas.push(`${atacante.nome} ${motivo}: sofre a lesão crítica ${nome}.`);
    }
  }
  // A arma de um token, para quem controla o token.
  function armaDoToken(state, viewer, body) {
    const { token } = tokenArg(state, viewer, body.token);
    if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
    const arma = (token.armas || []).find(item => item.id === String(body.arma || ''));
    if (!arma) throw fail(400, 'Arma não encontrada na ficha.');
    return { token, arma };
  }

  const operations = {
    // { atacante, arma (id ou 'briga'), modo, alvo, local (mirado), mod, sorte, alvo2 (a Kappa), doisCanos (a Palica) }
    ataque: { async run({ state, viewer, body, campaignId, table, color }) {
      const { scene, token: atacante } = tokenArg(state, viewer, body.atacante);
      if (!canControl(viewer, atacante)) throw fail(403, 'Esse token não é seu.');
      if (atacante.morto) throw fail(400, `${atacante.nome} está morto.`);
      const numeros = numerosDe(campaignId, atacante);
      const arma = armaDe(atacante, String(body.arma || 'briga'), numeros.stats);
      if (!arma) throw fail(400, 'Arma não encontrada na ficha.');
      const classe = R.classeDaArma(arma);
      const kit = arma.kit || null;
      const modos = R.modosDaArma({ ...arma, classe });
      const modo = modos.includes(body.modo) ? body.modo : modos[0];
      const local = modo === 'mirado' ? (['cabeca', 'perna', 'item'].includes(body.local) ? body.local : 'cabeca') : 'corpo';
      travasDe2077(atacante, arma, kit);
      const visivel = token => isGm(viewer) || Boolean(tokenFor(viewer, scene, token, campaignId));
      let alvos;
      let alvoPrincipal = null;
      let segundoAlvo = null;
      if (modo === 'supressivo') {
        alvos = scene.tokens.filter(token => token !== atacante && !token.morto && distancia(scene, atacante, token) <= R.RAIO_SUPRESSAO);
        if (!alvos.length) throw fail(400, 'Ninguém a até 25 m.');
      } else {
        alvoPrincipal = scene.tokens.find(token => token.id === String(body.alvo || ''));
        if (!alvoPrincipal || alvoPrincipal === atacante || !visivel(alvoPrincipal)) throw fail(400, 'Escolha um alvo na cena.');
        alvos = [alvoPrincipal];
        if (kit && kit.doisAlvos && body.alvo2 && ['tiro', 'mirado', 'ricochete'].includes(modo)) {
          segundoAlvo = scene.tokens.find(token => token.id === String(body.alvo2));
          if (!segundoAlvo || segundoAlvo === atacante || segundoAlvo === alvoPrincipal || segundoAlvo.morto || !visivel(segundoAlvo)) throw fail(400, 'Escolha um segundo alvo na cena.');
          if (distancia(scene, alvoPrincipal, segundoAlvo) > R.KIT.redirecionamento) throw fail(400, `O segundo alvo tem de estar a até ${R.KIT.redirecionamento} m do primeiro.`);
        }
      }
      const metros = alvoPrincipal ? distancia(scene, atacante, alvoPrincipal) : null;
      if (modo === 'corpo' && metros > Math.max(2, scene.grade.metros)) throw fail(400, `Longe demais para corpo a corpo (${metros} m; o alcance é 2 m).`);
      // Espingarda com cartucho: todos à frente, até 6 m e à vista de quem atira (a parede tapa), na direção do alvo
      // escolhido.
      const daFrente = modo === 'cartucho' ? scene.tokens.filter(token => token !== atacante && !token.morto && distancia(scene, atacante, token) <= R.ALCANCE_CARTUCHO
        && R.naFrente(atacante, alvoPrincipal, token) && V.algumVe([{ x: atacante.x, y: atacante.y }], token, scene.paredes || [], (token.tamanho || 1) * scene.grade.tamanho * 0.4, { global: true })) : null;
      if (daFrente && !daFrente.length) throw fail(400, `Ninguém à frente até ${R.ALCANCE_CARTUCHO} m.`);

      // Munição: 1 por tiro, 10 no autofogo e no fogo supressivo, ou o que a arma de 2077 pede (balas por tiro, os dois
      // canos, a carga). Os NPCs do livro não contam bala.
      const carregada = Boolean(kit && kit.classe === 'tech' && R.cargaValida(arma.carga, state.combate));
      const usaCarga = carregada && modo !== 'supressivo';
      const pente = arma.pente ? arma.pente.atual : Infinity;
      const doisCanos = Boolean(kit && kit.doisCanos && body.doisCanos && R.TIRO_UNICO.has(modo) && pente >= R.KIT.doisCanos.balas);
      const balas = arma.pente ? R.balasDoAtaque({ modo, kit, pente, carregada: usaCarga, doisCanos }) : 0;
      if (arma.pente && arma.pente.atual < balas) {
        throw fail(400, ['autofogo', 'supressivo'].includes(modo) ? 'Autofogo e fogo supressivo precisam de 10 balas no pente.'
          : balas > 1 ? `${arma.nome} gasta ${balas} balas no tiro (tem ${arma.pente.atual}): recarregue.` : `${arma.nome} está sem balas: recarregue.`);
      }

      const pericia = ['autofogo', 'supressivo'].includes(modo) ? 'Autofire' : arma.pericia || (R.ehCorpoACorpo(classe) ? 'Melee Weapon' : 'Handgun');
      const base = numeros.base(pericia, R.ehCorpoACorpo(classe) ? 'DEX' : 'REF');
      const antes = retrato(atacante);
      const partes = [{ rotulo: base.rotulo, valor: base.valor }];
      if (modo === 'mirado') partes.push({ rotulo: 'Mirado', valor: R.MIRADO });
      if (modo === 'ricochete') {
        const coprocessador = Boolean(atacante.cromo && atacante.cromo.coprocessador);
        partes.push({ rotulo: coprocessador ? 'Ricochete (Ballistic Coprocessor)' : 'Ricochete', valor: coprocessador ? R.KIT.ricocheteComCoprocessador : R.KIT.ricochete });
      }
      if (kit && kit.classe === 'smart' && arma.distancia) partes.push({ rotulo: 'Arma Smart', valor: R.KIT.smart });
      if (arma.excelente) partes.push({ rotulo: 'Qualidade excelente', valor: R.KIT.excelente });
      if (kit && kit.coronhaRetratil && arma.coronha) partes.push({ rotulo: 'Coronha recolhida', valor: R.KIT.coronha });
      const dor = ferimento(atacante);
      if (dor) partes.push(dor);
      const mod = int(body.mod, -30, 30, 0);
      if (mod) partes.push({ rotulo: 'Modificador', valor: mod });
      // As penalidades vão junto na segunda chance da munição Smart melhorada.
      const penalidades = partes.slice(1).filter(parte => parte.valor < 0).reduce((soma, parte) => soma + parte.valor, 0);
      const mudancas = {};
      const gasto = gastarSorte(atacante, body.sorte, mudancas);
      if (gasto) partes.push(gasto);
      const notas = notasDe2077({ arma, kit, modo, pente, usaCarga, doisCanos, segundoAlvo, alvoPrincipal });
      lesoesDoAtirador(atacante, kit, numeros.stats, mudancas, notas);

      // A arma depois do tiro: o pente, a carga Tech gasta (a Omaha fica carregada até o fim do turno) e o ferrolho.
      const depois = {};
      const estado = { pente: arma.pente ? arma.pente.atual : null, carga: arma.carga || null, ferrolho: Boolean(arma.ferrolho) };
      if (arma.pente) { arma.pente = { ...arma.pente, atual: arma.pente.atual - balas }; depois.pente = arma.pente.atual; }
      if (usaCarga) {
        const combate = state.combate;
        if (!kit.cargaAteFimDoTurno) arma.carga = null;
        else if (!arma.carga.disparou) arma.carga = { ...arma.carga, disparou: { rodada: combate ? combate.rodada : null, vez: combate ? combate.vez : null, em: Date.now() } };
        depois.carga = arma.carga;
      }
      if (kit && kit.ferrolho) { arma.ferrolho = true; depois.ferrolho = true; }
      const municao = Object.keys(depois).length ? { token: atacante.id, arma: arma.id, antes: estado.pente, carga: estado.carga, ferrolho: estado.ferrolho } : null;
      if (municao) mudancas.armas = { [arma.id]: depois };
      const registro = {
        id: ctx.newId(), cena: scene.id, atacante: atacante.id, atacanteNome: atacante.nome, modo, local,
        arma: { id: arma.id, nome: arma.nome, classe, dano: R.formulaDoDano({ modo, dano: arma.dano, kit, pente, doisCanos }) },
        ataque: rolar(partes), alvos: [], desfazer: [{ token: atacante.id, antes, municao }], prazo: new Date(Date.now() + prazo).toISOString(),
        notas, penalidades, metadeDoSp: usaCarga, bonusDaLesao: kit && kit.classe === 'power' ? R.KIT.bonusPower : 5,
        segundaChance: Boolean(kit && kit.classe === 'smart' && arma.smartMelhorada && arma.distancia),
        autofogoMax: R.autofogoDe(arma, classe), segundoAlvo: segundoAlvo ? segundoAlvo.id : null
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
      if (modo === 'cartucho') {
        registro.metros = metros;
        registro.dv = R.DV_CARTUCHO;
        if (!(registro.ataque.total > R.DV_CARTUCHO) && registro.segundaChance && R.temSegundaChance({ ataque: registro.ataque.total, contra: R.DV_CARTUCHO })) registro.segunda = rolarSegundaChance(registro);
        if (totalDoAtaque(registro) > R.DV_CARTUCHO) alvos = daFrente;
        else { registro.errou = true; alvos = []; }
      }
      // Só uma escolha (corpo a corpo, REF abaixo de 8, fogo supressivo): rola já.
      for (const token of alvos) novoAlvo(campaignId, scene, registro, atacante, token);
      if (gasto || municao || mudancas.lesoes) await writeSheet(campaignId, atacante, mudancas);
      const entrada = addEntry(state, {
        tipo: 'ataque', autor: ctx.authorOf(viewer, color), quem: atacante.nome, pendente: true,
        ataque: { atacante: atacante.nome, arma: arma.nome, modo, descricao: R.descreverAtaque(registro), alvos: registro.alvos.map(alvo => ({ nome: alvo.nome })), rolagem: registro.ataque }
      });
      registro.entrada = entrada.id;
      table.pendentes.set(registro.id, registro);
      if (registro.alvos.every(alvo => alvo.escolha)) {
        broadcast(campaignId, { tokens: true, registro: entrada });
        const concluido = await concluir(campaignId, registro);
        return { resultado: { ataque: registro.id, concluido } };
      }
      armarPrazo(campaignId, registro);
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

    // O mestre volta como estava antes de um ataque, de um dano ou de um Death Save (com a bala, a carga e o ferrolho).
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
        const arma = municao && (token.armas || []).find(item => item.id === municao.arma);
        if (arma) {
          const volta = {};
          if (arma.pente && municao.antes !== null && municao.antes !== undefined) { arma.pente = { ...arma.pente, atual: municao.antes }; volta.pente = municao.antes; }
          if ('carga' in municao) { arma.carga = municao.carga; volta.carga = municao.carga; }
          if ('ferrolho' in municao) { arma.ferrolho = municao.ferrolho; volta.ferrolho = municao.ferrolho; }
          if (Object.keys(volta).length) mudancas.armas = { [arma.id]: volta };
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
    // Recarregar. O personagem usa a munição da ficha: a caixa diminui, e ele escolhe qual (municao: o id da caixa; trocar
    // devolve o que estava no pente). O NPC e o token livre não contam bala.
    'arma.recarregar': { async run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      const arma = (token.armas || []).find(item => item.id === String(body.arma || ''));
      if (!arma || !arma.pente) throw fail(400, 'Essa arma não tem pente.');
      if (token.tipo === 'pj' && ctx.recarregar) {
        const feito = await ctx.recarregar(campaignId, token.personagem, arma.id, String(body.municao || ''));
        return { tokens: true, fichas: true, resultado: feito };
      }
      arma.pente = { ...arma.pente, atual: arma.pente.max };
      await writeSheet(campaignId, token, { armas: { [arma.id]: { pente: arma.pente.atual } } });
      return { tokens: true };
    } },
    // A arma Tech: carregar (gasta a Ação de Movimento; a Burya, não) ou descarregar. A carga dura até disparar ou 20
    // rodadas. O registro conta para todos só a do personagem (a do NPC escondido não vaza).
    'arma.carregar': { async run({ state, viewer, body, campaignId }) {
      const { token, arma } = armaDoToken(state, viewer, body);
      if (!arma.kit || arma.kit.classe !== 'tech') throw fail(400, `${arma.nome} não é uma arma Tech.`);
      const combate = state.combate;
      arma.carga = R.cargaValida(arma.carga, combate) ? null
        : { combate: combate ? combate.id || null : null, rodada: combate ? combate.rodada : null, vez: combate ? combate.vez : null, disparou: null };
      await writeSheet(campaignId, token, { armas: { [arma.id]: { carga: arma.carga } } });
      if (token.tipo !== 'pj') return { tokens: true };
      const texto = arma.carga
        ? `${token.nome} carrega ${arma.nome} (${arma.kit.cargaSemMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento'}): o próximo ataque ignora metade do SP e atravessa cobertura ${arma.kit.cargaGrossa ? 'fina e grossa' : 'fina'}.`
        : `${token.nome} descarrega ${arma.nome}.`;
      return { tokens: true, registro: ctx.systemEntry(state, texto) };
    } },
    // O ferrolho manejado (gastou a Ação): a arma volta a atirar.
    'arma.ferrolho': { async run({ state, viewer, body, campaignId }) {
      const { token, arma } = armaDoToken(state, viewer, body);
      if (!arma.ferrolho) throw fail(400, `${arma.nome} já está pronta para atirar.`);
      arma.ferrolho = false;
      await writeSheet(campaignId, token, { armas: { [arma.id]: { ferrolho: false } } });
      return { tokens: true };
    } },
    // A coronha retrátil (a Dian): recolhida, dá para esconder a arma, e o ataque tem −1.
    'arma.coronha': { async run({ state, viewer, body, campaignId }) {
      const { token, arma } = armaDoToken(state, viewer, body);
      if (!arma.kit || !arma.kit.coronhaRetratil) throw fail(400, `${arma.nome} não tem coronha retrátil.`);
      arma.coronha = !arma.coronha;
      await writeSheet(campaignId, token, { armas: { [arma.id]: { coronha: arma.coronha } } });
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
