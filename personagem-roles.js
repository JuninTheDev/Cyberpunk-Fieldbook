// Duas Roles pela regra da mesa. A principal continua sendo a origem do pacote e das tabelas de criação.
// Compartilhado pela wiki e pela API; personagens antigos mantêm uma Role no Rank 4.
(() => {
  const nomes = { rockerboy: 'Rockerboy', solo: 'Solo', netrunner: 'Netrunner', tech: 'Tech', medtech: 'Medtech', media: 'Media', exec: 'Exec', lawman: 'Lawman', fixer: 'Fixer', nomad: 'Nomad' };
  const aliases = { face: 'rockerboy', corpo: 'exec' };
  const canonico = valor => {
    const chave = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
    const id = aliases[chave] || chave;
    return Object.hasOwn(nomes, id) ? id : '';
  };
  const nome = id => nomes[canonico(id)] || '';
  const mapa = valor => valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  const rankSeguro = (valor, padrao) => Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= 10 ? Number(valor) : padrao;
  const falha = mensagem => Object.assign(new Error(mensagem), { status: 400 });
  function conferirRank(valor, padrao) {
    if (valor === undefined) return padrao;
    if (typeof valor !== 'number' && typeof valor !== 'string') throw falha('O Rank de cada Role deve ser um número inteiro de 1 a 10.');
    const rank = Number(valor);
    if (!Number.isInteger(rank) || rank < 1 || rank > 10) throw falha('O Rank de cada Role deve ser um número inteiro de 1 a 10.');
    return rank;
  }

  function normalizar(doc) {
    const saida = { ...doc, role: canonico(doc.role) };
    if (doc.role && !saida.role) throw falha('Escolha uma Role principal válida.');
    if (doc.rankRole !== undefined) saida.rankRole = conferirRank(doc.rankRole, 4);
    if (doc.roleSecundaria === undefined) return saida;
    if (doc.roleSecundaria === null) { saida.roleSecundaria = null; return saida; }
    const secundaria = doc.roleSecundaria;
    if (!secundaria || typeof secundaria !== 'object' || Array.isArray(secundaria)) throw falha('A segunda Role deve ter uma Role e um Rank.');
    const id = canonico(secundaria.id);
    if (!id || !saida.role) throw falha('Escolha uma Role principal e uma segunda Role válidas.');
    if (id === saida.role) throw falha('A segunda Role deve ser diferente da principal.');
    saida.roleSecundaria = {
      id, rank: conferirRank(secundaria.rank, 1), habilidades: { ...mapa(secundaria.habilidades) },
      oficina: Array.isArray(secundaria.oficina) ? [...secundaria.oficina] : [],
      lifepath: { ...mapa(secundaria.lifepath) }, especializacao: String(secundaria.especializacao || '')
    };
    return saida;
  }

  function lista(doc = {}) {
    const id = canonico(doc.role);
    if (!id) return [];
    const principal = { id, rank: rankSeguro(doc.rankRole, 4), habilidades: mapa(doc.habilidades), oficina: Array.isArray(doc.oficina) ? doc.oficina : [], lifepath: mapa((doc.lifepath || {}).role), especializacao: doc.especializacao || '' };
    const secundaria = doc.roleSecundaria;
    const outra = secundaria && canonico(secundaria.id);
    return [principal, ...(outra && outra !== id ? [{ id: outra, rank: rankSeguro(secundaria.rank, 1), habilidades: mapa(secundaria.habilidades), oficina: Array.isArray(secundaria.oficina) ? secundaria.oficina : [], lifepath: mapa(secundaria.lifepath), especializacao: secundaria.especializacao || '' }] : [])];
  }

  function contexto(doc, entrada) {
    return { ...doc, role: entrada.id, rankRole: entrada.rank, habilidades: entrada.habilidades || {}, oficina: entrada.oficina || [], especializacao: entrada.especializacao || '', lifepath: { ...(doc.lifepath || {}), role: entrada.lifepath || {} }, roleSecundaria: null };
  }

  function especificacao(id, rank, C) {
    const spec = (C.roleAbilities || {})[canonico(id)];
    return spec ? { ...spec, pontos: (canonico(id) === 'tech' ? 2 : 1) * rank, max: rank } : null;
  }

  function resultados(doc, C) {
    return lista(doc).map(entrada => {
      const role = C.roles.find(item => item.id === entrada.id);
      const spec = especificacao(entrada.id, entrada.rank, C);
      const habilidades = spec ? spec.itens.map(item => ({ nome: item.id, rank: Math.min(spec.max, Math.max(0, Math.floor(Number(entrada.habilidades[item.id]) || 0))) })) : [];
      const porNome = Object.fromEntries(habilidades.map(item => [item.nome, item.rank]));
      for (const derivada of (spec && spec.derivadas) || []) {
        const total = Object.entries(derivada.de).reduce((soma, [chave, fator]) => soma + (porNome[chave] || 0) * fator, 0);
        habilidades.push({ nome: derivada.id, rank: derivada.max ? Math.min(derivada.max, total) : total });
      }
      const especializacao = ((role && role.especializacoes) || []).find(item => item.id === entrada.especializacao);
      return { id: entrada.id, nome: role ? role.nome : nome(entrada.id), rank: entrada.rank,
        foundry: role ? role.foundry : { pack: 'cyberpunk-red-core.core_roles', nome: nome(entrada.id) },
        especializacao: especializacao ? { nome: especializacao.nome, pericias: especializacao.pericias } : null, habilidades };
    });
  }

  function listaMesa(doc = {}) {
    const mesa = doc.mesa || {};
    const originais = Array.isArray(mesa.roles) && mesa.roles.length ? mesa.roles : mesa.role ? [mesa.role] : [];
    const vistos = new Set();
    const roles = [];
    for (const item of originais) {
      if (!item || typeof item !== 'object') continue;
      const id = canonico(item.id || item.nome);
      const chave = id || String(item.nome || '').toLowerCase();
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      const habilidades = (Array.isArray(item.habilidades) ? item.habilidades : [])
        .filter(entrada => entrada && typeof entrada === 'object')
        .map(entrada => Array.isArray(entrada) ? [String(entrada[0] || ''), Number(entrada[1]) || 0] : [String(entrada.nome || ''), Number(entrada.rank) || 0])
        .filter(([nome]) => nome);
      roles.push({ id, nome: item.nome || nome(id), rank: rankSeguro(item.rank, 0), habilidades });
    }
    const principal = roles.findIndex(item => item.id === canonico(doc.role));
    if (principal > 0) roles.unshift(...roles.splice(principal, 1));
    return roles;
  }

  const api = { ids: Object.keys(nomes), aliases, canonico, nome, normalizar, lista, contexto, especificacao, resultados, listaMesa };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.characterRoles = api;
})();
