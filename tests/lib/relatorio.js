// O relatório dos testes com navegador (tests/rodar.js): os passos de cada cenário e o código de saída da rodada.
// Um passo pulado (o Foundry 14 que não está no PC, a mesa do servidor em uso ou que não se sabe se está) não é um passo
// aprovado: o resultado diz que a rodada não vale como portão, e o código de saída é 2 (o C54, da auditoria de
// 2026-11-16; antes, o pulo saía como ✓ e "Tudo certo", com o código 0). PERMITIR_PULAR=1 sai com 0 mesmo assim.

// prazoMs: o tempo de um passo (o C60, da auditoria de 2026-11-16). O passo que não termina (uma janela que espera para
// sempre, um evaluate preso) vira falha, e a rodada segue, em vez de parar sem relatório. 0: sem prazo.
// soPassos: uma expressão regular (SO_PASSOS) com os passos que rodam; os outros ficam pulados, e a rodada não vale como
// portão (o C104). É para quem mexe num passo do G4 não esperar a rodada inteira; o passo que dependa de um pulado falha.
class Relatorio {
  constructor({ prazoMs = 0, soPassos = process.env.SO_PASSOS || '' } = {}) { this.itens = []; this.prazoMs = prazoMs; this.soPassos = soPassos ? new RegExp(soPassos, 'i') : null; }
  // fn devolve [ok, detalhe]; um erro conta como falha, com a mensagem.
  async passo(nome, fn) {
    if (this.soPassos && !this.soPassos.test(nome)) return this.pular(nome, 'fora do SO_PASSOS');
    const inicio = Date.now();
    if (process.env.SONDA_TEMPOS) require('fs').appendFileSync(process.env.SONDA_TEMPOS, JSON.stringify({ t: inicio, passo: nome.slice(0, 90) }) + '\n');
    let relogio = null;
    try {
      const prazo = this.prazoMs > 0 ? new Promise((_, rejeitar) => {
        relogio = setTimeout(() => rejeitar(new Error(`o passo passou de ${Math.round(this.prazoMs / 1000)} s sem terminar (PASSO_MS)`)), this.prazoMs);
      }) : null;
      const [ok, detalhe = ''] = await (prazo ? Promise.race([fn(), prazo]) : fn());
      this.itens.push({ nome, ok: Boolean(ok), detalhe: String(detalhe), ms: Date.now() - inicio });
    } catch (error) {
      this.itens.push({ nome, ok: false, detalhe: `erro: ${error.message}`, ms: Date.now() - inicio });
    } finally {
      clearTimeout(relogio);
    }
  }
  // A parte do cenário que não rodou, e por quê: não é falha, mas também não é aprovação.
  pular(nome, motivo = '') {
    this.itens.push({ nome, ok: true, pulado: true, detalhe: String(motivo), ms: 0 });
  }
}

// 1 com alguma falha; 2 com algum passo pulado (a não ser com permitirPular); 0 com tudo rodado e certo.
function codigoDeSaida({ falhas = 0, pulados = 0, permitirPular = false } = {}) {
  if (falhas) return 1;
  if (pulados && !permitirPular) return 2;
  return 0;
}

// A última linha da rodada.
function resumo({ falhas = 0, pulados = 0, permitirPular = false } = {}) {
  if (falhas) return `${falhas} checagem(ns) falharam.${pulados ? ` E ${pulados} parte(s) pulada(s).` : ''}`;
  if (pulados) return `${pulados} parte(s) pulada(s): o resto passou, mas a rodada NÃO vale como portão${permitirPular ? ' (PERMITIR_PULAR=1: sai com 0)' : ' (sai com o código 2)'}.`;
  return 'Tudo certo.';
}

module.exports = { Relatorio, codigoDeSaida, resumo };
