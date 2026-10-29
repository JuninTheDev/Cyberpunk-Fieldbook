// Os modificadores do CORE 0.93 num Die nativo do Foundry 14, inclusive ao reconstruir uma macro ou o chat.
import { danoCriticoConfigurado, parametrosDoDano, resultadoRed, separarModificadores } from './regras-formulas.mjs';

export function registrarDadoRed() {
  const Die = foundry.dice.terms.Die;
  class DadoRED extends Die {
    static MODIFIERS = { ...Die.MODIFIERS, red: 'red', crit: 'red', dmg: 'dmg', ab: 'ab', cd: 'cd' };

    async _evaluateModifiers() {
      this.modifiers = separarModificadores(this.modifiers, this.constructor.MODIFIERS);
      this.temRed = this.modifiers.some(m => /^(red|crit)[0-9]*$/i.test(m));
      const dano = parametrosDoDano(this.modifiers, this.faces);
      this.temDano = Boolean(dano);
      await super._evaluateModifiers();
      // Inspeciona depois de keep/drop e reroll: só os resultados ativos contam para o crítico.
      if (dano) this.options.danoFieldbook = { ...dano, ...danoCriticoConfigurado(this.results.filter(r => r.active).map(r => r.result), dano) };
    }

    // CORE 0.93, rolls/cpr-die-extended.js:255–294. O crit antigo continua como alias de red.
    async red(modificador) {
      const limiar = Number(modificador.match(/[0-9]+$/)?.[0] ?? this.faces);
      for (const resultado of this.results.filter(r => r.active && !r.cprfProcessado)) {
        resultado.cprfProcessado = true;
        const { multiplicadorExtra } = resultadoRed(resultado.result, 0, this.faces, limiar);
        if (!multiplicadorExtra) continue;
        const pai = this.results.indexOf(resultado);
        const extra = await this.roll();
        extra.cprfProcessado = true;
        extra.cprfPai = pai;
        if (multiplicadorExtra > 0) resultado.exploded = true;
        else { extra.count = -extra.result; extra.failure = true; }
      }
    }

    dmg() { /* O marcador é inspecionado depois dos demais modificadores. */ }
    ab(modificador) { this.conferirMarcador(modificador); }
    cd(modificador) { this.conferirMarcador(modificador); }
    conferirMarcador(modificador) {
      if (!this.temDano) ui.notifications.warn(`O modificador ${modificador} só se aplica a um dado com dmg.`);
    }

    // CORE 0.93, cpr-die-extended.js:131–148, :180–250: o extra não explode, não é rerrolado
    // e acompanha o dado original ao manter/descartar. A ordem dos modificadores continua a do Foundry.
    async explode(modificador, opcoes) { if (!this.temRed) return super.explode(modificador, opcoes); }
    async explodeOnce(modificador) { if (!this.temRed) return super.explodeOnce(modificador); }
    async reroll(modificador, opcoes) {
      const extras = this.results.filter(r => r.active && Number.isInteger(r.cprfPai));
      extras.forEach(r => { r.active = false; });
      try { return await super.reroll(modificador, opcoes); }
      finally { extras.forEach(r => { r.active = true; }); }
    }

    agruparExtras(operacao) {
      const grupos = new Map();
      for (const extra of this.results) {
        if (!Number.isInteger(extra.cprfPai)) continue;
        const grupo = grupos.get(extra.cprfPai) ?? [];
        grupo.push(extra);
        grupos.set(extra.cprfPai, grupo);
      }
      const originais = [];
      for (const [indice, extras] of grupos) {
        const pai = this.results[indice];
        originais.push({ pai, extras, valor: pai.result });
        pai.result += extras.reduce((soma, r) => soma + (r.count ?? r.result), 0);
        extras.forEach(r => { r.active = false; });
      }
      try { return operacao(); }
      finally {
        for (const { pai, extras, valor } of originais) {
          pai.result = valor;
          extras.forEach(r => { r.active = pai.active; r.discarded = !pai.active; });
        }
      }
    }
    keep(modificador) { return this.agruparExtras(() => super.keep(modificador)); }
    drop(modificador) { return this.agruparExtras(() => super.drop(modificador)); }
  }
  // DiceTerm.fromData usa termTypes; a denominação d escolhe a classe ao ler uma fórmula nova.
  // Foundry 14, client/dice/terms/term.mjs:183–185.
  CONFIG.Dice.terms.d = DadoRED;
  CONFIG.Dice.termTypes.DadoRED = DadoRED;
  Die.MODIFIERS.crit = DadoRED.prototype.red;
}
