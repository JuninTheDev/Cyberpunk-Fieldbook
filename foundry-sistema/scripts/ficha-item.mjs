// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e os efeitos que o item dá. Nos efeitos ligados
// à mão (droga, equipamento como a lanterna), um botão liga e desliga.
import { ALVOS_UPGRADE, ATIVACOES, caminho, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, ESTILOS_ROUPA, QUALIDADES, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { PERICIAS } from './gerado.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
// As opções de um select com o valor atual garantido. Um valor fora da lista (de outro conteúdo, de uma versão antiga)
// apareceria como a primeira opção, e a ficha a gravaria ao salvar qualquer outro campo.
const comAtual = (opcoes, atual) => (atual && !(atual in opcoes) ? { ...opcoes, [atual]: atual } : opcoes);
// Os efeitos que se ligam à mão: os da droga e os do equipamento de ativação manual.
const ligaAMao = item => item.type === 'droga' || (item.type === 'equipamento' && item.system.ativacao === 'manual');

// O alto da ficha, como a maquete "Item Sheets" do usuário: o resumo (o que o item é) e as etiquetas (o estado dele; as
// cheias são as que valem agora: equipado, vestido, instalado, ativo).
function cabecalhoDoItem(item) {
  const s = item.system;
  const nomeDaPericia = id => PERICIAS.find(p => p.id === id)?.nome ?? id;
  const cheia = texto => ({ texto, classe: 'cheia' });
  const vazada = texto => ({ texto, classe: '' });
  const sp = local => (s.sp?.[local]?.max ? `${local === 'cabeca' ? 'cabeça' : 'corpo'} ${s.sp[local].value}/${s.sp[local].max}` : '');
  const porTipo = {
    arma: () => [[nomeDaPericia(s.pericia), s.aDistancia ? 'à distância' : 'corpo a corpo'], [QUALIDADES[s.qualidade] && vazada(QUALIDADES[s.qualidade]), s.equipada && cheia('EQUIPADA')]],
    armadura: () => [['SP', sp('cabeca'), sp('corpo')], [s.equipada && cheia('VESTIDA'), vazada(s.penalidade ? `PENALIDADE ${s.penalidade}` : 'SEM PENALIDADE')]],
    municao: () => [[s.tipo, `${s.quantidade} tiros`], []],
    cyberware: () => [[TIPOS_CYBERWARE[s.tipo] ?? s.tipo, s.perdaHumanidade?.formula && `Humanidade ${s.perdaHumanidade.formula}`], [s.instalado && cheia('INSTALADO'), s.fundacional && vazada('FUNDACIONAL')]],
    lesao: () => [['Lesão crítica', s.local === 'cabeca' ? 'cabeça' : 'corpo'], [cheia('ATIVA')]],
    programa: () => [[CLASSES_PROGRAMA[s.classe] ?? s.classe, item.instaladoNo ? `no ${item.instaladoNo.name}` : 'fora do deck'], [s.ativo && cheia('ATIVO')]],
    cyberdeck: () => [[`${item.slotsUsados} de ${s.slots} slots`, QUALIDADES[s.qualidade]], []],
    roupa: () => [[TIPOS_ROUPA[s.tipo] ?? s.tipo, ESTILOS_ROUPA[s.estilo] ?? s.estilo], []],
    equipamento: () => [[], [s.eletronico && vazada('ELETRÔNICO'), s.ocultavel && vazada('OCULTÁVEL')]],
    upgrade: () => [[`para ${(ALVOS_UPGRADE[s.alvo] ?? s.alvo).toLowerCase()}`, item.instaladoNo ? `em ${item.instaladoNo.name}` : 'não instalado'], []],
    veiculo: () => [[`SDP ${s.sdp?.value}/${s.sdp?.max}`, `${s.assentos} assentos`], [s.familia && vazada('DA FAMÍLIA')]]
  };
  const [resumo, etiquetas] = porTipo[item.type]?.() ?? [[], []];
  if ('uso' in s && USOS[s.uso]) etiquetas.push(s.uso === 'equipado' ? cheia(USOS[s.uso].toUpperCase()) : vazada(USOS[s.uso].toUpperCase()));
  return { resumo: resumo.filter(Boolean).join(' // '), etiquetas: etiquetas.filter(Boolean) };
}

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
    ficha: { template: caminho('templates/item.hbs'), scrollable: ['.tab'] }
  };

  // As abas da ficha (a maquete): os campos, a descrição e os efeitos.
  static TABS = {
    item: { tabs: [{ id: 'detalhes', label: 'Detalhes' }, { id: 'descricao', label: 'Descrição' }, { id: 'efeitos', label: 'Efeitos' }], initial: 'detalhes' }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const item = this.item;
    const fonte = item._source.system;
    const tipo = item.type;
    const tipoDoLugar = tipo === 'programa' ? 'cyberdeck' : tipo === 'upgrade' ? fonte.alvo : null;
    return Object.assign(contexto, {
      item, sistema: item.system, fonte, editavel: this.isEditable, ...cabecalhoDoItem(item),
      tipoRotulo: game.i18n.localize(CONFIG.Item.typeLabels[tipo] ?? tipo),
      usosLista: Object.entries(USOS).map(([id, rotulo]) => ({ id, rotulo, ativo: fonte.uso === id })),
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
      // O Black ICE próprio do netrunner: o tipo, PER e SPD.
      blackIce: tipo === 'programa' && fonte.classe === 'blackice', classesDoIce: CLASSES_BLACK_ICE,
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
