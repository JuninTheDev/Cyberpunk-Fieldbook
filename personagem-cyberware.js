// O local anatômico é independente da clínica usada na instalação do Foundry.
// Sem local: dado legado ou peça cuja família não distingue lados.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.characterCyberware = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const PARTES = {
    cyberArm: [{ id: 'braco-esquerdo', nome: 'Braço esquerdo' }, { id: 'braco-direito', nome: 'Braço direito' }],
    cyberLeg: [{ id: 'perna-esquerda', nome: 'Perna esquerda' }, { id: 'perna-direita', nome: 'Perna direita' }],
    cyberEye: [{ id: 'olho-esquerdo', nome: 'Olho esquerdo' }, { id: 'olho-direito', nome: 'Olho direito' }]
  };
  const TODOS = Object.entries(PARTES).flatMap(([tipo, locais]) => locais.map(local => ({ ...local, tipo })));
  const falha = mensagem => { throw Object.assign(new Error(mensagem), { status: 400 }); };
  function locais(tipo) { return (PARTES[tipo] || []).map(local => ({ ...local })); }
  function nome(local) { return TODOS.find(parte => parte.id === local)?.nome || 'Local não definido'; }
  function tipo(local) { return TODOS.find(parte => parte.id === local)?.tipo || ''; }
  function normalizar(local, familia) {
    if (local === undefined || local === null || local === '') return '';
    if (typeof local !== 'string') return falha('Escolha um local de instalação válido.');
    const parte = TODOS.find(entrada => entrada.id === local);
    if (!parte) return falha('Local de instalação desconhecido.');
    if (familia !== undefined && parte.tipo !== familia) return falha(`${parte.nome} não é compatível com este cyberware.`);
    return parte.id;
  }
  function duplicados(entries) {
    const usados = new Set();
    for (const entry of entries || []) {
      const cyber = entry.item?.cyber || entry.cyber;
      if (!cyber?.base || !entry.local) continue;
      const local = normalizar(entry.local, cyber.tipo);
      if (usados.has(local) || Number(entry.qtd || 1) > 1) return falha(`Há mais de uma base no ${nome(local).toLocaleLowerCase('pt-BR')}. Escolha um local diferente para cada uma.`);
      usados.add(local);
    }
    return true;
  }
  return { locais, nome, tipo, normalizar, duplicados };
});
