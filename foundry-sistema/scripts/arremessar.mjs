// O contexto do arremesso acompanha o ataque e o dano manual, sem mudar a arma na ficha.
// Wiki, system-rules.js:535 (p. 177): arma branca arremessada usa o SP inteiro. O dano-base está no CORE,
// .cache/cpr-core-v0.92.4/src/packs/core/weapons/weapon.thrown.weapon.yaml:25–27.
import { SISTEMA } from './config.mjs';
import { TABELAS_DV } from './gerado.mjs';
import { dvArremesso } from './arremesso-regras.mjs';
import { MUNICAO_SEM_DANO } from './regras.mjs';

export const podeArremessar = arma => arma?.type === 'arma' && !arma.system.aDistancia
  && ['lightMelee', 'medMelee', 'heavyMelee', 'vHeavyMelee'].includes(arma.system.tipo)
  && !arma.system.instaladoEm && !arma.getFlag(SISTEMA, 'armaVeicular');

// CORE, modules/item/mixins/cpr-attackable.js:95–102: a Thrown Weapon também usa DEX.
export const ehArremesso = (arma, pedido = null) => arma?.system.tipo === 'thrownWeapon' || (pedido === 'arremesso' && podeArremessar(arma));
export const dvDoArremesso = metros => dvArremesso(metros, TABELAS_DV['DV Grenade Launcher']);
export const ignorarNoArremesso = (arma, pedido) => pedido?.arremesso ? 0 : arma.system.ignorarArmadura;

// Dano manual parte do cartão deste ataque: o botão Dano comum da ficha continua sendo o golpe da arma.
export async function rolarDanoDoArremesso(mensagem) {
  const ataque = mensagem.getFlag(SISTEMA, 'ataque');
  if (!game.user.isGM || !ataque?.arremesso || !ataque.linhas.some(l => l.resultado === 'acertou')) return null;
  const arma = await fromUuid(mensagem.getFlag(SISTEMA, 'armaDoArremesso'));
  if (!arma?.actor || !ehArremesso(arma, 'arremesso')) { ui.notifications.warn('A arma deste arremesso não está mais disponível.'); return null; }
  if (MUNICAO_SEM_DANO[arma.municaoCarregada?.system.efeito]) { ui.notifications.warn('Esta munição aplica seu efeito, sem rolar o dano da arma.'); return null; }
  return arma.rolarDano({ arremesso: true, modoDoArremesso: ataque.modo });
}
