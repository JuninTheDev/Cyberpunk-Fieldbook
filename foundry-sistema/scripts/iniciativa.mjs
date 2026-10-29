// A iniciativa (REF + 1d10, p. 168) com os situacionais, como o CORE: quem tem um situacional de iniciativa (o
// Sandevistan, ligado por padrão) vê a janela de rolagem ao rolar, no computador de quem rola; sem a janela (ou com
// "Rolar direto"), entram os ligados por padrão. A Sorte da janela entra na rolagem e sai da Sorte do ator. O Black ICE e o
// demônio não rolam: entram no topo da fila (regras.iniciativaNoTopo), cada um acima de quem já está nela.
import { ATORES_DA_NET, SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { perguntarTeste } from './janela-rolagem.mjs';
import { costelasNoFimDoTurno } from './perigos.mjs';
import { formulaDaIniciativa, iniciativaNoTopo, tempoEntreRodadas } from './regras.mjs';
import { AVISO_INICIATIVA_VEICULO, podeEntrarNaIniciativa } from './regras-iniciativa.mjs';
import { metrosAPe } from './regras-lesoes.mjs';

// A escolha da janela de cada combatente, de rollInitiative até a rolagem dele.
const escolhas = new WeakMap();
const termo = valor => `${valor < 0 ? '-' : '+'} ${Math.abs(valor)}`;

const daNet = combatente => ATORES_DA_NET.includes(combatente?.actor?.type);

export class CombatenteCPR extends Combatant {
  // O HUD, o rastreador e Actor.rollInitiative criam Combatants. O _preCreate pode vetar cada um (Foundry 14,
  // client/documents/combatant.mjs:228-232); o resto do lote continua entrando.
  async _preCreate(dados, opcoes, usuario) {
    if (!podeEntrarNaIniciativa(this.actor?.type)) { ui.notifications.info(AVISO_INICIATIVA_VEICULO); return false; }
    return super._preCreate(dados, opcoes, usuario);
  }

  async rollInitiative(formula) {
    if (!podeEntrarNaIniciativa(this.actor?.type)) { ui.notifications.info(AVISO_INICIATIVA_VEICULO); return this; }
    return super.rollInitiative(formula);
  }

  // O Black ICE e o demônio: 1 a mais que a maior iniciativa dos outros (ou 30, sem ninguém na fila). Os outros usam
  // 1d10 + @iniciativa (ou 1d10crit + @iniciativa, com "Iniciativa explode no 10 e no 1?" ligada).
  _getInitiativeFormula() {
    if (!daNet(this)) return formulaDaIniciativa(super._getInitiativeFormula(), config('iniciativaCritica'));
    return String(iniciativaNoTopo(this.parent.combatants.filter(outro => outro.id !== this.id).map(outro => outro.initiative)));
  }

  getInitiativeRoll(formula) {
    const ator = this.actor;
    const escolha = escolhas.get(this);
    escolhas.delete(this);
    const extras = escolha?.partes ?? ator?.situacionaisDaIniciativa?.().filter(situacional => situacional.ligado) ?? [];
    const valores = [...extras.map(parte => parte.valor), escolha?.sorte ?? 0].filter(Boolean);
    const base = formula ? formulaDaIniciativa(formula, !daNet(this) && config('iniciativaCritica')) : this._getInitiativeFormula();
    return foundry.dice.Roll.create([base, ...valores.map(termo)].join(' '), ator?.getRollData() || {});
  }
}

export class CombateCPR extends Combat {
  // O relógio avança no combate; as durações em rodadas dos efeitos continuam em rodadas fora dele.
  getTimeDelta(rodadaAnterior, turnoAnterior, rodadaSeguinte, turnoSeguinte) {
    return tempoEntreRodadas(rodadaAnterior, rodadaSeguinte);
  }

  // O fim de um turno jogado (no mestre ativo; client/documents/combat.mjs, #triggerTurnEvents): os metros a pé do token
  // nele, para as Costelas quebradas (perigos.costelasNoFimDoTurno). Aqui o histórico de movimento ainda é o do turno: o
  // Foundry o zera depois, no começo do turno seguinte (_clearMovementHistoryOnStartTurn). O turno pulado não foi jogado.
  async _onEndTurn(combatente, contexto) {
    await super._onEndTurn(combatente, contexto);
    const token = combatente?.token;
    if (contexto?.skipped || !token?.actor) return;
    const metros = metrosAPe(token.movementHistory ?? [], pontos => token.parent?.grid?.measurePath(pontos).distance ?? 0);
    if (metros > 0) costelasNoFimDoTurno(token.actor, { metros, turno: `${this.id}:${contexto.round}:${contexto.turn}` })
      .catch(erro => console.warn(`${SISTEMA} | Costelas quebradas`, erro));
  }

  async rollInitiative(ids, opcoes = {}) {
    const lista = [];
    for (const id of typeof ids === 'string' ? [ids] : ids) {
      const combatente = this.combatants.get(id);
      const ator = combatente?.actor;
      // Também cobre um combatente salvo antes da recusa, sem impedir a iniciativa dos outros do lote.
      if (!podeEntrarNaIniciativa(ator?.type)) { ui.notifications.info(AVISO_INICIATIVA_VEICULO); continue; }
      const situacionais = combatente?.isOwner ? ator?.situacionaisDaIniciativa?.() ?? [] : [];
      if (situacionais.length && !config('rolarDireto')) {
        const escolha = await perguntarTeste(ator, { rotulo: `Iniciativa de ${combatente.name}`, partes: ator.partesDaIniciativa(), situacionais });
        if (!escolha) continue;
        if (escolha.sorte) await ator.gastarSorte(escolha.sorte);
        escolhas.set(combatente, escolha);
      }
      lista.push(id);
    }
    // O Black ICE e o demônio vão depois dos outros, um de cada vez: cada um entra acima de quem já rolou (o Foundry só
    // grava as iniciativas no fim de cada rollInitiative).
    const naNet = lista.filter(id => daNet(this.combatants.get(id)));
    const outros = lista.filter(id => !naNet.includes(id));
    if (outros.length) await super.rollInitiative(outros, opcoes);
    for (const id of naNet) await super.rollInitiative([id], opcoes);
    return this;
  }
}
