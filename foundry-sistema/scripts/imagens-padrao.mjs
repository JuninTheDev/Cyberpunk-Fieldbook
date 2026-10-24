// CORE 0.92.4: GetDefaultImage, com os SVGs locais do sistema. Os documentos usam o getDefaultArtwork nativo do Foundry
// 14: o padrão vale também no item em branco da ficha ou aninhado no ator, sem substituir uma imagem explícita.
import { caminho } from './config.mjs';

const ATORES = {
  personagem: 'Default_CPR_Mystery_Man.svg', capanga: 'Default_Mook.svg', conteiner: 'Default_Container.svg',
  blackice: 'default-blackice.svg', demonio: 'default-demon.svg'
};
const ITENS = {
  arma: 'Default_Weapon.svg', armadura: 'Default_Armor.svg', municao: 'Default_Ammo.svg', cyberware: 'Default_Cyberware.svg',
  lesao: 'Default_Critical_Injury.svg', equipamento: 'Default_Gear.svg', roupa: 'Default_Clothing.svg', droga: 'Default_Gear.svg',
  cyberdeck: 'Default_Cyberdeck.svg', programa: 'Default_Program.svg', upgrade: 'Default_Gear.svg', veiculo: 'Default_Vehicle.svg',
  arquitetura: 'Default_Net_Architecture.svg'
};

export function imagemPadrao(documento, tipo) {
  const imagens = documento === 'Actor' ? ATORES : documento === 'Item' ? ITENS : null;
  return imagens && Object.hasOwn(imagens, tipo) ? caminho('icones/padrao/' + imagens[tipo]) : null;
}
