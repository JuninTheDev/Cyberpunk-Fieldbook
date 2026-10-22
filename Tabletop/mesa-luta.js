// A luta na mesa da wiki (M9b): agarrar, escapar, soltar, estrangular, derrubar e o escudo humano (a wiki, "Agarrar e
// arremessar", p. 177, e "Escudos e escudo humano", p. 183–184), levantar-se, e os movimentos das Artes Marciais que vão
// contra a DV (p. 178–180). As regras ficam em mesa-regras.js; os golpes e o arremesso vão pelo ataque (mesa-combate.js).
//
// Como o sistema do Foundry 14 (foundry-sistema/scripts/agarrao.mjs e artes-marciais.mjs), com duas diferenças:
//   · quem resiste ao agarrão rola na hora, como a esquiva do corpo a corpo da mesa (sem pergunta);
//   · o requisito "neste turno" a mesa confere pelo registro do turno (fora do combate, quem age confirma).
// O agarrão fica nos dois tokens: token.agarrao = { papel: 'agarrando' ou 'agarrado', outro: o id do outro token }, mais
// o Aperto de ferro (no agarrado), o escudo humano e as rodadas do estrangular (em quem agarra). Caído e inconsciente:
// token.caido e token.inconsciente. Ficam só no token (a ficha do personagem não guarda), e o desfazer volta.
'use strict';
const R = require('./mesa-regras');

module.exports = function createLuta(ctx) {
  const { fail, int, isGm, canControl, tokenArg, tokenFor, writeSheet, addEntry, authorOf, critTables, ajuda } = ctx;
  const { numerosDe, rolar, penalidadesDe, gastarSorte, distancia, retrato, mudancasDoRetrato, nomeDaLesao, formasDe, conferirRequisito } = ajuda;

  const outroDe = (scene, token) => (token.agarrao ? scene.tokens.find(item => item.id === token.agarrao.outro) || null : null);
  const perto = (scene, a, b) => distancia(scene, a, b) <= Math.max(2, scene.grade.metros);
  // Quem age: o token de quem pede (o mestre, qualquer um), vivo e acordado.
  function quemAge(state, viewer, id) {
    const { scene, token } = tokenArg(state, viewer, id);
    if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
    if (token.morto) throw fail(400, `${token.nome} está morto.`);
    if (token.inconsciente) throw fail(400, `${token.nome} está inconsciente.`);
    return { scene, token };
  }
  // O alvo escolhido na cena: um que quem pede vê, vivo, a até 2 m.
  function alvoNaCena(scene, viewer, campaignId, token, id, { contra = 'o alvo' } = {}) {
    const alvo = scene.tokens.find(item => item.id === String(id || ''));
    if (!alvo || alvo === token || alvo.morto || !(isGm(viewer) || tokenFor(viewer, scene, alvo, campaignId))) throw fail(400, `Escolha ${contra} na cena.`);
    if (alvo.veiculo) throw fail(400, 'Isso não vale contra um veículo.');
    if (!perto(scene, token, alvo)) throw fail(400, `Longe demais (${distancia(scene, token, alvo)} m; o alcance é 2 m).`);
    return alvo;
  }
  // O teste de quem age: a base (STAT + perícia, ou a base do NPC), as penalidades (o ferimento, o agarrão), os extras, o
  // modificador e a Sorte (sai da ficha: mudancas).
  function teste(campaignId, token, { pericia, stat, mod = 0, sorte = 0, extras = [] }, mudancas) {
    const base = numerosDe(campaignId, token).base(pericia, stat);
    const partes = [{ rotulo: base.rotulo, valor: base.valor }, ...penalidadesDe(token), ...extras];
    const ajuste = int(mod, -30, 30, 0);
    if (ajuste) partes.push({ rotulo: 'Modificador', valor: ajuste });
    const gasto = gastarSorte(token, sorte, mudancas);
    if (gasto) partes.push(gasto);
    return rolar(partes);
  }
  // A entrada da luta no registro, para todos. O HP de quem sofreu vai à parte (hp: { antes, depois }), e o servidor
  // tira o de NPC para os jogadores (como no cartão do ataque). desfazer: o retrato de antes de cada token mexido.
  function entrada(state, viewer, color, { acao, titulo, quem, alvo = null, rolagens = [], frase, notas = [], resultado = '', hp = null, desfazer }) {
    return addEntry(state, {
      tipo: 'luta', autor: authorOf(viewer, color), quem: quem.nome, ...(alvo ? { alvoTipo: alvo.tipo, alvoDono: alvo.dono || null } : {}),
      luta: { acao, titulo, quem: quem.nome, alvo: alvo ? alvo.nome : null, rolagens, frase, notas, resultado, ...(hp ? { hp } : {}) },
      ...(desfazer ? { desfazer } : {})
    });
  }
  const retratos = tokens => tokens.filter(Boolean).map(token => ({ token: token.id, antes: retrato(token) }));
  // A ficha do personagem guarda o que mudou nele (o HP, o SP, as lesões); a do NPC fica no token.
  const gravar = (campaignId, ...tokens) => Promise.all(tokens.filter(Boolean).map(token => writeSheet(campaignId, token, mudancasDoRetrato(token))));
  // A lesão de um movimento (o Braço quebrado do Escape de agarrão): +5 direto no HP, como toda lesão; a que já tem não
  // repete. Devolve o nome, ou null.
  function lesionar(token, nomeDoLivro) {
    const nome = nomeDaLesao(nomeDoLivro);
    if ((token.lesoes || []).includes(nome)) return null;
    token.lesoes = [...(token.lesoes || []), nome];
    if (token.hp) token.hp = { ...token.hp, atual: token.hp.atual - 5 };
    return nome;
  }
  const efeitoDaLesao = nome => ([...critTables().corpo, ...critTables().cabeca].find(linha => linha[1] === nome) || [])[2] || '';
  // A arma que o desarme tira: a escolhida, ou a primeira na mão (a equipada antes da carregada).
  function armaNaMao(alvo, id) {
    const armas = (alvo.armas || []).filter(arma => !arma.largada);
    return (id && armas.find(arma => arma.id === String(id))) || armas.find(arma => arma.uso === 'equipado') || armas[0] || null;
  }
  // Agarrar pede uma mão livre: com as armas equipadas ocupando as duas, o cartão avisa (largar a arma não custa Ação).
  function maosOcupadas(campaignId, token) {
    const body = Number(numerosDe(campaignId, token).stats.BODY) || 0;
    return (token.armas || []).filter(arma => arma.uso === 'equipado' && !arma.largada).reduce((soma, arma) => soma + R.maosDaArma(arma, body), 0);
  }

  // Estrangular e Derrubar: o BODY de quem agarra direto no HP do outro, sem a armadura (mesa-regras.js danoDoAgarrao).
  async function apertar(acao, { state, viewer, body, campaignId, color }) {
    const { scene, token } = quemAge(state, viewer, body.token);
    if (!token.agarrao || token.agarrao.papel !== 'agarrando') throw fail(400, `${token.nome} não está agarrando ninguém.`);
    const outro = outroDe(scene, token);
    if (!outro || !outro.hp) throw fail(400, 'Quem está agarrado não tem HP.');
    const forca = Number(numerosDe(campaignId, token).stats.BODY) || 0;
    const desfazer = retratos([token, outro]);
    const estrangulando = acao === 'estrangular';
    const combat = state.combate && state.combate.cena === scene.id ? state.combate : null;
    const agora = { combate: combat ? combat.id || 'combate' : null, rodada: combat ? combat.rodada : null };
    const vezes = estrangulando ? R.vezesEstrangulando(token.agarrao.estrangulou, agora) : 0;
    const antes = outro.hp.atual;
    const { hp, desmaiou, motivo } = R.danoDoAgarrao({ hp: antes, body: forca, estrangular: estrangulando, vezes });
    outro.hp = { ...outro.hp, atual: hp };
    if (desmaiou) outro.inconsciente = true;
    if (estrangulando) token.agarrao = { ...token.agarrao, estrangulou: { ...agora, vezes } };
    else {
      outro.caido = true;
      delete token.agarrao;
      delete outro.agarrao;
    }
    await gravar(campaignId, outro);
    const fim = motivo === 'abaixoDeZero' ? `: o dano o levaria abaixo de 0, então fica com ${hp <= 1 ? hp : 1} HP e desmaia.`
      : motivo === 'tresRodadas' ? `: é a ${vezes}ª rodada seguida, e ${outro.nome} desmaia.`
        : vezes > 1 ? ` (${vezes}ª rodada seguida; na 3ª, desmaia).` : '.';
    const frase = estrangulando ? `${token.nome} estrangula ${outro.nome}: ${forca} de dano direto no HP, sem a armadura${fim}`
      : `${token.nome} derruba ${outro.nome}: ${forca} de dano direto no HP, sem a armadura; ${outro.nome} cai, e o agarrão acaba.`;
    const registro = entrada(state, viewer, color, { acao, titulo: estrangulando ? 'Estrangular' : 'Derrubar', quem: token, alvo: outro, frase, resultado: desmaiou ? 'desmaiou' : estrangulando ? 'estrangulou' : 'derrubou', hp: { antes, depois: hp }, desfazer });
    return { tokens: true, registro, resultado: { hp, desmaiou } };
  }

  const operations = {
    // Agarrar: { token, alvo, mod, sorte }. Uma Ação contra quem está a até 2 m: os dois rolam DEX + Briga, e quem agarra
    // precisa superar. Quem resiste rola na hora, sem Sorte (como a esquiva do corpo a corpo da mesa).
    'luta.agarrar': { async run({ state, viewer, body, campaignId, color }) {
      const { scene, token } = quemAge(state, viewer, body.token);
      const alvo = alvoNaCena(scene, viewer, campaignId, token, body.alvo, { contra: 'quem agarrar' });
      if (token.agarrao) throw fail(409, `${token.nome} já está num agarrão.`);
      if (alvo.agarrao) throw fail(409, `${alvo.nome} já está num agarrão.`);
      if (token.dentro || alvo.dentro) throw fail(409, 'Quem está num veículo não agarra nem é agarrado.');
      const mudancas = {};
      const ataque = teste(campaignId, token, { pericia: 'Brawling', stat: 'DEX', mod: body.mod, sorte: body.sorte }, mudancas);
      const defesa = teste(campaignId, alvo, { pericia: 'Brawling', stat: 'DEX' }, {});
      const desfazer = retratos([token, alvo]);
      const agarrou = R.venceuResistido(ataque.total, defesa.total);
      if (agarrou) {
        token.agarrao = { papel: 'agarrando', outro: alvo.id };
        alvo.agarrao = { papel: 'agarrado', outro: token.id };
      }
      if (Object.keys(mudancas).length) await writeSheet(campaignId, token, mudancas);
      const notas = maosOcupadas(campaignId, token) >= 2 ? [`Agarrar pede uma mão livre: ${token.nome} está com as duas ocupadas (largar a arma não custa Ação).`] : [];
      const frase = agarrou ? `${token.nome} agarrou ${alvo.nome}: os dois têm −2 em todas as ações; ${alvo.nome} não usa a Ação de Movimento e é arrastado, e ninguém usa arma de duas mãos.`
        : `${alvo.nome} resistiu ao agarrão de ${token.nome}${ataque.total === defesa.total ? ' (o empate é de quem resiste)' : ''}.`;
      const registro = entrada(state, viewer, color, {
        acao: 'agarrar', titulo: 'Agarrar', quem: token, alvo, frase, notas, resultado: agarrou ? 'agarrou' : 'resistiu', desfazer,
        rolagens: [{ quem: token.nome, rotulo: 'Agarrar', rolagem: ataque }, { quem: alvo.nome, rotulo: 'Resiste', rolagem: defesa }]
      });
      return { tokens: true, registro, resultado: { agarrou } };
    } },
    // Escapar: { token, mod, sorte }. Quem é agarrado rola DEX + Briga contra quem segura (o empate é de quem segura); o
    // Aperto de ferro tira mais 2.
    'luta.escapar': { async run({ state, viewer, body, campaignId, color }) {
      const { scene, token } = quemAge(state, viewer, body.token);
      if (!token.agarrao || token.agarrao.papel !== 'agarrado') throw fail(400, `${token.nome} não está agarrado.`);
      const outro = outroDe(scene, token);
      if (!outro) throw fail(400, 'Quem o segura não está na cena.');
      const extras = token.agarrao.apertoDeFerro ? [{ rotulo: 'Aperto de ferro', valor: R.AGARRAO.apertoDeFerro }] : [];
      const mudancas = {};
      const fuga = teste(campaignId, token, { pericia: 'Brawling', stat: 'DEX', mod: body.mod, sorte: body.sorte, extras }, mudancas);
      const segura = teste(campaignId, outro, { pericia: 'Brawling', stat: 'DEX' }, {});
      const desfazer = retratos([token, outro]);
      const escapou = R.venceuResistido(fuga.total, segura.total);
      if (escapou) { delete token.agarrao; delete outro.agarrao; }
      if (Object.keys(mudancas).length) await writeSheet(campaignId, token, mudancas);
      const frase = escapou ? `${token.nome} escapou do agarrão de ${outro.nome}: o agarrão acabou.`
        : `${outro.nome} segurou ${token.nome}${fuga.total === segura.total ? ' (o empate é de quem segura)' : ''}: o agarrão continua.`;
      const registro = entrada(state, viewer, color, {
        acao: 'escapar', titulo: 'Escapar do agarrão', quem: token, alvo: outro, frase, resultado: escapou ? 'escapou' : 'segurou', desfazer,
        rolagens: [{ quem: token.nome, rotulo: 'Escapar', rolagem: fuga }, { quem: outro.nome, rotulo: 'Segura', rolagem: segura }]
      });
      return { tokens: true, registro, resultado: { escapou } };
    } },
    // Soltar: { token }. Quem agarra solta quando quiser (o mestre solta qualquer lado).
    'luta.soltar': { run({ state, viewer, body, color }) {
      const { scene, token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      if (!token.agarrao) throw fail(400, `${token.nome} não está num agarrão.`);
      if (token.agarrao.papel !== 'agarrando' && !isGm(viewer)) throw fail(403, 'Quem solta é quem agarra; quem é agarrado escapa (um teste).');
      const outro = outroDe(scene, token);
      const desfazer = retratos([token, outro]);
      const [segura, preso] = token.agarrao.papel === 'agarrando' ? [token, outro] : [outro, token];
      delete token.agarrao;
      if (outro) delete outro.agarrao;
      const frase = `${segura ? segura.nome : 'Quem agarrava'} soltou ${preso ? preso.nome : 'quem agarrava'}: o agarrão acabou.`;
      return { tokens: true, registro: entrada(state, viewer, color, { acao: 'soltar', titulo: 'Soltar', quem: token, frase, resultado: 'soltou', desfazer }) };
    } },
    'luta.estrangular': { run: contexto => apertar('estrangular', contexto) },
    'luta.derrubar': { run: contexto => apertar('derrubar', contexto) },
    // O escudo humano: { token, ligar }. Quem agarra usa o agarrado como escudo (uma Ação) ou para de usar. Morto, o
    // agarrado é um escudo com HP igual ao BODY dele.
    'luta.escudo': { run({ state, viewer, body, campaignId, color }) {
      const { scene, token } = quemAge(state, viewer, body.token);
      if (!token.agarrao || token.agarrao.papel !== 'agarrando') throw fail(400, `${token.nome} não está agarrando ninguém.`);
      const outro = outroDe(scene, token);
      if (!outro) throw fail(400, 'Quem está agarrado não está na cena.');
      const ligar = body.ligar === undefined ? !token.agarrao.escudo : Boolean(body.ligar);
      const desfazer = retratos([token, outro]);
      const agarrao = { ...token.agarrao, escudo: ligar };
      delete agarrao.escudoHp;
      if (ligar && outro.morto) agarrao.escudoHp = Number(numerosDe(campaignId, outro).stats.BODY) || 0;
      token.agarrao = agarrao;
      const frase = !ligar ? `${token.nome} parou de usar ${outro.nome} como escudo.`
        : outro.morto ? `${token.nome} se protege atrás do corpo de ${outro.nome} (uma Ação): um escudo com ${agarrao.escudoHp} HP contra os tiros.`
          : `${token.nome} usa ${outro.nome} como escudo humano (uma Ação): os tiros em ${token.nome} vão em ${outro.nome}, que não esquiva. Não segura o corpo a corpo, nem o tiro mirado na cabeça.`;
      return { tokens: true, registro: entrada(state, viewer, color, { acao: 'escudo', titulo: 'Escudo humano', quem: token, alvo: outro, frase, resultado: ligar ? 'ligou' : 'desligou', desfazer }) };
    } },
    // Levantar-se: { token }. Uma Ação (a Recuperação das Artes Marciais pode poupar a Ação: luta.movimento).
    'luta.levantar': { run({ state, viewer, body, color }) {
      const { token } = quemAge(state, viewer, body.token);
      if (!token.caido) throw fail(400, `${token.nome} não está caído.`);
      const desfazer = retratos([token]);
      delete token.caido;
      return { tokens: true, registro: entrada(state, viewer, color, { acao: 'levantar', titulo: 'Levantar-se', quem: token, frase: `${token.nome} se levantou (uma Ação).`, resultado: 'levantou', desfazer }) };
    } },

    // Os movimentos das Artes Marciais contra a DV: { token, movimento, alvo, arma (no desarme: a arma do alvo), ficar (no
    // desarme: true, o objeto fica com quem desarmou; false, cai), confirmado (o requisito, fora do combate; o mestre, por
    // cima do registro), mod, sorte }. DEX + a forma + 1d10 precisa superar a DV.
    'luta.movimento': { async run({ state, viewer, body, campaignId, color }) {
      const id = String(body.movimento || '');
      const m = Object.hasOwn(R.MOVIMENTOS, id) ? R.MOVIMENTOS[id] : null;
      if (!m) throw fail(400, 'Movimento desconhecido.');
      if (m.golpe) throw fail(400, `${m.nome} é um golpe: ataque com a arma das Artes Marciais.`);
      const { scene, token } = quemAge(state, viewer, body.token);
      const numeros = numerosDe(campaignId, token);
      const disponivel = R.movimentosDisponiveis(formasDe(numeros), { will: numeros.stats.WILL, move: numeros.stats.MOVE }).find(item => item.id === id);
      if (!disponivel) throw fail(400, `${token.nome}: ${m.nome} pede pelo menos 1 ponto em ${m.forma ? `Artes Marciais (${R.FORMAS[m.forma]})` : 'uma forma de Artes Marciais'}.`);
      if (m.caido && !token.caido) throw fail(400, `${token.nome} não está caído: a Recuperação é para se levantar.`);
      if (m.agarrao && (!token.agarrao || token.agarrao.papel !== m.agarrao)) throw fail(400, m.agarrao === 'agarrando' ? `${token.nome} não está agarrando ninguém.` : `${token.nome} não está agarrado.`);
      const outro = m.agarrao ? outroDe(scene, token) : null;
      if (m.agarrao && !outro) throw fail(400, 'O outro token do agarrão não está na cena.');
      if (id === 'apertoDeFerro' && outro.agarrao && outro.agarrao.apertoDeFerro) throw fail(409, `${outro.nome} já está no Aperto de ferro.`);
      const alvo = m.alvo ? alvoNaCena(scene, viewer, campaignId, token, body.alvo) : null;
      conferirRequisito(state, scene, token, id, { viewer, confirmado: Boolean(body.confirmado), alvo: alvo ? alvo.id : null, quemAgarra: m.agarrao === 'agarrado' ? outro.id : null });
      const mudancas = {};
      const rolagem = teste(campaignId, token, { pericia: disponivel.pericia, stat: 'DEX', mod: body.mod, sorte: body.sorte }, mudancas);
      const passou = R.passouNoMovimento(rolagem.total, m.dv);
      const desfazer = retratos([token, alvo, outro]);
      if (Object.keys(mudancas).length) await writeSheet(campaignId, token, mudancas);
      const notas = [];
      let frase = `${token.nome} tentou ${m.nome}${alvo ? ` em ${alvo.nome}` : ''}: não passou.`;
      let hp = null;
      let afetado = alvo || outro;
      if (id === 'recuperacao') {
        delete token.caido;
        frase = passou ? `${token.nome} se levantou sem gastar a Ação.` : `${token.nome} se levantou, mas gastou a Ação.`;
      } else if (passou && id === 'desarmeCombinado') {
        const arma = armaNaMao(alvo, body.arma);
        const ficar = body.ficar !== false;
        if (!arma) frase = `${token.nome} desarmou ${alvo.nome}, mas não havia nada na mão dele.`;
        else {
          const com = ficar ? token.nome : '';
          desfazer.find(item => item.token === alvo.id).municao = { token: alvo.id, arma: arma.id, antes: null, largada: Boolean(arma.largada), com: arma.com || '' };
          arma.largada = true;
          if (com) arma.com = com; else delete arma.com;
          await writeSheet(campaignId, alvo, { armas: { [arma.id]: { largada: true, com } } });
          frase = ficar ? `${token.nome} desarmou ${alvo.nome}: ${arma.nome} ficou com ${token.nome}.` : `${token.nome} desarmou ${alvo.nome}: ${arma.nome} caiu.`;
          if (ficar) notas.push(`${arma.nome} continua na ficha de ${alvo.nome}, marcada com ${token.nome}: depois da luta, o mestre decide para onde vai.`);
        }
      } else if (passou && id === 'apertoDeFerro') {
        outro.agarrao = { ...outro.agarrao, apertoDeFerro: true };
        frase = `${token.nome} aplicou o Aperto de ferro em ${outro.nome}: −2 a mais para escapar, e nada de ataques à distância enquanto agarrado.`;
      } else if (passou && id === 'quebraArmadura') {
        const sp = alvo.sp && alvo.sp.corpo;
        if (!sp || !sp.max) frase = `${token.nome} acertou a Combinação quebra-armadura em ${alvo.nome}, mas ${alvo.nome} não tem armadura no corpo.`;
        else {
          const depois = Math.max(0, sp.atual - R.SP_DA_QUEBRA);
          frase = `${token.nome} acertou a Combinação quebra-armadura em ${alvo.nome}: a armadura do corpo perde ${R.SP_DA_QUEBRA} SP (${sp.atual} → ${depois}).`;
          alvo.sp = { ...alvo.sp, corpo: { ...sp, atual: depois } };
          await gravar(campaignId, alvo);
        }
      } else if (passou && id === 'contraQueda') {
        alvo.caido = true;
        frase = `${token.nome} derrubou ${alvo.nome} com a Contra-queda: não pode ser evitado.`;
      } else if (passou && id === 'escapeDeAgarrao') {
        delete token.agarrao;
        delete outro.agarrao;
        const antes = outro.hp ? outro.hp.atual : null;
        const lesao = lesionar(outro, R.LESOES_DOS_GOLPES.braco);
        await gravar(campaignId, outro);
        if (lesao && outro.hp) hp = { antes, depois: outro.hp.atual };
        frase = `${token.nome} escapou do agarrão de ${outro.nome}${lesao ? `, e ${outro.nome} sofre ${lesao} (+5 direto no HP)` : ''}.`;
        if (lesao) notas.push(`${lesao}: ${efeitoDaLesao(lesao)}`);
      }
      if (id === 'recuperacao') afetado = null;
      const registro = entrada(state, viewer, color, {
        acao: id, titulo: `${m.nome} (${disponivel.nomeDaForma})`, quem: token, alvo: afetado, frase, notas, resultado: passou ? 'passou' : 'falhou', hp, desfazer,
        rolagens: [{ quem: token.nome, rotulo: `DV ${m.dv}`, rolagem }]
      });
      return { tokens: true, registro, resultado: { passou } };
    } }
  };

  // Os agarrões que não valem mais: o outro saiu da cena ou não aponta de volta, quem agarra morreu ou desmaiou, quem é
  // agarrado morreu sem ser escudo. O escudo humano que morreu vira um escudo com HP igual ao BODY dele (fica até
  // quebrar). Chamado depois de cada operação que mexe nos tokens. true: mudou alguma coisa.
  function conferir(state, campaignId) {
    let mudou = false;
    for (const scene of state.cenas) {
      for (const token of scene.tokens) {
        if (!token.agarrao) continue;
        const outro = outroDe(scene, token);
        const valido = Boolean(outro && outro.agarrao && outro.agarrao.outro === token.id && outro.agarrao.papel !== token.agarrao.papel);
        const segura = token.agarrao.papel === 'agarrando' ? token : outro;
        const preso = token.agarrao.papel === 'agarrando' ? outro : token;
        if (!valido || segura.morto || segura.inconsciente || (preso.morto && !segura.agarrao.escudo)) {
          delete token.agarrao;
          if (valido) delete outro.agarrao;
          mudou = true;
          continue;
        }
        if (token === segura && preso.morto && !Number.isFinite(token.agarrao.escudoHp)) {
          token.agarrao = { ...token.agarrao, escudoHp: Number(numerosDe(campaignId, preso).stats.BODY) || 0 };
          mudou = true;
        }
      }
    }
    return mudou;
  }

  // O que o dono e o mestre veem da luta no token: as armas das Artes Marciais (com os golpes) e os movimentos, com o
  // requisito de agora. Sem Artes Marciais, nada.
  function vistaDe(state, scene, token, campaignId, armaParaVer) {
    if (token.tipo !== 'pj' && token.tipo !== 'npc') return null;
    const numeros = numerosDe(campaignId, token);
    const artes = ajuda.armasDeArtesMarciais(numeros);
    if (!artes.length) return null;
    return { artes: artes.map(armaParaVer), movimentos: ajuda.movimentosDoToken(state, scene, token, numeros) };
  }

  return { operations, conferir, vistaDe };
};
