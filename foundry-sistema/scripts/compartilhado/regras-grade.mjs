// O inventário em grade (o C107; o plano em foundry-sistema/inventario-plano/PLANO.md): as regras puras, sem o Foundry e
// sem a página. O mesmo arquivo serve ao Foundry, ao servidor da wiki (que confere o pedido do jogador) e à página da wiki,
// por isso não importa nada: o que ele repete do resto do sistema (o maosDaArma e o EMPILHAVEIS do regras.mjs) o G3
// confere que continua igual.
//
// A grade é regra da casa (o RED não tem peso nem carga): o espaço é o limite, sem penalidade, e o lugar decide o uso
// (decisões do usuário, 2026-11-28): o corpo é o equipado; o coldre, as costas, os bolsos, o cinto e a mochila, o
// carregando; o esconderijo da moradia e o porta-malas, o guardado. "Para organizar" guarda o que não coube, com o uso que
// o item já tinha: nada some.

// ---------------- Os tamanhos ----------------
// { l: largura, a: altura, pilha: unidades por item na grade }. O tamanho null é o item que não ocupa lugar: a lesão, o
// veículo (é um lugar, o porta-malas), a arma natural, a arma montada no cyberware ou no veículo, o cyberware instalado e
// a arquitetura da NET (o mestre a tem nos compêndios; não é coisa que se carrega).

// O plano, 3.2. As armas pelo tipo do CORE (system.tipo).
export const TAMANHO_DA_ARMA = {
  medPistol: [2, 1], heavyPistol: [2, 2], vHeavyPistol: [2, 2], smg: [2, 2], heavySmg: [3, 2],
  shotgun: [4, 2], bow: [4, 2], grenadeLauncher: [4, 2], assaultRifle: [5, 2], sniperRifle: [6, 2], rocketLauncher: [6, 2],
  lightMelee: [1, 2], medMelee: [1, 3], heavyMelee: [1, 4], vHeavyMelee: [2, 4], thrownWeapon: [1, 1]
};
// As armas do corpo: não se carregam.
export const ARMAS_NATURAIS = ['martialArts', 'unarmed'];

// A munição pelo tipo: o tamanho e quantas unidades cabem num item da grade. A SMG e a pistola usam a mesma; o rifle de
// precisão usa a de rifle (no RED não há munição de precisão). Leitura minha, fora da tabela do plano: a flecha, a bateria
// e a munição própria (custom) a 10, e o paintball como a de pistola.
export const MUNICAO = {
  medPistol: [1, 1, 30], heavyPistol: [1, 1, 30], vHeavyPistol: [1, 1, 30], paintball: [1, 1, 30],
  rifle: [1, 1, 20], shotgunShell: [1, 1, 10], shotgunSlug: [1, 1, 10], arrow: [1, 1, 10],
  grenade: [1, 1, 4], rocket: [2, 1, 1], battery: [1, 1, 10], custom: [1, 1, 10]
};

// O equipamento não tem categoria no catálogo: o padrão é o pequeno (1×1), e estes são os maiores, pelo id do catálogo
// (leitura minha, pela descrição de cada um). [l, a] ou [l, a, pilha].
export const TAMANHO_DO_CATALOGO = {
  'core_gear:carryall': [2, 2], 'core_gear:computer': [2, 2], 'core_gear:medtech-bag': [2, 2], 'core_gear:tech-bag': [2, 2],
  'core_gear:video-camera': [2, 2], 'core_gear:braindance-viewer': [2, 2], 'core_gear:chemical-analyzer': [2, 2],
  'core_gear:grapple-gun': [2, 2], 'core_gear:rope-60m-yd': [2, 2], 'core_gear:cryopump': [2, 2],
  'core_gear:drum-synthesizer': [3, 3], 'core_gear:electric-guitar-other-instrument': [2, 4],
  'core_gear:inflatable-bed-sleep-bag': [3, 3], 'core_gear:tent-and-camping-equipment': [3, 3],
  'core_gear:radiation-suit': [3, 3], 'core_gear:cryotank': [6, 3],
  'core_gear:linear-frame-beta': [4, 4], 'core_gear:linear-frame-sigma': [4, 4],
  'black-chrome_gear:co2-tank': [2, 2], 'black-chrome_gear:drink-master-3000': [3, 3],
  'black-chrome_gear:el-f4-nt-linear-frame': [4, 4], 'black-chrome_gear:everest-ventureware-airwell-50': [2, 2],
  'black-chrome_gear:everest-ventureware-one-touch-habitat': [3, 3], 'black-chrome_gear:fuma-kotaro-linear-frame': [4, 4],
  'black-chrome_gear:hydrosubsidium-universal-aqualung': [2, 3], 'black-chrome_gear:jeeves-executive-garment-bag': [3, 3],
  'black-chrome_gear:killstrom-sonic-boom-amp': [3, 3], 'black-chrome_gear:killstrom-typhoid-speaker': [2, 2],
  'black-chrome_gear:ktech-doberman-500': [4, 3], 'black-chrome_gear:laser-light-electric-guitar': [2, 4],
  'black-chrome_gear:lf-001-swat-linear-frame': [4, 4], 'black-chrome_gear:mr-biscuit-multi-food-processor': [2, 2],
  'black-chrome_gear:rapideploy-sheath': [1, 3], 'black-chrome_gear:streetcase-by-secsystems': [2, 2],
  'black-chrome_gear:vermilion-linear-frame': [4, 4], 'black-chrome_gear:worldsat-aerial-sphere': [2, 2],
  'black-chrome_gear:zetatech-porta-printer': [3, 3], 'dlc_black-chrome-plus:solo-of-fortune-bodypillow': [2, 4],
  // Os consumíveis pequenos empilham (leitura minha: 10 por item).
  'core_gear:road-flare': [1, 1, 10], 'core_gear:glow-stick': [1, 1, 10], 'core_gear:food-stick': [1, 1, 10],
  'core_gear:kibble-pack': [1, 1, 10], 'core_gear:mre': [1, 1, 10], 'core_gear:glow-paint': [1, 1, 10],
  'core_gear:memory-chip': [1, 1, 10], 'core_gear:tracer-button': [1, 1, 10], 'core_gear:homing-tracer': [1, 1, 10],
  'core_gear:vial-of-biotoxin': [1, 1, 10], 'core_gear:vial-of-poison': [1, 1, 10], 'core_gear:disposable-cell-phone': [1, 1, 10],
  'dlc_black-chrome-plus:bullet-to-slug-adapter-casings': [1, 1, 10]
};

// A roupa guardada: os acessórios pequenos e o resto dobrado (o plano diz 2×2; os óculos, as lentes e as joias a 1×1 são
// leitura minha).
const ROUPA_PEQUENA = ['glasses', 'mirrorshades', 'contactLenses', 'jewelry'];

const tam = ([l, a, pilha = 1]) => ({ l, a, pilha });

// O tamanho de um item (o do Foundry ou a linha da wiki com os mesmos campos): { type, name, catalogo, system, montada }.
// montada: o que está dentro de outro item e vai com ele (a arma do cyberware, do acessório ou do veículo; o programa no
// deck; o acessório na arma; a opção na fundação), que o chamador conhece (o instaladoEm, o ehArmaMontadaEmItem).
export function tamanhoDoItem(item = {}) {
  const s = item.system ?? {};
  const doCatalogo = item.catalogo && TAMANHO_DO_CATALOGO[item.catalogo];
  if (item.montada) return null;
  switch (item.type) {
    case 'arma':
      if (ARMAS_NATURAIS.includes(s.tipo)) return null;
      return tam(TAMANHO_DA_ARMA[s.tipo] ?? [2, 2]);
    case 'municao': return tam(MUNICAO[s.tipo] ?? MUNICAO.custom);
    case 'droga': return tam([1, 1, 10]);
    case 'equipamento': return tam(doCatalogo || [1, 1]);
    case 'roupa': return tam(ROUPA_PEQUENA.includes(s.tipo) ? [1, 1] : [2, 2]);
    case 'armadura': {
      if (s.escudo) return tam([3, 4]);
      if (!(Number(s.sp?.corpo?.max) > 0)) return tam([2, 2]);
      const pen = Number(s.penalidade) || 0;
      return tam(pen >= 3 ? [4, 4] : pen >= 1 ? [3, 4] : [3, 3]);
    }
    case 'cyberware':
      if (s.instalado) return null;
      if (s.fundacional && ['cyberArm', 'cyberLeg'].includes(s.tipo)) return tam([2, 4]);
      // A base de borgware (os quadros lineares, o braço extra) é maior que a de um membro: leitura minha.
      if (s.fundacional && s.tipo === 'borgware') return tam([3, 4]);
      return tam([1, 1]);
    case 'cyberdeck': return tam([2, 2]);
    case 'programa': return tam([1, 1]);
    // O acessório solto: o da arma e o do deck cabem na mão; o do veículo é peça grande (leitura minha).
    case 'upgrade': return tam(s.alvo === 'veiculo' ? [3, 3] : [1, 1]);
    default: return null;
  }
}

export const dimensoes = (tamanho, girado = false) => (girado ? { l: tamanho.a, a: tamanho.l } : { l: tamanho.l, a: tamanho.a });

// ---------------- As pilhas ----------------
// O que a grade acrescenta à pilha do CORE (o mesmaPilha e o divisaoDaPilha do regras-inventario.mjs decidem se junta e
// como divide): o teto de unidades por item.
export const EMPILHAVEIS = ['municao', 'equipamento', 'roupa', 'droga'];
export const limiteDaPilha = item => (EMPILHAVEIS.includes(item?.type) ? tamanhoDoItem(item)?.pilha ?? 1 : 1);
// Quantos itens da grade uma quantidade pede: [30, 30, 10] para 70 balas de pistola.
export function pilhasNecessarias(quantidade, limite) {
  const total = Math.max(0, Math.floor(Number(quantidade) || 0));
  const teto = Math.max(1, Math.floor(Number(limite) || 1));
  const pilhas = [];
  for (let resta = total; resta > 0; resta -= teto) pilhas.push(Math.min(teto, resta));
  return pilhas;
}
// Soltar uma pilha na outra (que o mesmaPilha já aceitou): o destino enche até o teto, e o resto fica na origem. Null: o
// destino já está cheio.
export function juntarPilhas(origem, destino, limite) {
  const cabe = Math.min(Math.max(0, limite - destino), Math.max(0, origem));
  return cabe > 0 ? { destino: destino + cabe, origem: origem - cabe } : null;
}

// ---------------- Os lugares ----------------
// O plano, 3.1. O encaixe guarda um item (ou o par de mãos, um); a lista guarda quantos quiser; a grade tem largura e
// altura.
export const ENCAIXES = {
  'corpo:maoPrincipal': 'Mão principal', 'corpo:maoSecundaria': 'Mão secundária', 'corpo:cabeca': 'Cabeça',
  'corpo:tronco': 'Tronco', 'corpo:deck': 'Cyberdeck', 'corpo:mochila': 'Mochila nas costas',
  coldre: 'Coldre', costas: 'Costas'
};
export const LISTAS = { 'corpo:roupa': 'Roupa', 'corpo:emUso': 'Em uso', organizar: 'Para organizar' };
export const GRADES_FIXAS = { bolsos: { nome: 'Bolsos', l: 4, a: 2 }, cinto: { nome: 'Cinto', l: 6, a: 1 } };
export const TAMANHOS_DA_MOCHILA = { P: { l: 4, a: 4 }, M: { l: 6, a: 5 }, G: { l: 8, a: 6 } };

// O esconderijo pela moradia da wiki (system-criacao.js, moradias). O ator guarda a moradia como { custo, descricao }
// (moradiaDaWiki, regras.mjs), com o nome; o id e o aluguel também servem.
export const MORADIAS = {
  rua: { nomes: ['Na rua ou num veículo', 'Street'], aluguel: 0, l: 0, a: 0 },
  capsula: { nomes: ['Hotel cápsula', 'Cube Hotel'], aluguel: 500, l: 4, a: 3 },
  conteiner: { nomes: ['Contêiner de carga', 'Cargo Container'], aluguel: 1000, l: 10, a: 6 },
  quitinete: { nomes: ['Quitinete', 'Studio Apartment'], aluguel: 1500, l: 8, a: 6 },
  'dois-quartos': { nomes: ['Apartamento de dois quartos', 'Two-Bedroom Apartment'], aluguel: 2500, l: 10, a: 8 },
  'conapt-luxo': { nomes: ['Conapt de luxo', 'Upscale Conapt'], aluguel: 7500, l: 12, a: 8 },
  cobertura: { nomes: ['Cobertura de luxo', 'Luxury Penthouse'], aluguel: 15000, l: 12, a: 10 },
  // As duas sem aluguel, de uma Role só (leitura minha, fora da tabela do plano): o conapt da corporação do Exec, como o de
  // dois quartos; o clã do Nomad, a parte dele no comboio.
  'conapt-corp': { nomes: ['Conapt corporativo'], aluguel: 0, l: 10, a: 8 },
  cla: { nomes: ['Com a família do clã'], aluguel: 0, l: 8, a: 4 }
};
// Com um nome que não é da lista, vale o aluguel: a maior moradia que ele paga, a partir da cápsula. Sem aluguel (o ator
// sem moradia preenchida, a casa que o mestre deu), o contêiner, a moradia padrão da criação (leitura minha). Só o nome da
// rua fica sem esconderijo.
export function moradiaDoPersonagem({ custo = 0, descricao = '' } = {}) {
  const nome = String(descricao ?? '').trim().toLowerCase();
  for (const [id, m] of Object.entries(MORADIAS)) if (nome === id || m.nomes.some(outro => outro.toLowerCase() === nome)) return id;
  const aluguel = Number(custo) || 0;
  if (aluguel <= 0) return 'conteiner';
  return Object.entries(MORADIAS).filter(([, m]) => m.aluguel > 0 && m.aluguel <= aluguel).sort((x, y) => y[1].aluguel - x[1].aluguel)[0]?.[0] ?? 'capsula';
}

// O porta-malas pela classe do veículo (o plano: moto 4×2, carro 8×4, van 10×8; o compacto, o enorme e a classe de cada
// veículo do catálogo são leitura minha, pela descrição e pelos assentos).
export const PORTA_MALAS = { nenhum: [0, 0], moto: [4, 2], compacto: [6, 4], carro: [8, 4], grande: [10, 8], enorme: [12, 10] };
export const CLASSE_DO_VEICULO = {
  'black-chrome_vehicles:tanson-jetboy-hoverboard': 'nenhum', 'black-chrome_vehicles:sh-45-patroller': 'nenhum',
  'black-chrome_vehicles:sh-45-patroller-law': 'nenhum', 'black-chrome_vehicles:tanson-bellhop': 'nenhum',
  'core_vehicles:roadbike': 'moto', 'core_vehicles:superbike': 'moto', 'core_vehicles:jetski': 'moto', 'core_vehicles:gyrocopter': 'moto',
  'black-chrome_vehicles:harriet-100': 'moto', 'black-chrome_vehicles:harvey-100': 'moto', 'black-chrome_vehicles:harvey-merc': 'moto',
  'black-chrome_vehicles:highway-master-artemis': 'moto', 'black-chrome_vehicles:diego-motors-range-trike': 'moto',
  'black-chrome_vehicles:zonda-parallax-cybercycle': 'moto', 'black-chrome_vehicles:zonda-sliver': 'moto',
  'black-chrome_vehicles:yang-s-wheels-rickshaw': 'moto',
  'core_vehicles:compact-groundcar': 'compacto', 'core_vehicles:super-groundcar': 'compacto', 'core_vehicles:av-9-super-aerodyne': 'compacto',
  'black-chrome_vehicles:americar-econocompact': 'compacto', 'black-chrome_vehicles:makigai-ebi': 'compacto',
  'black-chrome_vehicles:zonda-molly-1k': 'compacto',
  'core_vehicles:high-performance-groundcar': 'carro', 'core_vehicles:helicopter': 'carro', 'core_vehicles:speedboat': 'carro',
  'black-chrome_vehicles:quadra-thunder-x': 'carro', 'black-chrome_vehicles:paladin-500': 'carro',
  'black-chrome_vehicles:diego-motors-chupacabra': 'carro', 'black-chrome_vehicles:grundy': 'carro',
  'black-chrome_vehicles:zetatech-destination': 'carro',
  'core_vehicles:av-4-multipurpose-aerodyne': 'grande', 'core_vehicles:cabin-cruiser': 'grande',
  'black-chrome_vehicles:americar-family-star-van': 'grande', 'black-chrome_vehicles:militech-gorgon-security-van': 'grande',
  'black-chrome_vehicles:street-king-combat-vehicle': 'grande', 'black-chrome_vehicles:zacatzontli-pickup-truck': 'grande',
  'black-chrome_vehicles:kaukaz-volkhov': 'grande', 'black-chrome_vehicles:zetatech-aerocop': 'grande',
  'black-chrome_vehicles:zetatech-aerovox': 'grande', 'black-chrome_vehicles:zetatech-herakles': 'grande',
  'black-chrome_vehicles:dayton-tdt-004': 'grande', 'black-chrome_vehicles:tetracorp-america-badger-corporate-bus': 'grande',
  'core_vehicles:aerozep': 'enorme', 'core_vehicles:yacht': 'enorme', 'black-chrome_vehicles:tetracorp-america-megahauler': 'enorme'
};
// O veículo fora do catálogo vai pelo tipo (o tipoDoVeiculo do regras-veiculos.mjs): o marítimo como o compacto, o resto
// como o carro.
export const classeDoVeiculo = ({ catalogo = '', tipo = '' } = {}) => CLASSE_DO_VEICULO[catalogo] ?? (tipo === 'maritimo' ? 'compacto' : 'carro');

// Os lugares de um personagem: moradia { custo, descricao }; veiculos [{ id, nome, catalogo, tipo }]; mochila: o tamanho
// (P, M ou G) do Carryall no encaixe "Mochila nas costas", ou null sem ele.
export function lugaresDoPersonagem({ moradia = {}, veiculos = [], mochila = null } = {}) {
  const lugares = [
    ...Object.entries(ENCAIXES).map(([id, nome]) => ({ id, nome, tipo: 'encaixe', uso: usoDoLugar(id) })),
    ...['corpo:roupa', 'corpo:emUso'].map(id => ({ id, nome: LISTAS[id], tipo: 'lista', uso: usoDoLugar(id) })),
    ...Object.entries(GRADES_FIXAS).map(([id, g]) => ({ id, nome: g.nome, tipo: 'grade', uso: usoDoLugar(id), l: g.l, a: g.a }))
  ];
  const daMochila = TAMANHOS_DA_MOCHILA[mochila];
  if (daMochila) lugares.push({ id: 'mochila', nome: 'Mochila', tipo: 'grade', uso: usoDoLugar('mochila'), ...daMochila });
  const casa = MORADIAS[moradiaDoPersonagem(moradia)];
  if (casa.l) lugares.push({ id: 'esconderijo', nome: 'Esconderijo', tipo: 'grade', uso: usoDoLugar('esconderijo'), l: casa.l, a: casa.a });
  for (const veiculo of veiculos) {
    const [l, a] = PORTA_MALAS[classeDoVeiculo(veiculo)];
    if (l) lugares.push({ id: `veiculo:${veiculo.id}`, nome: `Porta-malas: ${veiculo.nome}`, tipo: 'grade', uso: usoDoLugar(`veiculo:${veiculo.id}`), l, a });
  }
  lugares.push({ id: 'organizar', nome: LISTAS.organizar, tipo: 'lista', uso: null });
  return lugares;
}

// O uso que o lugar dá (o USOS do config.mjs). "Para organizar" fica com o que o item já tinha.
export function usoDoLugar(lugar, usoAtual = null) {
  if (lugar === 'organizar') return usoAtual;
  if (String(lugar).startsWith('corpo:')) return 'equipado';
  if (lugar === 'esconderijo' || String(lugar).startsWith('veiculo:')) return 'guardado';
  return 'carregando';
}

// ---------------- Os encaixes ----------------
// O regras.mjs, maosDaArma (o G3 confere que é igual): a arma branca de duas mãos vai com uma só a partir do BODY 8.
export const maosDaArma = (arma, body = 0) => (arma.maos === 2 && arma.aDistancia === false && body >= 8 ? 1 : arma.maos ?? 0);
const ehCarryall = item => item.catalogo === 'core_gear:carryall' || /^carryall$/i.test(String(item.name ?? '').trim());

// Os encaixes que o item ocupa se for posto em "encaixe" (a arma de duas mãos, as duas mãos; a armadura de cabeça e
// corpo, os dois), ou null se ele não serve ali. As mãos levam só arma e escudo, como a conta das mãos livres do sistema
// (maosLivres): o equipamento em uso vai na lista "Em uso".
export function encaixesDoItem(item, encaixe, body = 0) {
  const s = item.system ?? {};
  const arma = item.type === 'arma' && tamanhoDoItem(item) !== null;
  const maos = arma ? maosDaArma({ maos: s.maos, aDistancia: s.aDistancia }, body) : 0;
  const escudo = item.type === 'armadura' && Boolean(s.escudo);
  const cabeca = item.type === 'armadura' && !escudo && Number(s.sp?.cabeca?.max) > 0;
  const tronco = item.type === 'armadura' && !escudo && Number(s.sp?.corpo?.max) > 0;
  switch (encaixe) {
    case 'corpo:maoPrincipal': case 'corpo:maoSecundaria':
      if (arma && maos >= 2) return ['corpo:maoPrincipal', 'corpo:maoSecundaria'];
      return arma || escudo ? [encaixe] : null;
    case 'corpo:cabeca': case 'corpo:tronco':
      if (!(encaixe === 'corpo:cabeca' ? cabeca : tronco)) return null;
      return cabeca && tronco ? ['corpo:cabeca', 'corpo:tronco'] : [encaixe];
    case 'corpo:deck': return item.type === 'cyberdeck' ? [encaixe] : null;
    case 'corpo:mochila': return ehCarryall(item) ? [encaixe] : null;
    // A granada e a faca de arremesso vão no cinto, não no coldre.
    case 'coldre': return arma && maos <= 1 && s.tipo !== 'thrownWeapon' ? [encaixe] : null;
    case 'costas': return arma && (Number(s.maos) >= 2 || ['heavyMelee', 'vHeavyMelee'].includes(s.tipo)) ? [encaixe] : null;
    default: return null;
  }
}
// O que cada lista aceita.
function aceitaNaLista(lista, item) {
  if (lista === 'corpo:roupa') return item.type === 'roupa';
  if (lista === 'corpo:emUso') return item.type === 'equipamento' && !ehCarryall(item);
  return lista === 'organizar';
}

// ---------------- Conferir um lugar ----------------
const quadrados = ({ x, y }, { l, a }) => Array.from({ length: l * a }, (_, i) => `${x + (i % l)},${y + Math.floor(i / l)}`);

// Pode pôr o item em destino { lugar, x, y, girado }? estado: os outros itens do personagem, [{ item, grade }] (o próprio
// item pode estar ali: ele não colide consigo). Null quando pode; senão o motivo, em português, para a wiki e a ficha
// mostrarem.
export function conferirLugar(lugares, estado, item, destino, { body = 0 } = {}) {
  const lugar = lugares.find(outro => outro.id === destino?.lugar);
  if (!lugar) return 'Esse lugar não existe para este personagem.';
  const tamanho = tamanhoDoItem(item);
  if (!tamanho) return `${item.name} não ocupa lugar no inventário.`;
  const outros = estado.filter(outro => outro.item.id !== item.id && outro.grade);
  if (lugar.tipo === 'lista') return aceitaNaLista(lugar.id, item) ? null : `${lugar.nome}: não serve para ${item.name}.`;
  if (lugar.tipo === 'encaixe') {
    const ocupa = encaixesDoItem(item, lugar.id, body);
    if (!ocupa) return `${lugar.nome}: não serve para ${item.name}.`;
    for (const outro of outros.filter(outro => ENCAIXES[outro.grade.lugar])) {
      const dele = encaixesDoItem(outro.item, outro.grade.lugar, body) ?? [outro.grade.lugar];
      const comum = ocupa.find(id => dele.includes(id));
      if (comum) return `${ENCAIXES[comum]}: já tem ${outro.item.name}.`;
    }
    return null;
  }
  const { x, y } = destino;
  const { l, a } = dimensoes(tamanho, destino.girado);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x < 0 || y < 0 || x + l > lugar.l || y + a > lugar.a) return `${item.name} passa da borda de ${lugar.nome}.`;
  const meus = new Set(quadrados({ x, y }, { l, a }));
  const ocupante = outros.find(outro => outro.grade.lugar === lugar.id && tamanhoDoItem(outro.item)
    && quadrados(outro.grade, dimensoes(tamanhoDoItem(outro.item), outro.grade.girado)).some(q => meus.has(q)));
  return ocupante ? `${lugar.nome}: ${ocupante.item.name} já está ali.` : null;
}

// ---------------- Arrumar sozinho ----------------
// O botão "Arrumar" e a migração dos atores de hoje (o C108): cada item vai para um lugar do uso que ele já tem, do maior
// para o menor; o que não cabe vai para "Para organizar", com o mesmo uso. O resultado depende só da entrada (a ordem dos
// itens não importa), para a migração dar o mesmo em qualquer navegador: a ordem não usa o localeCompare.
// itens: [{ id, name, type, catalogo, system, montada, uso }]. Devolve { [id]: { lugar, x, y, girado } }, sem os itens que
// não ocupam lugar; o de "Para organizar" guarda também o uso (a arma e a armadura não têm o campo: é por ele que a guardada
// continua guardada). fixos: os que ficam onde estão, [{ item, grade }] (o C108: o item novo chega sem mexer nos outros).
const ordem = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
export function arrumar(itens, lugares, { body = 0, fixos = [] } = {}) {
  const existe = id => lugares.some(lugar => lugar.id === id);
  const grades = ids => ids.filter(existe);
  const comTamanho = itens.map(item => ({ item, tamanho: tamanhoDoItem(item) })).filter(({ tamanho }) => tamanho)
    .sort((x, y) => (y.tamanho.l * y.tamanho.a - x.tamanho.l * x.tamanho.a) || ordem(String(x.item.name), String(y.item.name)) || ordem(String(x.item.id), String(y.item.id)));
  const estado = fixos.filter(fixo => fixo.grade);
  const resultado = {};
  const tentar = destino => {
    if (!existe(destino.lugar)) return false;
    const atual = estado.at(-1);
    if (conferirLugar(lugares, estado.slice(0, -1), atual.item, destino, { body })) return false;
    atual.grade = destino;
    return true;
  };
  const naGrade = id => {
    const lugar = lugares.find(outro => outro.id === id);
    for (let y = 0; y < lugar.a; y++) for (let x = 0; x < lugar.l; x++) for (const girado of [false, true]) if (tentar({ lugar: id, x, y, girado })) return true;
    return false;
  };
  for (const { item } of comTamanho) {
    estado.push({ item, grade: null });
    const uso = item.uso;
    let feito = false;
    if (uso === 'equipado') {
      const lista = item.type === 'roupa' ? 'corpo:roupa' : item.type === 'equipamento' && !ehCarryall(item) ? 'corpo:emUso' : null;
      const encaixes = lista ? [lista] : ['corpo:maoPrincipal', 'corpo:maoSecundaria', 'corpo:cabeca', 'corpo:tronco', 'corpo:deck', 'corpo:mochila'];
      feito = encaixes.some(lugar => tentar({ lugar, x: 0, y: 0, girado: false }));
    } else if (uso === 'guardado') {
      feito = grades(['esconderijo', ...lugares.filter(lugar => lugar.id.startsWith('veiculo:')).map(lugar => lugar.id)]).some(naGrade);
    } else {
      feito = ['coldre', 'costas'].some(lugar => tentar({ lugar, x: 0, y: 0, girado: false })) || grades(['bolsos', 'cinto', 'mochila']).some(naGrade);
    }
    if (!feito) estado.at(-1).grade = paraOrganizar(uso);
    resultado[item.id] = estado.at(-1).grade;
  }
  return resultado;
}
const paraOrganizar = uso => ({ lugar: 'organizar', x: 0, y: 0, girado: false, uso: USOS.includes(uso) ? uso : 'carregando' });

// ---------------- O uso e a grade juntos (o C108) ----------------
// Os usos do sistema (o USOS do config.mjs) e os tipos que têm o campo uso. A arma e a armadura têm só o equipada; o resto
// (a munição, o cyberware, o programa e o acessório soltos) não tem nenhum: para eles, o guardado é só o lugar.
export const USOS = ['equipado', 'carregando', 'guardado'];
export const TIPOS_COM_USO = ['equipamento', 'roupa', 'droga', 'cyberdeck'];
export const TIPOS_COM_EQUIPADA = ['arma', 'armadura'];

// O uso de um item agora: o campo dele, o equipada, ou o lugar onde está (item.grade). Sem nada, carregando (o padrão do
// sistema).
export function usoDoItem(item = {}) {
  const s = item.system ?? {};
  const doLugar = item.grade ? usoDoLugar(item.grade.lugar, item.grade.uso) : null;
  if (TIPOS_COM_EQUIPADA.includes(item.type)) return s.equipada ? 'equipado' : doLugar === 'guardado' ? 'guardado' : 'carregando';
  if (TIPOS_COM_USO.includes(item.type) && USOS.includes(s.uso)) return s.uso;
  return USOS.includes(doLugar) ? doLugar : 'carregando';
}

// O que muda no item para ele ter o uso: o system.uso, o equipada (a arma e a armadura fora do corpo não ficam equipadas),
// ou nada (os sem campo). Os caminhos do system, para o update do Foundry.
export function mudancasDoUso(item, uso) {
  if (TIPOS_COM_EQUIPADA.includes(item.type)) return { 'system.equipada': uso === 'equipado' };
  if (TIPOS_COM_USO.includes(item.type)) return { 'system.uso': uso };
  return {};
}

// O lugar de um item que mudou de uso por outro caminho (a ficha, o Painel Tático, uma macro) ou que acabou de chegar:
// fica onde está se o lugar ainda vale e dá esse uso; senão, o primeiro lugar livre do uso, sem mexer nos outros; sem
// nenhum, "Para organizar". outros: [{ item, grade }], os outros itens do personagem. Devolve a grade nova, ou null quando
// o item fica onde está (ou não ocupa lugar).
export function gradeParaUso(item, uso, lugares, outros, { body = 0 } = {}) {
  if (!tamanhoDoItem(item)) return null;
  const atual = item.grade;
  if (atual && usoDoLugar(atual.lugar, atual.uso) === uso && !conferirLugar(lugares, outros, item, atual, { body })) return null;
  // O próprio item nos outros não atrapalha: o conferirLugar o ignora pelo id.
  return arrumar([{ ...item, uso }], lugares, { body, fixos: outros })[item.id];
}

// Depois que um lugar some ou encolhe (a mochila tirada, o veículo que saiu, a moradia nova): o que não cabe mais onde
// estava vai para "Para organizar", com o uso que tinha. Os que ficam são conferidos na ordem do rev (o mexido por
// último ganha o lugar), e depois pelo id. Devolve { [id]: grade } só dos que mudam.
export function reconciliar(itens, lugares, { body = 0 } = {}) {
  const comGrade = itens.filter(item => item.grade && item.grade.lugar !== 'organizar' && tamanhoDoItem(item))
    .sort((x, y) => (Number(y.grade.rev) || 0) - (Number(x.grade.rev) || 0) || ordem(String(x.id), String(y.id)));
  const estado = [];
  const mudam = {};
  for (const item of comGrade) {
    if (conferirLugar(lugares, estado, item, item.grade, { body })) mudam[item.id] = paraOrganizar(usoDoItem(item));
    else estado.push({ item, grade: item.grade });
  }
  return mudam;
}
