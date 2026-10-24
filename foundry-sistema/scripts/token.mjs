// O getBarAttribute do Foundry 14 traduz o SP derivado (sp/max) para o formato das barras (value/max).
// O valor vem do ator deste token, inclusive no capanga solto; nenhuma cópia de SP é gravada no ator.
import { BARRAS_SP } from './barras-sp.mjs';

export class TokenCPR extends foundry.documents.TokenDocument {
  getBarAttribute(nome, opcoes = {}) {
    const atributo = opcoes.alternative ?? this[nome]?.attribute;
    const local = BARRAS_SP[atributo];
    if (!Object.hasOwn(BARRAS_SP, atributo)) return super.getBarAttribute(nome, opcoes);
    if (!['personagem', 'capanga'].includes(this.actor?.type)) return null;
    const { sp, max } = this.actor.system.armadura[local];
    return { attribute: atributo, type: 'bar', value: sp, max, editable: this.actor.isOwner };
  }
}

// Conserva os atributos que o Foundry descobre pelo modelo e acrescenta as duas barras derivadas à configuração
// do personagem e do capanga. HP, Humanidade, Sorte e os atributos numéricos continuam disponíveis.
export function registrarBarrasDeSp() {
  CONFIG.Token.documentClass = TokenCPR;
  for (const tipo of ['personagem', 'capanga']) {
    const atributos = TokenCPR.getTrackedAttributes(tipo);
    const caminho = partes => Array.isArray(partes) ? partes.join('.') : partes;
    CONFIG.Actor.trackableAttributes[tipo] = {
      bar: [...new Set([...atributos.bar.map(caminho), ...Object.keys(BARRAS_SP)])],
      value: atributos.value.map(caminho)
    };
  }
}
