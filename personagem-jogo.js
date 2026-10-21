// O estado de jogo do personagem que a mesa da wiki guarda (doc.jogo): HP, SP (com a ablação), Sorte, Humanidade, a
// munição no pente (e a carga, o ferrolho e a coronha das armas de 2077), as lesões críticas e o Death Save. Compartilhado pela wiki (a ficha), pela API (os números da lista
// de Personagens) e pela mesa da wiki (Tabletop/mesa-api.js).
//
// Até a mesa da wiki substituir o Foundry, ele também manda a ficha (doc.mesa, a cada mudança no ator): vale o mais
// recente dos dois, pela hora do servidor (doc.jogo.quando contra doc.mesa.recebido). Quando o Foundry é o mais
// recente, nada de doc.jogo vale; quando a mesa grava de novo, ela parte do que vale agora (não ressuscita o antigo).
// Os máximos são sempre os da ficha: a do Foundry, se ele já mandou; senão, a da criação (doc.resultado).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.characterGame = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const instante = valor => { const t = Date.parse(valor || ''); return Number.isFinite(t) ? t : 0; };
  const numero = valor => { const n = Number.parseInt(valor && typeof valor === 'object' ? valor.value : valor, 10); return Number.isFinite(n) ? n : 0; };
  const fichaDoFoundry = doc => (doc && doc.mesa && (Array.isArray(doc.mesa.itens) || (doc.mesa.hp && Number(doc.mesa.hp.max))) ? doc.mesa : null);
  // doc.jogo vale? (a mesa da wiki mexeu depois da última ficha do Foundry)
  const jogoValido = doc => {
    if (!doc || !doc.jogo || typeof doc.jogo !== 'object') return null;
    const mesa = fichaDoFoundry(doc);
    return !mesa || instante(doc.jogo.quando) >= instante(mesa.recebido) ? doc.jogo : null;
  };

  function hp(doc) {
    if (!doc) return null;
    const mesa = doc.mesa && doc.mesa.hp && Number(doc.mesa.hp.max) ? doc.mesa : null;
    const criado = Number(doc.resultado && doc.resultado.derivados && doc.resultado.derivados.hp) || 0;
    const max = mesa ? Number(mesa.hp.max) : criado;
    if (!max) return null;
    let atual = mesa ? Number(mesa.hp.atual) || 0 : max;
    const jogo = jogoValido(doc);
    if (jogo && jogo.hp && Number.isFinite(Number(jogo.hp.atual))) atual = Number(jogo.hp.atual);
    return { atual: Math.min(atual, max), max };
  }

  // A ficha de jogo inteira. catalogo: { item(id), porNome(nome) } da loja (loja-catalogo.js), para as armas e armaduras
  // da criação e para a classe das armas que vieram do Foundry.
  function ficha(doc, catalogo = {}) {
    const mesa = fichaDoFoundry(doc);
    const criado = (doc && doc.resultado) || {};
    const jogo = jogoValido(doc) || {};
    const stats = {};
    for (const [chave, valor] of Object.entries((mesa && mesa.stats) || criado.stats || doc.stats || {})) stats[chave.toUpperCase()] = numero(valor);
    const item = id => (catalogo.item ? catalogo.item(id) : null);
    const porNome = nome => (catalogo.porNome ? catalogo.porNome(nome) : null);

    // Armas à mão (equipadas ou carregadas; guardada não vai para a mesa).
    let armas;
    if (mesa && Array.isArray(mesa.itens)) {
      armas = mesa.itens.filter(entrada => entrada.tipo === 'weapon' && entrada.uso !== 'owned').map(entrada => {
        const cat = porNome(entrada.nome);
        return { id: `foundry:${entrada.id}`, nome: entrada.nome, classe: (cat && cat.arma && cat.arma.tipo) || '', dano: String(entrada.dano || ''), cdt: Number(entrada.cdt) || 1,
          pericia: entrada.pericia || '', distancia: Boolean(entrada.distancia), pente: entrada.pente && Number(entrada.pente.max) ? { atual: Number(entrada.pente.atual) || 0, max: Number(entrada.pente.max) } : null, municao: entrada.municao || '' };
      });
    } else {
      armas = (Array.isArray(criado.itens) ? criado.itens : []).filter(linha => linha.uso !== 'guardado').map(linha => ({ linha, cat: item(linha.id) }))
        .filter(({ cat }) => cat && cat.arma).map(({ linha, cat }) => ({
          id: linha.uid || linha.id, nome: linha.renomear || linha.nome || cat.nome, classe: cat.arma.tipo || '', dano: String(cat.arma.dano || ''), cdt: Number(cat.arma.cdt) || 1,
          pericia: cat.arma.pericia || '', distancia: Boolean(cat.arma.distancia),
          // Na montagem, a arma já vem carregada com a munição escolhida.
          pente: cat.arma.distancia && Number(cat.arma.pente) ? { atual: linha.municao ? Number(cat.arma.pente) : 0, max: Number(cat.arma.pente) } : null,
          municao: linha.municao ? ((criado.itens || []).find(outra => outra.uid === linha.municao) || {}).nome || '' : ''
        }));
    }
    // O que a mesa guarda de cada arma: a munição no pente, a carga da arma Tech, o ferrolho por manejar e a coronha
    // recolhida.
    const salvas = (jogo.armas && typeof jogo.armas === 'object') ? jogo.armas : {};
    for (const arma of armas) {
      const salva = salvas[arma.id];
      if (!salva || typeof salva !== 'object') continue;
      if (arma.pente && Number.isFinite(Number(salva.pente))) arma.pente.atual = Math.max(0, Math.min(arma.pente.max, Number(salva.pente)));
      if (salva.carga && typeof salva.carga === 'object') arma.carga = salva.carga;
      if (salva.ferrolho) arma.ferrolho = true;
      if (salva.coronha) arma.coronha = true;
    }

    // Armadura: o SP de cada local. Do Foundry vem o SP de agora (o máximo não vem: fica o mesmo).
    let base = { cabeca: 0, corpo: 0 };
    if (mesa && mesa.sp) base = { cabeca: numero(mesa.sp.cabeca), corpo: numero(mesa.sp.corpo) };
    else {
      for (const linha of Array.isArray(criado.itens) ? criado.itens : []) {
        const cat = linha.uso === 'equipado' ? item(linha.id) : null;
        if (!cat || !cat.armadura) continue;
        base = { cabeca: Math.max(base.cabeca, numero(cat.armadura.cabeca)), corpo: Math.max(base.corpo, numero(cat.armadura.corpo)) };
      }
    }
    const spAgora = jogo.sp && typeof jogo.sp === 'object' ? jogo.sp : {};
    const sp = {
      cabeca: { atual: Number.isFinite(Number(spAgora.cabeca)) ? Math.max(0, Math.min(base.cabeca, Number(spAgora.cabeca))) : base.cabeca, max: base.cabeca },
      corpo: { atual: Number.isFinite(Number(spAgora.corpo)) ? Math.max(0, Math.min(base.corpo, Number(spAgora.corpo))) : base.corpo, max: base.corpo }
    };
    const sorteMax = (mesa && mesa.sorte && numero(mesa.sorte.max)) || stats.LUCK || 0;
    const sorteBase = mesa && mesa.sorte ? numero(mesa.sorte.atual) : sorteMax;
    const humanidade = (mesa && mesa.humanidade) || criado.humanidade || null;
    return {
      stats, hp: hp(doc), sp, armas,
      sorte: { atual: Number.isFinite(Number(jogo.sorte)) ? Math.max(0, Math.min(sorteMax, Number(jogo.sorte))) : sorteBase, max: sorteMax },
      humanidade: humanidade ? { atual: Number.isFinite(Number(jogo.humanidade)) ? Number(jogo.humanidade) : numero(humanidade.atual), max: numero(humanidade.max) } : null,
      lesoes: Array.isArray(jogo.lesoes) ? jogo.lesoes.map(String) : ((mesa && Array.isArray(mesa.lesoes)) ? mesa.lesoes.map(String) : []),
      deathSave: Number(jogo.deathSave) || 0,
      morto: Boolean(jogo.morto)
    };
  }

  // O que a mesa grava em doc.jogo: parte do que vale agora e troca só os campos mudados. hp é o atual (número).
  function comJogo(doc, mudancas, quando = new Date().toISOString()) {
    const base = { ...(jogoValido(doc) || {}) };
    const novo = { ...base, ...mudancas, quando };
    if (mudancas.hp !== undefined && typeof mudancas.hp !== 'object') novo.hp = { atual: Math.round(Number(mudancas.hp) || 0) };
    // Cada arma mistura com o que já tinha: gravar a carga não apaga o pente.
    if (mudancas.armas) {
      novo.armas = { ...(base.armas || {}) };
      for (const [id, arma] of Object.entries(mudancas.armas)) novo.armas[id] = { ...(novo.armas[id] || {}), ...arma };
    }
    return novo;
  }
  // O HP mudou na mesa (o atalho de antes).
  const comHp = (doc, atual, quando) => comJogo(doc, { hp: atual }, quando);

  return { hp, ficha, comJogo, comHp, jogoValido };
});
