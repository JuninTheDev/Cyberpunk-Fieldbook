// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e os efeitos que o item dá. Nos efeitos ligados
// à mão (droga, equipamento como a lanterna), um botão liga e desliga.
import { ALVOS_UPGRADE, ATIVACOES, caminho, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, ESTILOS_ROUPA, QUALIDADES, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { config } from './configuracoes.mjs';
import { prepararAcessibilidade } from './acessibilidade.mjs';
import { PERICIAS } from './gerado.mjs';
import { ehDesarmada, FALHAS_DA_ARMA, FAMILIA_ARTES_MARCIAIS, ladosDoTipo, nomeDoLado, programaDeAtaque } from './regras.mjs';
import { opcoesDaLesao, tratarLesao, voltouALesao } from './tratamento.mjs';
import { acabouOEfeito, usarDroga } from './drogas.mjs';
import { ARMAS_VEICULARES } from './armas-veiculos.mjs';
import { TIPOS_DE_VEICULO } from './regras-veiculos.mjs';
import { ehArmaDoUpgrade, ehArmaMontadaEmItem, idDaOrigem } from './armas-cyberware.mjs';
import { ligaAMao, resumoDasMudancas } from './regras-efeitos.mjs';

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
// As opções de um select com o valor atual garantido. Um valor fora da lista (de outro conteúdo, de uma versão antiga)
// apareceria como a primeira opção, e a ficha a gravaria ao salvar qualquer outro campo.
const comAtual = (opcoes, atual) => (atual && !(atual in opcoes) ? { ...opcoes, [atual]: atual } : opcoes);
// Os efeitos que se ligam à mão (regras-efeitos.ligaAMao): os da droga e os do equipamento de ativação manual; a aba
// Efeitos da ficha do personagem liga e desliga pela mesma regra.
// As Artes Marciais no seletor da perícia da arma (o C10): a família toda (a forma com mais pontos, como a arma do CORE) e
// as formas do dono.
const opcoesDeArtesMarciais = ator => ({
  [FAMILIA_ARTES_MARCIAIS]: 'Artes Marciais (a forma com mais pontos)',
  ...Object.fromEntries(Object.entries(ator?.system.pericias ?? {}).filter(([, p]) => p.familia === FAMILIA_ARTES_MARCIAIS).map(([id, p]) => [id, `Artes Marciais (${p.nome})`]))
});

// O alto da ficha, como a maquete "Item Sheets" do usuário: o resumo (o que o item é) e as etiquetas (o estado dele; as
// cheias são as que valem agora: equipado, vestido, instalado, ativo).
function cabecalhoDoItem(item) {
  const s = item.system;
  const nomeDaPericia = id => PERICIAS.find(p => p.id === id)?.nome ?? id;
  // A perícia com que a arma ataca: nas Artes Marciais, a forma do dono (o C10).
  const periciaDaArma = () => {
    const id = item.periciaDaArma;
    return id === FAMILIA_ARTES_MARCIAIS ? 'Artes Marciais' : item.actor?.system.pericia?.(id)?.nome || nomeDaPericia(id);
  };
  const cheia = texto => ({ texto, classe: 'cheia' });
  const vazada = texto => ({ texto, classe: '' });
  const sp = local => (s.sp?.[local]?.max ? `${local === 'cabeca' ? 'cabeça' : 'corpo'} ${s.sp[local].value}/${s.sp[local].max}` : '');
  const porTipo = {
    arma: () => [[periciaDaArma(), ehDesarmada(s.tipo) && s.danoPeloBody && item.actor && `${item.danoDaArma} pelo BODY`, s.aDistancia ? 'à distância' : 'corpo a corpo', s.instaladoEm && (item.instaladoNo?.name ?? 'Veículo ausente')], [QUALIDADES[s.qualidade] && vazada(QUALIDADES[s.qualidade]), s.instaladoEm ? cheia('MONTADA') : s.equipada && cheia('EQUIPADA')]],
    armadura: () => [['SP', sp('cabeca'), sp('corpo')], [s.equipada && cheia('VESTIDA'), vazada(s.penalidade ? `PENALIDADE ${s.penalidade}` : 'SEM PENALIDADE')]],
    municao: () => [[s.tipo, `${s.quantidade} tiros`], []],
    // A fundação: os slots usados; a opção: em qual fundação está (no cyberware de um ator).
    cyberware: () => [[TIPOS_CYBERWARE[s.tipo] ?? s.tipo, nomeDoLado(item.ladoDoCyberware), item.noMembroNatural && 'no membro natural', s.perdaHumanidade?.formula && `Humanidade ${s.perdaHumanidade.formula}`, s.fundacional ? `${item.slotsUsados} de ${s.slots} slots` : item.instaladoNo && `na ${item.instaladoNo.name}`],
      [s.instalado && cheia('INSTALADO'), s.fundacional && vazada('FUNDACIONAL'), item.semFundacao && vazada('SEM FUNDAÇÃO')]],
    lesao: () => [['Lesão crítica', s.local === 'cabeca' ? 'cabeça' : 'corpo'], [cheia('ATIVA')]],
    programa: () => [[CLASSES_PROGRAMA[s.classe] ?? s.classe, item.instaladoNo ? `no ${item.instaladoNo.name}` : 'fora do deck'], [s.ativo && cheia('ATIVO')]],
    cyberdeck: () => [[`${item.slotsUsados} de ${s.slots} slots`, QUALIDADES[s.qualidade]], []],
    roupa: () => [[TIPOS_ROUPA[s.tipo] ?? s.tipo, ESTILOS_ROUPA[s.estilo] ?? s.estilo], []],
    equipamento: () => [[], [s.eletronico && vazada('ELETRÔNICO'), s.ocultavel && vazada('OCULTÁVEL')]],
    upgrade: () => [[`para ${(ALVOS_UPGRADE[s.alvo] ?? s.alvo).toLowerCase()}`, item.instaladoNo ? `em ${item.instaladoNo.name}` : 'não instalado'], []],
    veiculo: () => [[`SDP ${s.sdp?.value}/${s.sdp?.max}`, `SP ${s.blindagem.sp}/${s.blindagem.max}`, `${s.assentos} assentos`], [s.familia && vazada('DA FAMÍLIA'), item.actor?.veiculoAtivo?.id === item.id && cheia(item.actor.system.dirigindo ? 'DIRIGINDO' : 'EM USO')]]
  };
  const [resumo, etiquetas] = porTipo[item.type]?.() ?? [[], []];
  if (item.inoperante) etiquetas.push(vazada('INOPERANTE (EMP)'));
  if ('uso' in s && USOS[s.uso]) etiquetas.push(s.uso === 'equipado' ? cheia(USOS[s.uso].toUpperCase()) : vazada(USOS[s.uso].toUpperCase()));
  return { resumo: resumo.filter(Boolean).join(' // '), etiquetas: etiquetas.filter(Boolean) };
}

export class FichaItem extends HandlebarsApplicationMixin(ItemSheetV2) {
  // No contêiner, o jogador só muda os itens com a permissão "Mudar os itens" (o players-modify do CORE); sem ela, a
  // ficha do item abre só para ler.
  get isEditable() {
    const conteiner = this.item.parent?.type === 'conteiner' ? this.item.parent : null;
    if (conteiner && !game.user.isGM && !conteiner.system.permissoes.mudar) return false;
    return super.isEditable;
  }

  // A equipagem recusada pode não gerar diff nem redesenho; a caixa volta ao estado gravado.
  async _processSubmitData(evento, form, dados, opcoes) {
    const resultado = await super._processSubmitData(evento, form, dados, opcoes);
    const caixa = this.element?.querySelector('[name="system.equipada"]');
    if (caixa) caixa.checked = this.item.system.equipada;
    return resultado;
  }

  static DEFAULT_OPTIONS = {
    // O tema escuro da ficha do personagem (styles/tema.css), qualquer que seja o da interface.
    classes: [SISTEMA, 'ficha-item', 'themed', 'theme-dark'],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { alternarEfeito: FichaItem.#alternarEfeito, consertar: FichaItem.#consertar, usar: FichaItem.#usar, rolarHumanidade: FichaItem.#rolarHumanidade,
      atacar: FichaItem.#atacar, recarregar: FichaItem.#recarregar, ablar: FichaItem.#ablar, rodar: FichaItem.#rodar, restaurarRez: FichaItem.#restaurarRez,
      adicionarJanela: FichaItem.#adicionarJanela, removerJanela: FichaItem.#removerJanela, ajustarVidros: FichaItem.#ajustarVidros, prepararArmaVeicular: FichaItem.#prepararArmaVeicular,
      corrigir: FichaItem.#corrigir, tratar: FichaItem.#tratar, voltou: FichaItem.#voltou, usarDroga: FichaItem.#usarDroga, acabouDroga: FichaItem.#acabouDroga
    }
  };

  static PARTS = {
    ficha: { template: caminho('templates/item.hbs'), scrollable: ['.tab'] }
  };

  // As abas da ficha (a maquete): os campos, a descrição e os efeitos.
  static TABS = {
    item: { tabs: [{ id: 'detalhes', label: 'Detalhes' }, { id: 'descricao', label: 'Descrição' }, { id: 'efeitos', label: 'Efeitos' }], initial: 'detalhes' }
  };

  async _onRender(contexto, opcoes) {
    await super._onRender(contexto, opcoes);
    prepararAcessibilidade(this.element);
  }

  // O Foundry troca a classe active; as abas desenhadas aqui também expõem a seleção ao leitor de tela.
  changeTab(aba, grupo, opcoes = {}) {
    super.changeTab(aba, grupo, opcoes);
    for (const controle of this.element.querySelectorAll('.abas-do-item [role="tab"]')) {
      controle.setAttribute('aria-selected', String(controle.classList.contains('active')));
    }
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const item = this.item;
    const fonte = item._source.system;
    const tipo = item.type;
    const tipoDoLugar = tipo === 'programa' ? 'cyberdeck' : tipo === 'upgrade' ? fonte.alvo : null;
    // O lado (o C30): a fundação e a peça solta escolhem; a opção numa fundação fica no lado dela, que a ficha só mostra.
    const naFundacao = tipo === 'cyberware' && !fonte.fundacional && item.instaladoNo?.type === 'cyberware' && item.instaladoNo.system.fundacional;
    const veiculosDaArma = { '': 'Sem montagem', ...Object.fromEntries((item.actor?.items.filter(i => i.type === 'veiculo') ?? []).map(i => [i.id, i.name])) };
    if (tipo === 'arma' && fonte.instaladoEm && !(fonte.instaladoEm in veiculosDaArma)) veiculosDaArma[fonte.instaladoEm] = 'Veículo ausente';
    return Object.assign(contexto, {
      item, sistema: item.system, fonte, editavel: this.isEditable, ...cabecalhoDoItem(item), usavel: item.usavelAMao, emUso: item.emUso,
      temEletronica: 'eletronico' in fonte,
      // A arma de um personagem ataca e recarrega pela ficha dela; a armadura mostra o SP de cada local em caixas.
      armaDeAtor: tipo === 'arma' && Boolean(item.actor),
      armaMontada: tipo === 'arma' && Boolean(fonte.instaladoEm), veiculosDaArma, soAutofogo: Boolean(item.getFlag(SISTEMA, 'armaVeicular')?.soAutofogo),
      // O cyberware e o acessório de arma que são arma (o C11): a arma diz de onde vem; o item, se a arma dele está na ficha.
      armaDe: ehArmaMontadaEmItem(item) ? { rotulo: ehArmaDoUpgrade(item) ? 'Do acessório' : 'Do cyberware', nome: item.instaladoNo?.name ?? 'Item ausente' } : null,
      editaArma: tipo === 'cyberware' || (tipo === 'upgrade' && fonte.alvo === 'arma'),
      periciasDaArma: ['cyberware', 'upgrade'].includes(tipo) ? comAtual(Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])), fonte.arma?.pericia) : null,
      armaNaFicha: ['cyberware', 'upgrade'].includes(tipo) && item.actor?.items.some(outro => idDaOrigem(outro) === item.id)
        ? (tipo === 'upgrade' ? 'Na arma: ataca pela aba Combate, com ela equipada.' : 'Instalado: ataca pela aba Combate.') : '',
      prepararArma: tipo === 'upgrade' && item.instaladoNo?.type === 'veiculo' && Object.hasOwn(ARMAS_VEICULARES, item.getFlag(SISTEMA, 'catalogo')),
      janelas: tipo === 'veiculo' ? Object.entries(fonte.janelas).map(([id, janela]) => ({ id, ...janela })) : [],
      // O tipo do veículo (o C40): "Pelo nome" é o vazio.
      tiposDeVeiculo: comAtual(TIPOS_DE_VEICULO, tipo === 'veiculo' && fonte.tipo),
      drogaDeAtor: tipo === 'droga' && Boolean(item.actor) ? { sobEfeito: Boolean(item.getFlag(SISTEMA, 'sobEfeito')), viciado: Boolean(item.getFlag(SISTEMA, 'viciado')) } : null,
      // A lesão de um personagem: a correção rápida e o tratamento (o que ela permite) e se está corrigida.
      lesaoDeAtor: tipo === 'lesao' && Boolean(item.actor) ? { correcao: opcoesDaLesao(fonte, 'correcao').length > 0, tratamento: opcoesDaLesao(fonte, 'tratamento').length > 0, corrigida: Boolean(item.getFlag(SISTEMA, 'corrigida')) } : null,
      // O programa: liga e desliga num deck (os de ataque, não), e a REZ (os que têm, menos o quickhack e o daemon).
      rodavel: tipo === 'programa' && Boolean(item.instaladoNo) && !programaDeAtaque(fonte.classe),
      rezDoPrograma: tipo === 'programa' && fonte.rez && !['quickhack', 'daemon'].includes(fonte.classe) ? { atual: item.rezAtual, max: fonte.rez } : null,
      trilhas: tipo === 'armadura' ? ['cabeca', 'corpo'].filter(local => item.system.sp[local].max).map(local => ({ local, rotulo: local === 'cabeca' ? 'cabeça' : 'corpo', valor: item.system.sp[local].value, max: item.system.sp[local].max })) : [],
      rolaHumanidade: tipo === 'cyberware' && Boolean(item.actor) && Boolean(fonte.perdaHumanidade?.formula) && fonte.perdaHumanidade.formula !== '0',
      tipoRotulo: game.i18n.localize(CONFIG.Item.typeLabels[tipo] ?? tipo),
      usosLista: Object.entries(USOS).map(([id, rotulo]) => ({ id, rotulo, ativo: fonte.uso === id })),
      eh: Object.fromEntries(['arma', 'armadura', 'municao', 'cyberware', 'lesao', 'equipamento', 'roupa', 'droga', 'cyberdeck', 'programa', 'upgrade', 'veiculo'].map(t => [t, tipo === t])),
      temQuantidade: tipo !== 'municao' && 'quantidade' in fonte,
      temUso: 'uso' in fonte,
      locaisLesao: comAtual({ corpo: 'Corpo', cabeca: 'Cabeça' }, tipo === 'lesao' && fonte.local),
      pericias: comAtual({ ...Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])), ...(tipo === 'arma' ? opcoesDeArtesMarciais(item.actor) : {}) }, tipo === 'arma' && fonte.pericia),
      // Briga e Artes Marciais (o C10): o "Dano pelo BODY" e o dano que ele dá agora.
      desarmada: tipo === 'arma' && ehDesarmada(fonte.tipo), danoDoBody: tipo === 'arma' && item.actor ? item.danoDaArma : '',
      qualidades: comAtual(QUALIDADES, (tipo === 'arma' || tipo === 'cyberdeck') && fonte.qualidade),
      falhasDaArma: comAtual(Object.fromEntries(Object.entries(FALHAS_DA_ARMA).map(([id, efeito]) => [id, efeito.rotulo])), tipo === 'arma' && fonte.falhaCritica),
      tiposCyberware: comAtual(TIPOS_CYBERWARE, tipo === 'cyberware' && fonte.tipo),
      lados: tipo === 'cyberware' && !naFundacao && ladosDoTipo(fonte.tipo).length ? comAtual({ '': 'Sem lado', ...Object.fromEntries(ladosDoTipo(fonte.tipo)) }, fonte.lado) : null,
      ladoDaFundacao: naFundacao && ladosDoTipo(item.instaladoNo.system.tipo).length ? nomeDoLado(item.ladoDoCyberware) || 'Sem lado' : '',
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
      // A opção instalada de um ator: a fundação onde está, entre as instaladas em que ela cabe (e a de agora), ou nenhuma.
      fundacoes: item.type === 'cyberware' && item.actor && item.system.instalado && !item.system.fundacional
        ? Object.fromEntries([['', 'Sem fundação'], ...[...new Set([item.instaladoNo, ...item.actor.fundacoesPara(item)].filter(Boolean))].map(fundacao => [fundacao.id, fundacao.name])])
        : null,
      efeitos: item.effects.map(efeito => ({
        id: efeito.id, nome: efeito.name, ativo: efeito.active, desligado: efeito.disabled, ligavel: ligaAMao(item),
        mudancas: resumoDasMudancas(efeito.system.changes)
      })),
      descricaoRica: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.descricao, { relativeTo: item })
    });
  }

  // "Atacar" e "Recarregar" na arma de um personagem (as maquetes do usuário): o fluxo da ficha dele (a janela de
  // rolagem no clique; Ctrl + clique, direto; "Rolar direto" inverte).
  static #atacar(evento) {
    return this.item.atacar({ modo: this.item.getFlag(SISTEMA, 'armaVeicular')?.soAutofogo ? 'autofogo' : 'tiro', perguntar: Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto')) });
  }
  static #recarregar() {
    return this.item.recarregar();
  }
  // Cada janela tem seu próprio nome e HP; os upgrades definem a proteção disponível no veículo.
  static async #adicionarJanela() {
    const nome = await DialogV2.prompt({
      window: { title: 'Adicionar janela' }, classes: [SISTEMA], rejectClose: false,
      content: '<label>Nome <input type="text" name="nome" value="Para-brisa"></label>',
      ok: { label: 'Adicionar', callback: (evento, botao) => botao.form.elements.nome.value.trim() }
    });
    return nome ? this.item.adicionarJanela(nome) : null;
  }
  static #removerJanela(evento, alvo) { return this.item.removerJanela(alvo.dataset.janelaId); }
  static #ajustarVidros() { return this.item.ajustarVidros(); }
  static #prepararArmaVeicular() { return this.item.prepararArmaVeicular(); }
  // "−1" no SP de um local da armadura (o "Ablate" das maquetes): sem passar de 0 (o modelo não tem o mínimo); o
  // "Consertar" devolve.
  static #ablar(evento, alvo) {
    const sp = this.item.system.sp?.[alvo.dataset.local];
    return sp ? this.item.update({ [`system.sp.${alvo.dataset.local}.value`]: Math.max(0, sp.value - 1) }) : null;
  }
  // "Usar" a droga e "O efeito acabou" na droga de um personagem (drogas.mjs).
  static #usarDroga() { return usarDroga(this.item); }
  static #acabouDroga() { return acabouOEfeito(this.item); }
  // A correção rápida, o tratamento e o "Voltou" na lesão de um personagem (tratamento.mjs).
  static #corrigir() { return tratarLesao(this.item, 'correcao'); }
  static #tratar() { return tratarLesao(this.item, 'tratamento'); }
  static #voltou() { return voltouALesao(this.item); }
  // "Rodar" e "Restaurar REZ" no programa (as maquetes do usuário): liga ou desliga o programa num deck (o "Ativo" da aba
  // NET; os de ataque não ligam, atacam) e devolve a REZ perdida.
  static #rodar() {
    return this.item.update({ 'system.ativo': !this.item.system.ativo });
  }
  static #restaurarRez() {
    return this.item.restaurarRez();
  }
  // "Rolar Humanidade" no cyberware de um ator (ItemCPR.rolarHumanidade).
  static #rolarHumanidade() {
    return this.item.rolarHumanidade();
  }
  // "Usar" o equipamento ligado à mão (ItemCPR.usar).
  static #usar() {
    return this.item.usar();
  }
  // "Consertar" a armadura (ItemCPR.consertar): o SP volta ao máximo, e o chat diz quem consertou.
  static #consertar() {
    return this.item.consertar();
  }

  // Liga ou desliga um efeito do item (o principal da droga quando alguém a usa, por exemplo).
  static #alternarEfeito(evento, alvo) {
    const efeito = this.item.effects.get(alvo.dataset.efeito);
    return efeito?.update({ disabled: !efeito.disabled });
  }
}
