// As armas e a munição do Black Chrome que o CORE 0.92.4 traz diferentes da wiki (system-blackchrome.js; o C48, parte 2).
// O build (build/conteudo.mjs) converte os pacotes do CORE e corrige estes itens; as regras ficam no sistema
// (scripts/regras-black-chrome.mjs).
// - A Combinação: o CORE traz só o primeiro modo ("the upgrade must be added manually"). O outro modo vem de uma arma do
//   RED (o combinacao da arma, que vira a arma ligada a ela; scripts/armas-cyberware.mjs), com o que a wiki muda nele.
// - A Pepper Shaker: dano 0 no CORE; a wiki, 2d6 (o autofogo rola 2d6 de qualquer jeito).
// - A Tomahawk e a Mono-Star: no CORE, só de arremesso; na wiki, "Arma branca / de arremesso" (Armas Brancas ou
//   Atletismo). Viram arma branca, que se arremessa (scripts/arremessar.mjs) e continua reduzindo o SP à metade.
// - Os explosivos: o CORE copia o "ignora metade do SP" da arma branca; a regra deles é a do sistema.
// - A munição sucata e a granada Arachnid ganham o efeito delas ("junk" e "arachnid"; no CORE, "special").

const COMBINACOES = {
  'black-chrome_weapons:pursuit-security-bouncer': { de: 'core_weapons:microwaver', modo: 'Microwaver' },
  'black-chrome_weapons:eagletech-survivalist': { de: 'core_weapons:assault-rifle', modo: 'rifle', pente: 10, autofogo: 0, supressivo: false },
  'black-chrome_weapons:ktech-techhammer': { de: 'core_weapons:rocket-launcher', modo: 'lança-foguetes', pente: 2 },
  'black-chrome_weapons:militech-mastiff-smg': { de: 'core_weapons:shotgun', modo: 'espingarda', pente: 3 },
  'black-chrome_weapons:sternmeyer-m-04-variable-assault': { de: 'core_weapons:grenade-launcher', modo: 'lança-granadas', pente: 2, qualidade: 'poor' },
  'black-chrome_weapons:tommyknocker': { de: 'core_weapons:shotgun', modo: 'espingarda', pente: 2, qualidade: 'poor' }
};
const CAMPOS_DO_MODO = ['tipo', 'pericia', 'dano', 'cdt', 'aDistancia', 'municoes', 'autofogo', 'supressivo', 'bonusAtaque', 'qualidade', 'falhaCritica', 'ocultavel', 'tabelaDV', 'ignorarArmadura', 'ignorarAbaixo'];

const CORRECOES = {
  'black-chrome_weapons:federated-arms-pepper-shaker': { dano: '2d6' },
  // O primeiro modo da TechHammer é a espingarda: o foguete vai no segundo.
  'black-chrome_weapons:ktech-techhammer': { municoes: ['shotgunShell', 'shotgunSlug'] },
  'black-chrome_weapons:utility-tomahawk': { tipo: 'heavyMelee', pericia: 'melee-weapon', aDistancia: false, tabelaDV: '' },
  'black-chrome_weapons:kendachi-mono-star': { tipo: 'medMelee', pericia: 'melee-weapon', aDistancia: false, tabelaDV: '', slots: 0 }
};
const EXPLOSIVOS = ['killchip-100-micro-bomb', 'gunmart-door-cracker', 'outlet-explosive', 'micro-hydrogen-combustor', 'tr-4-detonator-fluid'].map(nome => `black-chrome_weapons:${nome}`);
const EFEITOS_DA_MUNICAO = { 'black-chrome_ammo:grenade-arachnid': 'arachnid' };
const SUCATA = /^dlc_black-chrome-plus:.+-junk$/;

// Corrige os itens do catálogo (no lugar). Devolve os ids corrigidos, para o build listar.
export function corrigirBlackChrome(itens) {
  const corrigidos = [];
  const mudar = (id, mudancas) => {
    if (!itens[id]) throw new Error(`Black Chrome: ${id} não está no catálogo.`);
    Object.assign(itens[id].system, mudancas);
    corrigidos.push(id);
  };
  for (const [id, mudancas] of Object.entries(CORRECOES)) mudar(id, mudancas);
  for (const id of EXPLOSIVOS) mudar(id, { ignorarArmadura: 0, aDistancia: false });
  for (const [id, { de, modo, pente, ...outros }] of Object.entries(COMBINACOES)) {
    const base = itens[de]?.system;
    if (!base) throw new Error(`Black Chrome: a arma ${de} do modo de ${id} não está no catálogo.`);
    const campos = Object.fromEntries(CAMPOS_DO_MODO.map(campo => [campo, structuredClone(base[campo])]));
    mudar(id, { combinacao: { ataca: true, modo, ...campos, pente: pente ?? base.pente.max, ...outros } });
  }
  for (const [id, item] of Object.entries(itens)) {
    const efeito = EFEITOS_DA_MUNICAO[id] ?? (SUCATA.test(id) && item.type === 'municao' ? 'junk' : null);
    if (efeito) mudar(id, { efeito });
  }
  return corrigidos;
}
