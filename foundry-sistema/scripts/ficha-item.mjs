// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e, no cyberware, os efeitos que ele dá.
import { caminho, QUALIDADES, SISTEMA, TIPOS_CYBERWARE } from './config.mjs';
import { PERICIAS } from './gerado.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class FichaItem extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'ficha-item'],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    ficha: { template: caminho('templates/item.hbs'), scrollable: [''] }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const item = this.item;
    return Object.assign(contexto, {
      item, sistema: item.system, fonte: item._source.system, editavel: this.isEditable,
      eh: { arma: item.type === 'arma', armadura: item.type === 'armadura', municao: item.type === 'municao', cyberware: item.type === 'cyberware', lesao: item.type === 'lesao' },
      locaisLesao: { corpo: 'Corpo', cabeca: 'Cabeça' },
      pericias: Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])),
      qualidades: QUALIDADES,
      tiposCyberware: TIPOS_CYBERWARE,
      efeitos: item.effects.map(efeito => ({ nome: efeito.name, mudancas: efeito.system.changes.map(c => `${c.key.replace(/^system\./, '')} ${c.type === 'add' ? '+' : c.type} ${c.value}`).join(' · '), ativo: efeito.active })),
      descricaoRica: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.descricao, { relativeTo: item })
    });
  }
}
