// Ficha dos itens (ApplicationV2): os campos de cada tipo, a descrição e os efeitos que o item dá. Nos efeitos ligados
// à mão (droga, equipamento como a lanterna), um botão liga e desliga.
import { ALVOS_UPGRADE, ATIVACOES, caminho, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, ESTILOS_ROUPA, QUALIDADES, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { config } from './configuracoes.mjs';
import { prepararAcessibilidade } from './acessibilidade.mjs';
import { PERICIAS } from './gerado.mjs';
import { descreverEfeito, modCabe, podeInstalarModificacao, TIPOS as TIPOS_DE_MOD, validarMod } from './regras-modificacoes.mjs';
import { contadores, descreverEvento, diario, LIMITES as LIMITES_DA_IDENTIDADE } from './regras-identidade.mjs';
import { anotarMarco, temIdentidade, tornarDono } from './identidade.mjs';
import { defeitoEscondido, esconder, revelar, tirar } from './defeito-escondido.mjs';
import { abrir as abrirOficina } from './oficina.mjs';
import { abrirInstalacao, instalacaoDe, pedirInstalacao, textoDaRegra, tirar as tirarModificacao } from './instalacao-mod.mjs';
import { RARIDADES } from './regras-oficina.mjs';
import { acessorioCabe, bonusDoCritico, classeDoRebuild, ehDesarmada, FALHAS_DA_ARMA, FAMILIA_ARTES_MARCIAIS, ladosDoTipo, nomeDoLado, programaDeAtaque, rebuildCabe } from './regras.mjs';
import { opcoesDaLesao, tratarLesao, voltouALesao } from './tratamento.mjs';
import { acabouOEfeito, usarDroga } from './drogas.mjs';
import { ARMAS_VEICULARES } from './armas-veiculos.mjs';
import { TIPOS_DE_VEICULO } from './regras-veiculos.mjs';
import { porVeiculoNaCena } from './vinculo-veiculo.mjs';
import { ehArmaDaCombinacao, ehArmaDoUpgrade, ehArmaMontadaEmItem, idDaOrigem } from './armas-cyberware.mjs';
import { ligaAMao, resumoDasMudancas } from './regras-efeitos.mjs';
import { perceberArmadura } from './black-chrome.mjs';

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
    armadura: () => [['SP', sp('cabeca'), sp('corpo')], [s.equipada && cheia('VESTIDA'), vazada(s.penalidade ? `PENALIDADE ${s.penalidade}` : 'SEM PENALIDADE'), s.moda && vazada(`PARECE ${(ESTILOS_ROUPA[s.moda] ?? s.moda).toUpperCase()}`)]],
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
    veiculo: () => [[`SDP ${s.sdp?.value}/${s.sdp?.max}`, `SP ${s.blindagem.sp}/${s.blindagem.max}`, `${s.assentos} assentos`], [s.familia && vazada('DA FAMÍLIA'), s.acessoNomade > 0 && vazada(`ACESSO NÔMADE ${s.acessoNomade}`), item.actor?.veiculoAtivo?.id === item.id && cheia(item.actor.system.dirigindo ? 'DIRIGINDO' : 'EM USO')]]
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
      porVeiculoNaCena: FichaItem.#porVeiculoNaCena, perceberArmadura: FichaItem.#perceberArmadura,
      corrigir: FichaItem.#corrigir, tratar: FichaItem.#tratar, voltou: FichaItem.#voltou, usarDroga: FichaItem.#usarDroga, acabouDroga: FichaItem.#acabouDroga,
      anotarMarco: FichaItem.#anotarMarco, tornarDono: FichaItem.#tornarDono,
      esconderDefeito: FichaItem.#esconderDefeito, revelarDefeito: FichaItem.#revelarDefeito, tirarDefeito: FichaItem.#tirarDefeito, editarNaOficina: FichaItem.#editarNaOficina,
      instalarAcessorio: FichaItem.#instalarAcessorio, removerAcessorio: FichaItem.#removerAcessorio,
      instalarModificacao: FichaItem.#instalarModificacao, abrirItemBancada: FichaItem.#abrirItemBancada,
      pedirInstalacao: FichaItem.#pedirInstalacao, tirarModificacao: FichaItem.#tirarModificacao
    }
  };

  static PARTS = {
    ficha: { template: caminho('templates/item.hbs'), scrollable: ['.tab'] }
  };

  // As abas da ficha (a maquete): os campos, a descrição e os efeitos.
  static TABS = {
    item: { tabs: [{ id: 'detalhes', label: 'Detalhes' }, { id: 'descricao', label: 'Descrição' }, { id: 'efeitos', label: 'Efeitos' }], initial: 'detalhes' }
  };

  // A aba História (o C69) só na arma de um personagem que tem diário (regras de identidade.temIdentidade).
  _getTabsConfig(grupo) {
    const config = super._getTabsConfig(grupo);
    if (grupo !== 'item' || !config) return config;
    const tabs = [...config.tabs];
    if (this.item.type === 'arma') tabs.push({ id: 'bancada', label: 'Bancada' });
    if (temIdentidade(this.item)) tabs.push({ id: 'historia', label: 'História' });
    return { ...config, tabs };
  }

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

  // No destino Bancada, acessórios do inventário ocupam os slots da arma; modificações ficam no painel próprio.
  async _onDropDocument(evento, documento) {
    const destino = evento.target?.closest?.('[data-bancada-drop]')?.dataset.bancadaDrop;
    if (this.item.type !== 'arma' || !destino || documento.documentName !== 'Item') return super._onDropDocument(evento, documento);
    return FichaItem.#instalarNaBancada.call(this, documento, destino);
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
      armaDe: ehArmaMontadaEmItem(item) ? { rotulo: ehArmaDoUpgrade(item) ? 'Do acessório' : ehArmaDaCombinacao(item) ? 'Modo de' : 'Do cyberware', nome: item.instaladoNo?.name ?? 'Item ausente' } : null,
      editaArma: tipo === 'cyberware' || (tipo === 'upgrade' && fonte.alvo === 'arma'),
      periciasDaArma: ['cyberware', 'upgrade'].includes(tipo) ? comAtual(Object.fromEntries(PERICIAS.map(p => [p.id, p.nome])), fonte.arma?.pericia) : null,
      armaNaFicha: ['cyberware', 'upgrade'].includes(tipo) && item.actor?.items.some(outro => idDaOrigem(outro) === item.id)
        ? (tipo === 'upgrade' ? 'Na arma: ataca pela aba Combate, com ela equipada.' : 'Instalado: ataca pela aba Combate.') : '',
      prepararArma: tipo === 'upgrade' && item.instaladoNo?.type === 'veiculo' && Object.hasOwn(ARMAS_VEICULARES, item.getFlag(SISTEMA, 'catalogo')),
      janelas: tipo === 'veiculo' ? Object.entries(fonte.janelas).map(([id, janela]) => ({ id, ...janela })) : [],
      podePorVeiculoNaCena: this.isEditable && tipo === 'veiculo' && item.parent?.type === 'personagem' && !item.parent.isToken,
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
      bonusCriticoPadrao: tipo === 'arma' ? bonusDoCritico(item.perfil2077) : 5,
      qualidades: comAtual(QUALIDADES, (tipo === 'arma' || tipo === 'cyberdeck') && fonte.qualidade),
      falhasDaArma: comAtual(Object.fromEntries(Object.entries(FALHAS_DA_ARMA).map(([id, efeito]) => [id, efeito.rotulo])), tipo === 'arma' && fonte.falhaCritica),
      tiposCyberware: comAtual(TIPOS_CYBERWARE, tipo === 'cyberware' && fonte.tipo),
      lados: tipo === 'cyberware' && !naFundacao && ladosDoTipo(fonte.tipo).length ? comAtual({ '': 'Sem lado', ...Object.fromEntries(ladosDoTipo(fonte.tipo)) }, fonte.lado) : null,
      ladoDaFundacao: naFundacao && ladosDoTipo(item.instaladoNo.system.tipo).length ? nomeDoLado(item.ladoDoCyberware) || 'Sem lado' : '',
      usos: USOS,
      ativacoes: ATIVACOES,
      tiposRoupa: comAtual(TIPOS_ROUPA, tipo === 'roupa' && fonte.tipo),
      estilosRoupa: comAtual(ESTILOS_ROUPA, tipo === 'roupa' && fonte.estilo),
      // A aparência de moda (o C48, parte 3): o estilo e, na armadura de um ator, os testes para perceber (regras-black-chrome).
      estilosDaModa: comAtual(ESTILOS_ROUPA, tipo === 'armadura' && fonte.moda), perceberModa: tipo === 'armadura' && Boolean(fonte.moda) && Boolean(item.actor),
      classesPrograma: comAtual(CLASSES_PROGRAMA, tipo === 'programa' && fonte.classe),
      // O Black ICE próprio do netrunner: o tipo, PER e SPD.
      blackIce: tipo === 'programa' && fonte.classe === 'blackice', classesDoIce: CLASSES_BLACK_ICE,
      alvosUpgrade: comAtual(ALVOS_UPGRADE, tipo === 'upgrade' && fonte.alvo),
      // Onde o programa ou o upgrade pode ser instalado: os itens do tipo certo no mesmo ator. Um lugar que não existe mais
      // conta como não instalado.
      lugares: { '': tipo === 'programa' ? 'Fora do deck' : 'Não instalado', ...Object.fromEntries((item.actor?.items.filter(i => i.type === tipoDoLugar) ?? []).map(i => [i.id, i.name])) },
      lugarAtual: tipoDoLugar && item.instaladoNo?.type === tipoDoLugar ? item.instaladoNo.id : '',
      // Na arma, as modificações (o C67) têm os slots delas: os acessórios e as modificações em linhas à parte.
      instalados: item.instalados.filter(i => !(tipo === 'arma' && i.getFlag(SISTEMA, 'mod'))).map(i => i.name).join(', '),
      slotsUsados: item.slotsUsados,
      modsDaArma: tipo === 'arma' && item.actor ? { ...item.slotsDeModificacao, nomes: item.modificacoes.map(i => i.name).join(', ') } : null,
      bancada: tipo === 'arma' ? bancadaDaArma(item, this.isEditable) : null,
      modificacao: tipo === 'upgrade' && item.getFlag(SISTEMA, 'mod') ? modificacaoDaFicha(item.getFlag(SISTEMA, 'mod')) : null,
      // A oficina do mestre (o C71): a raridade da modificação da oficina e, só para o mestre, o "Editar na oficina"; na arma,
      // o defeito escondido (o nome só no navegador do mestre).
      raridade: tipo === 'upgrade' && item.getFlag(SISTEMA, 'oficina') ? RARIDADES[item.getFlag(SISTEMA, 'raridade')] ?? '' : '',
      daOficina: tipo === 'upgrade' && game.user.isGM && Boolean(item.getFlag(SISTEMA, 'oficina')),
      // A instalação pelo Tech (o C72): a regra, onde está e o botão; o jogador não escolhe o "Instalado em" da modificação.
      instalacaoMod: instalacaoDaFicha(item),
      semLugarDaMod: tipo === 'upgrade' && Boolean(item.modificacao) && !game.user.isGM,
      defeitoEscondido: tipo === 'arma' && game.user.isGM && temIdentidade(item) ? { nome: defeitoEscondido(item)?.nome ?? '' } : null,
      // A identidade da arma (o C69): o nome próprio no alto e a aba História.
      apelidoDaArma: tipo === 'arma' ? item.identidade.apelido : '',
      historia: temIdentidade(item) ? historiaDaFicha(item) : null,
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

  static #itemDaBancada(alvo) {
    return this.item.actor?.items.get(alvo.dataset.itemId);
  }
  static #instalarAcessorio(evento, alvo) {
    return FichaItem.#instalarNaBancada.call(this, FichaItem.#itemDaBancada.call(this, alvo), 'acessorio');
  }
  static #instalarModificacao(evento, alvo) {
    return FichaItem.#instalarNaBancada.call(this, FichaItem.#itemDaBancada.call(this, alvo), 'modificacao');
  }
  static #abrirItemBancada(evento, alvo) {
    return FichaItem.#itemDaBancada.call(this, alvo)?.sheet.render(true);
  }
  static async #removerAcessorio(evento, alvo) {
    const item = FichaItem.#itemDaBancada.call(this, alvo);
    if (!this.isEditable || !item || item.getFlag(SISTEMA, 'mod') || item.system.instaladoEm !== this.item.id) return null;
    const resultado = await item.update({ 'system.instaladoEm': '' });
    if (this.item.actor.items.get(item.id)?.system.instaladoEm !== this.item.id) await this.render({ force: true });
    return resultado;
  }
  static async #instalarNaBancada(item, destino) {
    const arma = this.item;
    const ator = arma.actor;
    if (arma.type !== 'arma' || !ator || !ator.isOwner || !this.isEditable) {
      ui.notifications.warn('A bancada só pode mudar itens de uma arma que você pode editar.');
      return null;
    }
    if (!item || item.type !== 'upgrade' || item.parent?.uuid !== ator.uuid) {
      ui.notifications.warn('Use um acessório ou uma modificação do inventário deste personagem.');
      return null;
    }
    const flagMod = item.getFlag(SISTEMA, 'mod');
    const ehModificacao = Boolean(flagMod);
    if (destino === 'acessorio') {
      if (ehModificacao || item.system.alvo !== 'arma') {
        ui.notifications.warn(item.name + ': esta área recebe acessórios de arma, não modificações.');
        return null;
      }
      const compatibilidade = compatibilidadeDoAcessorio(arma, item);
      if (!compatibilidade.cabe) {
        ui.notifications.warn(item.name + ' não cabe em ' + arma.name + ': ' + compatibilidade.motivo + '.');
        return null;
      }
    } else if (destino === 'modificacao') {
      if (!ehModificacao) {
        ui.notifications.warn(item.name + ': esta área recebe uma modificação de arma.');
        return null;
      }
      const invalida = validarMod(flagMod);
      if (invalida) {
        ui.notifications.warn(item.name + ': a modificação não vale: ' + invalida + '.');
        return null;
      }
      const podeInstalar = podeInstalarModificacao({ mestre: game.user.isGM, roles: [ator.system.role?.nome, ator.system.roleSecundaria?.nome] });
      if (!podeInstalar) {
        ui.notifications.warn('Só um Tech ou o mestre pode instalar uma modificação de arma.');
        return null;
      }
      if (item.system.instaladoEm && item.system.instaladoEm !== arma.id) {
        ui.notifications.warn(item.name + ' é permanente em outra arma e não pode passar para ' + arma.name + '.');
        return null;
      }
      const compatibilidade = modCabe(arma.paraModificacoes, arma.modificacoes.filter(outro => outro.id !== item.id).map(outro => outro.modificacao), flagMod);
      if (!compatibilidade.cabe) {
        ui.notifications.warn(item.name + ' não cabe em ' + arma.name + ': ' + compatibilidade.motivo + '.');
        return null;
      }
    } else return null;
    if (item.system.instaladoEm === arma.id) return item;
    // A modificação passa pelo Tech, com o teste (o C72): o jogador do Tech pede ao mestre; o mestre abre a janela dele (o
    // teste do Tech da mesa, ou direto, com o Tech NPC).
    if (destino === 'modificacao') return game.user.isGM ? abrirInstalacao({ mod: item, arma }) : pedirInstalacao(item, { arma });
    const resultado = await item.update({ 'system.instaladoEm': arma.id });
    if (ator.items.get(item.id)?.system.instaladoEm === arma.id) {
      await this.render({ force: true });
      return resultado ?? item;
    }
    return null;
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
  static #porVeiculoNaCena() {
    const item = this.item;
    return this.isEditable && item.isOwner && item.type === 'veiculo' && item.parent?.type === 'personagem' && !item.parent.isToken ? porVeiculoNaCena(item) : null;
  }
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
  // O marco à mão e o dono (a aba História, o C69).
  static async #anotarMarco() {
    const campo = this.element.querySelector('.marco-novo');
    if (!campo?.value.trim()) return null;
    await anotarMarco(this.item, campo.value);
    campo.value = '';
    return null;
  }
  static #tornarDono() { return tornarDono(this.item); }
  // O defeito escondido (o C71, só o mestre): sortear, revelar agora ou tirar; e o "Editar na oficina".
  static #esconderDefeito() { return esconder(this.item).catch(erro => ui.notifications.error(erro.message)); }
  static #revelarDefeito() { return revelar(this.item).catch(erro => ui.notifications.error(erro.message)); }
  static #tirarDefeito() { return tirar(this.item).catch(erro => ui.notifications.error(erro.message)); }
  static #editarNaOficina() { return abrirOficina({ item: this.item }); }
  // A instalação pelo Tech (o C72): o jogador pede ao mestre; o mestre abre a janela dele.
  static #pedirInstalacao() { return pedirInstalacao(this.item).catch(erro => ui.notifications.error(erro.message)); }
  static #tirarModificacao() { return tirarModificacao(this.item).catch(erro => ui.notifications.error(erro.message)); }
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

  // A aparência de moda (o C48, parte 3): quem o usuário controla (ou o personagem dele) tenta perceber a armadura.
  static #perceberArmadura(evento, alvo) {
    const observador = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
    if (!observador) return ui.notifications.warn('Selecione o token de quem observa (ou tenha um personagem) para o teste.');
    return perceberArmadura(this.item, observador, alvo.dataset.pericia);
  }

  // Liga ou desliga um efeito do item (o principal da droga quando alguém a usa, por exemplo).
  static #alternarEfeito(evento, alvo) {
    const efeito = this.item.effects.get(alvo.dataset.efeito);
    return efeito?.update({ disabled: !efeito.disabled });
  }
}

// A modificação de arma (o C67) na ficha do upgrade: o tipo, os slots e cada efeito numa linha; a que não vale diz o motivo.
// A instalação pelo Tech na ficha da modificação (o C72): a regra; instalada, onde (e, para o mestre, o "Tirar"); solta
// num ator, o botão (o mestre: "Instalar com o Tech"; o dono: "Pedir a instalação"). O defeito e a modificação inválida
// não têm.
function instalacaoDaFicha(item) {
  const inst = item.type === 'upgrade' ? instalacaoDe(item) : null;
  if (!inst) return null;
  const arma = item.actor?.items.get(item.system.instaladoEm);
  const botao = !item.actor || arma ? '' : game.user.isGM ? 'INSTALAR COM O TECH' : item.isOwner ? 'PEDIR A INSTALAÇÃO' : '';
  const instalada = arma?.type === 'arma' ? arma.nomeDeExibicao : '';
  return { regra: textoDaRegra(inst), instalada, botao, tirar: Boolean(instalada) && game.user.isGM };
}
function modificacaoDaFicha(mod) {
  const invalida = validarMod(mod);
  return invalida ? { invalida } : { tipo: TIPOS_DE_MOD[mod.tipo], tamanho: mod.tamanho, efeitos: mod.efeitos.map(descreverEfeito) };
}

// A Bancada (C74) apresenta só os dados da arma e reaproveita os validadores de slots do C11/C67.
function bancadaDaArma(arma, editavel) {
  const ator = arma.actor;
  const podeVerMontagem = Boolean(ator?.isOwner);
  const instalados = podeVerMontagem ? arma.instalados : [];
  const acessoriosInstalados = instalados.filter(item => !item.getFlag(SISTEMA, 'mod'));
  const modsInstaladas = instalados.filter(item => item.getFlag(SISTEMA, 'mod'));
  const podeEditar = Boolean(editavel && podeVerMontagem);
  const podeInstalarMods = Boolean(podeEditar && podeInstalarModificacao({ mestre: game.user.isGM, roles: [ator?.system.role?.nome, ator?.system.roleSecundaria?.nome] }));
  const acessoriosTotal = Math.max(0, Math.trunc(Number(arma.system.slots) || 0));
  const acessoriosUsados = arma.slotsUsados;
  const modsDaArma = arma.slotsDeModificacao;
  const quantidadeDeSlots = total => Math.min(12, Math.max(0, Math.trunc(Number(total) || 0)));
  const slotsVisuais = (usados, total) => Array.from({ length: quantidadeDeSlots(total) }, (_, indice) => ({ numero: indice + 1, ocupado: indice < usados }));
  const mods = modsInstaladas.map(item => {
    const flag = item.getFlag(SISTEMA, 'mod');
    const ficha = modificacaoDaFicha(flag);
    return { id: item.id, nome: item.name, imagem: item.img, tipo: TIPOS_DE_MOD[flag?.tipo] ?? 'Inválida',
      tipoId: flag?.tipo, tamanho: Number(flag?.tamanho) || 0, defeito: flag?.tipo === 'defeito', efeitos: ficha.efeitos ?? [], invalida: ficha.invalida ?? '' };
  });
  const inventario = podeVerMontagem ? [...ator.items] : [];
  const acessorios = inventario.filter(item => item.type === 'upgrade' && item.system.alvo === 'arma'
    && !item.getFlag(SISTEMA, 'mod') && !item.system.instaladoEm).map(item => {
      const compatibilidade = compatibilidadeDoAcessorio(arma, item);
      return { id: item.id, nome: item.name, imagem: item.img, tamanho: Number(item.system.tamanho) || 0,
        cabe: compatibilidade.cabe, motivo: compatibilidade.motivo };
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const modificacoes = inventario.filter(item => item.type === 'upgrade' && item.getFlag(SISTEMA, 'mod') && !item.system.instaladoEm).map(item => {
    const flag = item.getFlag(SISTEMA, 'mod');
    const ficha = modificacaoDaFicha(flag);
    const compatibilidade = item.modificacao
      ? modCabe(arma.paraModificacoes, arma.modificacoes.map(outro => outro.modificacao), item.modificacao)
      : { cabe: false, motivo: ficha.invalida };
    return { id: item.id, nome: item.name, imagem: item.img, tipo: ficha.tipo ?? 'Inválida',
      tamanho: Number(flag?.tamanho) || 0, defeito: flag?.tipo === 'defeito', efeitos: ficha.efeitos ?? [], invalida: ficha.invalida ?? '',
      cabe: compatibilidade.cabe, motivo: compatibilidade.motivo, instalavel: podeInstalarMods && compatibilidade.cabe };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const periciaId = arma.periciaDaArma;
  const pericia = arma.actor?.system.pericia?.(periciaId)?.nome ?? PERICIAS.find(item => item.id === periciaId)?.nome ?? periciaId ?? '';
  const atributos = [
    { rotulo: 'Perícia', valor: pericia }, { rotulo: 'Dano', valor: arma.system.dano },
    { rotulo: 'CDT', valor: arma.system.cdt },
    { rotulo: 'Pente', valor: arma.system.pente?.max ? arma.system.pente.value + '/' + arma.system.pente.max : '' },
    { rotulo: 'Alcance', valor: arma.system.aDistancia ? 'À distância' : 'Corpo a corpo' },
    { rotulo: 'Qualidade', valor: QUALIDADES[arma.system.qualidade] ?? arma.system.qualidade }
  ].filter(dado => dado.valor !== '' && dado.valor !== undefined && dado.valor !== null);
  return {
    nome: arma.name, apelido: arma.identidade?.apelido ?? '', imagem: arma.img, atributos,
    acessorios: { usados: acessoriosUsados, total: acessoriosTotal, restantes: Math.max(0, acessoriosTotal - acessoriosUsados), slots: slotsVisuais(acessoriosUsados, acessoriosTotal) },
    modificacoes: { usados: modsDaArma.usados, total: modsDaArma.total, defeitos: mods.filter(item => item.defeito).length,
      teto: 3, slots: slotsVisuais(modsDaArma.usados, modsDaArma.total), itens: mods, disponiveis: modificacoes, podeInstalar: podeInstalarMods },
    acessoriosInstalados: acessoriosInstalados.map(item => ({ id: item.id, nome: item.name, imagem: item.img, tamanho: arma.tamanhoNaArma(item) })),
    acessoriosDisponiveis: acessorios, podeEditar, podeVerMontagem, semAtor: !ator
  };
}

function compatibilidadeDoAcessorio(arma, acessorio) {
  const outros = arma.instalados.filter(item => item.id !== acessorio.id);
  const usados = outros.reduce((soma, item) => soma + arma.tamanhoNaArma(item), 0);
  const rebuild = classeDoRebuild(acessorio.getFlag(SISTEMA, 'arma2077'));
  if (rebuild) {
    const classe2077 = arma.getFlag(SISTEMA, 'arma2077')?.classe ?? null;
    return rebuildCabe({ rebuild, arma: arma.system, usados,
      outroRebuild: outros.some(item => classeDoRebuild(item.getFlag(SISTEMA, 'arma2077'))), classe2077 });
  }
  return acessorioCabe({
    slots: arma.system.slots, usados, tamanho: Number(acessorio.system.tamanho) || 0,
    carregador: Boolean(acessorio.system.modificadores?.pente),
    temCarregador: outros.some(item => item.type === 'upgrade' && item.system.modificadores?.pente)
  });
}

// A aba História da arma (o C69): a identidade, os contadores, o diário (os mais novos primeiro) e, só para o mestre, o
// dono e a nota dele.
function historiaDaFicha(item) {
  const identidade = item.identidade;
  const conta = contadores(identidade);
  return {
    ...identidade, ...conta, limites: LIMITES_DA_IDENTIDADE, dono: identidade.dono?.nome ?? '', carregaEhDono: !identidade.dono || identidade.dono.id === item.actor.id,
    primeiroSangue: conta.primeiroSangue ? descreverEvento({ tipo: 'primeiroSangue', ...conta.primeiroSangue }) : '',
    diario: diario(identidade, 50), podeAnotar: item.isOwner, mestre: game.user.isGM, nota: game.user.isGM ? item.getFlag(SISTEMA, 'notaDoMestre') ?? '' : ''
  };
}
