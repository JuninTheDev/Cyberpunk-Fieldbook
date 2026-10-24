// Ficha do personagem (ApplicationV2 do Foundry 14), no visual do modelo da mesa ("Modelo de ficha/"): o cabeçalho com
// a Role, o nome, o apelido e os indicadores (HP, Sorte, dinheiro, IP, reputação), e as abas Perícias (o painel geral:
// atributos, vitais, perícias, armadura, armas, cyberware e lesões), Combate, Equipamento, Cyberware, Role, NET e Vida
// (o Lifepath e as notas). Rola pela ficha: clique no atributo, na perícia ou nos botões da arma.
import { itemDoMundo } from './instalados.mjs';
import { ALVOS_UPGRADE, ATRIBUTOS, caminho, CLASSES_2077, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, ESTILOS_ROUPA, EXTRATOS, LIFEPATH, QUALIDADES, SIGLA, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { agarraoDe, agarrar, derrubar, escapar, estrangular, soltar } from './agarrao.mjs';
import { movimentosDe, usarMovimento } from './artes-marciais.mjs';
import { acoesNetDe, andaresDe, arrancarCabo, breach, conexaoDireta, expulsar, jackIn, jackOut, neuroportDe, quickhack, selfIcesDe } from './neuroport.mjs';
import { criarItemNaFicha, podeCriarItemNaFicha } from './criar-item.mjs';
import { config } from './configuracoes.mjs';
import { prepararAcessibilidade } from './acessibilidade.mjs';
import { avancarComIp } from './avanco.mjs';
import { abrirExtrato } from './extrato.mjs';
import { levantar, movimentoDe } from './estados.mjs';
import { levarItem } from './conteiner.mjs';
import { perguntarDivisao } from './pilhas.mjs';
import { apagarComInstalados, descarregaAoApagar, divisaoDaPilha, passaNaBusca } from './regras-inventario.mjs';
import { acoesDe2077, STATUS_COBERTURA } from './combate.mjs';
import { trocarMunicao } from './painel/acoes.mjs';
import { roleDaWiki } from './dados.mjs';
import { FAMILIAS, HABILIDADES_DE_ROLE, PERICIAS, ROLES } from './gerado.mjs';
import { FLAG_CONEXAO, FLAG_PONTO } from './netrun/constantes.mjs';
import { opcoesDaLesao, tratarLesao, voltouALesao } from './tratamento.mjs';
import { lesaoCritica } from './lesoes.mjs';
import { acabouOEfeito, usarDroga } from './drogas.mjs';
import { alcanceDoJackIn, bonusDeRole, custoMensalDeMoradia, periciaPropria, DANO_DE_PROGRAMA, EMPILHAVEIS, formulaDeDano, HABILIDADES_DE_INTERFACE, nomeDoLado, passwallsDoAlvo, passwallsPassados, pontosDeRole, programaDeAtaque, ROLAGENS_DE_ROLE } from './regras.mjs';
import { netrunnerDo, temPortaDoDeck } from './netrun/regras-da-net.mjs';
import { ARMAS_VEICULARES } from './armas-veiculos.mjs';
import { manobra } from './direcao.mjs';
import { armaDoAcessorio, armaMontadaPronta, ehArmaDoCyberware, ehArmaMontadaEmItem } from './armas-cyberware.mjs';
import { alternarItemFavorito, alternarPericiaFavorita, arrastoDaPericia, FLAG_FAVORITAS, FLAG_FAVORITO, listaCurta, perguntarLocalMirado } from './macros.mjs';
import { ESTADOS_MENTAIS, estadoMental, fazerTerapia, TRACOS_DE_HARE } from './terapia.mjs';

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const parte = arquivo => ({ template: caminho(`templates/personagem/${arquivo}.hbs`) });
const aba = arquivo => ({ ...parte(arquivo), scrollable: [''] });
// Os blocos que a ficha do capanga também usa (partials: o Foundry os carrega e registra pelo caminho).
export const bloco = arquivo => caminho(`templates/personagem/bloco-${arquivo}.hbs`);
const porcento = (valor, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((valor / max) * 100))) : 0);
const slug = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// A janela de rolagem abre no clique; Ctrl (ou ⌘) + clique rola direto. "Rolar direto" (deste navegador) inverte.
const comJanela = evento => Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto'));
// As perícias mais altas ficam em destaque no painel geral, como no modelo.
const EM_DESTAQUE = 6;
// A aba Vida em painéis, como a maquete "Lifepath Tab" do usuário: os 17 campos do Lifepath (config.LIFEPATH) por grupo.
const GRUPOS_DO_LIFEPATH = [
  { titulo: 'ORIGENS', sub: 'QUEM VOCÊ É', chaves: ['origem', 'personalidade', 'roupa', 'cabelo', 'adorno'] },
  { titulo: 'VALORES', sub: 'O QUE IMPORTA', chaves: ['valor', 'pessoas', 'pessoa', 'posse'] },
  { titulo: 'FAMÍLIA', sub: 'DE ONDE VEIO', chaves: ['familia', 'infancia', 'crise'] },
  { titulo: 'METAS E PESSOAS', sub: 'AMIGOS E INIMIGOS', chaves: ['meta', 'amigos', 'inimigos', 'amores'] },
  { titulo: 'LIFEPATH DA ROLE', sub: 'RED p. 40–70', chaves: ['role'], largo: true }
];

export class FichaPersonagem extends HandlebarsApplicationMixin(ActorSheetV2) {
  // A arma ou o escudo de outra ficha pode chegar equipado. Recebe guardado e tenta equipar pela mesma conferência.
  // Da ficha de outro ator, o item vai (sai de lá, como no CORE; conteiner.levarItem); do contêiner, só o mestre arrasta:
  // o jogador usa o "Pegar" da ficha do contêiner.
  async _onDropItem(evento, item) {
    const origem = item.parent?.documentName === 'Actor' && item.parent.uuid !== this.actor.uuid ? item.parent : null;
    if (origem && origem.type === 'conteiner' && !game.user.isGM) { ui.notifications.warn(`${item.name}: para tirar do contêiner, use o "Pegar" na ficha dele.`); return null; }
    if (origem && !this.actor.isOwner) return null;
    const empunhado = this.actor.uuid !== item.parent?.uuid && item.system.equipada
      && (item.type === 'arma' || (item.type === 'armadura' && item.system.escudo));
    const copiarPilha = !item.parent && EMPILHAVEIS.includes(item.type), copiarMundo = itemDoMundo(item);
    const criado = origem || copiarPilha || copiarMundo ? await levarItem(item, this.actor, { manterNaOrigem: copiarPilha || copiarMundo }) : await super._onDropItem(evento, empunhado ? item.clone({ 'system.equipada': false }, { keepId: true }) : item);
    if (criado && empunhado) await criado.update({ 'system.equipada': true });
    return criado;
  }

  // A perícia arrastada vai para a barra de macros (macros.mjs): as daqui não são itens, como no CORE.
  async _onDragStart(evento) {
    const { pericia } = evento.currentTarget.dataset;
    if (pericia) return evento.dataTransfer.setData('text/plain', JSON.stringify(arrastoDaPericia(this.actor, pericia)));
    return super._onDragStart(evento);
  }

  static DEFAULT_OPTIONS = {
    // O visual do modelo é escuro: a ficha fica no tema escuro do Foundry, qualquer que seja o tema da interface.
    classes: [SISTEMA, 'ficha-personagem', 'themed', 'theme-dark'],
    position: { width: 1060, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      atualizarWiki: FichaPersonagem.#atualizarWiki,
      rolarAtributo: FichaPersonagem.#rolarAtributo,
      rolarPericia: FichaPersonagem.#rolarPericia,
      rolarRole: FichaPersonagem.#rolarRole,
      rolarFacedown: FichaPersonagem.#rolarFacedown,
      rolarIniciativa: FichaPersonagem.#rolarIniciativa,
      protegerSe: FichaPersonagem.#protegerSe,
      levantar: FichaPersonagem.#levantar,
      agarrar: FichaPersonagem.#agarrar, movimento: FichaPersonagem.#movimento,
      soltar: FichaPersonagem.#soltar,
      estrangular: FichaPersonagem.#estrangular,
      derrubar: FichaPersonagem.#derrubar,
      escapar: FichaPersonagem.#escapar,
      jackIn: FichaPersonagem.#jackIn,
      conexaoDireta: FichaPersonagem.#conexaoDireta,
      arrancarCabo: FichaPersonagem.#arrancarCabo,
      jackOut: FichaPersonagem.#jackOut,
      breach: FichaPersonagem.#breach,
      quickhack: FichaPersonagem.#quickhack,
      expulsar: FichaPersonagem.#expulsar,
      conectarNaNet: FichaPersonagem.#conectarNaNet,
      abrirNet: FichaPersonagem.#abrirNet,
      desconectarDaNet: FichaPersonagem.#desconectarDaNet,
      rolarInterface: FichaPersonagem.#rolarInterface,
      rolarDanoDoZap: FichaPersonagem.#rolarDanoDoZap,
      ativarPrograma: FichaPersonagem.#ativarPrograma,
      atacarComPrograma: FichaPersonagem.#atacarComPrograma,
      rolarDanoDePrograma: FichaPersonagem.#rolarDanoDePrograma,
      perderRez: FichaPersonagem.#perderRez,
      restaurarRez: FichaPersonagem.#restaurarRez,
      alternarPericias: FichaPersonagem.#alternarPericias,
      novaPericia: FichaPersonagem.#novaPericia,
      tirarPericia: FichaPersonagem.#tirarPericia,
      favoritarPericia: FichaPersonagem.#favoritarPericia,
      favoritarItem: FichaPersonagem.#favoritarItem,
      terapia: FichaPersonagem.#terapia,
      atacar: FichaPersonagem.#atacar,
      mirar: FichaPersonagem.#mirar,
      deathSave: FichaPersonagem.#deathSave,
      zerarDeathSave: FichaPersonagem.#zerarDeathSave,
      rolarDano: FichaPersonagem.#rolarDano,
      recarregar: FichaPersonagem.#recarregar,
      trocarMunicao: FichaPersonagem.#trocarMunicao,
      descarregar: FichaPersonagem.#descarregar,
      usarVeiculo: FichaPersonagem.#usarVeiculo,
      dirigirVeiculo: FichaPersonagem.#dirigirVeiculo,
      manobra: FichaPersonagem.#manobra,
      prepararArmaVeicular: FichaPersonagem.#prepararArmaVeicular,
      prepararSorte: FichaPersonagem.#prepararSorte,
      abrirExtrato: FichaPersonagem.#abrirExtrato,
      avancarComIp: FichaPersonagem.#avancarComIp,
      pagarMes: FichaPersonagem.#pagarMes,
      recarregarSorte: FichaPersonagem.#recarregarSorte,
      alternarCoronha: FichaPersonagem.#alternarCoronha,
      alternarCarga: FichaPersonagem.#alternarCarga,
      tirarSegundaRole: FichaPersonagem.#tirarSegundaRole,
      manejarFerrolho: FichaPersonagem.#manejarFerrolho,
      equipar: FichaPersonagem.#equipar,
      mudarUso: FichaPersonagem.#mudarUso,
      portaDoDeck: FichaPersonagem.#portaDoDeck,
      mudarQuantidade: FichaPersonagem.#mudarQuantidade,
      dividirPilha: FichaPersonagem.#dividirPilha,
      ablarArmadura: FichaPersonagem.#ablarArmadura,
      consertarArmadura: FichaPersonagem.#consertarArmadura,
      usarItem: FichaPersonagem.#usarItem,
      usarDroga: FichaPersonagem.#usarDroga,
      acabouDroga: FichaPersonagem.#acabouDroga,
      instalar: FichaPersonagem.#instalar,
      instalarOpcao: FichaPersonagem.#instalarOpcao,
      editarItem: FichaPersonagem.#editarItem,
      criarItem: FichaPersonagem.#criarItem,
      apagarItem: FichaPersonagem.#apagarItem,
      rolarLesao: FichaPersonagem.#rolarLesao,
      corrigirLesao: FichaPersonagem.#corrigirLesao,
      tratarLesao: FichaPersonagem.#tratarLesao,
      voltouLesao: FichaPersonagem.#voltouLesao
    }
  };

  static PARTS = {
    topo: parte('topo'),
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    pericias: { ...aba('pericias'), templates: [bloco('geral'), bloco('lesoes')] },
    combate: { ...aba('combate'), templates: [bloco('armas'), bloco('agarrao'), bloco('artes-marciais'), bloco('armadura'), bloco('lesoes')] },
    equipamento: aba('equipamento'),
    cyberware: aba('cyberware'),
    role: aba('role'),
    net: aba('net'),
    vida: aba('vida'),
    rodape: parte('rodape')
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'pericias', label: 'Perícias', icon: 'fa-solid fa-list-check' }, { id: 'combate', label: 'Combate', icon: 'fa-solid fa-crosshairs' },
        { id: 'equipamento', label: 'Equipamento', icon: 'fa-solid fa-briefcase' }, { id: 'cyberware', label: 'Cyberware', icon: 'fa-solid fa-microchip' },
        { id: 'role', label: 'Role', icon: 'fa-solid fa-id-badge' }, { id: 'net', label: 'NET', icon: 'fa-solid fa-network-wired' },
        { id: 'vida', label: 'Vida', icon: 'fa-solid fa-book-open' }
      ],
      initial: 'pericias'
    }
  };

  // Todas as perícias ou só as que têm nível (o painel geral). Sem escolha, todas quando nenhuma tem nível.
  #todasAsPericias = null;
  // A busca de perícias e itens do cabeçalho (o C32; o filter-contents do CORE, cpr-actor-sheet.js:1660-1683): o texto
  // fica nesta janela, e não no ator, e vale de novo a cada desenho (o ApplicationV2 redesenha a cada mudança do ator).
  #busca = '';

  async _onRender(contexto, opcoes) {
    await super._onRender(contexto, opcoes);
    prepararAcessibilidade(this.element);
    const campo = this.element.querySelector('input.busca-da-ficha');
    if (campo) {
      campo.value = this.#busca;
      // Com texto, o painel geral mostra todas as perícias (as do CORE ficam todas à vista): o começo e o fim da busca
      // redesenham; o resto só esconde e mostra as linhas.
      campo.addEventListener('input', () => {
        const mudouAsPericias = Boolean(this.#busca.trim()) !== Boolean(campo.value.trim());
        this.#busca = campo.value;
        if (mudouAsPericias) this.render(); else this.#filtrar();
      });
      // O texto não é campo do ator: nem a mudança nem o Enter enviam o formulário.
      campo.addEventListener('change', evento => evento.stopPropagation());
      campo.addEventListener('keydown', evento => { if (evento.key === 'Enter') evento.preventDefault(); });
      if (campo === document.activeElement) campo.setSelectionRange(campo.value.length, campo.value.length);
    }
    this.#filtrar();
  }

  // Esconde as linhas que não passam na busca (regras-inventario.passaNaBusca), pelo nome: as perícias e os itens das
  // listas e da tabela de armas, em todas as abas; o grupo de perícias sem nenhuma à vista some junto. Os painéis de
  // resumo (os favoritos, o painel geral, as lesões) ficam inteiros.
  #filtrar() {
    const raiz = this.element;
    if (!raiz) return;
    for (const linha of raiz.querySelectorAll('.lista-pericias li.pericia, ol.itens li[data-item-id], table.lista tr[data-item-id]')) {
      const nome = (linha.querySelector('[data-action="editarItem"]') ?? linha.querySelector('.nome'))?.textContent ?? '';
      linha.hidden = !passaNaBusca(nome, this.#busca);
    }
    for (const lista of raiz.querySelectorAll('.lista-pericias')) {
      let grupo = null, algum = false;
      for (const li of [...lista.children, null]) {
        if (li && !li.classList.contains('grupo-pericias')) { if (li.classList.contains('pericia')) algum ||= !li.hidden; continue; }
        if (grupo) grupo.hidden = !algum;
        grupo = li;
        algum = false;
      }
    }
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ator = this.actor;
    const s = ator.system;
    const fonte = ator._source.system;
    const itens = tipo => ator.items.filter(item => item.type === tipo).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'pt-BR'));
    // Armas de 2077: os botões dos modos, os avisos e a dica do ataque (o +1 da arma Smart; combate.mjs).
    const favorito = item => Boolean(item.getFlag(SISTEMA, FLAG_FAVORITO));
    const linhaArma = arma => {
      const de2077 = acoesDe2077(arma);
      const { partes } = arma.partesDoAtaque(null);
      return { id: arma.id, nome: arma.name, img: arma.img, sistema: arma.system, dano: arma.danoDaArma, ataque: partes.reduce((soma, p) => soma + p.valor, 0), municao: arma.municaoCarregada?.name ?? '', qualidade: QUALIDADES[arma.system.qualidade] ?? '', acessorios: arma.instalados.map(item => item.name).join(', '), favorito: favorito(arma),
        classe2077: CLASSES_2077[arma.perfil2077?.classe] ?? '', modos2077: de2077.modos, alternar2077: de2077.alternar, avisos2077: de2077.avisos,
        dicaAtaque: de2077.dicaAtaque, balasAutofogo: de2077.balasAutofogo, soAutofogo: Boolean(arma.getFlag(SISTEMA, 'armaVeicular')?.soAutofogo),
        // A arma do cyberware instalado (o C11) está sempre pronta, sem ocupar as mãos; a do acessório, com a arma onde ele
        // está equipada.
        doCyberware: ehArmaDoCyberware(arma), doAcessorio: armaDoAcessorio(arma)?.name ?? '', pronta: arma.system.equipada || armaMontadaPronta(arma),
        resumo: [arma.danoDaArma, `CDT ${arma.system.cdt}`, arma.system.pente.max ? `${arma.system.pente.value}/${arma.system.pente.max}` : ''].filter(Boolean).join(' // ') };
    };
    // A arma montada fica com o veículo, sem ocupar a lista das armas de mãos. A montagem órfã continua editável. A do
    // cyberware e a do acessório ficam na aba Combate, com as de mão, e fora do inventário (elas saem com o item).
    const todasAsArmas = itens('arma');
    const armas = todasAsArmas.filter(arma => !arma.system.instaladoEm).map(linhaArma);
    const armasDeCombate = [...armas, ...todasAsArmas.filter(ehArmaMontadaEmItem).map(linhaArma)];
    const armasSemVeiculo = todasAsArmas.filter(arma => arma.system.instaladoEm && !ehArmaMontadaEmItem(arma) && arma.instaladoNo?.type !== 'veiculo').map(linhaArma);

    // Perícias: as comuns sempre (nível 0 também) e as de família que o personagem tem. No painel geral, só as que têm
    // nível (das mais altas para as mais baixas) ou todas, no grupo de cada uma.
    const favoritas = new Set(ator.getFlag(SISTEMA, FLAG_FAVORITAS) ?? []);
    const linhaPericia = id => {
      const p = s.pericia(id);
      const total = s.atributos[p.atributo].valor + p.nivel + p.bonus + (p.role?.valor ?? 0) + s.penalidade;
      return { ...p, familia: Boolean(s.pericias[id]?.familia) || p.propria, sigla: SIGLA[p.atributo], total, favorita: favoritas.has(id),
        dica: `${SIGLA[p.atributo]} + ${p.nome} + 1d10${p.bonus ? ` (bônus +${p.bonus})` : ''}${p.role ? ` (${p.role.rotulo} +${p.role.valor})` : ''}`,
        dicaTotal: `Atributo + nível${p.bonus ? ' + bônus' : ''}${p.role ? ` + ${p.role.rotulo}` : ''}${s.penalidade ? ` ${s.penalidade} do ferimento` : ''}, sem o dado` };
    };
    // As de família e as próprias (com o STAT delas, como no CORE).
    const todas = [...PERICIAS.map(p => linhaPericia(p.id)), ...Object.entries(s.pericias).filter(([, propria]) => propria.familia || propria.atributo).map(([id]) => linhaPericia(id))];
    const comNivel = todas.filter(p => p.nivel > 0).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
    comNivel.slice(0, EM_DESTAQUE).forEach(p => { p.alta = true; });
    const mostrarTodas = Boolean(this.#busca.trim()) || (this.#todasAsPericias ?? comNivel.length === 0);
    // Tirar uma perícia de família só na lista completa, onde a lista se edita.
    if (mostrarTodas) for (const p of todas) p.tirar = p.familia;
    const grupoDe = p => PERICIAS.find(base => base.id === p.id)?.grupo ?? FAMILIAS[s.pericias[p.id]?.familia]?.grupo ?? (p.propria ? 'Próprias' : 'Educação');
    const grupos = Map.groupBy(todas, grupoDe);
    const linhasDePericia = mostrarTodas
      ? [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .flatMap(([grupo, lista]) => [{ grupo }, ...lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))])
      : listaCurta(comNivel, todas);

    // Inventário: um detalhe de cada tipo e o uso (o botão passa por equipado, carregando e guardado).
    // A quantidade fica no controle com − e + (as maquetes do usuário), e não mais no detalhe; na droga, as doses.
    const linhaDoInventario = (item, ...detalhes) => ({
      divisivel: Boolean(divisaoDaPilha(item.type, item.system.quantidade, 1)),
      quantidade: 'quantidade' in item.system ? item.system.quantidade : null, unidade: item.type === 'droga' ? 'Doses' : 'Quantidade',
      id: item.id, nome: item.name, img: item.img, detalhe: detalhes.filter(Boolean).join(' · '), equipado: item.system.uso === 'equipado', guardado: item.system.uso === 'guardado', favorito: favorito(item),
      usoNome: USOS[item.system.uso] ?? item.system.uso,
      // A droga (drogas.mjs): sob o efeito agora e viciada.
      ehDroga: item.type === 'droga', sobEfeito: Boolean(item.getFlag(SISTEMA, 'sobEfeito')), viciado: Boolean(item.getFlag(SISTEMA, 'viciado')), usavel: item.usavelAMao, emUso: item.emUso
    });
    const sp = (armadura, local) => (armadura.system.sp[local].max ? `${local === 'cabeca' ? 'cabeça' : 'corpo'} ${armadura.system.sp[local].value}/${armadura.system.sp[local].max}` : '');
    const armaduras = itens('armadura').map(armadura => ({
      id: armadura.id, nome: armadura.name, img: armadura.img, equipada: armadura.system.equipada, favorito: favorito(armadura),
      consertavel: !armadura.system.escudo && ['cabeca', 'corpo'].some(local => armadura.system.sp[local].max > 0),
      detalhe: [sp(armadura, 'cabeca'), sp(armadura, 'corpo'), armadura.system.escudo ? `escudo ${armadura.system.pvEscudo.value}/${armadura.system.pvEscudo.max} PV` : '',
        armadura.system.penalidade ? `penalidade ${armadura.system.penalidade}` : ''].filter(Boolean).join(' · ')
    }));
    // O cyberware em árvore, como a maquete "Cyberware Tab": cada fundação com as opções dela logo abaixo (└) e os slots
    // usados; o resto na ordem de sempre. A opção instalada sem a fundação que ela pede fica marcada.
    const doCyber = itens('cyberware');
    const naFundacao = item => item.instaladoNo?.type === 'cyberware' && item.instaladoNo.system.fundacional;
    const arvore = doCyber.filter(item => !naFundacao(item)).flatMap(item => [{ item, opcao: false }, ...item.instalados.map(outro => ({ item: outro, opcao: true }))]);
    const cyberwares = arvore.map(({ item, opcao }) => ({
      id: item.id, nome: item.name, img: item.img, sistema: item.system, tipo: TIPOS_CYBERWARE[item.system.tipo] ?? item.system.tipo, efeitos: item.effects.map(e => e.name).join(', '),
      opcao, slots: item.system.fundacional ? `${item.slotsUsados} / ${item.system.slots}` : '', semFundacao: item.semFundacao, lado: nomeDoLado(item.ladoDoCyberware),
      membroNatural: item.noMembroNatural ? (item.system.tipo === 'cyberLeg' ? 'perna natural' : 'braço natural') : ''
    }));
    // As lesões, com o paliativo e o tratamento (as DVs de cada perícia).
    const dvs = pares => pares.filter(([, dv]) => dv).map(([pericia, dv]) => `${pericia} DV${dv}`).join(' ou ');
    const lesoes = itens('lesao').map(item => {
      const { paliativo, tratamento } = item.system;
      const p = dvs([['Primeiros Socorros', paliativo.primeirosSocorros], ['Paramédico', paliativo.paramedico]]);
      const t = dvs([['Paramédico', tratamento.paramedico], ['Cirurgia', tratamento.cirurgia]]);
      return { id: item.id, nome: item.name, img: item.img, sistema: item.system, tratar: [p && `PALIATIVO: ${p}`, t && `TRATAMENTO: ${t}`].filter(Boolean).join(' // '),
        // A correção rápida e o tratamento (tratamento.mjs): o que a lesão permite e se ela está corrigida até o fim do dia.
        temCorrecao: opcoesDaLesao(item.system, 'correcao').length > 0, temTratamento: opcoesDaLesao(item.system, 'tratamento').length > 0, corrigida: Boolean(item.getFlag(SISTEMA, 'corrigida')),
        resumo: item.system.descricao.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' Paliativo:')[0] };
    });

    // Os favoritos da aba Combate (macros.mjs): as perícias com a estrela, com o total, e os itens com a estrela, com o botão
    // de cada um (a arma ataca; a droga e o equipamento ligado à mão, "Usar").
    const favoritos = {
      pericias: todas.filter(p => p.favorita).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      itens: ator.items.filter(favorito).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(item => ({
        id: item.id, nome: item.name, img: item.img, arma: item.type === 'arma', droga: item.type === 'droga', usavel: item.usavelAMao, emUso: item.emUso
      }))
    };

    // Iniciativa e esquiva (a esquiva média, sem o dado).
    const esquiva = ator.partesDaPericia('evasion').partes.reduce((soma, p) => soma + p.valor, 0);
    // O Facedown sem o dado (COOL, Reputação e as penalidades), com a conta na dica.
    const partesDoFacedown = ator.partesDoFacedown({ situacionais: [] });
    const facedown = { valor: partesDoFacedown.reduce((soma, p) => soma + p.valor, 0), dica: `${partesDoFacedown.map(p => `${p.rotulo} ${p.valor}`).join(' + ')} + 1d10: teste enfrentado` };
    const bonusDeIniciativa = s.iniciativa - s.atributos.ref.valor;

    // As Roles (a principal e a segunda, a regra da mesa "Duas Roles na criação"): a do RED da wiki e as especialidades
    // (Solo, Tech, Medtech) com os pontos; o efeito de cada uma do Solo.
    const efeitoDoSolo = {
      'Initiative Reaction': s.consciencia.iniciativa && `+${s.consciencia.iniciativa} na Iniciativa`,
      'Precision Attack': s.consciencia.ataque && `+${s.consciencia.ataque} no ataque`,
      'Spot Weakness': s.consciencia.pontoFraco && `+${s.consciencia.pontoFraco} no dano`,
      'Threat Detection': s.consciencia.percepcao && `+${s.consciencia.percepcao} em Percepção`,
      'Damage Deflection': s.consciencia.deflexao && `−${s.consciencia.deflexao} no dano sofrido`,
      'Fumble Recovery': s.consciencia.semFalhaCritica && 'sem falha crítica'
    };
    const rolesDaFicha = ['role', ...(s.roleSecundaria.nome ? ['roleSecundaria'] : [])].map(chave => this.#contextoDaRole(chave, efeitoDoSolo));

    // NET: os cyberdecks (com o que está instalado) e os programas; a Interface é o Rank do Netrunner.
    // O deck equipado e os slots dele (as maquetes do usuário: as caixas dos slots no painel da Interface).
    const deckEquipado = itens('cyberdeck').find(deck => deck.system.uso === 'equipado');
    // Com a Neuroport Cyberdeck Port, o deck equipado se encaixa nela (o botão "Na porta").
    const temPorta = temPortaDoDeck(ator);
    const decks = itens('cyberdeck').map(deck => ({
      ...linhaDoInventario(deck, deck.system.ram ? `RAM ${deck.system.ram}` : '', `${deck.slotsUsados}/${deck.system.slots} slots`, deck.instalados.map(item => item.name).join(', ')),
      porta: temPorta && deck.system.uso === 'equipado', naPorta: Boolean(deck.getFlag(SISTEMA, 'naPorta'))
    }));
    // A Interface: as rolagens (com o valor sem o dado) pelo cyberdeck equipado, como o CORE, e as Ações NET pelo Rank.
    const net = {
      rank: s.rankDeInterface, acoes: s.acoesDeNet, deck: deckEquipado?.name ?? '', naPorta: netrunnerDo(ator).naPorta,
      slots: deckEquipado ? { usados: deckEquipado.slotsUsados, total: deckEquipado.system.slots } : null,
      habilidades: HABILIDADES_DE_INTERFACE.map(h => ({ ...h, valor: ator.partesDaInterface(h.id, { situacionais: [] }).reduce((soma, p) => soma + p.valor, 0) }))
    };
    // O Neuroport (neuroport.mjs): as ligações do netrunner, o alcance do Jack In pelo deck e quem está no Neuroport deste
    // ator (o jogador vê só quem ele percebeu; o mestre, todos).
    const { ligacoes, invasores } = neuroportDe(ator);
    // Os Passwalls de cada ligação: os do Self-ICE do alvo, os passados e a DV (o Breach passa um por vez).
    // E os andares do Neuroport do alvo (o Black ICE do deck dele, os Passwalls e o Holophone).
    const comPasswalls = ligacoes.map(ligacao => {
      const alvo = fromUuidSync(ligacao.alvo)?.actor;
      const { quantos, dv } = passwallsDoAlvo(selfIcesDe(alvo));
      const passados = passwallsPassados(ligacao, quantos);
      return { ...ligacao, quantos, dv, passados, faltam: quantos - passados, andares: alvo ? andaresDe(alvo).join(' · ') : '' };
    });
    // Em combate, as Ações NET da rodada fora da arquitetura (o Jack In, o Breach e o quickhack).
    const neuroport = {
      ligacoes: comPasswalls, invasores: game.user.isGM ? invasores : invasores.filter(item => item.percebido),
      alcance: alcanceDoJackIn(netrunnerDo(ator)), acoes: s.rankDeInterface ? acoesNetDe(ator) : null
    };
    // A conexão na NET (os botões da aba, as maquetes do usuário): o token do ator nesta cena que está num ponto de acesso,
    // com o nome do ponto.
    const conectado = ator.getActiveTokens(false, true).map(token => ({ token, conexao: token.getFlag(SISTEMA, FLAG_CONEXAO) })).find(c => c.conexao);
    net.conexao = conectado ? {
      tile: conectado.conexao.tile, token: conectado.token.id, ponto: fromUuidSync(conectado.conexao.tile)?.getFlag(SISTEMA, FLAG_PONTO)?.nome || 'Ponto de acesso',
      // A arquitetura ao vivo: os andares como o netrunner os conhece (o motor da NET).
      andares: (tile => (tile ? game.system.api.netrun?.andaresConhecidos(tile) ?? [] : []))(fromUuidSync(conectado.conexao.tile))
    } : null;

    return Object.assign(contexto, {
      podeAtualizarWiki: game.user.isGM && Boolean(ator.getFlag(SISTEMA, 'wiki')) && !ator.isToken,
      ator, sistema: s, fonte, editavel: this.isEditable, podeCriarItem: this.isEditable && podeCriarItemNaFicha(ator), versao: game.system.version, daWiki: Boolean(ator.getFlag(SISTEMA, 'wiki')), sortePreparada: ator.sortePreparada,
      // A Sorte usada na sessão (as maquetes do usuário, "Luck used"): o máximo menos a que resta.
      sorteUsada: Math.max(0, s.sorte.max - s.sorte.value),
      roles: ROLES,
      // Eurodólares, IP e Reputação: o botão do cabeçalho abre o extrato (como o ledger do CORE).
      extratos: [['dinheiro', 'EURODÓLARES'], ['pontosDeMelhoria', 'IP'], ['reputacao', 'REPUTAÇÃO']].map(([campo, sigla]) => ({
        campo, sigla, valor: s[campo], dica: `${EXTRATOS[campo].rotulo}: somar, subtrair ou definir, com o motivo; e o histórico`
      })),
      extratoRecente: s.extratos.dinheiro.slice(-5).reverse().map(linha => ({
        mudanca: linha.acao === 'definir' ? `= ${linha.saldo} eb` : `${linha.delta > 0 ? '+' : '−'}${Math.abs(linha.delta)} eb`, saldo: linha.saldo, motivo: linha.motivo, usuario: linha.usuario,
        quando: linha.quando ? new Date(linha.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
        classe: linha.delta > 0 ? 'entrou' : linha.delta < 0 ? 'saiu' : ''
      })),
      atributos: ATRIBUTOS.map(chave => ({ chave, sigla: SIGLA[chave], valor: s.atributos[chave].valor, base: fonte.atributos[chave].valor })),
      vitais: { hp: porcento(s.hp.value, s.hp.max), humanidade: porcento(s.humanidade.value, s.humanidade.max), grave: Math.ceil(s.hp.max / 2) },
      deathSavePenalidade: s.deathSave.base + s.deathSave.penalidade,
      movimento: movimentoDe(ator),
      todasAsPericias: mostrarTodas, linhasDePericia, periciasComNivel: comNivel.length, periciasSemNivel: todas.length - comNivel.length, periciasTotal: todas.length, busca: this.#busca,
      armas, armasDeCombate, armasSemVeiculo, armasEquipadas: armasDeCombate.filter(arma => arma.pronta),
      armaduras, armadurasVestidas: armaduras.filter(armadura => armadura.equipada),
      locaisArmadura: ['cabeca', 'corpo'].map(local => ({ local, rotulo: local === 'cabeca' ? 'CABEÇA' : 'CORPO',
        ...s.armadura[local], nome: ator.items.get(s.armadura[local].item)?.name ?? 'Sem armadura' })),
      // O estado mental pela EMP de agora (a ciberpsicose da wiki; terapia.mjs), com os traços de Hare na dica.
      estadoMental: (chave => ({ chave, ...ESTADOS_MENTAIS[chave], tracos: ['dissociativo', 'ciberpsicose'].includes(chave) ? TRACOS_DE_HARE.join('; ') : '' }))(estadoMental(s.humanidade.value, s.atributos.emp.valor)),
      cyberwares, cyberInstalado: cyberwares.filter(item => item.sistema.instalado).map(item => ({ ...item, detalhe: [item.tipo, item.sistema.perdaHumanidade.sofrida ? `Humanidade −${item.sistema.perdaHumanidade.sofrida}` : ''].filter(Boolean).join(' // ') })),
      lesoes, favoritos,
      iniciativa: { valor: s.iniciativa, dica: `REF ${s.atributos.ref.valor}${bonusDeIniciativa ? ` + ${bonusDeIniciativa} (cyberware e Role)` : ''}` },
      esquiva, podeEsquivarTiro: s.atributos.ref.valor >= 8, facedown, emCobertura: ator.statuses.has(STATUS_COBERTURA), agarrao: agarraoDe(ator), movimentos: movimentosDe(ator),
      municoes: itens('municao'),
      inventario: [
        { titulo: 'EQUIPAMENTO', tipo: 'equipamento', vazio: 'Sem equipamento.', itens: itens('equipamento').map(item => linhaDoInventario(item, item.effects.filter(e => e.active).map(e => e.name).join(', '))) },
        { titulo: 'ROUPAS', tipo: 'roupa', vazio: 'Sem roupas.', itens: itens('roupa').map(item => linhaDoInventario(item, TIPOS_ROUPA[item.system.tipo], ESTILOS_ROUPA[item.system.estilo])) },
        { titulo: 'DROGAS', tipo: 'droga', vazio: 'Sem drogas.', itens: itens('droga').map(item => linhaDoInventario(item)) }
      ],
      decks,
      programas: itens('programa').map(p => ({
        id: p.id, nome: p.name, img: p.img,
        detalhe: [
          CLASSES_PROGRAMA[p.system.classe] ?? p.system.classe,
          p.system.classe === 'quickhack' ? `RAM ${p.system.ram}` : p.system.classe === 'daemon' ? `REZ ${p.system.rez}`
            : p.system.classe === 'blackice' ? `${CLASSES_BLACK_ICE[p.system.tipoDeIce] ?? p.system.tipoDeIce} · PER ${p.system.per} · SPD ${p.system.spd} · ATK ${p.system.atk} · DEF ${p.system.def}`
              : `ATK ${p.system.atk} · DEF ${p.system.def}`,
          p.instaladoNo ? `no ${p.instaladoNo.name}` : 'fora do deck'
        ].join(' · '),
        // O de ataque (num deck, com Interface) ataca e rola o dano; o que tem REZ ativa, perde e restaura REZ.
        ataque: programaDeAtaque(p.system.classe) && Boolean(p.instaladoNo) && s.rankDeInterface > 0 && { total: s.rankDeInterface + p.system.atk },
        danos: programaDeAtaque(p.system.classe) && p.instaladoNo && s.rankDeInterface > 0
          ? DANO_DE_PROGRAMA[p.system.classe].map(dano => ({ ...dano, formula: formulaDeDano(p.system.dano[dano.id]) })).filter(dano => dano.formula) : [],
        rez: p.system.rez && !['quickhack', 'daemon'].includes(p.system.classe) ? { atual: p.rezAtual, max: p.system.rez } : null,
        // O estado (as maquetes do usuário): fora do deck, guardado; no deck, carregado; rezzado, ativo.
        estado: !p.instaladoNo ? 'guardado' : p.system.ativo ? 'ativo' : 'carregado',
        ativo: p.system.ativo, podeAtivar: Boolean(p.instaladoNo) && !programaDeAtaque(p.system.classe),
        dicaAtivo: p.system.classe === 'blackice' ? 'Ativo (rezzado): o mestre põe o token do Black ICE ao lado do seu na cena; desativado, ele sai' : 'Ativo (rezzado): os boosters somam na habilidade deles'
      })),
      net, neuroport,
      veiculos: itens('veiculo').map(v => ({
        id: v.id, nome: v.name, img: v.img,
        ativo: ator.veiculoAtivo?.id === v.id, dirigindo: ator.veiculoAtivo?.id === v.id && s.dirigindo,
        armas: todasAsArmas.filter(arma => arma.system.instaladoEm === v.id).map(linhaArma),
        detalhe: [`SDP ${v.system.sdp.value}/${v.system.sdp.max}`, `SP ${v.system.blindagem.sp}/${v.system.blindagem.max}`, `${v.system.assentos} assentos`, `MOVE ${v.system.velocidade.combate}`, v.system.familia ? 'da família' : '', v.instalados.filter(i => i.type === 'upgrade').map(i => i.name).join(', ')].filter(Boolean).join(' · ')
      })),
      upgrades: itens('upgrade').map(u => ({
        id: u.id, nome: u.name, img: u.img,
        prepararArma: u.instaladoNo?.type === 'veiculo' && Object.hasOwn(ARMAS_VEICULARES, u.getFlag(SISTEMA, 'catalogo')),
        detalhe: [ALVOS_UPGRADE[u.system.alvo] ?? u.system.alvo, `${u.system.tamanho} ${u.system.tamanho === 1 ? 'slot' : 'slots'}`, u.instaladoNo ? `em ${u.instaladoNo.name}` : 'não instalado'].join(' · ')
      })),
      rolesDaFicha, temSegundaRole: Boolean(s.roleSecundaria.nome),
      lifepathGrupos: GRUPOS_DO_LIFEPATH.map(grupo => ({
        ...grupo, campos: grupo.chaves.map(chave => ({ chave, rotulo: LIFEPATH.find(campo => campo.chave === chave).rotulo, valor: s.lifepath[chave], linhas: chave === 'role' ? 4 : 2 }))
      })),
      custoMensal: custoMensalDeMoradia(s),
      camposDeMoradia: [
        { chave: 'moradia', rotulo: 'Moradia', descricao: s.moradia.descricao, custo: s.moradia.custo },
        { chave: 'estiloDeVida', rotulo: 'Estilo de vida', descricao: s.estiloDeVida.descricao, custo: s.estiloDeVida.custo },
        { chave: 'traumaTeam', rotulo: 'Trauma Team', descricao: s.traumaTeam.descricao, custo: s.traumaTeam.custo }
      ],
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  static async #atualizarWiki() {
    try { return await game.system.api.wiki.atualizarDaWiki(this.actor); }
    catch (erro) { ui.notifications.warn(erro.message); return null; }
  }

  // Uma Role da ficha (chave: "role", a principal, ou "roleSecundaria"): a do RED da wiki, as rolagens da habilidade, as
  // especialidades, as outras habilidades (como vieram da importação) e o bônus nas perícias (o Moto do Nomad, que soma
  // sempre). caminho: onde os campos dela gravam.
  #contextoDaRole(chave, efeitoDoSolo) {
    const dados = this.actor.system[chave];
    const role = roleDaWiki(dados.nome);
    const especialidades = role && HABILIDADES_DE_ROLE[role.id];
    // As especialidades e as perícias que vêm delas (as do Medtech: a ficha calcula, não ficam entre as outras).
    const daEspecialidade = new Set([...(especialidades?.itens ?? []), ...(especialidades?.derivadas ?? [])].map(item => item.id));
    const nomeDaPericia = id => PERICIAS.find(p => p.id === id)?.nome ?? FAMILIAS[id]?.nome ?? id;
    const ativos = Object.entries(bonusDeRole({ roleId: role?.id, rank: dados.rank }));
    return {
      chave, caminho: `system.${chave}`, principal: chave === 'role', nome: dados.nome, rank: dados.rank, roleDaWiki: role,
      rolagens: (role && ROLAGENS_DE_ROLE[role.id]) ?? [],
      especialidades: especialidades && this.#especialidades(especialidades, role, dados, efeitoDoSolo),
      outrasHabilidades: Object.entries(dados.habilidades).filter(([nome]) => !daEspecialidade.has(nome)).map(([nome, pontos]) => ({ nome, pontos })),
      bonus: ativos.length ? { rotulo: ativos[0][1].rotulo, valor: ativos[0][1].valor, pericias: ativos.map(([id]) => nomeDaPericia(id)).join(', ') } : null
    };
  }

  // As especialidades da Role com os pontos de cada uma e a conferência do Rank (regras.mjs, pontosDeRole): o total
  // distribuído contra o do Rank e cada uma contra o máximo. Só avisa: quem decide é a mesa.
  #especialidades(especialidades, role, dados, efeitoDoSolo) {
    const { habilidades, rank } = dados;
    const { total, max } = pontosDeRole(role.id, rank);
    const itens = especialidades.itens.map(item => {
      const pontos = Number(habilidades[item.id]) || 0;
      return { ...item, pontos, acima: pontos > max, efeito: role.id === 'solo' ? efeitoDoSolo[item.id] || '' : '' };
    });
    const distribuidos = itens.reduce((soma, item) => soma + item.pontos, 0);
    // As perícias que vêm das especialidades (a Cirurgia e a Tecnologia Médica do Medtech), com o nível e a conta.
    const nomeDe = id => itens.find(item => item.id === id)?.nome ?? id;
    const derivadas = (especialidades.derivadas ?? []).map(({ id, de, max: teto }) => ({
      id, nome: ROLAGENS_DE_ROLE[role.id]?.find(rolagem => rolagem.derivada === id)?.rotulo ?? id, nivel: this.actor.system.periciasDeRole[id] ?? 0,
      conta: `${Object.entries(de).map(([especialidade, fator]) => (fator === 1 ? nomeDe(especialidade) : `${fator} por ponto de ${nomeDe(especialidade)}`)).join(' + ')}${teto ? `, até ${teto}` : ''}`
    }));
    return { ...especialidades, itens, derivadas, distribuidos, total, max, rank, passou: distribuidos > total, sobra: Math.max(0, total - distribuidos), acima: itens.filter(item => item.acima).map(item => item.nome).join(', ') };
  }

  async _preparePartContext(partId, contexto, options) {
    contexto = await super._preparePartContext(partId, contexto, options);
    if (contexto.tabs?.[partId]) contexto.tab = contexto.tabs[partId];
    return contexto;
  }

  // ---------------- Ações ----------------
  #item(alvo) {
    return this.actor.items.get(alvo.closest('[data-item-id]')?.dataset.itemId);
  }
  static #rolarAtributo(evento, alvo) { return this.actor.rolarAtributo(alvo.dataset.atributo, { perguntar: comJanela(evento) }); }
  static #rolarPericia(evento, alvo) { return this.actor.rolarPericia(alvo.dataset.pericia, { perguntar: comJanela(evento) }); }
  static #rolarFacedown(evento) { return this.actor.rolarFacedown({ perguntar: comJanela(evento) }); }
  // "Rolar iniciativa" (as maquetes do usuário): o ator entra no combate (o Foundry cria um, se o mestre clicar sem
  // nenhum) e rola na fila, pela iniciativa do sistema (iniciativa.mjs: a janela dos situacionais e a Sorte). Quem já
  // rolou neste combate não rola de novo: o RED rola a iniciativa uma vez, no começo do combate.
  static #rolarIniciativa() {
    const ja = game.combat?.combatants.find(combatente => combatente.actor === this.actor && combatente.initiative !== null);
    if (ja) return ui.notifications.info(`${this.actor.name} já tem iniciativa ${ja.initiative} neste combate.`);
    return this.actor.rollInitiative({ createCombatants: true });
  }
  // "Proteger-se" (as maquetes do usuário): marca ou tira o "Em cobertura" (combate.STATUS_COBERTURA); o cartão do tiro
  // contra quem a tem avisa o mestre, que decide (a wiki, p. 182).
  static async #protegerSe() {
    await this.actor.toggleStatusEffect(STATUS_COBERTURA);
    return this.render();
  }
  static #levantar() { return levantar(this.actor); }
  // O agarrão (as maquetes do usuário; a wiki, p. 177; agarrao.mjs): "Agarrar" (o alvo marcado, T, resiste pela janela
  // de reação do dono); agarrando, "Estrangular", "Derrubar" e "Soltar"; agarrado, "Escapar" (quem agarra resiste).
  static #agarrar(evento) { return agarrar(this.actor, { perguntar: comJanela(evento) }); }
  static #soltar() { return soltar(this.actor); }
  static #estrangular() { return estrangular(this.actor); }
  static #derrubar() { return derrubar(this.actor); }
  static #escapar(evento) { return escapar(this.actor, { perguntar: comJanela(evento) }); }
  // Os movimentos especiais das Artes Marciais (artes-marciais.mjs; o C10): o requisito "neste turno" o jogador confirma.
  static #movimento(evento, alvo) { return usarMovimento(this.actor, alvo.dataset.movimento, { perguntar: comJanela(evento) }); }
  // O Neuroport (neuroport.mjs; a NET de 2077): "Jack In" no alvo marcado (T, que resiste com a WILL pela janela de
  // reação do dono) e "Jack Out" de cada ligação.
  static #jackIn(evento) { return jackIn(this.actor, { perguntar: comJanela(evento) }); }
  static #jackOut(evento, alvo) { return jackOut(this.actor, alvo.dataset.alvo); }
  static #breach(evento, alvo) { return breach(this.actor, alvo.dataset.alvo, { perguntar: comJanela(evento) }); }
  static #quickhack(evento, alvo) { return quickhack(this.actor, alvo.dataset.alvo, { perguntar: comJanela(evento) }); }
  // No Neuroport deste ator: "Expulsar" o netrunner que ele percebeu.
  static #expulsar(evento, alvo) { return expulsar(this.actor, alvo.dataset.netrunner, { perguntar: comJanela(evento) }); }
  // A conexão direta pelo Personal Link, no alvo marcado; e, no Neuroport deste ator, o cabo arrancado.
  static #conexaoDireta(evento) { return conexaoDireta(this.actor, { perguntar: comJanela(evento) }); }
  static #arrancarCabo(evento, alvo) { return arrancarCabo(this.actor, alvo.dataset.netrunner); }
  static #rolarInterface(evento, alvo) { return this.actor.rolarInterface(alvo.dataset.habilidade, { perguntar: comJanela(evento) }); }
  static #rolarDanoDoZap() { return this.actor.rolarDanoDoZap(); }
  // "Conectar", "Abrir a NET" e "Desconectar" na aba NET (as maquetes do usuário), pelo motor da NET (netrun): as mesmas
  // conferências do clique no marcador e a desconexão segura da janela. A conexão fica no token, e a ficha se redesenha.
  static async #conectarNaNet() {
    await game.system.api.netrun.conectarPelaFicha(this.actor);
    return this.render();
  }
  static #abrirNet(evento, alvo) {
    const tile = fromUuidSync(alvo.dataset.tile);
    return tile ? game.system.api.netrun.janela(tile, game.user.isGM ? { gm: true } : { tokenId: alvo.dataset.token }) : null;
  }
  static async #desconectarDaNet(evento, alvo) {
    const token = canvas.scene?.tokens.get(alvo.dataset.token);
    if (!token) return null;
    await game.system.api.netrun.desconectar(token).catch(falha => ui.notifications.warn(falha.message));
    return this.render();
  }
  // O programa ativo (rezzado): os boosters somam na habilidade deles.
  static #ativarPrograma(evento, alvo) {
    const item = this.#item(alvo);
    return item?.update({ 'system.ativo': !item.system.ativo });
  }
  static #atacarComPrograma(evento, alvo) { return this.actor.rolarAtaqueDePrograma(this.#item(alvo), { perguntar: comJanela(evento) }); }
  static #rolarDanoDePrograma(evento, alvo) { return this.#item(alvo)?.rolarDanoDePrograma(alvo.dataset.contra); }
  static #perderRez(evento, alvo) { return this.#item(alvo)?.perderRez(1); }
  static #restaurarRez(evento, alvo) { return this.#item(alvo)?.restaurarRez(); }
  // As Expertises do Tech perguntam antes a perícia do teste.
  static async #rolarRole(evento, alvo) {
    const id = alvo.dataset.rolagem;
    const perguntar = comJanela(evento);
    const rolagem = this.actor.rolagemDeRole(id);
    const pericia = rolagem?.escolherPericia ? await this.#escolherPericia(rolagem) : null;
    if (rolagem?.escolherPericia && !pericia) return null;
    return this.actor.rolarRole(id, { perguntar, pericia });
  }
  // A perícia de uma Expertise do Tech: as do atributo da rolagem (o "varying" do item de Role do CORE), as comuns e as de
  // família que o personagem tem, da mais alta para a mais baixa. Fechada, null.
  #escolherPericia(rolagem) {
    const s = this.actor.system;
    const ids = [...PERICIAS.map(p => p.id), ...Object.entries(s.pericias).filter(([, propria]) => propria.familia || propria.atributo).map(([id]) => id)];
    const pericias = ids.map(id => s.pericia(id)).filter(p => p.atributo === rolagem.atributo)
      .sort((a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome, 'pt-BR'));
    const opcoes = pericias.map(p => `<option value="${p.id}">${foundry.utils.escapeHTML(p.nome)} (${p.nivel})</option>`).join('');
    return DialogV2.prompt({
      window: { title: rolagem.rotulo }, classes: [SISTEMA, 'escolher-pericia'], rejectClose: false,
      content: `<label>Perícia de ${SIGLA[rolagem.atributo]} <select name="pericia" autofocus>${opcoes}</select></label><p class="dica">${rolagem.formula}</p>`,
      ok: { label: 'Usar esta perícia', callback: (evento, botao) => botao.form.elements.pericia.value }
    });
  }
  static #alternarPericias() {
    this.#todasAsPericias = !(this.#todasAsPericias ?? !Object.values(this.actor.system.pericias).some(p => p.nivel > 0));
    return this.render();
  }
  // Uma perícia nova: de família (uma Linguagem, um Especialista Local...; a chave é a família e o nome, como na importação
  // da wiki: "language-streetslang") ou própria (o C23; o nome e o STAT, como o item de perícia do CORE).
  static async #novaPericia() {
    const opcoes = [...Object.entries(FAMILIAS).map(([id, f]) => `<option value="${id}">${foundry.utils.escapeHTML(f.nome)}</option>`), '<option value="">Própria (o nome e o STAT, como no CORE)</option>'].join('');
    const stats = ATRIBUTOS.map(chave => `<option value="${chave}">${SIGLA[chave]}</option>`).join('');
    const resposta = await DialogV2.prompt({
      window: { title: 'Perícia nova' }, classes: [SISTEMA, 'nova-pericia'], rejectClose: false,
      content: `<label>Família <select name="familia">${opcoes}</select></label><label>Qual (a língua, o lugar, a ciência...; na própria, o nome) <input type="text" name="nome" autofocus></label><label>STAT (da própria) <select name="atributo">${stats}</select></label>`,
      ok: { label: 'Acrescentar', callback: (evento, botao) => ({ familia: botao.form.elements.familia.value, nome: botao.form.elements.nome.value.trim(), atributo: botao.form.elements.atributo.value }) }
    });
    if (!resposta?.nome) return null;
    const [chave, dados] = resposta.familia
      ? [`${resposta.familia}-${slug(resposta.nome)}`, { familia: resposta.familia, nome: resposta.nome, nivel: 0 }]
      : periciaPropria(resposta, ATRIBUTOS) ?? [];
    if (!chave) return null;
    if (this.actor.system.pericias[chave] || PERICIAS.some(p => p.id === chave)) { ui.notifications.warn(`${this.actor.name} já tem essa perícia.`); return null; }
    return this.actor.update({ [`system.pericias.${chave}`]: dados });
  }
  // As estrelas (macros.mjs): a perícia favorita e o item favorito.
  static #favoritarPericia(evento, alvo) { return alternarPericiaFavorita(this.actor, alvo.dataset.pericia); }
  // A terapia (terapia.mjs, pela wiki): quem trata é o Medtech selecionado.
  static #terapia() { return fazerTerapia(this.actor); }
  static #favoritarItem(evento, alvo) { const item = this.#item(alvo); return item && alternarItemFavorito(item); }
  static async #tirarPericia(evento, alvo) {
    const chave = alvo.dataset.pericia;
    const nome = this.actor.system.pericia(chave).nome;
    const ok = await DialogV2.confirm({ window: { title: 'Tirar perícia' }, content: `<p>Tirar <b>${foundry.utils.escapeHTML(nome)}</b> da ficha?</p>` });
    return ok ? this.actor.update({ [`system.pericias.${chave}`]: new foundry.data.operators.ForcedDeletion() }) : null;
  }
  static #atacar(evento, alvo) { return this.#item(alvo)?.atacar({ local: alvo.dataset.local || 'corpo', modo: alvo.dataset.modo || null, perguntar: comJanela(evento) }); }
  // Tiro (ou golpe) mirado: escolhe o local e ataca.
  static async #mirar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const local = await perguntarLocalMirado(item);
    return local ? item.atacar({ local, perguntar: comJanela(evento) }) : null;
  }
  static #deathSave(evento) { return this.actor.rolarDeathSave({ perguntar: comJanela(evento) }); }
  static #zerarDeathSave() { return this.actor.zerarDeathSave(); }
  static #rolarDano(evento, alvo) { return this.#item(alvo)?.rolarDano({ perguntar: comJanela(evento) }); }
  static #recarregar(evento, alvo) { return this.#item(alvo)?.recarregar(); }
  // Trocar a munição (o mesmo do Painel Tático: a sobra do pente volta para a que estava nele) e descarregar (o C32; o
  // load e o unload do CORE, cpr-loadable.js:57-62 e :131-134).
  static #trocarMunicao(evento, alvo) { const item = this.#item(alvo); return item ? trocarMunicao(this.actor, item.id) : null; }
  static #descarregar(evento, alvo) { return this.#item(alvo)?.descarregar(); }
  // Um veículo em uso por vez; o motorista pode começar ou parar de dirigir sem trocar a escolha.
  static #usarVeiculo(evento, alvo) {
    const item = this.#item(alvo);
    return item && this.actor.usarVeiculo(this.actor.veiculoAtivo?.id === item.id ? '' : item.id);
  }
  static #dirigirVeiculo() { return this.actor.dirigirVeiculo(!this.actor.system.dirigindo); }
  // A manobra de quem dirige (o C40, direcao.mjs): a janela das manobras do tipo do veículo e a rolagem.
  static #manobra(evento) { return manobra(this.actor, null, { perguntar: comJanela(evento) }); }
  static #prepararArmaVeicular(evento, alvo) { return this.#item(alvo)?.prepararArmaVeicular(); }
  // Sorte: um ponto a mais ou a menos para o próximo teste; no começo da sessão, volta ao máximo.
  static #prepararSorte(evento, alvo) { return this.actor.prepararSorte(this.actor.sortePreparada + Number(alvo.dataset.delta)); }
  static #recarregarSorte() { return this.actor.recarregarSorte(); }
  static #abrirExtrato(evento, alvo) { return abrirExtrato(this.actor, alvo.dataset.campo); }
  static #avancarComIp(evento, alvo) { return this.isEditable ? avancarComIp(this.actor, { pericia: alvo.dataset.pericia, role: alvo.dataset.role }) : null; }
  // "Pagar o mês" na aba Vida (o C22; a regra do criador da wiki, passo 6; o CORE só guarda os campos): no dia 1º de cada
  // mês, o aluguel, o estilo de vida e o Trauma Team saem dos Eurodólares, pelo extrato, depois da confirmação.
  static async #pagarMes() {
    if (!this.isEditable) return null;
    const valor = custoMensalDeMoradia(this.actor.system);
    if (!valor) return null;
    const ok = await DialogV2.confirm({
      window: { title: 'Pagar o mês' }, classes: [SISTEMA, 'pagar-mes'], rejectClose: false,
      content: `<p>Descontar <b>${valor} eb</b> de <b>${foundry.utils.escapeHTML(this.actor.name)}</b> pela moradia e estilo de vida do mês (no dia 1º)?</p>`
    });
    if (!ok) return null;
    const agora = custoMensalDeMoradia(this.actor.system);
    return agora ? this.actor.mudarComExtrato('dinheiro', { acao: 'subtrair', valor: agora, motivo: 'Moradia e estilo de vida do mês' }) : null;
  }
  // A coronha retrátil (a Dian, de 2077): recolhida, dá para esconder a arma, e os ataques têm −1.
  static #alternarCoronha(evento, alvo) {
    const item = this.#item(alvo);
    return item?.setFlag(SISTEMA, 'coronhaRecolhida', !item.coronhaRecolhida);
  }
  // A segunda Role sai da ficha (o nome, o Rank e as habilidades dela).
  static #tirarSegundaRole() {
    return this.actor.update({ 'system.roleSecundaria.nome': '', 'system.roleSecundaria.rank': 0, 'system.roleSecundaria.habilidades': foundry.data.operators.ForcedReplacement.create({}) });
  }
  // A carga Tech (o Kit): carregar gasta a Ação de Movimento; carregada, o botão descarrega.
  static #alternarCarga(evento, alvo) {
    const item = this.#item(alvo);
    return item && game.system.api.combate.alternarCarga(item);
  }
  // O ferrolho da Grad (o Kit): depois do tiro, uma Ação para manejá-lo antes de atirar de novo.
  static #manejarFerrolho(evento, alvo) {
    return this.#item(alvo)?.unsetFlag(SISTEMA, 'ferrolhoPendente');
  }
  static #equipar(evento, alvo) {
    const item = this.#item(alvo);
    return item?.update({ 'system.equipada': !item.system.equipada });
  }
  static #mudarUso(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const ordem = Object.keys(USOS);
    return item.update({ 'system.uso': ordem[(ordem.indexOf(item.system.uso) + 1) % ordem.length] });
  }
  // Encaixar ou tirar o cyberdeck da Neuroport Cyberdeck Port (a wiki: uma Ação; na porta, 20 m contra arquiteturas e 50 m
  // contra Neuroports, e o hardware do deck não vale).
  static #portaDoDeck(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    if (!temPortaDoDeck(this.actor)) return ui.notifications.warn(`${this.actor.name} não tem a Neuroport Cyberdeck Port instalada.`);
    return item.setFlag(SISTEMA, 'naPorta', !item.getFlag(SISTEMA, 'naPorta'));
  }
  // − e + na quantidade do inventário (as maquetes do usuário): de 1 em 1. O 0 é o piso do modelo (o min: 0 do campo,
  // que o Foundry 14 aplica ao limpar os dados); o item fica, com 0.
  // "Usar" a droga e "O efeito acabou" (drogas.mjs, pela wiki).
  static #usarDroga(evento, alvo) { const item = this.#item(alvo); return item && usarDroga(item); }
  static #acabouDroga(evento, alvo) { const item = this.#item(alvo); return item && acabouOEfeito(item); }
  // "Usar" o equipamento ligado à mão (ItemCPR.usar): liga ou desliga os efeitos dele.
  static #usarItem(evento, alvo) {
    return this.#item(alvo)?.usar();
  }
  static #mudarQuantidade(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    return item.update({ 'system.quantidade': item.system.quantidade + Number(alvo.dataset.delta) });
  }
  static #dividirPilha(evento, alvo) { return perguntarDivisao(this.#item(alvo)); }
  static #ablarArmadura(evento, alvo) { return this.isEditable ? this.actor.ablarArmaduras(alvo.dataset.local) : null; }
  static #consertarArmadura(evento, alvo) { return this.isEditable ? this.#item(alvo)?.consertar() : null; }
  static #instalar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    return item.system.instalado ? this.actor.desinstalarCyberware(item) : this.actor.instalarCyberware(item, { rolar: !evento.shiftKey });
  }
  // "+ Opção" na fundação (a maquete "Cyberware Tab"): escolhe, entre as opções deste personagem que cabem nela, a que vai;
  // a que ainda não está instalada se instala nela (Shift: a perda pela média).
  static async #instalarOpcao(evento, alvo) {
    const fundacao = this.#item(alvo);
    if (!fundacao) return null;
    const opcoes = this.actor.opcoesPara(fundacao);
    if (!opcoes.length) return ui.notifications.info(`Nenhuma opção de ${this.actor.name} cabe em ${fundacao.name} (do mesmo tipo e com o slot livre).`);
    const rotulo = opcao => `${foundry.utils.escapeHTML(opcao.name)} (${opcao.system.tamanho} slot${opcao.system.tamanho === 1 ? '' : 's'}${opcao.system.instalado ? ', instalada' : ''})`;
    const escolha = await DialogV2.prompt({
      window: { title: `+ Opção: ${fundacao.name}` }, classes: [SISTEMA, 'instalar-opcao'], rejectClose: false,
      content: `<label>Opção <select name="opcao">${opcoes.map(opcao => `<option value="${opcao.id}">${rotulo(opcao)}</option>`).join('')}</select></label>`,
      ok: { label: 'Instalar', callback: (e, botao) => botao.form.elements.opcao.value }
    });
    const opcao = escolha && this.actor.items.get(escolha);
    return opcao ? this.actor.instalarOpcao(opcao, fundacao, { rolar: !evento.shiftKey }) : null;
  }
  static #editarItem(evento, alvo) { return this.#item(alvo)?.sheet.render(true); }
  // O "+" de cada lista (o C32; o item-create do CORE, cpr-actor-sheet.js:1693-1702): um item em branco do tipo da lista,
  // com o nome do CORE em português ("Arma nova"; regras-inventario.nomeDoItemNovo), que abre para ser preenchido, como o
  // "+" do contêiner.
  static async #criarItem(evento, alvo) {
    const tipo = alvo.dataset.tipo;
    if (!this.isEditable) return null;
    const criado = await criarItemNaFicha(this.actor, tipo);
    return criado?.sheet.render(true) ?? null;
  }
  // A correção rápida, o tratamento e o "Voltou" da lesão (tratamento.mjs, pela wiki).
  // CORE: escolher a tabela e rolar a lesão à mão cria o item e o cartão, sem alterar o HP.
  static async #rolarLesao() {
    if (!this.isEditable) return null;
    const local = await DialogV2.prompt({
      window: { title: `Lesão crítica: ${this.actor.name}` }, classes: [SISTEMA, 'rolar-lesao'], rejectClose: false,
      content: '<label>Local da lesão <select name="local"><option value="corpo">Corpo</option><option value="cabeca">Cabeça</option></select></label>',
      ok: { label: 'Rolar 2d6', callback: (evento, botao) => botao.form.elements.local.value }
    });
    if (!this.isEditable || !['corpo', 'cabeca'].includes(local)) return null;
    return lesaoCritica(this.actor, { cabeca: local === 'cabeca' });
  }
  static #corrigirLesao(evento, alvo) { const item = this.#item(alvo); return this.isEditable && item ? tratarLesao(item, 'correcao') : null; }
  static #tratarLesao(evento, alvo) { const item = this.#item(alvo); return this.isEditable && item ? tratarLesao(item, 'tratamento') : null; }
  static #voltouLesao(evento, alvo) { const item = this.#item(alvo); return this.isEditable && item ? voltouALesao(item) : null; }
  // Apagar. Com algo instalado no item (o acessório na arma, a opção na fundação, o programa no deck, a arma e o upgrade
  // no veículo), a pergunta do CORE (o C32; cpr-container.js:11-21 e cpr-actor-sheet.js:1057-1073): só tirar (o padrão
  // do CORE) ou apagar junto (regras-inventario.apagarComInstalados). Só tirar desinstala o que estava nele, como o
  // uninstallItems do CORE (cpr-actor.js:314-327): o cyberware pelo desinstalarCyberware (o efeito para, o máximo de
  // Humanidade volta, e a perdida não; a arma dele sai pelo gancho), o programa desativado (o CORE, :1042-1055), o resto
  // fora do item. A arma descarrega antes (regras-inventario.descarregaAoApagar). A arma do cyberware ou do acessório sai
  // com ele, pelo gancho (armas-cyberware.mjs), com as balas de volta.
  static async #apagarItem(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return;
    const nome = foundry.utils.escapeHTML(item.name);
    const montagem = junto => apagarComInstalados(item.id, this.actor.items.map(outro => ({ id: outro.id, instaladoEm: outro.system.instaladoEm ?? '', propria: ehArmaMontadaEmItem(outro) })), junto);
    // Sem a munição carregada na ficha, a arma só sai (sem o aviso do descarregar).
    const descarregar = junto => (descarregaAoApagar({ tipo: item.type, pente: item.system.pente?.value, municaoNaFicha: Boolean(item.municaoCarregada), junto }) ? item.descarregar() : null);
    const dentro = montagem(false).soltar.map(id => this.actor.items.get(id)?.name).filter(Boolean);
    if (!dentro.length) {
      const ok = await DialogV2.confirm({ window: { title: 'Apagar item' }, content: `<p>Apagar <b>${nome}</b> da ficha?</p>` });
      if (!ok || !this.actor.items.has(item.id)) return;
      await descarregar(false);
      await item.delete();
      return;
    }
    const escolha = await DialogV2.wait({
      window: { title: 'Apagar item' }, classes: [SISTEMA, 'apagar-com-instalados'], rejectClose: false,
      content: `<p>Apagar <b>${nome}</b> da ficha? Instalado nele: ${dentro.map(outro => foundry.utils.escapeHTML(outro)).join(', ')}.</p><p class="dica">Só tirar: o que está nele fica solto no inventário. Apagar junto: sai tudo.</p>`,
      buttons: [{ action: 'soltar', label: 'Só tirar', default: true }, { action: 'junto', label: 'Apagar junto' }, { action: 'cancelar', label: 'Cancelar' }]
    });
    // A montagem se lê de novo depois da pergunta: o que entrou ou saiu do item enquanto ela estava aberta.
    if (!['soltar', 'junto'].includes(escolha) || !this.actor.items.has(item.id)) return;
    const junto = escolha === 'junto';
    const { apagar, soltar } = montagem(junto);
    await descarregar(junto);
    // O item sai antes de o resto se desinstalar: o acessório que sai da arma faz o gancho acertar o pente dela
    // (armas-cyberware.acertarPentes), e a arma apagada no meio disso daria erro.
    await this.actor.deleteEmbeddedDocuments('Item', apagar);
    // Recusado o apagar (um gancho pode devolver nada sem erro), o que está nele fica onde estava.
    if (this.actor.items.has(item.id)) return;
    for (const outro of soltar.map(id => this.actor.items.get(id)).filter(Boolean)) {
      if (outro.type === 'cyberware' && outro.system.instalado) await this.actor.desinstalarCyberware(outro);
      else await outro.update({ 'system.instaladoEm': '', ...(outro.type === 'programa' ? { 'system.ativo': false } : {}) });
    }
  }
}
