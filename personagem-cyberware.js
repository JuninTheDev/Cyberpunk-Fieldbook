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
  // Peça única num membro natural (RED: a opção que vai "num braço orgânico como peça única"; o CORE do Foundry 12 faz
  // isso com a base Meat Arm ou Meat Leg, de graça e sem Humanidade, que aceita "a única peça instalada"). Uma peça por
  // membro, num lado sem cyberbraço ou cyberperna. Pelo nome do Foundry (o "en" do catálogo da loja).
  const PECAS_UNICAS = {
    cyberArm: ['Big Knucks', 'Tool Hand', 'Rippers', 'Scratchers', "Slice 'N Dice", 'Wolvers', 'Modular Finger Cyberhand', 'Ballistic Coprocessor'],
    cyberLeg: ['Talon Foot', 'Lynx Paws']
  };
  const BASES_NATURAIS = { cyberArm: 'Meat Arm', cyberLeg: 'Meat Leg' };
  const MEMBROS = { cyberArm: 'braço natural', cyberLeg: 'perna natural' };
  function pecaUnica(nomeFoundry, familia) {
    return Object.entries(PECAS_UNICAS).some(([tipoDaPeca, nomes]) => (familia === undefined || familia === tipoDaPeca) && nomes.includes(nomeFoundry));
  }
  // A base do membro natural no Foundry 12 (o CORE): "Meat Arm", ou "Meat Arm — Braço direito" depois que o importador
  // põe o lado no nome. Devolve o tipo (cyberArm, cyberLeg) ou ''.
  function baseNatural(nomeFoundry) {
    return Object.entries(BASES_NATURAIS).find(([, base]) => String(nomeFoundry || '') === base || String(nomeFoundry || '').startsWith(`${base} — `))?.[0] || '';
  }
  const membro = familia => MEMBROS[familia] || 'membro natural';
  return { locais, nome, tipo, normalizar, duplicados, pecaUnica, baseNatural, membro, BASES_NATURAIS };
});
