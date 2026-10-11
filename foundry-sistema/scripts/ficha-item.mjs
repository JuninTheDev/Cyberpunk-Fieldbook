// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e os efeitos que o item dá. Nos efeitos ligados
// à mão (droga, equipamento como a lanterna), um botão liga e desliga.
import { ATIVACOES, caminho, ESTILOS_ROUPA, QUALIDADES, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { PERICIAS } from './gerado.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
// As opções de um select com o valor atual garantido. Um valor fora da lista (de outro conteúdo, de uma versão antiga)
// apareceria como a primeira opção, e a ficha a gravaria ao salvar qualquer outro campo.
const comAtual = (opcoes, atual) => (atual && !(atual in opcoes) ? { ...opcoes, [atual]: atual } : opcoes);
// Os efeitos que se ligam à mão: os da droga e os do equipamento de ativação manual.
const ligaAMao = item => item.type === 'droga' || (item.type === 'equipamento' && item.system.ativacao === 'manual');

export class FichaItem extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'ficha-item'],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { alternarEfeito: FichaItem.#alternarEfeito }
  };

  static PARTS = {
    ficha: { template: caminho('templates/item.hbs'), scrollable: [''] }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const item = this.item;
    const fonte = item._source.system;
    const tipo = item.type;
    return Object.assign(contexto, {
      item, sistema: item.system, fonte, editavel: this.isEditable,
      eh: Object.fromEntries(['arma', 'armadura', 'municao', 'cyberware', 'lesao', 'equipamento', 'roupa', 'droga'].map(t => [t, tipo === t])),
      inventario: 'uso' in fonte,
      locaisLesao: comAtual({ corpo: 'Corpo', cabeca: 'Cabeça' }, tipo === 'lesao' && fonte.local),
      pericias: comAtual(Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])), tipo === 'arma' && fonte.pericia),
      qualidades: comAtual(QUALIDADES, tipo === 'arma' && fonte.qualidade),
      tiposCyberware: comAtual(TIPOS_CYBERWARE, tipo === 'cyberware' && fonte.tipo),
      usos: USOS,
      ativacoes: ATIVACOES,
      tiposRoupa: comAtual(TIPOS_ROUPA, tipo === 'roupa' && fonte.tipo),
      estilosRoupa: comAtual(ESTILOS_ROUPA, tipo === 'roupa' && fonte.estilo),
      efeitos: item.effects.map(efeito => ({
        id: efeito.id, nome: efeito.name, ativo: efeito.active, desligado: efeito.disabled, ligavel: ligaAMao(item),
        mudancas: efeito.system.changes.map(c => `${c.key.replace(/^system\./, '')} ${c.type === 'add' ? '+' : c.type} ${c.value}`).join(' · ')
      })),
      descricaoRica: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.descricao, { relativeTo: item })
    });
  }

  // Liga ou desliga um efeito do item (o principal da droga quando alguém a usa, por exemplo).
  static #alternarEfeito(evento, alvo) {
    const efeito = this.item.effects.get(alvo.dataset.efeito);
    return efeito?.update({ disabled: !efeito.disabled });
  }
}
