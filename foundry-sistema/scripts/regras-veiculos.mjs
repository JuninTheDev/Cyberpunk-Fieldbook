// Regras dos veículos sem Foundry. A lista contém apenas os upgrades instalados no veículo escolhido.
import { aplicarDano } from './regras.mjs';
// Wiki, system-criacao.js, RED p. 163: vidro blindado tem 15 HP; a segunda instalação o leva a 30 HP.
// CORE 0.92.4, Armored Chassis: SP 13 no veículo, sem afetar o vidro. Bulletproof Glass: cada janela perde HP à parte.
export function protecoesDoVeiculo(upgrades = []) {
  let vidros = 0;
  let sp = 0;
  for (const upgrade of upgrades) {
    const catalogo = upgrade.flags?.['cpr-fieldbook']?.catalogo;
    const nome = String(upgrade.name ?? '').trim().toLowerCase();
    if (catalogo === 'core_upgrades:bulletproof-glass' || (!catalogo && nome === 'bulletproof glass')) vidros += 1;
    if (catalogo === 'core_upgrades:armored-chassis' || (!catalogo && nome === 'armored chassis')) sp = 13;
  }
  return { sp, vidro: 15 * Math.min(vidros, 2) };
}

// Wiki, system-rules.js, Cobertura (p. 182–183): a sobra se perde, exceto nos explosivos.
// Explosivos (p. 174): se a cobertura for destruída, o dano total alcança quem estava atrás dela.
// O resultado diz se o ataque passa pelo vidro; o dano e a armadura do ocupante são resolvidos pelo chamador.
export function danoNoVidro({ hp, dano, explosivo = false }) {
  const antes = Math.max(0, Number(hp) || 0);
  const perdeu = Math.min(antes, Math.max(0, Number(dano) || 0));
  const depois = antes - perdeu;
  return { antes, depois, perdeu, passou: antes === 0 || (explosivo && depois === 0) };
}

// Decisão do usuário, 2026-10-18: dano − SP e ablação normal da munição ao atravessar. O SDP não recebe +5 nem lesão.
// Armas que ignoram SP conservam a conta geral do sistema; SDP nunca fica negativo.
export function danoNoVeiculo({ sdp, dano, sp = 0, ignorarPct = 0, ignorarAbaixo = 0, ablacao = 1 }) {
  const antes = Math.max(0, Number(sdp) || 0);
  const conta = aplicarDano({ dano, sp, ignorarPct, ignorarAbaixo });
  const depois = Math.max(0, antes - conta.recebido);
  return { antes, depois, perdeu: antes - depois, sp, spEfetivo: conta.spEfetivo, passou: conta.passou,
    ablado: conta.ablar ? Math.min(sp, Math.max(0, ablacao)) : 0 };
}

// Wiki, system-rules.js, Cobertura: vidro fino tem 15 HP; grosso, 30. O dano sofrido não muda a espessura.
// system-2077.js, Tech (Kit p. 32): carga atravessa fina sem danificá-la; a Nekomata também atravessa grossa.
export function techAtravessaVidro({ carga = false, grossa = false, max = 0 }) {
  return Boolean(carga && max > 0 && (max <= 15 || grossa));
}
