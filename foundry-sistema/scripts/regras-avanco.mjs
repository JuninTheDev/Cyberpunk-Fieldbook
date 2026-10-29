// Gastar IP: system-rules.js:242–245 (a tabela de níveis/Ranks 1–10) e :712 (p. 411).
// Compra um nível por vez; o tempo no nível novo, sem duração definida na wiki, fica com o mestre.
export function avancoComIp({ tipo = 'pericia', nivel = 0, nivelNovo = nivel + 1, dificil = false, saldo = 0 } = {}) {
  if (!['pericia', 'role'].includes(tipo)) return { ok: false, motivo: 'Escolha uma perícia ou uma Role.' };
  if (!Number.isInteger(nivel) || nivel < 0 || nivel > 10 || !Number.isInteger(nivelNovo)) return { ok: false, motivo: 'O nível precisa ser um inteiro de 0 a 10.' };
  if (nivel === 10 || nivelNovo > 10) return { ok: false, motivo: 'O nível ou Rank máximo é 10.' };
  if (nivelNovo !== nivel + 1) return { ok: false, motivo: 'Compre um nível por vez.' };
  if (!Number.isSafeInteger(saldo)) return { ok: false, motivo: 'O saldo de IP precisa ser um inteiro.' };
  const custo = (tipo === 'role' ? 60 : dificil ? 40 : 20) * nivelNovo;
  if (saldo < custo) return { ok: false, custo, saldo, motivo: `IP insuficiente: custa ${custo} IP; você tem ${saldo}.` };
  return { ok: true, nivel, nivelNovo, custo, saldo: saldo - custo };
}
