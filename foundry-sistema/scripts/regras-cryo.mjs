// O Cryopump e o Cryotank, sem Foundry (o C41, parte 4; a wiki, system-catalog.js:218-228, "Equipamento médico", e o
// "Criossistema do Medtech, por Rank"). Só o Medtech opera. O Cryopump: uma Ação põe o alvo (que aceita ou está
// inconsciente) em estase na bolsa, gastando 1 carga; por até uma semana, sem Death Saves enquanto a bolsa tiver 1 HP ou
// mais; a bolsa vale como cobertura de 15 HP (dá para operar através dela); a recarga é 50eb por carga. O Cryotank: com
// Tecnologia Médica DV13, mantém 1 pessoa em estase pelo tempo que quiser, curando no dobro do ritmo; vale como cobertura
// de 30 HP. Os pontos do Medtech em Criossistemas (a especialidade "Medical Tech (Cryosystem Operation)"): no 4, o Cryopump
// passa a 2 cargas e 2 pessoas; no 5, a 3 cargas. Decisão do usuário (2026-10-25): a estase completa, com as cargas e a
// cobertura. A cobertura segue a regra da wiki (p. 182–183, como o escudo e o vidro): ela leva o dano antes, a sobra se
// perde, e só o explosivo que a destrói passa inteiro.

export const COBERTURA_DA_ESTASE = { cryopump: 15, cryotank: 30 };
export const NOME_DO_DISPOSITIVO = { cryopump: 'Cryopump', cryotank: 'Cryotank' };
export const DV_DO_CRYOTANK = 13;
export const RECARGA_DO_CRYOPUMP = 50;
export const ESPECIALIDADE_CRIOSSISTEMAS = 'Medical Tech (Cryosystem Operation)';

// O dispositivo pelo id do catálogo (core_gear:cryopump, core_gear:cryotank) ou pelo nome.
export function dispositivoCryo(nome, catalogo = '') {
  const doCatalogo = /^core_gear:(cryopump|cryotank)$/.exec(catalogo)?.[1];
  if (doCatalogo) return doCatalogo;
  const texto = String(nome ?? '').trim().toLowerCase();
  return texto === 'cryopump' ? 'cryopump' : texto === 'cryotank' ? 'cryotank' : null;
}

// Os pontos em Criossistemas da Role (a principal ou a segunda), o maior.
export const pontosDeCriossistemas = sistema => Math.max(0, ...['role', 'roleSecundaria']
  .map(chave => Math.trunc(Number(sistema?.[chave]?.habilidades?.[ESPECIALIDADE_CRIOSSISTEMAS]) || 0)));

// O Cryopump pelos pontos: as cargas e as pessoas ao mesmo tempo.
export const capacidadeDoCryopump = pontos => ({ cargas: pontos >= 5 ? 3 : pontos >= 4 ? 2 : 1, pessoas: pontos >= 4 ? 2 : 1 });

// As cargas de agora: as guardadas no item (sem elas, cheio), nunca acima da capacidade.
export function cargasDoCryopump(guardadas, pontos) {
  const { cargas } = capacidadeDoCryopump(pontos);
  return guardadas === undefined || guardadas === null ? cargas : Math.max(0, Math.min(cargas, Math.trunc(Number(guardadas) || 0)));
}

// O plano de pôr alguém em estase. tipo: 'cryopump' ou 'cryotank'; ocupados: quantos já estão nele; no Cryopump vazio,
// recarregar enche (50eb por carga, do dinheiro do Medtech) antes de gastar a carga.
// cargas: as guardadas no item (sem elas, o Cryopump está cheio).
export function planoDaEstase({ tipo, cargas, pontos = 0, ocupados = 0, recarregar = false, dinheiro = 0 }) {
  if (!Object.hasOwn(COBERTURA_DA_ESTASE, tipo)) return { erro: 'Escolha o Cryopump ou o Cryotank.' };
  const hp = COBERTURA_DA_ESTASE[tipo];
  if (tipo === 'cryotank') {
    if (ocupados >= 1) return { erro: 'O Cryotank já tem alguém em estase (cabe 1 pessoa).' };
    return { tipo, hp, rola: true, dv: DV_DO_CRYOTANK, recarga: 0, cargasDepois: null };
  }
  const capacidade = capacidadeDoCryopump(pontos);
  if (ocupados >= capacidade.pessoas) return { erro: `O Cryopump já tem ${ocupados} ${ocupados === 1 ? 'pessoa' : 'pessoas'} em estase (cabe${capacidade.pessoas === 1 ? '' : 'm'} ${capacidade.pessoas}).` };
  const atual = cargasDoCryopump(cargas, pontos);
  const faltam = atual < 1 && recarregar ? capacidade.cargas - atual : 0;
  const recarga = faltam * RECARGA_DO_CRYOPUMP;
  if (atual < 1 && !recarregar) return { erro: 'O Cryopump está sem carga: recarregue (50eb por carga).' };
  if (recarga > (Number(dinheiro) || 0)) return { erro: `Dinheiro insuficiente para a recarga: tem ${Number(dinheiro) || 0}eb, e ${faltam} ${faltam === 1 ? 'carga custa' : 'cargas custam'} ${recarga}eb.` };
  return { tipo, hp, rola: false, dv: null, recarga, recarregadas: faltam, cargasDepois: atual + faltam - 1 };
}

// O Cryotank precisa superar a DV13 (p. 128): o empate falha.
export const estaseDeuCerto = total => Number(total) > DV_DO_CRYOTANK;

// Sem Death Saves enquanto a bolsa (ou o tanque) tiver 1 HP ou mais.
export const estaseProtege = estase => Number(estase?.hp) >= 1;

// A cobertura da estase leva o dano antes: o que ela segura e o HP dela depois; o dano passa só se for explosivo e a
// destruir (aí, inteiro).
export function coberturaDaEstase({ hp, dano, explosivo = false }) {
  const absorveu = Math.min(Math.max(0, Number(dano) || 0), Math.max(0, Number(hp) || 0));
  const depois = Math.max(0, Number(hp) || 0) - absorveu;
  return { absorveu, hp: depois, passa: explosivo && depois === 0 };
}

// O descanso no Cryotank cura no dobro do ritmo (multiplica o que o descanso já dá).
export const multiplicadorDaCura = estase => (estase?.tipo === 'cryotank' && estaseProtege(estase) ? 2 : 1);
