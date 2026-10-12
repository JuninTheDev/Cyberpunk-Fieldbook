// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e os efeitos que o item dá. Nos efeitos ligados
// à mão (droga, equipamento como a lanterna), um botão liga e desliga.
import { ALVOS_UPGRADE, ATIVACOES, caminho, CLASSES_PROGRAMA, ESTILOS_ROUPA, QUALIDADES, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
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
    // O tema escuro da ficha do personagem (styles/tema.css), qualquer que seja o da interface.
    classes: [SISTEMA, 'ficha-item', 'themed', 'theme-dark'],
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
    const tipoDoLugar = tipo === 'programa' ? 'cyberdeck' : tipo === 'upgrade' ? fonte.alvo : null;
    return Object.assign(contexto, {
      item, sistema: item.system, fonte, editavel: this.isEditable,
      eh: Object.fromEntries(['arma', 'armadura', 'municao', 'cyberware', 'lesao', 'equipamento', 'roupa', 'droga', 'cyberdeck', 'programa', 'upgrade', 'veiculo'].map(t => [t, tipo === t])),
      temQuantidade: tipo !== 'municao' && 'quantidade' in fonte,
      temUso: 'uso' in fonte,
      locaisLesao: comAtual({ corpo: 'Corpo', cabeca: 'Cabeça' }, tipo === 'lesao' && fonte.local),
      pericias: comAtual(Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])), tipo === 'arma' && fonte.pericia),
      qualidades: comAtual(QUALIDADES, (tipo === 'arma' || tipo === 'cyberdeck') && fonte.qualidade),
      tiposCyberware: comAtual(TIPOS_CYBERWARE, tipo === 'cyberware' && fonte.tipo),
      usos: USOS,
      ativacoes: ATIVACOES,
      tiposRoupa: comAtual(TIPOS_ROUPA, tipo === 'roupa' && fonte.tipo),
      estilosRoupa: comAtual(ESTILOS_ROUPA, tipo === 'roupa' && fonte.estilo),
      classesPrograma: comAtual(CLASSES_PROGRAMA, tipo === 'programa' && fonte.classe),
      alvosUpgrade: comAtual(ALVOS_UPGRADE, tipo === 'upgrade' && fonte.alvo),
      // Onde o programa ou o upgrade pode ser instalado: os itens do tipo certo no mesmo ator. Um lugar que não existe mais
      // conta como não instalado.
      lugares: { '': tipo === 'programa' ? 'Fora do deck' : 'Não instalado', ...Object.fromEntries((item.actor?.items.filter(i => i.type === tipoDoLugar) ?? []).map(i => [i.id, i.name])) },
      lugarAtual: tipoDoLugar && item.instaladoNo?.type === tipoDoLugar ? item.instaladoNo.id : '',
      instalados: item.instalados.map(i => i.name).join(', '),
      slotsUsados: item.slotsUsados,
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
