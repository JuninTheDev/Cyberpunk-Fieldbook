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

// ---------------- Os veículos fora do dano (o C40) ----------------
// A wiki, system-rules.js:538 ("Veículos", p. 189–192). O CORE 0.92.4 não automatiza a direção, as manobras nem a
// batida; a janela, os cartões e os turnos ficam em direcao.mjs e perigos.mjs.
export const PAGINA_DOS_VEICULOS = 'p. 189–192';

// O tipo do veículo (o campo system.tipo do item): '' é "pelo nome".
export const TIPOS_DE_VEICULO = { '': 'Pelo nome', terrestre: 'Terrestre', aereo: 'Aéreo', maritimo: 'Marítimo' };
// Os 14 veículos do CORE pelo nome em inglês (core_vehicles, RED p. 190–191).
const PELO_NOME = {
  roadbike: 'terrestre', superbike: 'terrestre', 'compact groundcar': 'terrestre', 'high performance groundcar': 'terrestre', 'super groundcar': 'terrestre',
  jetski: 'maritimo', speedboat: 'maritimo', 'cabin cruiser': 'maritimo', yacht: 'maritimo',
  gyrocopter: 'aereo', helicopter: 'aereo', 'av-4 multipurpose aerodyne': 'aereo', 'av-9 super aerodyne': 'aereo', aerozep: 'aereo'
};
// O campo, se escolhido; vazio, o nome de um dos 14 do CORE (sem diferença de maiúsculas nem de espaços nas pontas); sem
// nada, terrestre.
export function tipoDoVeiculo({ tipo = '', nome = '' } = {}) {
  if (tipo && Object.hasOwn(TIPOS_DE_VEICULO, tipo)) return tipo;
  const chave = String(nome ?? '').trim().toLowerCase();
  return Object.hasOwn(PELO_NOME, chave) ? PELO_NOME[chave] : 'terrestre';
}

// A perícia de controle pelo tipo: Conduzir Veículo Terrestre, Pilotar Veículo Aéreo, Pilotar Veículo Marítimo.
const PERICIA_DO_CONTROLE = { terrestre: 'drive-land-vehicle', aereo: 'pilot-air-vehicle', maritimo: 'pilot-sea-vehicle' };
export const periciaDoControle = tipo => (Object.hasOwn(PERICIA_DO_CONTROLE, tipo) ? PERICIA_DO_CONTROLE[tipo] : PERICIA_DO_CONTROLE.terrestre);

// Direção básica: REF + perícia de controle maior que 9, não gasta a Ação (nem rola); senão, gasta a Ação e rola DV10 todo
// turno (falhar é perder o controle).
export const LIMITE_DA_DIRECAO = 9;
export const DV_DA_DIRECAO = 10;
export const direcaoSobPressao = soma => ({ rola: !(Number(soma) > LIMITE_DA_DIRECAO), dv: DV_DA_DIRECAO });

// As manobras (usam a Ação e a Ação de Movimento; falhar é perder o controle), na ordem da tabela da wiki. aereo: só para
// o veículo aéreo.
export const MANOBRAS = {
  desviar: { nome: 'Desviar', dv: 13, aereo: false },
  curvaFechada: { nome: 'Curva fechada', dv: 13, aereo: false },
  paradaDeEmergencia: { nome: 'Parada de emergência', dv: 13, aereo: false },
  cavaloDePau: { nome: 'Cavalo de pau', dv: 17, aereo: false },
  salto: { nome: 'Salto', dv: 17, aereo: false },
  pouso: { nome: 'Pouso', dv: 13, aereo: true },
  acrobacia: { nome: 'Acrobacia', dv: 17, aereo: true }
};
export const manobrasDo = tipo => Object.entries(MANOBRAS).filter(([, m]) => !m.aereo || tipo === 'aereo').map(([id, m]) => ({ id, nome: m.nome, dv: m.dv }));

// A batida: 6d6 no veículo e no que foi atingido, e o Traumatismo Cervical em todos os envolvidos. Quem está a pé desvia
// com DEX + Evasão + 1d10 contra DV13 (o veículo não se esquiva).
export const DANO_DA_BATIDA = '6d6';
export const LESAO_DA_BATIDA = 'core_critical-injuries-head:whiplash';
export const PERICIA_DE_DESVIAR = 'evasion';
export const DV_DESVIAR_A_PE = 13;
