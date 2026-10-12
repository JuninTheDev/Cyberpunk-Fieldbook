// A iniciativa (REF + 1d10, p. 168) com os situacionais, como o CORE: quem tem um situacional de iniciativa (o
// Sandevistan, ligado por padrão) vê a janela de rolagem ao rolar, no computador de quem rola; sem a janela (ou com
// "Rolar direto"), entram os ligados por padrão. A Sorte da janela entra na rolagem e sai da Sorte do ator.
import { config } from './configuracoes.mjs';
import { perguntarTeste } from './janela-rolagem.mjs';

// A escolha da janela de cada combatente, de rollInitiative até a rolagem dele.
const escolhas = new WeakMap();
const termo = valor => `${valor < 0 ? '-' : '+'} ${Math.abs(valor)}`;

export class CombatenteCPR extends Combatant {
  getInitiativeRoll(formula) {
    const ator = this.actor;
    const escolha = escolhas.get(this);
    escolhas.delete(this);
    const extras = escolha?.partes ?? ator?.situacionaisDaIniciativa?.().filter(situacional => situacional.ligado) ?? [];
    const valores = [...extras.map(parte => parte.valor), escolha?.sorte ?? 0].filter(Boolean);
    return foundry.dice.Roll.create([formula || this._getInitiativeFormula(), ...valores.map(termo)].join(' '), ator?.getRollData() || {});
  }
}

export class CombateCPR extends Combat {
  async rollInitiative(ids, opcoes = {}) {
    const lista = [];
    for (const id of typeof ids === 'string' ? [ids] : ids) {
      const combatente = this.combatants.get(id);
      const ator = combatente?.actor;
      const situacionais = combatente?.isOwner ? ator?.situacionaisDaIniciativa?.() ?? [] : [];
      if (situacionais.length && !config('rolarDireto')) {
        const escolha = await perguntarTeste(ator, { rotulo: `Iniciativa de ${combatente.name}`, partes: ator.partesDaIniciativa(), situacionais });
        if (!escolha) continue;
        if (escolha.sorte) await ator.gastarSorte(escolha.sorte);
        escolhas.set(combatente, escolha);
      }
      lista.push(id);
    }
    return lista.length ? super.rollInitiative(lista, opcoes) : this;
  }
}
