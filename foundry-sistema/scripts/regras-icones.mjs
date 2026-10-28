// Os ícones próprios do sistema (o C49, parte 1; o desenho em build/icones.mjs, os arquivos em icones/neon): os estados no
// token (os do Foundry e os do sistema, pelo id) e as imagens padrão dos atores e dos itens. Só dados: quem aplica é
// icones.mjs (os estados), imagens-padrao.mjs (o item em branco) e o build (o catálogo).
const PASTA = 'systems/cpr-fieldbook/icones/neon';
export const iconeNeon = nome => `${PASTA}/${nome}.svg`;
export const ehIconeNeon = src => String(src ?? '').startsWith(`${PASTA}/`);

// Os estados: os 34 do Foundry 14 (client/config.mjs) e os do sistema.
export const ICONES_DOS_ESTADOS = {
  dead: 'morto', unconscious: 'inconsciente', sleep: 'dormindo', stun: 'atordoado', prone: 'caido', restrain: 'preso', paralysis: 'paralisado',
  fly: 'voando', blind: 'cego', deaf: 'surdo', silence: 'silenciado', fear: 'medo', burning: 'queimando', frozen: 'congelado', shock: 'choque',
  corrode: 'corroendo', bleeding: 'sangrando', disease: 'doente', poison: 'envenenado', curse: 'maldito', regen: 'regenerando', degen: 'degenerando',
  hover: 'pairando', burrow: 'cavando', upgrade: 'melhorado', downgrade: 'piorado', invisible: 'invisivel', target: 'alvo', eye: 'olho', bless: 'abencoado',
  fireShield: 'escudoDeFogo', coldShield: 'escudoDeGelo', magicShield: 'escudoMagico', holyShield: 'escudoSagrado',
  'cpr-fieldbook-suprimido': 'suprimido', 'cpr-fieldbook-em-cobertura': 'cobertura', 'cpr-fieldbook-agarrando': 'agarrando', 'cpr-fieldbook-agarrado': 'agarrado',
  'cprf-em-chamas': 'queimando', 'cprf-conectado-na-net': 'conectado', 'cprf-sem-ar': 'semAr', 'cprf-eletrocutado': 'eletrocutado', 'cprf-radiacao': 'radiacao'
};
export const iconeDoEstado = id => (Object.hasOwn(ICONES_DOS_ESTADOS, id) ? iconeNeon(ICONES_DOS_ESTADOS[id]) : null);

// Os efeitos que o sistema cria com imagem (a estase, a Sonífera, o fogo, as penalidades) e o efeito novo da ficha.
export const ICONES_DOS_EFEITOS = { estase: 'estase', sono: 'dormindo', fogo: 'queimando', penalidade: 'piorado', novo: 'efeito' };
export const iconeDoEfeito = chave => iconeNeon(ICONES_DOS_EFEITOS[chave] ?? 'efeito');

// As imagens padrão: o ator e o item em branco, e os itens do catálogo.
export const ICONES_DOS_ATORES = { personagem: 'personagem', capanga: 'capanga', conteiner: 'conteiner', blackice: 'blackice', demonio: 'demonio', veiculo: 'veiculo' };
export const ICONES_DOS_ITENS = {
  arma: 'arma', armadura: 'armadura', municao: 'municao', cyberware: 'cyberware', lesao: 'lesao', equipamento: 'equipamento', roupa: 'roupa',
  droga: 'droga', cyberdeck: 'cyberdeck', programa: 'programa', upgrade: 'upgrade', veiculo: 'veiculo', arquitetura: 'arquitetura'
};

// As imagens genéricas do Foundry que o build punha nos itens do catálogo (até o ciclo 190), por tipo: a migração 10 troca
// pelas novas só essas, no item do catálogo (a imagem que o mestre escolheu fica).
export const IMAGENS_ANTIGAS_DOS_ITENS = {
  arma: ['icons/svg/target.svg', 'icons/svg/sword.svg'], armadura: ['icons/svg/shield.svg'], municao: ['icons/svg/barrel.svg'], cyberware: ['icons/svg/clockwork.svg'],
  lesao: ['icons/svg/blood.svg'], equipamento: ['icons/svg/item-bag.svg'], roupa: ['icons/svg/cowled.svg'], droga: ['icons/svg/pill.svg'], cyberdeck: ['icons/svg/net.svg'],
  programa: ['icons/svg/lightning.svg', 'icons/svg/ice-aura.svg'], upgrade: ['icons/svg/upgrade.svg'], veiculo: ['icons/svg/wingfoot.svg']
};
// As imagens padrão do CORE que o sistema usou até o ciclo 190 (o C34.3; icones/padrao, que fica no pacote para os
// documentos antigos): o item ou o ator em branco guardou o caminho delas.
const PADRAO_DO_CORE = {
  Actor: { personagem: 'Default_CPR_Mystery_Man.svg', capanga: 'Default_Mook.svg', conteiner: 'Default_Container.svg', blackice: 'default-blackice.svg', demonio: 'default-demon.svg', veiculo: 'Default_Vehicle.svg' },
  Item: { arma: 'Default_Weapon.svg', armadura: 'Default_Armor.svg', municao: 'Default_Ammo.svg', cyberware: 'Default_Cyberware.svg', lesao: 'Default_Critical_Injury.svg',
    equipamento: 'Default_Gear.svg', roupa: 'Default_Clothing.svg', droga: 'Default_Gear.svg', cyberdeck: 'Default_Cyberdeck.svg', programa: 'Default_Program.svg',
    upgrade: 'Default_Gear.svg', veiculo: 'Default_Vehicle.svg', arquitetura: 'Default_Net_Architecture.svg' }
};
const ICONES = { Actor: ICONES_DOS_ATORES, Item: ICONES_DOS_ITENS };
// A imagem neon padrão do documento (Actor ou Item) pelo tipo, ou null.
export const imagemNeonPadrao = (documento, tipo) => (Object.hasOwn(ICONES, documento ?? '') && Object.hasOwn(ICONES[documento], tipo ?? '') ? iconeNeon(ICONES[documento][tipo]) : null);
// A imagem nova de um documento antigo: a padrão do CORE (qualquer documento daquele tipo) ou a genérica do Foundry que o
// build punha no item do catálogo. null: fica a que está (a escolhida pelo mestre).
export function imagemNova({ documento = 'Item', tipo, img, catalogo = '' }) {
  const doCore = PADRAO_DO_CORE[documento]?.[tipo];
  if (doCore && img === `systems/cpr-fieldbook/icones/padrao/${doCore}`) return imagemNeonPadrao(documento, tipo);
  if (documento !== 'Item' || !catalogo || !IMAGENS_ANTIGAS_DOS_ITENS[tipo]?.includes(img)) return null;
  return iconeNeon(tipo === 'programa' && img === 'icons/svg/ice-aura.svg' ? 'blackice' : ICONES_DOS_ITENS[tipo]);
}
