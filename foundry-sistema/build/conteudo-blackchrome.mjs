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

// O cromo (a parte 3): o quadro linear externo (vestido) põe o BODY em body.quadro, e não em body.valor (o HP e o Death
// Save ficam pelo BODY sem ele; a decisão do usuário, como a wiki; os do RED também), e o Fūma Kotarō dá +2 em
// Furtividade (o CORE só traz o BODY). As armaduras com aparência de moda ganham o estilo que parecem (o de cada Mimic
// sai do nome; a Montage, Generic Chic ou Gang Colors, fica com o primeiro).
const QUADROS_EXTERNOS = ['core_gear:linear-frame-sigma', 'core_gear:linear-frame-beta', 'black-chrome_gear:fuma-kotaro-linear-frame',
  'black-chrome_gear:lf-001-swat-linear-frame', 'black-chrome_gear:vermilion-linear-frame', 'black-chrome_gear:el-f4-nt-linear-frame'];
const FUMA = ['black-chrome_gear:fuma-kotaro-linear-frame', 'black-chrome_cyberware:implanted-fuma-kotaro-linear-frame'];
const MODA = {
  'black-chrome_armor:dirk-combat-jacket': 'leisurewear', 'black-chrome_armor:laser-light-street-jacket': 'urbanFlash',
  'black-chrome_armor:montage-variable-clothing-line': 'genericChic', 'black-chrome_armor:executive-armor': 'businesswear',
  'black-chrome_armor:corporate-island': 'businesswear'
};
// Os veículos (a parte 4; a wiki, p. 57–84): o tipo (o CORE não diz se é aéreo), o Acesso Nômade e as proteções de
// fábrica do "Vem com" (o chassi blindado, SP 13, e os vidros à prova de balas, que contam como os upgrades instalados). O
// SDP e os assentos do CORE já trazem o chassi pesado e os upgrades de assentos.
// [slug, tipo, Acesso Nômade (0: "—"), chassi blindado, vidros à prova de balas]
const VEICULOS = [
  ['sh-45-patroller', 'aereo', 2, false, 1], ['sh-45-patroller-law', 'aereo', 4, false, 2], ['dayton-tdt-004', 'aereo', 7, false, 0],
  ['tanson-bellhop', 'aereo', 1, false, 0], ['zetatech-aerocop', 'aereo', 10, true, 2], ['zetatech-aerovox', 'aereo', 8, false, 0],
  ['zetatech-destination', 'aereo', 6, false, 0], ['zetatech-herakles', 'aereo', 10, true, 1],
  ['americar-econocompact', 'terrestre', 1, false, 0], ['americar-family-star-van', 'terrestre', 2, false, 0], ['diego-motors-chupacabra', 'terrestre', 4, false, 0],
  ['diego-motors-range-trike', 'terrestre', 4, true, 0], ['grundy', 'terrestre', 4, true, 0], ['harvey-100', 'terrestre', 1, false, 0],
  ['harriet-100', 'terrestre', 2, false, 0], ['harvey-merc', 'terrestre', 4, false, 0], ['highway-master-artemis', 'terrestre', 5, true, 2],
  ['kaukaz-volkhov', 'terrestre', 7, true, 0], ['makigai-ebi', 'terrestre', 1, false, 0], ['militech-gorgon-security-van', 'terrestre', 4, true, 1],
  ['zacatzontli-pickup-truck', 'terrestre', 4, false, 0], ['paladin-500', 'terrestre', 8, true, 0], ['quadra-thunder-x', 'terrestre', 8, true, 1],
  ['street-king-combat-vehicle', 'terrestre', 10, true, 2], ['tanson-jetboy-hoverboard', 'terrestre', 0, false, 0],
  ['tetracorp-america-megahauler', 'terrestre', 10, true, 2], ['tetracorp-america-badger-corporate-bus', 'terrestre', 6, true, 1],
  ['yang-s-wheels-rickshaw', 'terrestre', 2, false, 0], ['zonda-molly-1k', 'terrestre', 1, false, 0], ['zonda-parallax-cybercycle', 'terrestre', 8, true, 0],
  ['zonda-sliver', 'terrestre', 4, false, 1]
];
const camel = texto => texto.replace(/-([a-z])/g, (_, letra) => letra.toUpperCase());

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
  for (const id of QUADROS_EXTERNOS) {
    for (const efeito of itens[id].effects) for (const mudanca of efeito.system.changes) if (mudanca.key === 'system.atributos.body.valor') mudanca.key = 'system.atributos.body.quadro';
    corrigidos.push(id);
  }
  for (const id of FUMA) {
    itens[id].effects[0].system.changes.push({ key: 'system.bonus.pericias.stealth', type: 'add', value: '2', phase: 'initial', priority: null });
    corrigidos.push(id);
  }
  for (const id of Object.keys(itens).filter(id => id.startsWith('black-chrome_armor:mimic-clothing-'))) mudar(id, { moda: camel(id.split('mimic-clothing-')[1]) });
  for (const [id, estilo] of Object.entries(MODA)) mudar(id, { moda: estilo });
  for (const [slug, tipo, acessoNomade, blindado, vidros] of VEICULOS) mudar(`black-chrome_vehicles:${slug}`, { tipo, acessoNomade, sp: blindado ? 13 : 0, vidros });
  for (const [id, item] of Object.entries(itens)) {
    const efeito = EFEITOS_DA_MUNICAO[id] ?? (SUCATA.test(id) && item.type === 'municao' ? 'junk' : null);
    if (efeito) mudar(id, { efeito });
  }
  return corrigidos;
}
